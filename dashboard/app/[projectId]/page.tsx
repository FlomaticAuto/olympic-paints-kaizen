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
  params: Promise<{ projectId: string }>
}

export default async function ProjectPage({ params }: Props) {
  const { projectId } = await params
  const project = await getProject(projectId)
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
