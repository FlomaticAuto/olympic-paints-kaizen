import Link from 'next/link'
import { getAllProjects, getAllNotionDashboards } from '@/lib/registry'
import { SidebarNav } from './SidebarNav'

export async function Sidebar() {
  const [projects, notionDashboards] = await Promise.all([
    getAllProjects(),
    getAllNotionDashboards(),
  ])
  return (
    <aside className="w-56 shrink-0 bg-slate-900 min-h-screen flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <Link href="/" className="text-sm font-bold text-white hover:text-slate-200">
          Build Dashboard
        </Link>
      </div>
      <SidebarNav projects={projects} notionDashboards={notionDashboards} />
    </aside>
  )
}
