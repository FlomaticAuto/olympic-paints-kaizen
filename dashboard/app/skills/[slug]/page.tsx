import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSkillBySlug, getAllSkills } from '@/lib/registry'
import { notionSlug } from '@/lib/types'
import { Markdown } from '@/components/Markdown'
import { SkillTagBadge } from '@/components/SkillTagBadge'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function SkillDetailPage({ params }: Props) {
  const { slug } = await params
  const result = await getSkillBySlug(slug)
  if (!result) notFound()
  const { skill, supersededByName, supersedesName } = result

  // Find the superseded_by slug for the link, if any
  const skills = supersededByName ? await getAllSkills() : []
  const supersededByUrl = supersededByName
    ? skills.find((s) => s.name === supersededByName)?.notion_url
    : null
  const supersededBySlug = supersededByUrl ? notionSlug(supersededByUrl) : null

  return (
    <div className="max-w-4xl">
      <p className="text-xs text-gray-400 mb-4">
        <Link href="/skills" className="hover:text-indigo-600">
          Skills
        </Link>
        {' › '}
        <span className="text-gray-600 font-mono">{skill.name}</span>
      </p>

      <div className="flex items-baseline gap-2 mb-1">
        {skill.icon && <span className="text-2xl">{skill.icon}</span>}
        <h1 className="text-2xl font-bold text-gray-900 font-mono">{skill.name}</h1>
        <div className="ml-2">
          <SkillTagBadge value={skill.tag} />
        </div>
      </div>

      {skill.description && (
        <p className="text-sm text-gray-600 mt-2 mb-6 leading-relaxed border-l-2 border-gray-200 pl-3 italic">
          {skill.description}
        </p>
      )}

      {supersededByName && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded p-3 text-sm">
          <strong className="text-amber-900">Superseded by</strong>{' '}
          {supersededBySlug ? (
            <Link href={`/skills/${supersededBySlug}`} className="text-indigo-600 hover:underline font-mono">
              {supersededByName}
            </Link>
          ) : (
            <span className="font-mono">{supersededByName}</span>
          )}
        </div>
      )}

      {supersedesName && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded p-3 text-sm">
          <strong className="text-gray-700">Supersedes</strong>{' '}
          <span className="font-mono">{supersedesName}</span>
        </div>
      )}

      {skill.local_path && (
        <p className="text-xs text-gray-500 mb-6 font-mono">
          <strong className="not-italic font-sans text-gray-400">Local:</strong> {skill.local_path}
        </p>
      )}

      {skill.body_md ? (
        <Markdown>{skill.body_md}</Markdown>
      ) : (
        <p className="text-sm text-gray-400 italic">No body documentation imported yet.</p>
      )}

      <p className="text-xs text-gray-400 mt-10 pt-4 border-t border-gray-200">
        <a
          href={skill.notion_url}
          target="_blank"
          rel="noreferrer"
          className="hover:text-indigo-600 font-mono"
        >
          {skill.notion_url}
        </a>
      </p>
    </div>
  )
}
