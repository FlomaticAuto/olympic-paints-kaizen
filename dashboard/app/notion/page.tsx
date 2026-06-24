import Link from 'next/link'
import { getAllNotionDashboards } from '@/lib/registry'
import { notionSlug } from '@/lib/types'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function getPageCounts(): Promise<Record<string, number>> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_REGISTRY_URL!,
    process.env.NEXT_PUBLIC_REGISTRY_ANON_KEY!,
  )
  const { data, error } = await supabase
    .from('notion_pages')
    .select('dashboard_url')
  if (error) throw new Error(`Page count fetch failed: ${error.message}`)
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    if (!row.dashboard_url) continue
    counts[row.dashboard_url] = (counts[row.dashboard_url] ?? 0) + 1
  }
  return counts
}

export default async function NotionIndexPage() {
  const [dashboards, pageCounts] = await Promise.all([
    getAllNotionDashboards(),
    getPageCounts(),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Notion Dashboards</h1>
      <p className="text-sm text-gray-500 mb-8">
        {dashboards.length} dashboard{dashboards.length !== 1 ? 's' : ''} migrated from Notion
      </p>

      {dashboards.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-lg font-medium">No Notion dashboards yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {dashboards.map((d) => {
            const slug = notionSlug(d.notion_url)
            const count = pageCounts[d.notion_url] ?? 0
            return (
              <Link key={d.notion_url} href={`/notion/${slug}`} className="block">
                <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-indigo-300 hover:shadow-sm transition-all h-full">
                  <h2 className="text-base font-semibold text-gray-900 mb-1">{d.name}</h2>
                  <p className="text-xs text-gray-400">
                    {count} page{count !== 1 ? 's' : ''}
                  </p>
                  {d.live_url && (
                    <p className="text-xs text-indigo-600 truncate mt-2 font-mono">
                      {d.live_url}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
