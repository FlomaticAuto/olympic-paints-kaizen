import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getStandalonePageBySlug } from '@/lib/registry'
import { notionSlug } from '@/lib/types'
import { Markdown } from '@/components/Markdown'
import { IntelligenceBadge } from '@/components/IntelligenceBadge'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function StandalonePageDetail({ params }: Props) {
  const { slug } = await params
  const result = await getStandalonePageBySlug(slug)
  if (!result) notFound()
  const { page, siblings } = result

  const idx = siblings.findIndex((p) => p.notion_url === page.notion_url)
  const prev = idx > 0 ? siblings[idx - 1] : null
  const next = idx < siblings.length - 1 ? siblings[idx + 1] : null

  return (
    <div className="max-w-4xl">
      <p className="text-xs text-gray-400 mb-4">
        <Link href="/pages" className="hover:text-indigo-600">
          Pages
        </Link>
        {' › '}
        <span className="text-gray-600">{page.name}</span>
      </p>

      <div className="flex items-baseline gap-2 mb-1">
        {page.icon && <span className="text-2xl">{page.icon}</span>}
        <h1 className="text-2xl font-bold text-gray-900">{page.name}</h1>
        <div className="ml-2">
          <IntelligenceBadge value={page.intelligence} />
        </div>
      </div>
      {page.live_url && (
        <p className="text-sm mb-6">
          <a
            href={page.live_url}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 hover:underline font-mono"
          >
            {page.live_url}
          </a>
        </p>
      )}

      {page.body_md ? (
        <Markdown>{page.body_md}</Markdown>
      ) : (
        <p className="text-sm text-gray-400 italic">No documentation imported yet.</p>
      )}

      <nav className="mt-10 pt-6 border-t border-gray-200 flex justify-between text-sm">
        {prev ? (
          <Link
            href={`/pages/${notionSlug(prev.notion_url)}`}
            className="text-indigo-600 hover:underline"
          >
            ← {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/pages/${notionSlug(next.notion_url)}`}
            className="text-indigo-600 hover:underline text-right"
          >
            {next.name} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  )
}
