import Link from 'next/link'
import { getStandalonePages } from '@/lib/registry'
import { notionSlug } from '@/lib/types'
import { IntelligenceBadge } from '@/components/IntelligenceBadge'

export const dynamic = 'force-dynamic'

export default async function PagesIndexPage() {
  const pages = await getStandalonePages()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Pages</h1>
      <p className="text-sm text-gray-500 mb-8">
        {pages.length} standalone page{pages.length !== 1 ? 's' : ''}
      </p>

      {pages.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-lg font-medium">No standalone pages yet.</p>
          <p className="text-sm mt-1">
            Pages documented without a parent dashboard appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pages.map((p) => {
            const slug = notionSlug(p.notion_url)
            return (
              <Link key={p.notion_url} href={`/pages/${slug}`} className="block">
                <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-indigo-300 hover:shadow-sm transition-all h-full">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      {p.icon && <span className="text-base shrink-0">{p.icon}</span>}
                      <h2 className="text-base font-semibold text-gray-900 truncate">
                        {p.name}
                      </h2>
                    </div>
                    <IntelligenceBadge value={p.intelligence} />
                  </div>
                  {p.live_url && (
                    <p className="text-xs text-indigo-600 truncate mt-2 font-mono">
                      {p.live_url}
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
