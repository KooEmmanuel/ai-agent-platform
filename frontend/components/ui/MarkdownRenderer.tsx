import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeExternalLinks from 'rehype-external-links'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'

type Props = {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className = "" }: Props) {
  // Safety check for undefined or null content
  if (!content || typeof content !== 'string') {
    return <div className={className} />
  }

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeHighlight,
          rehypeSanitize,
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: 'wrap' }],
          [rehypeExternalLinks, { target: '_blank', rel: ['nofollow', 'noopener', 'noreferrer'] }]
        ]}
        components={{
          // Custom code block rendering with syntax highlighting
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            
            if (!inline && language) {
              return (
                <div className="my-4 rounded-lg overflow-hidden border border-gray-200 bg-gray-900">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                    <span className="text-sm text-gray-300 font-medium">{language}</span>
                    <button 
                      onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                      className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700"
                    >
                      Copy
                    </button>
                  </div>
                  <SyntaxHighlighter
                    style={tomorrow}
                    language={language}
                    PreTag="pre"
                    className="!m-0 !p-4"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              )
            }
            
            return (
              <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            )
          },
          
          // Custom heading styles
          h1: ({ children, ...props }) => (
            <h1 className="text-3xl font-bold text-gray-900 mt-6 mb-4" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-3" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-xl font-semibold text-gray-800 mt-4 mb-3" {...props}>
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 className="text-lg font-semibold text-gray-800 mt-4 mb-2" {...props}>
              {children}
            </h4>
          ),
          h5: ({ children, ...props }) => (
            <h5 className="text-base font-semibold text-gray-700 mt-4 mb-2" {...props}>
              {children}
            </h5>
          ),
          h6: ({ children, ...props }) => (
            <h6 className="text-sm font-semibold text-gray-700 mt-4 mb-2" {...props}>
              {children}
            </h6>
          ),
          
          // Custom paragraph styles
          p: ({ children, ...props }) => (
            <p className="mb-4 text-gray-700 leading-relaxed" {...props}>
              {children}
            </p>
          ),
          
          // Custom list styles
          ul: ({ children, ...props }) => (
            <ul className="list-disc pl-6 mb-4 space-y-1" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal pl-6 mb-4 space-y-1" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="text-gray-700" {...props}>
              {children}
            </li>
          ),
          
          // Custom blockquote styles
          blockquote: ({ children, ...props }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 text-gray-700 italic" {...props}>
              {children}
            </blockquote>
          ),
          
          // Custom table styles
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full border-collapse border border-gray-300" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-gray-50" {...props}>
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th className="px-4 py-2 text-left font-semibold text-gray-700 border-b border-gray-200" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-4 py-2 text-gray-600 border-b border-gray-100" {...props}>
              {children}
            </td>
          ),
          
          // Custom link styles
          a: ({ children, href, ...props }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="nofollow noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800" 
              {...props}
            >
              {children}
            </a>
          ),
          
          // Custom image styles
          img: ({ src, alt, ...props }) => (
            <div className="my-4 rounded-lg overflow-hidden shadow-sm border border-gray-200">
              <img 
                src={src} 
                alt={alt} 
                className="w-full max-w-md h-auto object-cover rounded-lg" 
                style={{ maxHeight: '400px' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const fallback = target.nextElementSibling as HTMLElement
                  if (fallback) fallback.style.display = 'block'
                }}
                {...props}
              />
              <div style={{ display: 'none' }} className="p-4 text-center text-gray-500 bg-gray-50">
                <span>📷 Image: {alt || 'Image'}</span>
                <br />
                <a href={src} target="_blank" className="text-blue-600 underline text-sm">
                  {src}
                </a>
              </div>
            </div>
          ),
          
          // Custom horizontal rule
          hr: ({ ...props }) => (
            <hr className="my-6 border-gray-300" {...props} />
          ),
          
          // Custom strong and emphasis
          strong: ({ children, ...props }) => (
            <strong className="font-semibold" {...props}>
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em className="italic" {...props}>
              {children}
            </em>
          ),
          
          // Custom strikethrough
          del: ({ children, ...props }) => (
            <del className="line-through text-gray-500" {...props}>
              {children}
            </del>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
