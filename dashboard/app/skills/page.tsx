import Link from 'next/link'
import { getAllSkills } from '@/lib/registry'
import { notionSlug } from '@/lib/types'
import { SkillTagBadge } from '@/components/SkillTagBadge'

export const dynamic = 'force-dynamic'

export default async function SkillsIndexPage() {
  const skills = await getAllSkills()

  const active = skills.filter((s) => !s.superseded_by)
  const superseded = skills.filter((s) => s.superseded_by)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Skills</h1>
      <p className="text-sm text-gray-500 mb-8">
        {active.length} active · {superseded.length} superseded
      </p>

      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Active
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
          {active.map((s) => {
            const slug = notionSlug(s.notion_url)
            return (
              <Link key={s.notion_url} href={`/skills/${slug}`} className="block">
                <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-indigo-300 hover:shadow-sm transition-all h-full">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      {s.icon && <span className="text-base shrink-0">{s.icon}</span>}
                      <h3 className="text-base font-semibold text-gray-900 truncate font-mono">{s.name}</h3>
                    </div>
                    <SkillTagBadge value={s.tag} />
                  </div>
                  {s.description && (
                    <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                      {s.description}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {superseded.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Superseded
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {superseded.map((s) => {
              const slug = notionSlug(s.notion_url)
              return (
                <Link key={s.notion_url} href={`/skills/${slug}`} className="block">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-all h-full opacity-75">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-baseline gap-2 min-w-0">
                        {s.icon && <span className="text-base shrink-0 grayscale">{s.icon}</span>}
                        <h3 className="text-base font-semibold text-gray-600 truncate font-mono line-through">{s.name}</h3>
                      </div>
                      <SkillTagBadge value={s.tag} />
                    </div>
                    {s.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {s.description}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
