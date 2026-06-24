<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Build Dashboard — Agent Rules

This Next.js app reads from `op-dashboard-registry` (Supabase project `ggjjvixcdsmivzrwldvc`).
**Do NOT modify content shown on the dashboard from this repo.** Content lives in Supabase.

## When asked to add/update content

| Request | What to do |
|---|---|
| "Add Supabase project X to the dashboard" | Invoke skill `document-supabase-project` |
| "Update phases for project X" | Invoke skill `document-supabase-project` (idempotent upsert) |
| "Document the X dashboard" / "add the Y dashboard to /notion" | Invoke skill `add-dashboard-doc` |
| "Update the docs for page Z" | Invoke skill `add-dashboard-doc` |
| "Migrate this Notion page into the build dashboard" | Invoke skill `add-dashboard-doc` |

Do NOT write the upsert SQL by hand from memory — the skills carry the current schema,
the verification steps, and the slug conventions. They also tell you which table to
write to and how to derive sub-fields like `subsystems` or `sections`.

## When asked to change the UI itself

That IS a code change in this repo. Standard rules apply:

- Server components use `export const dynamic = 'force-dynamic'` so changes to data
  show up immediately — only rebuild for code changes.
- All UI uses Tailwind v3 (no additional component library). Match the existing patterns
  in `components/`.
- Markdown bodies render through `components/Markdown.tsx` (react-markdown + remark-gfm).
  If you need a new Markdown feature (footnotes, task lists, etc.), extend that component
  rather than introducing a second renderer.
- The `notionSlug()` helper in `lib/types.ts` derives the URL slug from the `notion_url`
  column. Both surfaces share this — don't fork it.

## Schema reference

See the `add-dashboard-doc` SKILL.md ("The tables" section) for the canonical schema of
`notion_dashboards` and `notion_pages`, including the `parse_markdown_sections()`
Postgres function that auto-derives the `sections` JSONB column.

See the `document-supabase-project` SKILL.md for `dashboard_projects` schema and the
phase vocabulary (`schema`, `rls`, `spec`, `ui`, `tested`, `deployed`).
