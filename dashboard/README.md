# Olympic Paints Build Dashboard

Live: **https://op-dashboard-eight.vercel.app**

A Next.js 16 server-component app that tracks the build state of every Olympic Paints
project. It reads live from a dedicated Supabase project (`op-dashboard-registry`,
ref `ggjjvixcdsmivzrwldvc`) on every request, so new entries appear on the next page
visit with no rebuild.

## Two surfaces, two tables

| Route | Shows | Backed by | How to add/update content |
|---|---|---|---|
| `/` (and `/[projectId]`) | Supabase projects, their build phases, sub-systems, spec links | `dashboard_projects` | **Skill: `document-supabase-project`** |
| `/notion`, `/notion/[slug]`, `/notion/[slug]/[pageSlug]` | Dashboards and their pages — long-form Markdown docs migrated from Notion | `notion_dashboards` + `notion_pages` | **Skill: `add-dashboard-doc`** |

**To update content on either surface, invoke the matching skill — do not write SQL by
hand.** Each skill has its own `SKILL.md` with the exact insert/upsert templates,
verification steps, and conventions. Editing the dashboard means editing this Next.js
code; editing the *data shown by* the dashboard means running one of the skills.

## Local development

```bash
cd dashboard
npm install
npm run dev
```

Requires `.env.local` with:

```
NEXT_PUBLIC_REGISTRY_URL=https://ggjjvixcdsmivzrwldvc.supabase.co
NEXT_PUBLIC_REGISTRY_ANON_KEY=sb_publishable_Dut3yj10QKqJ4JpyXTnzvQ_c9LRvxtc
```

The anon key is read-only (RLS allows SELECT for everyone; writes require the service
role used by the skills).

## Deploy

`vercel deploy --prod --yes` from this directory. The Vercel project is linked
(`flomaticautos-projects/op-dashboard`) — no further config needed. Production env
vars are already set in Vercel for `NEXT_PUBLIC_REGISTRY_URL` and
`NEXT_PUBLIC_REGISTRY_ANON_KEY`.

Pushes to `main` also auto-deploy via Vercel's GitHub integration.

## Architecture

```
┌──────────────────────────┐         ┌──────────────────────────┐
│  Skills (Claude Code)    │ writes  │  op-dashboard-registry   │
│                          │ ──────▶ │  (Supabase, eu-north-1)  │
│  document-supabase-project          │                          │
│  add-dashboard-doc       │         │  dashboard_projects      │
└──────────────────────────┘         │  notion_dashboards       │
                                     │  notion_pages            │
                                     └────────────┬─────────────┘
                                                  │ anon key (SELECT only)
                                                  ▼
                                     ┌──────────────────────────┐
                                     │  Next.js server comps    │
                                     │  (dynamic = force-       │
                                     │   dynamic, no caching)   │
                                     └────────────┬─────────────┘
                                                  ▼
                                     ┌──────────────────────────┐
                                     │  Vercel production       │
                                     │  op-dashboard-eight      │
                                     │  .vercel.app             │
                                     └──────────────────────────┘
```

## Key files

- `lib/registry.ts` — Supabase client + fetch helpers (`getAllProjects`,
  `getAllNotionDashboards`, `getNotionDashboardBySlug`, `getNotionPageBySlug`)
- `lib/types.ts` — `DashboardProject`, `NotionDashboard`, `NotionPage`, `notionSlug()`
- `components/Markdown.tsx` — `react-markdown` + `remark-gfm` renderer, brand-styled
- `components/Sidebar.tsx` + `SidebarNav.tsx` — combined navigation for both surfaces
- `app/notion/[slug]/page.tsx` — dashboard detail (full body + child page grid)
- `app/notion/[slug]/[pageSlug]/page.tsx` — page detail (body + prev/next nav)
