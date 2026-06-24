import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-custom max-w-none text-sm text-gray-800">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mt-8 mb-3 border-b border-gray-100 pb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-gray-700 mt-4 mb-2">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          code: ({ children, className }) => {
            const isBlock = (className ?? '').startsWith('language-')
            if (isBlock) {
              return (
                <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-xs font-mono overflow-x-auto my-3">
                  <code>{children}</code>
                </pre>
              )
            }
            return (
              <code className="bg-gray-100 text-indigo-700 px-1 py-0.5 rounded text-xs font-mono">
                {children}
              </code>
            )
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 hover:underline"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
          th: ({ children }) => (
            <th className="text-left px-3 py-2 font-semibold text-gray-700 border border-gray-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border border-gray-200 align-top">{children}</td>
          ),
          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          hr: () => <hr className="my-6 border-gray-200" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
