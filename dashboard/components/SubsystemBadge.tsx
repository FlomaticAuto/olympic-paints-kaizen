interface Props {
  subsystem: string
}

export function SubsystemBadge({ subsystem }: Props) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
      {subsystem}
    </span>
  )
}
