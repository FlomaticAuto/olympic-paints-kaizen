#!/usr/bin/env python3
"""
Kaizen Analyze — runs on GitHub Actions every Friday 16:30 SAST (14:30 UTC).

1. Reads data/kaizen_evidence.json  (synced from local daily).
2. Reads memory/agent_*.md  (agent behavior files with Accumulated Learnings).
3. Calls Claude API → produces per-agent improvement suggestions.
4. Writes new entries into memory/agent_*.md  (Accumulated Learnings).
5. Generates index.html  (NAVY-theme dashboard, served by GitHub Pages).
6. Sends Telegram summary.

Environment variables required (GitHub Secrets):
  ANTHROPIC_API_KEY
  TELEGRAM_BOT_TOKEN
  TELEGRAM_CHAT_ID
"""

from __future__ import annotations

import json
import os
import re
import shutil
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO_DIR    = Path(__file__).parent
DATA_DIR    = REPO_DIR / "data"
MEMORY_DIR  = REPO_DIR / "memory"
ARCHIVE_DIR = REPO_DIR / "archive"

ANTHROPIC_API_KEY  = os.environ.get("ANTHROPIC_API_KEY", "")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID   = os.environ.get("TELEGRAM_CHAT_ID", "8042233389")

AGENTS = ["HAVEN", "PRISM", "STRIKER", "SIGMA", "BLAZE", "VAULT", "PULSE"]

AGENT_FILES = {
    "HAVEN":   "agent_haven.md",
    "PRISM":   "agent_prism.md",
    "STRIKER": "agent_striker.md",
    "SIGMA":   "agent_sigma.md",
    "BLAZE":   "agent_blaze.md",
    "VAULT":   "agent_vault.md",
    "PULSE":   "agent_pulse.md",
}


# ── Evidence & memory readers ─────────────────────────────────────────
def load_evidence() -> dict:
    path = DATA_DIR / "kaizen_evidence.json"
    if not path.exists():
        print("WARNING: kaizen_evidence.json not found — using empty evidence")
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def read_accumulated_learnings(agent: str) -> str:
    fname = AGENT_FILES.get(agent)
    if not fname:
        return ""
    fpath = MEMORY_DIR / fname
    if not fpath.exists():
        return ""
    content = fpath.read_text(encoding="utf-8")
    m = re.search(r"## Accumulated Learnings\s*\n(.*?)(?=\n## |\Z)", content, re.DOTALL)
    if not m:
        return ""
    section = m.group(1).strip()
    # Strip comment lines
    section = re.sub(r"<!--.*?-->", "", section, flags=re.DOTALL).strip()
    return section[:3000]  # cap to keep tokens manageable


def build_evidence_block(evidence: dict) -> str:
    lines = []
    generated = evidence.get("generated_at", "unknown")[:10]
    days = evidence.get("lookback_days", 7)
    lines.append(f"Evidence window: {days} days to {generated}")
    lines.append(f"Sessions: {evidence.get('sessions_seen', 0)}, "
                 f"Prompts: {evidence.get('total_prompts', 0)}, "
                 f"Total corrections: {evidence.get('total_corrections', 0)}")

    invocations = evidence.get("skill_invocations", {})
    if invocations:
        lines.append("\nSkill invocations:")
        for skill, n in invocations.items():
            lines.append(f"  /{skill}: {n}x")

    corrections = evidence.get("corrections_by_agent", {})
    for agent in AGENTS:
        items = corrections.get(agent, [])
        if not items:
            continue
        lines.append(f"\n{agent} corrections ({len(items)}):")
        for c in items[:10]:
            lines.append(f"  [{c['date']}] pattern='{c['pattern']}'")

    if corrections.get("unknown"):
        lines.append(f"\nUnattributed corrections: {len(corrections['unknown'])}")

    lines.append("\n--- Agent Accumulated Learnings ---")
    for agent in AGENTS:
        learnings = read_accumulated_learnings(agent)
        if learnings:
            lines.append(f"\n{agent} existing learnings:\n{learnings}")

    return "\n".join(lines)


