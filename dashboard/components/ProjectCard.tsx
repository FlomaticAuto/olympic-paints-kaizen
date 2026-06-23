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
