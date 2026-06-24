import { notFound } from 'next/navigation'
import { getNotionDashboardBySlug } from '@/lib/registry'
import { IntelligenceBadge } from '@/components/IntelligenceBadge'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function NotionDashboardPage({ params }: Props) {
  const { slug } = await params
  const result = await getNotionDashboardBySlug(slug)
  if (!result) notFound()
  const { dashboard, pages } = result

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">{dashboard.name}</h1>
      <p className="text-sm text-gray-400 mt-1 mb-8">
        {pages.length} page{pages.length !== 1 ? 's' : ''}
        {dashboard.live_url && (
          <>
            {' · '}
            <a href={dashboard.live_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-mono">
              {dashboard.live_url}
            </a>
          </>
        )}
      </p>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Pages</h2>
        {pages.length === 0 ? (
          <p className="text-sm text-gray-400">No pages found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Name</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Intelligence</th>
                  <th className="text-left py-2 font-medium text-gray-500">Live URL</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.notion_url} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-800">{p.name}</td>
                    <td className="py-2 pr-4">
                      <IntelligenceBadge value={p.intelligence} />
                    </td>
                    <td className="py-2 font-mono text-xs">
                      {p.live_url ? (
                        <a href={p.live_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                          {p.live_url}
                        </a>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
