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
          <p className="text-sm mt-2">Run the &quot;document Supabase project&quot; skill to get started.</p>
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
