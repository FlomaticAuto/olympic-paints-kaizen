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
