import type { SkillTag } from '@/lib/types'

const STYLE: Record<SkillTag, string> = {
  Documentation: 'bg-blue-100 text-blue-800',
  Tools:         'bg-gray-100 text-gray-700',
}

export function SkillTagBadge({ value }: { value: SkillTag | null }) {
  if (!value) return null
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STYLE[value]}`}>
      {value}
    </span>
  )
}
