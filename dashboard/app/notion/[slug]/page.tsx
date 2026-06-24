import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getNotionDashboardBySlug } from '@/lib/registry'
import { notionSlug } from '@/lib/types'
import { Markdown } from '@/components/Markdown'
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
      <div className="flex items-baseline gap-2 mb-1">
        {dashboard.icon && <span className="text-2xl">{dashboard.icon}</span>}
        <h1 className="text-2xl font-bold text-gray-900">{dashboard.name}</h1>
      </div>
      <p className="text-sm text-gray-400 mb-6">
        {pages.length} page{pages.length !== 1 ? 's' : ''}
        {dashboard.live_url && (
          <>
            {' · '}
            <a
              href={dashboard.live_url}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 hover:underline font-mono"
            >
              {dashboard.live_url}
            </a>
          </>
        )}
      </p>

      {dashboard.body_md ? (
        <Markdown>{dashboard.body_md}</Markdown>
      ) : (
        <p className="text-sm text-gray-400 italic">No documentation imported yet.</p>
      )}

      <section className="mt-10 pt-8 border-t border-gray-200">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Pages in this dashboard
        </h2>
        {pages.length === 0 ? (
          <p className="text-sm text-gray-400">No pages.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pages.map((p) => {
              const pageSlug = notionSlug(p.notion_url)
              return (
                <Link
                  key={p.notion_url}
                  href={`/notion/${slug}/${pageSlug}`}
                  className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-baseline gap-2 min-w-0">
                      {p.icon && <span className="text-sm shrink-0">{p.icon}</span>}
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{p.name}</h3>
                    </div>
                    <IntelligenceBadge value={p.intelligence} />
                  </div>
                  {p.live_url && (
                    <p className="text-xs text-indigo-600 truncate font-mono">{p.live_url}</p>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
