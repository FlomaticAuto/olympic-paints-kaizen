import type { Phase } from '@/lib/types'

const PHASE_LABELS: Record<Phase, string> = {
  schema: 'Schema documented',
  rls: 'RLS applied',
  ui: 'UI built',
  spec: 'Spec written',
  deployed: 'Deployed',
  tested: 'Tested',
}

const ALL_PHASES: Phase[] = ['schema', 'rls', 'spec', 'ui', 'tested', 'deployed']

function phaseBadgeClass(phase: Phase, completed: Phase[]): string {
  if (completed.includes(phase)) {
    return 'bg-green-100 text-green-800'
  }
  return 'bg-gray-100 text-gray-400'
}

function phasePrefix(phase: Phase, completed: Phase[]): string {
  return completed.includes(phase) ? '✓ ' : '○ '
}

interface Props {
  phases: Phase[] | null
}

export function PhaseStatus({ phases }: Props) {
  const completed = phases ?? []
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_PHASES.map((phase) => (
        <span
          key={phase}
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${phaseBadgeClass(phase, completed)}`}
        >
          {phasePrefix(phase, completed)}{PHASE_LABELS[phase]}
        </span>
      ))}
    </div>
  )
}
