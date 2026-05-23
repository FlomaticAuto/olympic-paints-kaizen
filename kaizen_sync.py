#!/usr/bin/env python3
"""
Kaizen Sync — local daily job.

1. Mines Claude Code session logs from the last 7 days.
   Extracts friction signals (correction events with attribution + metadata).
   Writes data/kaizen_evidence.json  — NO raw user text committed to GitHub.

2. Copies the 7 agent memory files from ~/.claude/projects/.../memory/
   into memory/ in this repo.

3. Pulls any updated memory files that GitHub Actions may have committed
   (i.e. new Accumulated Learnings written by the Friday analysis).

4. git add + commit + push.

Run daily via Task Scheduler.  Friday the GitHub Actions workflow then
picks up the evidence and runs the analysis.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────
REPO_DIR     = Path(__file__).parent
SESSION_DIR  = Path(r"C:\Users\quint\.claude\projects\c--Users-quint-OneDrive-1-Projects-1-Olympic-Paints")
MEMORY_SRC   = SESSION_DIR / "memory"
MEMORY_DEST  = REPO_DIR / "memory"
DATA_DIR     = REPO_DIR / "data"
LOGO_SRC     = Path(r"C:\Users\quint\OneDrive\1.Projects\1.Olympic Paints\3.Resources\9. Brand Assets & Images\Misc Pictures\Olympic Paints Logo Digital.jpg")

LOOKBACK_DAYS = 7

AGENT_FILES = {
    "HAVEN":   "agent_haven.md",
    "PRISM":   "agent_prism.md",
    "STRIKER": "agent_striker.md",
    "SIGMA":   "agent_sigma.md",
    "BLAZE":   "agent_blaze.md",
    "VAULT":   "agent_vault.md",
    "PULSE":   "agent_pulse.md",
}

SKILL_TO_AGENT = {
    "haven": "HAVEN", "prism": "PRISM", "striker": "STRIKER",
    "sigma": "SIGMA", "blaze": "BLAZE", "vault": "VAULT", "pulse": "PULSE",
    "kaizen": "VAULT", "new-task": "VAULT", "new-document": "VAULT",
}

AGENT_DOMAINS = {
    "HAVEN":   ["clocking", "clock", "punch", "attendance", "hr", "employee", "timesheet",
                "haven", "advius", "primeserve", "missed clock"],
    "PRISM":   ["prism", "kpi", "dashboard", "sales dashboard", "quicksight", "yoy",
                "analytics", "report", "target", "mtd", "ytd"],
    "STRIKER": ["striker", "zoho", "quote", "stockist", "sales rep", "crm", "lead", "order",
                "customer", "price list"],
    "SIGMA":   ["sigma", "sop", "dispatch", "factory", "supply chain", "operations", "logistics"],
    "BLAZE":   ["blaze", "marketing", "social", "copy", "campaign", "post", "brand",
                "instagram", "facebook"],
    "VAULT":   ["vault", "para", "inbox", "notion", "filing", "document", "archive", "task",
                "meeting"],
    "PULSE":   ["pulse", "scorecard", "ack", "leaderboard", "weekly ops"],
}

CORRECTION_RE = re.compile(
    r"\bno[,. ]+(?:not|don'?t|that'?s|stop)\b"
    r"|\bnot (?:like that|what I|right|correct)\b"
    r"|\binstead[, ]+(?:do|use|make|show|just|please)\b"
    r"|\bactually[, ]+(?:I want|I need|you should|don'?t|please|can you)\b"
    r"|\bundo (?:that|the|this)\b"
    r"|\brevert (?:that|the|this)\b"
    r"|\byou (?:missed|forgot|broke|ignored)\b"
    r"|\bthat'?s (?:wrong|not right|incorrect|not what)\b"
    r"|\bstop[, ]+(?:doing|adding|using|putting)\b",
    re.IGNORECASE,
)
SKILL_RE = re.compile(
    r"/(haven|prism|striker|sigma|blaze|vault|pulse|apex|kaizen|new-task|new-document)\b",
    re.IGNORECASE,
)


def iter_jsonl(path: Path):
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    continue
    except OSError:
        return


def text_of(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(
            b.get("text", "") for b in content
            if isinstance(b, dict) and b.get("type") == "text"
        )
    return ""


def guess_agent(txt: str) -> str | None:
    txt = txt.lower()
    scores = {a: sum(1 for kw in kws if kw in txt) for a, kws in AGENT_DOMAINS.items()}
    best = max(scores, key=lambda a: scores[a])
    return best if scores[best] > 0 else None


def mine_evidence() -> dict:
    cutoff = datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)
    cutoff_ts = datetime.now().timestamp() - LOOKBACK_DAYS * 86400

    files = [
        p for p in SESSION_DIR.rglob("*.jsonl")
        if p.is_file() and p.stat().st_mtime >= cutoff_ts
    ]

    sessions: set = set()
    total_prompts = 0
    skill_counts: dict[str, int] = defaultdict(int)
    # Corrections stored as metadata only — no raw text committed to public GitHub
    corrections_by_agent: dict[str, list[dict]] = defaultdict(list)

    # Attribution window: active_agent persists for at most ATTR_WINDOW user messages
    # after a /skill invocation. Past that, fall back to keyword-score guess.
    ATTR_WINDOW = 10

    for f in files:
        active_agent: str | None = None
        attr_remaining = 0
        for evt in iter_jsonl(f):
            sid = evt.get("sessionId")
            if sid:
                sessions.add(sid)

            ts_str = evt.get("timestamp", "")
            if ts_str:
                try:
                    ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                    if ts < cutoff:
                        continue
                except (ValueError, AttributeError):
                    pass

            t = evt.get("type")
            if t != "user":
                continue
            msg = evt.get("message") or {}
            if msg.get("role") != "user":
                continue
            txt = text_of(msg.get("content"))
            if not txt or txt.startswith("<system"):
                continue

            total_prompts += 1

            # Decay the attribution window on each user message
            if attr_remaining > 0:
                attr_remaining -= 1
                if attr_remaining == 0:
                    active_agent = None

            for m in SKILL_RE.findall(txt):
                skill_counts[m.lower()] += 1
                ag = SKILL_TO_AGENT.get(m.lower())
                if ag:
                    active_agent = ag
                    attr_remaining = ATTR_WINDOW

            if CORRECTION_RE.search(txt):
                # Prefer keyword-score guess if it disagrees strongly with sticky agent.
                # `guess_agent` returns the best-scoring agent only if score > 0;
                # we re-implement here to also check the score magnitude.
                txt_l = txt.lower()
                scores = {a: sum(1 for kw in kws if kw in txt_l)
                          for a, kws in AGENT_DOMAINS.items()}
                best = max(scores, key=lambda a: scores[a])
                strong_signal = scores[best] >= 2

                if strong_signal and best != active_agent:
                    agent = best
                else:
                    agent = active_agent or (best if scores[best] > 0 else None)

                matched = CORRECTION_RE.search(txt)
                pattern_hint = (matched.group(0)[:30] if matched else "correction").lower()
                entry = {
                    "date": ts_str[:10],
                    "pattern": pattern_hint,
                    "agent": agent or "unknown",
                    "session": sid or "",  # for distinct-session counting downstream
                }
                corrections_by_agent[agent or "unknown"].append(entry)

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "lookback_days": LOOKBACK_DAYS,
        "sessions_seen": len(sessions),
        "total_prompts": total_prompts,
        "skill_invocations": dict(sorted(skill_counts.items(), key=lambda x: -x[1])),
        "corrections_by_agent": {
            agent: entries[:20]
            for agent, entries in corrections_by_agent.items()
        },
        "total_corrections": sum(len(v) for v in corrections_by_agent.values()),
    }


def sync_memory_files():
    """Copy agent memory files from Claude Code local store to the repo."""
    MEMORY_DEST.mkdir(exist_ok=True)
    synced = []
    for agent, fname in AGENT_FILES.items():
        src = MEMORY_SRC / fname
        if src.exists():
            shutil.copy2(src, MEMORY_DEST / fname)
            synced.append(agent)
        else:
            print(f"  WARNING: {fname} not found at {src}")
    return synced


def pull_memory_updates():
    """After pushing, pull any changes GitHub Actions committed back (new learnings)."""
    result = subprocess.run(
        ["git", "pull", "--rebase"],
        cwd=REPO_DIR, capture_output=True, text=True,
    )
    if result.returncode == 0:
        print(f"  git pull: {result.stdout.strip() or 'up to date'}")
    else:
        print(f"  git pull warning: {result.stderr.strip()}")

    # Copy updated memory files back to local Claude Code memory store
    copied_back = []
    for agent, fname in AGENT_FILES.items():
        repo_file = MEMORY_DEST / fname
        local_file = MEMORY_SRC / fname
        if repo_file.exists():
            shutil.copy2(repo_file, local_file)
            copied_back.append(agent)
    if copied_back:
        print(f"  Synced back to local Claude memory: {', '.join(copied_back)}")


def git_push(evidence_updated: bool):
    subprocess.run(["git", "add", "-A"], cwd=REPO_DIR, check=True)

    # Check if there's anything to commit
    result = subprocess.run(
        ["git", "diff", "--staged", "--quiet"],
        cwd=REPO_DIR, capture_output=True,
    )
    if result.returncode == 0:
        print("  No changes to commit.")
        return

    msg = f"chore: sync evidence + memory {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    subprocess.run(["git", "commit", "-m", msg], cwd=REPO_DIR, check=True)
    subprocess.run(["git", "push"], cwd=REPO_DIR, check=True)
    print("  Pushed to GitHub.")


def main():
    print(f"Kaizen Sync — {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    # Pull first so we pick up any improvements Actions committed
    print("  Pulling latest from GitHub…")
    pull_memory_updates()

    print("  Mining session logs…")
    evidence = mine_evidence()
    print(f"    {evidence['sessions_seen']} sessions, {evidence['total_prompts']} prompts, "
          f"{evidence['total_corrections']} corrections")

    DATA_DIR.mkdir(exist_ok=True)
    (DATA_DIR / "kaizen_evidence.json").write_text(
        json.dumps(evidence, indent=2), encoding="utf-8"
    )

    print("  Syncing agent memory files…")
    synced = sync_memory_files()
    print(f"    Synced: {', '.join(synced)}")

    if LOGO_SRC.exists():
        shutil.copy2(LOGO_SRC, REPO_DIR / "logo.jpg")

    print("  Pushing to GitHub…")
    git_push(True)
    print("Done.")


if __name__ == "__main__":
    sys.exit(main() or 0)
