# Build Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Notion-style project hub at `olympic-paints-kaizen/dashboard/` that tracks the build state of every documented Supabase project, auto-updating when the skill runs.

**Architecture:** A Next.js app with server components fetches live from a dedicated Supabase registry project (`op-dashboard-registry`) on every request. A sidebar lists all projects; each project has a detail page showing build phases, sub-systems, tables, and spec links. The existing "document Supabase project" skill gains one extra step that upserts a row into the registry after documentation runs.

**Tech Stack:** Next.js 14 (App Router), Tailwind CSS, `@supabase/supabase-js`, TypeScript, Vercel

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `dashboard/package.json` | Create | Next.js + Tailwind + Supabase dependencies |
| `dashboard/next.config.ts` | Create | Next.js config |
| `dashboard/tailwind.config.ts` | Create | Tailwind config |
| `dashboard/postcss.config.mjs` | Create | PostCSS for Tailwind |
| `dashboard/.env.local` | Create | Registry URL + anon key (gitignored) |
| `dashboard/app/globals.css` | Create | Tailwind base styles |
| `dashboard/app/layout.tsx` | Create | Root layout with Sidebar |
| `dashboard/app/page.tsx` | Create | Home page — all projects as cards |
| `dashboard/app/[projectId]/page.tsx` | Create | Project detail page |
| `dashboard/lib/registry.ts` | Create | Supabase client + typed fetch helpers |
| `dashboard/lib/types.ts` | Create | Shared TypeScript types |
| `dashboard/components/Sidebar.tsx` | Create | Nav sidebar fetching all projects |
| `dashboard/components/ProjectCard.tsx` | Create | Card used on home page |
| `dashboard/components/PhaseStatus.tsx` | Create | Phase badge renderer |
| `dashboard/components/SubsystemBadge.tsx` | Create | Sub-system tag |
| `dashboard/components/TableList.tsx` | Create | Table name + subsystem + RLS indicator |
| `dashboard/components/SpecLinks.tsx` | Create | Clickable spec file links |
| `.gitignore` (repo root) | Modify | Add `dashboard/.env.local` |

---

## Task 1: Create the registry Supabase project and table

**Files:** None in repo — done via Supabase MCP.

- [ ] **Step 1: Create the registry project via MCP**

  In Claude, run:
  ```
  Create a new Supabase project named "op-dashboard-registry" in organisation znszbuvdpydqwsqxzjxd, region eu-north-1.
  ```
  Save the returned `project_id` (ref) — you'll need it for env vars.

- [ ] **Step 2: Create the `dashboard_projects` table**

  Run via Supabase MCP `execute_sql` on the new registry project:
  ```sql
  CREATE TABLE dashboard_projects (
    project_id          text PRIMARY KEY,
    name                text NOT NULL,
    region              text,
    table_count         integer,
    subsystems          jsonb,
    phases              jsonb DEFAULT '[]'::jsonb,
    schema_doc_path     text,
    spec_paths          jsonb DEFAULT '[]'::jsonb,
    last_documented_at  timestamptz DEFAULT now(),
    rls_clean           boolean DEFAULT false
  );
  ```

- [ ] **Step 3: Enable RLS with public read policy**

  ```sql
  ALTER TABLE dashboard_projects ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "public_read_dashboard_projects"
    ON dashboard_projects FOR SELECT
    USING (true);

  CREATE POLICY "service_write_dashboard_projects"
    ON dashboard_projects FOR ALL
    TO authenticated
    USING (true) WITH CHECK (true);
  ```

- [ ] **Step 4: Seed olympic-paints-backend row to verify**

  ```sql
  INSERT INTO dashboard_projects (
    project_id, name, region, table_count,
    subsystems, phases, schema_doc_path, spec_paths, rls_clean
  ) VALUES (
    'bpblxplotublqsecdkcb',
    'olympic-paints-backend',
    'eu-north-1',
    24,
    '["vd_*", "store_visit_*", "voice_order_*", "haven_*", "form_*", "ci_*", "whatsapp_*"]',
    '["schema", "rls"]',
    'docs/supabase-schema.md',
    '["docs/superpowers/specs/2026-05-29-voice-ordering-design.md", "docs/superpowers/specs/2026-06-23-build-dashboard-design.md"]',
    true
  );

  SELECT * FROM dashboard_projects;
  ```
  Expected: 1 row returned.

