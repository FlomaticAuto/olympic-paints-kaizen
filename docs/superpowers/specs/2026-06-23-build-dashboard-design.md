# Build Dashboard — Design Spec
**Date:** 2026-06-23
**Status:** Approved
**Project:** Olympic Paints — Supabase Build Dashboard

---

## Overview

A Notion-style project hub that tracks the build state of every Supabase project across the Olympic Paints ecosystem. It is not a data viewer — it is a build tracker. Each time a Supabase project is documented via the skill, a registry row is upserted and the dashboard automatically shows the new project in the sidebar with its phases, sub-systems, and schema details.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  "document Supabase project" skill                       │
│                                                          │
│  ① Fetch schema via MCP                                  │
│  ② Write docs/supabase-schema.md                         │
│  ③ Apply RLS policies                                    │
│  ④ Upsert row → dashboard_projects (registry project)   │
└────────────────────────┬────────────────────────────────┘
                         │ Supabase client (service role)
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Registry Supabase project  (new — op-dashboard-registry)│
│                                                          │
│  dashboard_projects table                                │
│  One row per documented project                          │
└────────────────────────┬────────────────────────────────┘
                         │ Supabase client (anon key, read-only)
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Next.js dashboard  (olympic-paints-kaizen/dashboard/)   │
│                                                          │
│  Server components — fetch registry on every request     │
│  Sidebar = all registry rows                             │
│  Project page = registry row + parsed schema doc         │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
              Vercel (auto-deploy on push to main)
```

**Key principle:** No rebuild needed when a new project is documented. Server components fetch live from the registry on every page visit — the new project appears in the sidebar immediately.

---

## Registry Schema

New dedicated Supabase project: **op-dashboard-registry**

```sql
CREATE TABLE dashboard_projects (
  project_id          text PRIMARY KEY,        -- Supabase ref (e.g. bpblxplot...)
  name                text NOT NULL,           -- e.g. "olympic-paints-backend"
  region              text,                    -- e.g. "eu-north-1"
  table_count         integer,                 -- total tables at last documentation
  subsystems          jsonb,                   -- ["vd_*", "store_visit_*", ...]
  phases              jsonb,                   -- ["schema", "rls", "ui", ...]
  schema_doc_path     text,                    -- "docs/supabase-schema.md"
  spec_paths          jsonb,                   -- links to design spec files
  last_documented_at  timestamptz DEFAULT now(),
  rls_clean           boolean DEFAULT false    -- true once no critical RLS advisories
);
```

RLS: enabled, public read, authenticated write (same pattern as olympic-paints-backend).

### Phase values

| Phase | Meaning |
|-------|---------|
| `schema` | `supabase-schema.md` written |
| `rls` | RLS policies applied, no critical advisories |
| `ui` | Dashboard page built for this project |
| `spec` | At least one design spec in `docs/superpowers/specs/` |
| `deployed` | Project live in production |
| `tested` | Tests written and passing |

---

## Skill Update

The existing "document Supabase project" skill gains one step at the end:

**Step ④ — Upsert to registry:**
- Connect to the registry project using `REGISTRY_SUPABASE_URL` + service role key
- Derive `subsystems` from table name prefixes automatically (e.g. all tables starting `vd_` → `"vd_*"`)
- Set `phases` based on what was completed in this run (`schema` always added; `rls` added if no critical advisories remain)
- Set `rls_clean = true` if `get_advisors` returns no critical RLS findings
- Scan `docs/superpowers/specs/` for all `.md` files → populate `spec_paths` with their relative paths (include all specs found; filtering by project is deferred to the detail page)
- Upsert with `ON CONFLICT (project_id) DO UPDATE SET ...` so re-running is safe

---

## Dashboard — Folder Structure

```
olympic-paints-kaizen/
├── dashboard/                        ← Next.js app (new)
│   ├── app/
│   │   ├── layout.tsx                ← sidebar shell
│   │   ├── page.tsx                  ← home: all projects as cards
│   │   └── [projectId]/
│   │       └── page.tsx              ← project detail page
│   ├── lib/
│   │   └── registry.ts               ← Supabase registry client + fetch helpers
│   └── components/
│       ├── Sidebar.tsx
│       ├── ProjectCard.tsx
│       ├── PhaseStatus.tsx
│       ├── SubsystemBadge.tsx
│       ├── TableList.tsx
│       └── SpecLinks.tsx
├── docs/
│   └── supabase-schema.md            ← already exists
└── memory/                           ← already exists
```

---

## Pages

### Home (`/`)
- Fetches all rows from `dashboard_projects` ordered by `last_documented_at DESC`
- Renders each as a `ProjectCard` — name, region, table count, last documented date, phase badges, subsystem tags
- Empty state if no projects documented yet

### Project detail (`/[projectId]`)
- Fetches single registry row by `project_id`
- Reads `schema_doc_path` from registry → renders parsed schema doc sections (sub-systems, tables, RLS status)
- Sections: Build phases · Sub-systems · Tables (name + subsystem + RLS) · Spec links
- 404 if project not in registry

---

## Components

| Component | Purpose |
|-----------|---------|
| `Sidebar` | Fetches all registry rows, renders nav links. Active project highlighted. |
| `ProjectCard` | Home page card — name, table count, phase badges, subsystem tags. |
| `PhaseStatus` | Renders phases array as coloured badges: ✓ green / ⟳ yellow / ○ grey. |
| `SubsystemBadge` | Small coloured tag for each table prefix group. |
| `TableList` | Table name + subsystem label + RLS indicator. Used on project detail page. |
| `SpecLinks` | Renders `spec_paths` array as clickable links to markdown files. |

---

## Environment Variables

```
# Set in .env.local for local dev, and in Vercel dashboard for production
NEXT_PUBLIC_REGISTRY_URL=https://<ref>.supabase.co
NEXT_PUBLIC_REGISTRY_ANON_KEY=<publishable anon key>
```

The skill uses the Supabase MCP (already authenticated via service role) to write to the registry — no additional skill-side env vars needed beyond configuring the MCP to point at the registry project.

---

## Deployment

- **Local dev:** `cd dashboard && npm install && npm run dev` → http://localhost:3000
- **Vercel:** Root directory set to `dashboard/`, framework Next.js, env vars added in Vercel dashboard, auto-deploys on push to main

---

## Out of Scope

- Editing phase status manually from the dashboard (phases are set by the skill only)
- Per-table drill-down pages (table list on project page is sufficient)
- Authentication / access control on the dashboard (read-only, anon key is fine)
- Dark mode
