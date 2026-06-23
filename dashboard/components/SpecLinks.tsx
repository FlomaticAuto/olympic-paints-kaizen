interface Props {
  specPaths: string[] | null
}

export function SpecLinks({ specPaths }: Props) {
  if (!specPaths || specPaths.length === 0) {
    return <p className="text-sm text-gray-400">No specs yet.</p>
  }

  return (
    <ul className="space-y-1">
      {specPaths.map((path) => {
        const filename = path.split('/').pop() ?? path
        return (
          <li key={path}>
            <span className="text-sm font-mono text-indigo-600">{filename}</span>
            <span className="text-xs text-gray-400 ml-2">{path}</span>
          </li>
        )
      })}
    </ul>
  )
}