# ── Claude API ────────────────────────────────────────────────────────
SYSTEM_PROMPT = """\
You are the Kaizen analyst for Olympic Paints' internal AI agent system.

Agents:
- HAVEN: HR & clocking (Advius timesheets, missed clock-outs, 45-min break rule, SD=Primeserve)
- PRISM: Analytics & KPI dashboards (QuickSight PDFs, YoY charts, rep performance)
- STRIKER: Sales & CRM (Zoho, quotes, stockist onboarding, price lists)
- SIGMA: Operations & SOPs (dispatch, factory, logistics, purchase orders)
- BLAZE: Marketing (social media, copy, campaigns, brand assets)
- VAULT: Admin & filing (PARA method, Notion tasks, inbox triage, document creation)
- PULSE: Sales ops manager (daily ack push, weekly scorecard, rep leaderboard)

You receive:
1. Friction evidence from session logs — correction events attributed per agent
2. Each agent's existing Accumulated Learnings (what has already been captured)

Your job:
- Identify which agents have genuine recurring friction this week
- Propose specific, actionable improvements — rules to add, behaviors to change, missing defaults
- Do NOT repeat suggestions already present in Accumulated Learnings
- Do NOT fabricate issues — only surface what the evidence supports
- If an agent has no friction evidence, omit it

Output strict JSON (no markdown fences):
{
  "agents": [
    {
      "agent": "HAVEN",
      "improvements": [
        {
          "friction": "Brief description of the recurring problem",
          "suggestion": "Concrete rule or behavior change to implement"
        }
      ]
    }
  ],
  "summary": "2-3 sentence plain-English summary for Quintus (the business owner)"
}
"""


