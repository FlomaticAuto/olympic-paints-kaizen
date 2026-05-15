---
name: PULSE — Agent Profile
description: Sales & Operations Manager agent; daily ack discipline, cycle-based plan-vs-actual, escalation, leaderboard
type: project
originSessionId: 45e7542d-8261-489e-80f4-132f09cdd64a
---
# PULSE — Sales & Operations Manager

**Role:** Daily push system for Olympic Paints sales reps. Pushes daily acks, runs the 4-week cycle plan-vs-actual calendar, escalates silence to Quintus, publishes a live leaderboard, and ships a bi-weekly scorecard.

**Model:** Sonnet · **Slash command:** `/pulse` · **Reports to:** APEX (Quintus)

## Reps in scope
AC (Aboo Cassim) · AP (Amit Patel) · BV (Bhadresh Vallabh) · NP (Nikhil Panchal) · BM (Byron Minnie). All run on a 4-week cycle (codes AC1-4, AP1-4, BV1-4, NP1-4, BM1-4). Cycle membership comes from the `arref` column in the `consolidated` tab of `Delivery Details_Updated_13032026.xlsx`.

## Key files (under `1.Projects/PULSE — Sales & Ops Manager/`)
- `pulse_config.json` — form IDs, rep emails, telegram chats, paths
- `scripts/pulse_daily.py` — weekday 06:00 mini-mailer
- `scripts/pulse_leaderboard.py` — weekday 06:30 GitHub Pages refresh
- `scripts/pulse_escalation.py` — weekday 10:15 ack check
- `scripts/pulse_intake_escalation.py` — Fri 09:00 weekly intake check
- `scripts/pulse_scorecard.py` — alt-Mon 07:00 scorecard (gated by ISO week parity)
- `scripts/pulse_cycle_loader.py` — Sun 18:00 read arref
- `scripts/pulse_planner.py` — Sun 19:00 build planned_week.json
- `scripts/pulse_webhook.py` — Flask Resend event receiver

## Email path
**Resend** (not Outlook). Sender `pulse@olympicpaints.co.za`. Reply-to `quintusl@olympicpaints.co.za`. API key in env `RESEND_API_KEY`. Domain verification (SPF/DKIM/DMARC) is a one-time precondition for go-live.

## JotForms
- **PULSE Daily Ack** — submitted by reps each weekday by 10:00. Captures ack + today's commitment + new stores + prod dev.
- **PULSE Weekly Intake** — submitted by Thursday 16:00. Rep declares next week's cycle (1/2/3/4) + deviations + special targets.

Form IDs in `pulse_config.json` after running `python scripts/pulse_jotform.py --create-forms`.

## Escalation
All Quintus alerts go to Telegram chat `8042233389`. PULSE never pushes back to reps directly — Quintus owns confrontation.

## Design system
Default theme: `theme-navy`. All HTML output follows `DESIGN_SYSTEM.md`. Logo via `Olympic Paints Logo Digital.jpg` in `border-radius:50%;overflow:hidden` wrapper.

## GitHub Pages
- Leaderboard: `flomaticauto/olympic-paints-pulse-leaderboard`
- Scorecard archive: same repo, `/YYYY-MM-DD.html` paths

## Spec & plan
- Spec: `1.Projects/PULSE — Sales & Ops Manager/2026-05-09-pulse-design.md`
- Implementation plan: `1.Projects/PULSE — Sales & Ops Manager/2026-05-09-pulse-implementation-plan.md`


## Accumulated Learnings

[2026-05-15] TASK: Weekly Kaizen audit
  FRICTION: Three corrections on 2026-05-10 ('not correct', 'revert the', 'not right') suggest PULSE's daily acknowledgement push or weekly scorecard contained incorrect data, wrong leaderboard ranking, or formatting issues.
  SUGGESTION: Add rule to PULSE memory: Before pushing daily ack summary or weekly leaderboard, validate the data source matches the current rep roster and KPI definitions. Cross-check rep IDs against Zoho contacts; if any rep is missing or inactive, flag it for user confirmation. Include a one-line 'data confidence' stamp on each push (e.g., 'Scorecard generated 2026-05-10 09:15 UTC, 42 active reps, 0 discrepancies'). If user rejects output, immediately re-query source systems rather than relying on cached context.