- [ ] **Step 5: Get the publishable anon key**

  Via MCP: `get_publishable_keys` for the registry project. Save the anon key — used in Task 2.

---

## Task 2: Scaffold the Next.js app

**Files:**
- Create: `dashboard/package.json`
- Create: `dashboard/next.config.ts`
- Create: `dashboard/tailwind.config.ts`
- Create: `dashboard/postcss.config.mjs`
- Create: `dashboard/.env.local`
- Create: `dashboard/app/globals.css`
- Modify: `.gitignore`

- [ ] **Step 1: Scaffold Next.js with Tailwind**

  ```bash
  cd C:\Users\quint\olympic-paints-kaizen
  npx create-next-app@latest dashboard --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
  ```
  When prompted, accept all defaults.

- [ ] **Step 2: Install Supabase client**

  ```bash
  cd dashboard
  npm install @supabase/supabase-js
  ```

- [ ] **Step 3: Create `.env.local`**

  Create `dashboard/.env.local`:
  ```
  NEXT_PUBLIC_REGISTRY_URL=https://<registry-project-ref>.supabase.co
  NEXT_PUBLIC_REGISTRY_ANON_KEY=<anon-key-from-task-1-step-5>
  ```
  Replace `<registry-project-ref>` and `<anon-key-from-task-1-step-5>` with actual values.

- [ ] **Step 4: Add `.env.local` to root `.gitignore`**

  Open `C:\Users\quint\olympic-paints-kaizen\.gitignore` (create if missing) and add:
  ```
  dashboard/.env.local
  dashboard/.next/
  dashboard/node_modules/
  ```

- [ ] **Step 5: Delete the create-next-app boilerplate**

  Delete `dashboard/app/page.tsx` and `dashboard/app/globals.css` content — you'll replace them in later tasks. Keep the file structure intact.

- [ ] **Step 6: Verify the app starts**

  ```bash
  cd dashboard
  npm run dev
  ```
  Expected: `▲ Next.js 14.x.x` running at http://localhost:3000 with no errors (blank page is fine).

- [ ] **Step 7: Commit**

  ```bash
  cd C:\Users\quint\olympic-paints-kaizen
  git add dashboard/ .gitignore
  git commit -m "feat: scaffold Next.js dashboard app with Tailwind and Supabase"
  ```

---

## Task 3: Types and registry client

**Files:**
- Create: `dashboard/lib/types.ts`
- Create: `dashboard/lib/registry.ts`

- [ ] **Step 1: Create shared types**

  Create `dashboard/lib/types.ts`:
  ```typescript
  export type Phase = 'schema' | 'rls' | 'ui' | 'spec' | 'deployed' | 'tested'

  export interface DashboardProject {
    project_id: string
    name: string
    region: string | null
    table_count: number | null
    subsystems: string[] | null
    phases: Phase[] | null
    schema_doc_path: string | null
    spec_paths: string[] | null
    last_documented_at: string
    rls_clean: boolean
  }
  ```

- [ ] **Step 2: Create registry client**

  Create `dashboard/lib/registry.ts`:
  ```typescript
  import { createClient } from '@supabase/supabase-js'
  import type { DashboardProject } from './types'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_REGISTRY_URL!,
    process.env.NEXT_PUBLIC_REGISTRY_ANON_KEY!
  )

  export async function getAllProjects(): Promise<DashboardProject[]> {
    const { data, error } = await supabase
      .from('dashboard_projects')
      .select('*')
      .order('last_documented_at', { ascending: false })

    if (error) throw new Error(`Registry fetch failed: ${error.message}`)
    return data ?? []
  }

  export async function getProject(projectId: string): Promise<DashboardProject | null> {
    const { data, error } = await supabase
      .from('dashboard_projects')
      .select('*')
      .eq('project_id', projectId)
      .single()

    if (error?.code === 'PGRST116') return null
    if (error) throw new Error(`Registry fetch failed: ${error.message}`)
    return data
  }
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  cd dashboard
  npx tsc --noEmit
  ```
  Expected: No errors.

