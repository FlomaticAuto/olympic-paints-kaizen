'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { DashboardProject, NotionDashboard } from '@/lib/types'
import { notionSlug } from '@/lib/types'

interface Props {
  projects: DashboardProject[]
  notionDashboards: NotionDashboard[]
}

export function SidebarNav({ projects, notionDashboards }: Props) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
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

      <div className="pt-4">
        <Link
          href="/notion"
          className={`block px-2 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
            pathname === '/notion' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Notion Dashboards
        </Link>
        {notionDashboards.map((d) => {
          const slug = notionSlug(d.notion_url)
          const isActive = pathname === `/notion/${slug}`
          return (
            <Link
              key={d.notion_url}
              href={`/notion/${slug}`}
              className={`block px-3 py-2 rounded text-sm transition-colors ${
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {d.name}
            </Link>
          )
        })}
        {notionDashboards.length === 0 && (
          <p className="px-2 text-xs text-slate-600 italic">No Notion data</p>
        )}
      </div>
    </nav>
  )
}