def call_claude(evidence_block: str) -> dict | None:
    if not ANTHROPIC_API_KEY:
        print("ERROR: ANTHROPIC_API_KEY not set", file=sys.stderr)
        return None

    payload = {
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 2048,
        "system": SYSTEM_PROMPT,
        "messages": [
            {"role": "user", "content": f"Analyse this week's evidence and return improvements:\n\n{evidence_block}"}
        ],
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=data,
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            body = json.loads(r.read().decode("utf-8"))
            raw = body["content"][0]["text"].strip()
            raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
            raw = re.sub(r"```\s*$", "", raw, flags=re.MULTILINE)
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        print(f"Claude API HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
    except Exception as e:
        print(f"Claude API error: {e}", file=sys.stderr)
    return None


# ── Memory file writer ────────────────────────────────────────────────
def write_to_memory(analysis: dict, run_date: str) -> list[str]:
    written = []
    for ae in analysis.get("agents", []):
        agent = ae.get("agent", "").upper()
        improvements = ae.get("improvements", [])
        if not improvements:
            continue
        fname = AGENT_FILES.get(agent)
        if not fname:
            continue
        fpath = MEMORY_DIR / fname
        if not fpath.exists():
            print(f"  Memory file not found: {fpath}")
            continue

        content = fpath.read_text(encoding="utf-8")
        new_entries = []
        for imp in improvements:
            friction = (imp.get("friction") or "").replace("\n", " ")
            suggestion = (imp.get("suggestion") or "").replace("\n", " ")
            if friction and suggestion:
                new_entries.append(
                    f"[{run_date}] TASK: Weekly Kaizen audit\n"
                    f"  FRICTION: {friction}\n"
                    f"  SUGGESTION: {suggestion}"
                )

        if not new_entries:
            continue

        block = "\n\n".join(new_entries)
        marker = "## Accumulated Learnings"
        if marker in content:
            m = re.search(rf"{re.escape(marker)}\s*\n(<!-- .+? -->\n)?", content)
            if m:
                pos = m.end()
                content = content[:pos] + "\n" + block + "\n\n" + content[pos:]
            else:
                content = content.replace(marker, marker + "\n\n" + block + "\n", 1)
        else:
            content += f"\n\n{marker}\n\n{block}\n"

        fpath.write_text(content, encoding="utf-8")
        written.append(f"{agent}: {len(new_entries)}")
        print(f"  Updated {fname}: {len(new_entries)} entries")

    return written


# ── HTML rendering ────────────────────────────────────────────────────
TOKEN_BLOCK = """:root{--_y50:#FEF9E0;--_y100:#FDF0A0;--_y200:#FAE04D;--_y400:#F5C400;--_y600:#D4A800;--_y800:#A88000;--_y900:#6A5000;--_n50:#E8EFF8;--_n100:#B8CCE8;--_n300:#6B9ED0;--_n500:#2D6BA8;--_n700:#1A3D6E;--_n900:#0D2040;--_n950:#071022;--_g0:#FFFFFF;--_g50:#F7F6F3;--_g100:#E8E7E2;--_g200:#C8C7C0;--_g400:#949390;--_g600:#5C5B58;--_g800:#2E2E2C;--_g900:#1A1A18;--_g950:#0D0D0B;--_teal:#2D8C7A;--_teal-light:#C8EDE7;--_teal-dark:#1a5c50;--_coral:#E86060;--_coral-light:#FDDCDC;--font-display:'Barlow Condensed',sans-serif;--font-body:'Barlow',sans-serif;--r-sm:4px;--r-md:8px;--r-lg:12px;--r-xl:16px;--r-pill:50px;}
.theme-light{color-scheme:light;--color-surface-page:var(--_g50);--color-surface-base:var(--_g0);--color-surface-elevated:var(--_g0);--color-surface-sunken:var(--_g100);--color-surface-secondary:var(--_n700);--color-text-primary:var(--_g950);--color-text-secondary:var(--_g600);--color-text-tertiary:var(--_g400);--color-text-on-brand:var(--_g950);--color-text-on-navy:var(--_g0);--color-brand-primary:var(--_y400);--color-border-subtle:var(--_g100);--color-border-default:var(--_g200);--color-border-strong:var(--_g400);--color-success-bg:#EDF7F5;--color-success-fg:var(--_teal-dark);--color-success-bd:var(--_teal);--color-warning-bg:var(--_y50);--color-warning-fg:var(--_y900);--color-warning-bd:var(--_y600);--color-danger-bg:#FEF2F2;--color-danger-fg:#C0392B;--color-danger-bd:var(--_coral);--color-info-bg:var(--_n50);--color-info-fg:var(--_n700);--color-info-bd:var(--_n500);--color-neutral-bg:var(--_g100);--color-neutral-fg:var(--_g600);--color-neutral-bd:var(--_g400);}
.theme-dark{color-scheme:dark;--color-surface-page:var(--_g950);--color-surface-base:var(--_g900);--color-surface-elevated:var(--_g800);--color-surface-sunken:var(--_g950);--color-surface-secondary:var(--_n700);--color-text-primary:var(--_g100);--color-text-secondary:var(--_g400);--color-text-tertiary:var(--_g600);--color-text-on-brand:var(--_g950);--color-text-on-navy:var(--_g0);--color-brand-primary:var(--_y400);--color-border-subtle:rgba(255,255,255,0.06);--color-border-default:rgba(255,255,255,0.10);--color-border-strong:rgba(255,255,255,0.20);--color-success-bg:rgba(45,140,122,0.12);--color-success-fg:var(--_teal-light);--color-success-bd:rgba(45,140,122,0.30);--color-warning-bg:rgba(245,196,0,0.10);--color-warning-fg:var(--_y200);--color-warning-bd:rgba(245,196,0,0.25);--color-danger-bg:rgba(232,96,96,0.12);--color-danger-fg:var(--_coral-light);--color-danger-bd:rgba(232,96,96,0.30);--color-info-bg:rgba(26,61,110,0.30);--color-info-fg:var(--_n100);--color-info-bd:rgba(107,158,208,0.30);--color-neutral-bg:rgba(255,255,255,0.05);--color-neutral-fg:var(--_g400);--color-neutral-bd:rgba(255,255,255,0.10);}
.theme-brand{color-scheme:light;--color-surface-page:var(--_y400);--color-surface-base:var(--_y200);--color-surface-elevated:var(--_y50);--color-surface-sunken:var(--_y600);--color-surface-secondary:var(--_g950);--color-text-primary:var(--_g950);--color-text-secondary:var(--_y900);--color-text-tertiary:var(--_y800);--color-text-on-brand:var(--_g950);--color-text-on-navy:var(--_g0);--color-brand-primary:var(--_g950);--color-border-subtle:rgba(0,0,0,0.08);--color-border-default:rgba(0,0,0,0.14);--color-border-strong:rgba(0,0,0,0.25);--color-success-bg:rgba(45,140,122,0.12);--color-success-fg:var(--_teal-dark);--color-success-bd:var(--_teal);--color-warning-bg:rgba(0,0,0,0.08);--color-warning-fg:var(--_y900);--color-warning-bd:var(--_y900);--color-danger-bg:rgba(232,96,96,0.12);--color-danger-fg:#C0392B;--color-danger-bd:var(--_coral);--color-info-bg:rgba(26,61,110,0.10);--color-info-fg:var(--_n900);--color-info-bd:var(--_n700);--color-neutral-bg:rgba(0,0,0,0.06);--color-neutral-fg:var(--_y900);--color-neutral-bd:rgba(0,0,0,0.15);}
.theme-navy{color-scheme:dark;--color-surface-page:var(--_n950);--color-surface-base:var(--_n900);--color-surface-elevated:var(--_n700);--color-surface-sunken:var(--_n950);--color-surface-secondary:var(--_n700);--color-text-primary:var(--_g0);--color-text-secondary:var(--_n100);--color-text-tertiary:var(--_n300);--color-text-on-brand:var(--_g950);--color-text-on-navy:var(--_g0);--color-brand-primary:var(--_y400);--color-border-subtle:rgba(107,158,208,0.12);--color-border-default:rgba(107,158,208,0.20);--color-border-strong:rgba(107,158,208,0.35);--color-success-bg:rgba(45,140,122,0.15);--color-success-fg:var(--_teal-light);--color-success-bd:rgba(45,140,122,0.35);--color-warning-bg:rgba(245,196,0,0.12);--color-warning-fg:var(--_y200);--color-warning-bd:rgba(245,196,0,0.30);--color-danger-bg:rgba(232,96,96,0.14);--color-danger-fg:var(--_coral-light);--color-danger-bd:rgba(232,96,96,0.35);--color-info-bg:rgba(45,107,168,0.20);--color-info-fg:var(--_n100);--color-info-bd:rgba(107,158,208,0.35);--color-neutral-bg:rgba(255,255,255,0.05);--color-neutral-fg:var(--_n300);--color-neutral-bd:rgba(255,255,255,0.12);}"""

PAGE_CSS = """*{box-sizing:border-box}body{font-family:var(--font-body);margin:0;padding:0;background:var(--color-surface-page);color:var(--color-text-primary);}.container{max-width:860px;margin:0 auto;padding:24px;}.theme-bar{display:flex;gap:4px;padding:8px 16px;background:var(--color-surface-secondary);}.theme-bar button{font-family:var(--font-display);font-weight:700;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;background:transparent;color:var(--color-text-on-navy);border:1px solid rgba(255,255,255,0.18);padding:6px 14px;border-radius:var(--r-pill);cursor:pointer;}.theme-bar button.active{background:var(--color-brand-primary);color:var(--color-text-on-brand);border-color:var(--color-brand-primary);}header.hero{display:flex;align-items:center;gap:16px;padding:24px 0 16px;border-bottom:1px solid var(--color-border-default);margin-bottom:24px;}.logo-wrap{width:56px;height:56px;border-radius:50%;overflow:hidden;flex-shrink:0;}.logo-wrap img{display:block;width:100%;height:100%;object-fit:cover;}h1{font-family:var(--font-display);font-weight:900;font-size:36px;text-transform:uppercase;margin:0;}.eyebrow{font-family:var(--font-display);font-weight:700;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:var(--color-text-tertiary);margin-bottom:4px;}.muted{color:var(--color-text-tertiary);font-size:12px;}.summary-card{background:var(--color-surface-elevated);border:1px solid var(--color-brand-primary);border-radius:var(--r-lg);padding:20px 24px;margin-bottom:32px;}.summary-card p{font-size:16px;line-height:1.7;margin:0;}h2{font-family:var(--font-display);font-weight:800;font-size:22px;text-transform:uppercase;margin:32px 0 12px;}.agent-card{background:var(--color-surface-elevated);border:1px solid var(--color-border-subtle);border-radius:var(--r-lg);padding:20px;margin-bottom:16px;}.agent-label{display:inline-block;font-family:var(--font-display);font-weight:900;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;background:var(--color-brand-primary);color:var(--color-text-on-brand);padding:3px 12px;border-radius:var(--r-pill);margin-bottom:14px;}.improvement{padding:14px 16px;border-radius:var(--r-md);background:var(--color-warning-bg);border:1px solid var(--color-warning-bd);margin-bottom:10px;}.improvement:last-child{margin-bottom:0;}.friction{font-size:13px;color:var(--color-text-secondary);margin-bottom:8px;}.friction strong{color:var(--color-text-primary);}.suggestion{font-size:15px;line-height:1.5;color:var(--color-text-primary);}.suggestion::before{content:"→ ";color:var(--color-brand-primary);font-weight:700;}.clean{background:var(--color-success-bg);border:1px solid var(--color-success-bd);border-radius:var(--r-lg);padding:20px;color:var(--color-success-fg);text-align:center;font-size:15px;}footer{margin-top:48px;padding-top:16px;border-top:1px solid var(--color-border-default);text-align:center;color:var(--color-text-tertiary);font-size:12px;}code{background:var(--color-surface-sunken);padding:2px 6px;border-radius:var(--r-sm);font-size:12px;}"""


def render_html(analysis: dict | None, evidence: dict, run_date: str) -> str:
    now_str = datetime.now().strftime("%d %B %Y")
    sessions = evidence.get("sessions_seen", 0)
    prompts  = evidence.get("total_prompts", 0)
    evdate   = evidence.get("generated_at", "")[:10]

    if analysis is None:
        summary_html = "<p>Analysis unavailable this week — check GitHub Actions logs.</p>"
        agents_html  = '<div class="clean">Could not complete analysis.</div>'
    else:
        summary_html = f"<p>{analysis.get('summary', '')}</p>"
        agents = analysis.get("agents", [])
        if agents:
            parts = []
            for ae in agents:
                imps = "".join(
                    f'<div class="improvement">'
                    f'<div class="friction"><strong>Friction:</strong> {imp.get("friction","").replace("<","&lt;")}</div>'
                    f'<div class="suggestion">{imp.get("suggestion","").replace("<","&lt;")}</div>'
                    f'</div>'
                    for imp in ae.get("improvements", [])
                )
                parts.append(
                    f'<div class="agent-card">'
                    f'<div class="agent-label">{ae.get("agent","")}</div>'
                    f'{imps}</div>'
                )
            agents_html = "\n".join(parts)
        else:
            agents_html = '<div class="clean">✓ No friction signals this week — all agents performing well.</div>'

    return f"""<!DOCTYPE html>
<html lang="en" class="theme-navy">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Weekly Kaizen — Olympic Paints</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;700;800;900&family=Barlow:wght@300;400;500;600&display=swap" rel="stylesheet">
<script>var t=localStorage.getItem('oly-theme');if(t)document.documentElement.className=t;</script>
<style>{TOKEN_BLOCK}{PAGE_CSS}</style>
</head>
<body>
<div class="theme-bar">
  <button onclick="olyTheme('theme-light',this)">Light</button>
  <button onclick="olyTheme('theme-dark',this)">Dark</button>
  <button onclick="olyTheme('theme-brand',this)">Brand</button>
  <button onclick="olyTheme('theme-navy',this)" class="active">Navy</button>
</div>
<div class="container">
<header class="hero">
  <div class="logo-wrap"><img src="logo.jpg" alt="Olympic Paints" width="56" height="56"></div>
  <div>
    <div class="eyebrow">Olympic Paints · Weekly Kaizen · Agent Improvement Report</div>
    <h1>What Can We Improve?</h1>
    <div class="muted">Evidence from {evdate} · {sessions} sessions · {prompts} prompts · Report date: {now_str}</div>
  </div>
</header>

<h2>This Week's Finding</h2>
<div class="summary-card">{summary_html}</div>

<h2>Agent Improvements</h2>
{agents_html}

<footer>Olympic Paints · Weekly Kaizen · {now_str} · Auto-generated by GitHub Actions · Improvements written to agent memory files</footer>
</div>
<script>
const T=['theme-light','theme-dark','theme-brand','theme-navy'];
function olyTheme(t,btn){{document.documentElement.classList.remove(...T);document.documentElement.classList.add(t);localStorage.setItem('oly-theme',t);document.querySelectorAll('.theme-bar button').forEach(b=>b.classList.toggle('active',b===btn));}}
</script>
</body>
</html>"""


# ── Telegram ──────────────────────────────────────────────────────────
def send_telegram(analysis: dict | None, written: list[str], run_date: str):
    if not TELEGRAM_BOT_TOKEN:
        print("  Telegram: no token set")
        return
    lines = [f"<b>🔧 Weekly Kaizen — {run_date}</b>", ""]
    if analysis:
        lines.append(analysis.get("summary", ""))
        lines.append("")
        for ae in analysis.get("agents", []):
            n = len(ae.get("improvements", []))
            lines.append(f"<b>{ae['agent']}</b>: {n} suggestion(s)")
            for imp in ae.get("improvements", [])[:2]:
                lines.append(f"  → {imp.get('suggestion','')[:120]}")
        if not analysis.get("agents"):
            lines.append("✅ No friction signals — agents performing well.")
    else:
        lines.append("⚠️ Analysis failed — check Actions logs.")
    if written:
        lines.append(f"\n<i>Written to memory: {', '.join(written)}</i>")
    lines.append("\n🔗 https://flomaticauto.github.io/olympic-paints-kaizen/")

    data = urllib.parse.urlencode({
        "chat_id": TELEGRAM_CHAT_ID, "text": "\n".join(lines),
        "parse_mode": "HTML", "disable_web_page_preview": "true",
    }).encode()
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        with urllib.request.urlopen(urllib.request.Request(url, data=data), timeout=15):
            print("  Telegram: sent")
    except Exception as e:
        print(f"  Telegram error: {e}", file=sys.stderr)


# ── Archive ───────────────────────────────────────────────────────────
def archive_run(analysis: dict | None, evidence: dict, written: list[str], run_date: str):
    """Append this run to archive/kaizen_history.json and save dated HTML snapshot."""
    ARCHIVE_DIR.mkdir(exist_ok=True)

    # ── JSON history log ──────────────────────────────────────────────
    history_path = ARCHIVE_DIR / "kaizen_history.json"
    history = []
    if history_path.exists():
        try:
            history = json.loads(history_path.read_text(encoding="utf-8"))
        except Exception:
            history = []

    entry = {
        "run_date":      run_date,
        "sessions":      evidence.get("sessions_seen", 0),
        "total_prompts": evidence.get("total_prompts", 0),
        "agents_with_findings": len((analysis or {}).get("agents", [])),
        "total_improvements":   sum(
            len(a.get("improvements", []))
            for a in (analysis or {}).get("agents", [])
        ),
        "summary":       (analysis or {}).get("summary", ""),
        "written_to_memory": written,
        "findings": [
            {
                "agent": ae["agent"],
                "improvements": ae.get("improvements", []),
            }
            for ae in (analysis or {}).get("agents", [])
        ],
    }
    history.append(entry)
    history_path.write_text(
        json.dumps(history, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"  Archive: appended run to kaizen_history.json ({len(history)} runs total)")

    # ── Dated HTML snapshot ────────────────────────────────────────────
    snapshot_path = ARCHIVE_DIR / f"kaizen_{run_date}.html"
    html = render_html(analysis, evidence, run_date)
    snapshot_path.write_text(html, encoding="utf-8")
    print(f"  Archive: saved snapshot → archive/kaizen_{run_date}.html")


# ── Main ──────────────────────────────────────────────────────────────
def main():
    run_date = datetime.now().strftime("%Y-%m-%d")
    print(f"Kaizen Analyze — {run_date}")

    if not ANTHROPIC_API_KEY:
        print("ERROR: ANTHROPIC_API_KEY not set", file=sys.stderr)
        sys.exit(1)

    print("  Loading evidence…")
    evidence = load_evidence()
    print(f"    {evidence.get('sessions_seen', 0)} sessions, "
          f"{evidence.get('total_corrections', 0)} corrections")

    print("  Building evidence block…")
    block = build_evidence_block(evidence)

    print("  Calling Claude API…")
    analysis = call_claude(block)
    if analysis:
        n = sum(len(a.get("improvements", [])) for a in analysis.get("agents", []))
        print(f"    {len(analysis.get('agents', []))} agents, {n} improvements")
        print(f"    {analysis.get('summary', '')[:100]}")
    else:
        print("    WARNING: no analysis returned")

    print("  Writing to memory files…")
    written = write_to_memory(analysis or {}, run_date)

    print("  Archiving run…")
    archive_run(analysis, evidence, written, run_date)

    print("  Generating index.html…")
    (REPO_DIR / "index.html").write_text(
        render_html(analysis, evidence, run_date), encoding="utf-8"
    )

    send_telegram(analysis, written, run_date)
    print("Done.")


if __name__ == "__main__":
    sys.exit(main() or 0)