- [ ] **Step 4: Commit**

  ```bash
  cd C:\Users\quint\olympic-paints-kaizen
  git add dashboard/lib/
  git commit -m "feat: add registry Supabase client and shared types"
  ```

---

## Task 4: PhaseStatus component

**Files:**
- Create: `dashboard/components/PhaseStatus.tsx`

- [ ] **Step 1: Create the component**

  Create `dashboard/components/PhaseStatus.tsx`:
  ```typescript
  import type { Phase } from '@/lib/types'

  const PHASE_LABELS: Record<Phase, string> = {
    schema: 'Schema documented',
    rls: 'RLS applied',
    ui: 'UI built',
    spec: 'Spec written',
    deployed: 'Deployed',
    tested: 'Tested',
  }

  const ALL_PHASES: Phase[] = ['schema', 'rls', 'spec', 'ui', 'tested', 'deployed']

  function phaseBadgeClass(phase: Phase, completed: Phase[]): string {
    if (completed.includes(phase)) {
      return 'bg-green-100 text-green-800'
    }
    return 'bg-gray-100 text-gray-400'
  }

  function phasePrefix(phase: Phase, completed: Phase[]): string {
    return completed.includes(phase) ? '✓ ' : '○ '
  }

  interface Props {
    phases: Phase[] | null
  }

  export function PhaseStatus({ phases }: Props) {
    const completed = phases ?? []
    return (
      <div className="flex flex-wrap gap-2">
        {ALL_PHASES.map((phase) => (
          <span
            key={phase}
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${phaseBadgeClass(phase, completed)}`}
          >
            {phasePrefix(phase, completed)}{PHASE_LABELS[phase]}
          </span>
        ))}
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  cd dashboard && npx tsc --noEmit
  ```
  Expected: No errors.

- [ ] **Step 3: Commit**

  ```bash
  cd C:\Users\quint\olympic-paints-kaizen
  git add dashboard/components/PhaseStatus.tsx
  git commit -m "feat: add PhaseStatus badge component"
  ```

---

## Task 5: SubsystemBadge component

**Files:**
- Create: `dashboard/components/SubsystemBadge.tsx`

- [ ] **Step 1: Create the component**

  Create `dashboard/components/SubsystemBadge.tsx`:
  ```typescript
  interface Props {
    subsystem: string
  }

  export function SubsystemBadge({ subsystem }: Props) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
        {subsystem}
      </span>
    )
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  cd C:\Users\quint\olympic-paints-kaizen
  git add dashboard/components/SubsystemBadge.tsx
  git commit -m "feat: add SubsystemBadge component"
  ```

---

## Task 6: SpecLinks component

**Files:**
- Create: `dashboard/components/SpecLinks.tsx`

- [ ] **Step 1: Create the component**

  Create `dashboard/components/SpecLinks.tsx`:
  ```typescript
  interface Props {
    specPaths: string[] | null
  }

  export function SpecLinks({ specPaths }: Props) {
    if (!specPaths || specPaths.length === 0) {
      return <p className="text-sm text-gray-400">No specs yet.</p>
    }

    return (
      <ul className="space-y-1">
        {specPaths.map((path) => {
          const filename = path.split('/').pop() ?? path
          return (
            <li key={path}>
              <span className="text-sm font-mono text-indigo-600">{filename}</span>
              <span className="text-xs text-gray-400 ml-2">{path}</span>
            </li>
          )
        })}
      </ul>
    )
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  cd C:\Users\quint\olympic-paints-kaizen
  git add dashboard/components/SpecLinks.tsx
  git commit -m "feat: add SpecLinks component"
  ```

---

## Task 7: TableList component

**Files:**
- Create: `dashboard/components/TableList.tsx`

- [ ] **Step 1: Create the component**

  Create `dashboard/components/TableList.tsx`:
  ```typescript
  export interface TableRow {
    name: string
    subsystem: string
    rls_enabled: boolean
  }

  interface Props {
    tables: TableRow[]
  }

  export function TableList({ tables }: Props) {
    if (tables.length === 0) {
      return <p className="text-sm text-gray-400">No tables found.</p>
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-4 font-medium text-gray-500">Table</th>
              <th className="text-left py-2 pr-4 font-medium text-gray-500">Sub-system</th>
              <th className="text-left py-2 font-medium text-gray-500">RLS</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((t) => (
              <tr key={t.name} className="border-b border-gray-100">
                <td className="py-2 pr-4 font-mono text-gray-800">{t.name}</td>
                <td className="py-2 pr-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                    {t.subsystem}
                  </span>
                </td>
                <td className="py-2">
                  {t.rls_enabled ? (
                    <span className="text-green-600 font-medium">✓</span>
                  ) : (
                    <span className="text-red-500 font-medium">✗</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  cd C:\Users\quint\olympic-paints-kaizen
  git add dashboard/components/TableList.tsx
  git commit -m "feat: add TableList component"
  ```

---

## Task 8: ProjectCard component

**Files:**
- Create: `dashboard/components/ProjectCard.tsx`

- [ ] **Step 1: Create the component**

  Create `dashboard/components/ProjectCard.tsx`:
  ```typescript
  import Link from 'next/link'
  import type { DashboardProject } from '@/lib/types'
  import { PhaseStatus } from './PhaseStatus'
  import { SubsystemBadge } from './SubsystemBadge'

  interface Props {
    project: DashboardProject
  }

  export function ProjectCard({ project }: Props) {
    const docDate = new Date(project.last_documented_at).toLocaleDateString('en-ZA', {
      year: 'numeric', month: 'short', day: 'numeric',
    })

    return (
      <Link href={`/${project.project_id}`} className="block">
        <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-indigo-300 hover:shadow-sm transition-all">
          <div className="mb-1">
            <h2 className="text-base font-semibold text-gray-900">{project.name}</h2>
            <p className="text-xs text-gray-400">
              {project.region} · {project.table_count ?? 0} tables · {docDate}
            </p>
          </div>

          <div className="mt-3 mb-3">
            <PhaseStatus phases={project.phases} />
          </div>

          {project.subsystems && project.subsystems.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {project.subsystems.slice(0, 5).map((s) => (
                <SubsystemBadge key={s} subsystem={s} />
              ))}
              {project.subsystems.length > 5 && (
                <span className="text-xs text-gray-400 self-center">
                  +{project.subsystems.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
    )
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  cd dashboard && npx tsc --noEmit
  ```
  Expected: No errors.

- [ ] **Step 3: Commit**

  ```bash
  cd C:\Users\quint\olympic-paints-kaizen
  git add dashboard/components/ProjectCard.tsx
  git commit -m "feat: add ProjectCard component"
  ```

---

## Task 9: Sidebar component

**Files:**
- Create: `dashboard/components/Sidebar.tsx`

- [ ] **Step 1: Create the component**

  Create `dashboard/components/Sidebar.tsx`:
  ```typescript
  import Link from 'next/link'
  import { getAllProjects } from '@/lib/registry'

  export async function Sidebar({ activeProjectId }: { activeProjectId?: string }) {
    const projects = await getAllProjects()

    return (
      <aside className="w-56 shrink-0 bg-slate-900 min-h-screen flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <span className="text-sm font-bold text-white">Build Dashboard</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-2">
            Projects
          </p>
          {projects.map((p) => (
            <Link
              key={p.project_id}
              href={`/${p.project_id}`}
              className={`block px-3 py-2 rounded text-sm transition-colors ${
                p.project_id === activeProjectId
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {p.name}
            </Link>
          ))}
          {projects.length === 0 && (
            <p className="px-2 text-xs text-slate-600 italic">No projects yet</p>
          )}
        </nav>
      </aside>
    )
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  cd dashboard && npx tsc --noEmit
  ```
  Expected: No errors.

- [ ] **Step 3: Commit**

  ```bash
  cd C:\Users\quint\olympic-paints-kaizen
  git add dashboard/components/Sidebar.tsx
  git commit -m "feat: add Sidebar server component"
  ```

---

## Task 10: Root layout and globals

**Files:**
- Modify: `dashboard/app/globals.css`
- Modify: `dashboard/app/layout.tsx`

- [ ] **Step 1: Replace globals.css**

  Replace the contents of `dashboard/app/globals.css` with:
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```

- [ ] **Step 2: Replace layout.tsx**

  Replace the contents of `dashboard/app/layout.tsx` with:
  ```typescript
  import type { Metadata } from 'next'
  import { Inter } from 'next/font/google'
  import './globals.css'
  import { Sidebar } from '@/components/Sidebar'

  const inter = Inter({ subsets: ['latin'] })

  export const metadata: Metadata = {
    title: 'Build Dashboard',
    description: 'Olympic Paints Supabase project tracker',
  }

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en">
        <body className={`${inter.className} bg-gray-50`}>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 p-8 overflow-auto">
              {children}
            </main>
          </div>
        </body>
      </html>
    )
  }
  ```

- [ ] **Step 3: Verify the app renders**

  ```bash
  cd dashboard && npm run dev
  ```
  Open http://localhost:3000. Expected: Dark sidebar on the left with "Build Dashboard" header and "olympic-paints-backend" listed. No errors in terminal.

- [ ] **Step 4: Commit**

  ```bash
  cd C:\Users\quint\olympic-paints-kaizen
  git add dashboard/app/globals.css dashboard/app/layout.tsx
  git commit -m "feat: add root layout with sidebar"
  ```

---

## Task 11: Home page

**Files:**
- Modify: `dashboard/app/page.tsx`

- [ ] **Step 1: Replace page.tsx**

  Replace the contents of `dashboard/app/page.tsx` with:
  ```typescript
  import { getAllProjects } from '@/lib/registry'
  import { ProjectCard } from '@/components/ProjectCard'

  export const dynamic = 'force-dynamic'

  export default async function HomePage() {
    const projects = await getAllProjects()

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">All Projects</h1>
        <p className="text-sm text-gray-500 mb-8">
          {projects.length} project{projects.length !== 1 ? 's' : ''} documented
        </p>

        {projects.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-lg font-medium">No projects documented yet.</p>
            <p className="text-sm mt-2">Run the "document Supabase project" skill to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((p) => (
              <ProjectCard key={p.project_id} project={p} />
            ))}
          </div>
        )}
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify home page renders**

  With `npm run dev` running, open http://localhost:3000.
  Expected: Grid of project cards — at minimum "olympic-paints-backend" with green `schema` and `rls` badges and indigo subsystem tags.

- [ ] **Step 3: Commit**

  ```bash
  cd C:\Users\quint\olympic-paints-kaizen
  git add dashboard/app/page.tsx
  git commit -m "feat: add home page with project card grid"
  ```

---

## Task 12: Project detail page

**Files:**
- Create: `dashboard/app/[projectId]/page.tsx`

- [ ] **Step 1: Create the detail page**

  Create `dashboard/app/[projectId]/page.tsx`:
  ```typescript
  import { notFound } from 'next/navigation'
  import { getProject } from '@/lib/registry'
  import { PhaseStatus } from '@/components/PhaseStatus'
  import { SubsystemBadge } from '@/components/SubsystemBadge'
  import { SpecLinks } from '@/components/SpecLinks'
  import { TableList } from '@/components/TableList'
  import type { TableRow } from '@/components/TableList'

  export const dynamic = 'force-dynamic'

  function deriveTablesFromSubsystems(subsystems: string[] | null): TableRow[] {
    if (!subsystems) return []
    return subsystems.map((s) => ({
      name: s,
      subsystem: s,
      rls_enabled: true,
    }))
  }

  interface Props {
    params: { projectId: string }
  }

  export default async function ProjectPage({ params }: Props) {
    const project = await getProject(params.projectId)
    if (!project) notFound()

    const docDate = new Date(project.last_documented_at).toLocaleDateString('en-ZA', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

    const tables = deriveTablesFromSubsystems(project.subsystems)

    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        <p className="text-sm text-gray-400 mt-1 mb-8">
          {project.region} · Postgres · {project.table_count ?? 0} tables · Last documented {docDate}
        </p>

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Build Phases</h2>
          <PhaseStatus phases={project.phases} />
        </section>

        {project.subsystems && project.subsystems.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Sub-systems ({project.subsystems.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {project.subsystems.map((s) => (
                <SubsystemBadge key={s} subsystem={s} />
              ))}
            </div>
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Sub-system overview
          </h2>
          <TableList tables={tables} />
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Spec Links</h2>
          <SpecLinks specPaths={project.spec_paths} />
        </section>
      </div>
    )
  }
  ```

- [ ] **Step 2: Update Sidebar to pass activeProjectId**

  Open `dashboard/app/layout.tsx` — the sidebar currently has no active state. Since layout doesn't have access to params, update the sidebar to use `usePathname` on the client. Replace `dashboard/components/Sidebar.tsx` with:

  ```typescript
  import Link from 'next/link'
  import { getAllProjects } from '@/lib/registry'
  import { SidebarNav } from './SidebarNav'

  export async function Sidebar() {
    const projects = await getAllProjects()
    return (
      <aside className="w-56 shrink-0 bg-slate-900 min-h-screen flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <Link href="/" className="text-sm font-bold text-white hover:text-slate-200">
            Build Dashboard
          </Link>
        </div>
        <SidebarNav projects={projects} />
      </aside>
    )
  }
  ```

- [ ] **Step 3: Create SidebarNav client component**

  Create `dashboard/components/SidebarNav.tsx`:
  ```typescript
  'use client'

  import Link from 'next/link'
  import { usePathname } from 'next/navigation'
  import type { DashboardProject } from '@/lib/types'

  interface Props {
    projects: DashboardProject[]
  }

  export function SidebarNav({ projects }: Props) {
    const pathname = usePathname()

    return (
      <nav className="flex-1 p-3 space-y-0.5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-2">
          Projects
        </p>
        {projects.map((p) => {
          const isActive = pathname === `/${p.project_id}`
          return (
            <Link
              key={p.project_id}
              href={`/${p.project_id}`}
              className={`block px-3 py-2 rounded text-sm transition-colors ${
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {p.name}
            </Link>
          )
        })}
        {projects.length === 0 && (
          <p className="px-2 text-xs text-slate-600 italic">No projects yet</p>
        )}
      </nav>
    )
  }
  ```

- [ ] **Step 4: Verify detail page renders**

  With `npm run dev` running, open http://localhost:3000/bpblxplotublqsecdkcb.
  Expected: "olympic-paints-backend" heading, phase badges (schema ✓, rls ✓, rest grey), sub-system badges, spec links. Sidebar highlights this project.

- [ ] **Step 5: Verify 404 for unknown project**

  Open http://localhost:3000/doesnotexist.
  Expected: Next.js 404 page.

- [ ] **Step 6: Commit**

  ```bash
  cd C:\Users\quint\olympic-paints-kaizen
  git add dashboard/app/[projectId]/ dashboard/components/Sidebar.tsx dashboard/components/SidebarNav.tsx
  git commit -m "feat: add project detail page and active sidebar nav"
  ```

---

## Task 13: Update the Supabase documentation skill

**Files:**
- Modify: `C:\Users\quint\.claude\projects\c--Users-quint-OneDrive\memory\` (skill update is via CLAUDE.md or skill file — locate the skill first)

This task adds Step ④ to the existing "document Supabase project" skill so it upserts a registry row after every documentation run.

- [ ] **Step 1: Locate the skill file**

  In Claude, use the Grep tool to find the skill:
  ```
  Search for "document.*supabase" (case insensitive) across C:\Users\quint\.claude\
  ```
  Alternatively, check `C:\Users\quint\.claude\projects\c--Users-quint-OneDrive\memory\` for the relevant skill or CLAUDE.md file that defines the documentation flow.

- [ ] **Step 2: Add the registry upsert instruction to the skill**

  After the existing RLS step, add the following instruction block:

  ```markdown
  ## Step 4 — Register in build dashboard

  After completing documentation and RLS, upsert a row into the `dashboard_projects` table
  in the registry Supabase project (op-dashboard-registry).

  **Derive subsystems:** From the table list, extract unique prefixes by taking the text
  before the first `_` for each table name, then appending `_*`
  (e.g. `vd_products` → `vd_*`). Deduplicate. Tables with no underscore use their full name.

  **Derive phases:** Always include `"schema"`. Include `"rls"` if `get_advisors` returned
  no critical RLS findings. Include `"spec"` if any `.md` files exist in
  `docs/superpowers/specs/`.

  **Collect spec_paths:** List all `.md` file paths found in `docs/superpowers/specs/`
  relative to the repo root.

  **SQL to execute via MCP on the registry project:**
  ```sql
  INSERT INTO dashboard_projects (
    project_id, name, region, table_count,
    subsystems, phases, schema_doc_path, spec_paths,
    last_documented_at, rls_clean
  ) VALUES (
    '<project_id>', '<name>', '<region>', <table_count>,
    '<subsystems_json>'::jsonb, '<phases_json>'::jsonb,
    'docs/supabase-schema.md', '<spec_paths_json>'::jsonb,
    now(), <rls_clean_bool>
  )
  ON CONFLICT (project_id) DO UPDATE SET
    name = EXCLUDED.name,
    region = EXCLUDED.region,
    table_count = EXCLUDED.table_count,
    subsystems = EXCLUDED.subsystems,
    phases = EXCLUDED.phases,
    schema_doc_path = EXCLUDED.schema_doc_path,
    spec_paths = EXCLUDED.spec_paths,
    last_documented_at = EXCLUDED.last_documented_at,
    rls_clean = EXCLUDED.rls_clean;
  ```
  ```

- [ ] **Step 3: Test the skill update**

  Run the "document Supabase project" skill on any existing project (e.g. TradeCraft).
  Expected: Row appears or updates in `dashboard_projects`. Visit http://localhost:3000 — new project card appears in the grid without any code change.

- [ ] **Step 4: Commit**

  ```bash
  cd C:\Users\quint\olympic-paints-kaizen
  git add .
  git commit -m "feat: update supabase documentation skill to register in build dashboard"
  ```

---

## Task 14: Deploy to Vercel

**Files:** None in repo — Vercel configuration only.

- [ ] **Step 1: Push to GitHub**

  ```bash
  cd C:\Users\quint\olympic-paints-kaizen
  git push origin main
  ```

- [ ] **Step 2: Create Vercel project**

  - Go to vercel.com → New Project → Import `olympic-paints-kaizen`
  - Set **Root Directory** to `dashboard`
  - Framework: Next.js (auto-detected)
  - Click Deploy

- [ ] **Step 3: Add environment variables in Vercel**

  In Vercel project Settings → Environment Variables, add:
  ```
  NEXT_PUBLIC_REGISTRY_URL     = https://<registry-ref>.supabase.co
  NEXT_PUBLIC_REGISTRY_ANON_KEY = <anon-key>
  ```

- [ ] **Step 4: Trigger a redeploy**

  In Vercel dashboard, click Redeploy. Once complete, open the Vercel URL.
  Expected: Dashboard loads with olympic-paints-backend in the sidebar and on the home page.

- [ ] **Step 5: Update olympic-paints-backend registry row with `ui` phase**

  Now that the dashboard UI is built, mark the phase complete via MCP on the registry project:
  ```sql
  UPDATE dashboard_projects
  SET phases = phases || '["ui"]'::jsonb
  WHERE project_id = 'bpblxplotublqsecdkcb'
    AND NOT (phases @> '["ui"]'::jsonb);
  ```

- [ ] **Step 6: Final commit**

  ```bash
  cd C:\Users\quint\olympic-paints-kaizen
  git add .
  git commit -m "feat: dashboard live on Vercel — mark ui phase complete"
  ```
