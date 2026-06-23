export interface TableRow {
  name: string
  subsystem: string
  rls_enabled: boolean
}

interface Props {
  tables: TableRow[]
}

export function TableList({ tables }: Props) {
  if (tables.length === 0) {
    return <p className="text-sm text-gray-400">No tables found.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 pr-4 font-medium text-gray-500">Table</th>
            <th className="text-left py-2 pr-4 font-medium text-gray-500">Sub-system</th>
            <th className="text-left py-2 font-medium text-gray-500">RLS</th>
          </tr>
        </thead>
        <tbody>
          {tables.map((t) => (
            <tr key={t.name} className="border-b border-gray-100">
              <td className="py-2 pr-4 font-mono text-gray-800">{t.name}</td>
              <td className="py-2 pr-4">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                  {t.subsystem}
                </span>
              </td>
              <td className="py-2">
                {t.rls_enabled ? (
                  <span className="text-green-600 font-medium">✓</span>
                ) : (
                  <span className="text-red-500 font-medium">✗</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
