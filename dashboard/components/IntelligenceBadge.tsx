import type { Intelligence } from '@/lib/types'

const STYLE: Record<Intelligence, string> = {
  Claude:  'bg-blue-100 text-blue-800',
  ChatGPT: 'bg-green-100 text-green-800',
  Gemini:  'bg-purple-100 text-purple-800',
  Ollama:  'bg-orange-100 text-orange-800',
  Static:  'bg-gray-100 text-gray-700',
  Dynamic: 'bg-yellow-100 text-yellow-800',
}

export function IntelligenceBadge({ value }: { value: Intelligence | null }) {
  if (!value) return null
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STYLE[value]}`}>
      {value}
    </span>
  )
}
