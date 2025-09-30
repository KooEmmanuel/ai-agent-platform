import React, { useEffect, useState } from 'react'

type Props = {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className = "" }: Props) {
  const [html, setHtml] = useState<string>("")

  useEffect(() => {
    let cancelled = false

    async function render() {
      // Safety check for undefined or null content
      if (!content || typeof content !== 'string') {
        setHtml('')
        return
      }
      try {
        // Try to import remark
        let remark = null
        try {
                  const remarkModule = await import("remark")
        remark = remarkModule.remark || (remarkModule as any).default
        } catch (err) {
          console.warn("Remark not available, using fallback")
        }

        // If remark not available, fallback to enhanced HTML conversion
        if (!remark) {
          setHtml(convertMarkdownToHtml(content))
          return
        }

        // Import other plugins
        const remarkPlugins = []
        try {
          const gfm = await import("remark-gfm")
          const gfmPlugin = gfm.default || gfm
          if (gfmPlugin && typeof gfmPlugin === 'function') {
            remarkPlugins.push(gfmPlugin)
          }
        } catch (err) {}

        try {
          const rehype = await import("remark-rehype")
          const rehypeModule = rehype.default || rehype
          if (rehypeModule && typeof rehypeModule === 'function') {
            remarkPlugins.push(rehypeModule, { allowDangerousHtml: true })
          } else {
            console.warn("Remark-rehype not available")
            setHtml(convertMarkdownToHtml(content))
            return
          }
        } catch (err) {
          console.warn("Remark-rehype not available")
          setHtml(convertMarkdownToHtml(content))
          return
        }

        try {
          const rehypeStringify = await import("rehype-stringify")
          const stringifyModule = rehypeStringify.default || rehypeStringify
          if (stringifyModule && typeof stringifyModule === 'function') {
            remarkPlugins.push(stringifyModule, { allowDangerousHtml: true })
          } else {
            console.warn("Rehype-stringify not available")
            setHtml(convertMarkdownToHtml(content))
            return
          }
        } catch (err) {
          console.warn("Rehype-stringify not available")
          setHtml(convertMarkdownToHtml(content))
          return
        }

        // Try syntax highlighting
        try {
          const highlight = await import("rehype-highlight")
          const highlightPlugin = highlight.default || highlight
          if (highlightPlugin && typeof highlightPlugin === 'function') {
            remarkPlugins.push(highlightPlugin)
          }
        } catch (err) {}

        // Only process if we have valid plugins
        if (remarkPlugins.length === 0) {
          console.warn("No valid remark plugins available, using fallback")
          setHtml(convertMarkdownToHtml(content))
          return
        }

        // Process the markdown
        const processor = remark().use(remarkPlugins)
        const file = await processor.process(content)
        
        if (!cancelled) {
          setHtml(String(file))
        }
      } catch (err) {
        console.warn("Markdown processing failed, using fallback:", err)
        // fallback: enhanced conversion
        setHtml(convertMarkdownToHtml(content))
      }
    }

    render()

    return () => {
      cancelled = true
    }
  }, [content])

  function escapeHtml(md: string) {
    if (!md || typeof md !== 'string') {
      return ''
    }
    return md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }

  function convertMarkdownToHtml(md: string) {
    // Safety check for undefined or null content
    if (!md || typeof md !== 'string') {
      return ''
    }
    
    // First, handle JSON data blocks and other structured data
    let processed = md
      // JSON data blocks
      .replace(/```json\n([\s\S]*?)```/g, (match, jsonContent) => {
        try {
          const parsed = JSON.parse(jsonContent.trim())
          const formatted = JSON.stringify(parsed, null, 2)
          return `<div class="my-4 rounded-lg overflow-hidden border border-gray-200 bg-gray-900">
                    <div class="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                      <span class="text-sm text-gray-300 font-medium">JSON</span>
                      <button onclick="navigator.clipboard.writeText(this.nextElementSibling.textContent)" 
                              class="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700">
                        Copy
                      </button>
                    </div>
                    <pre class="p-4 overflow-x-auto"><code class="language-json">${escapeHtml(formatted)}</code></pre>
                  </div>`
        } catch (e) {
          return `<div class="my-4 rounded-lg overflow-hidden border border-gray-200 bg-gray-900">
                    <div class="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                      <span class="text-sm text-gray-300 font-medium">JSON</span>
                      <button onclick="navigator.clipboard.writeText(this.nextElementSibling.textContent)" 
                              class="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700">
                        Copy
                      </button>
                    </div>
                    <pre class="p-4 overflow-x-auto"><code class="language-json">${escapeHtml(jsonContent.trim())}</code></pre>
                  </div>`
        }
      })
      
      // Auto-detect JSON objects in text
      .replace(/(^|\s)(\{[\s\S]*?\})(\s|$)/g, (match, prefix, jsonStr, suffix) => {
        try {
          const parsed = JSON.parse(jsonStr)
          const formatted = JSON.stringify(parsed, null, 2)
          return `${prefix}<div class="my-2 rounded border border-gray-200 bg-gray-50 p-3">
                    <details class="cursor-pointer">
                      <summary class="text-sm font-medium text-gray-700 mb-2">JSON Data</summary>
                      <pre class="text-xs overflow-x-auto"><code class="language-json">${escapeHtml(formatted)}</code></pre>
                    </details>
                  </div>${suffix}`
        } catch (e) {
          return match
        }
      })
      
      // Auto-detect arrays in text
      .replace(/(^|\s)(\[[\s\S]*?\])(\s|$)/g, (match, prefix, arrayStr, suffix) => {
        try {
          const parsed = JSON.parse(arrayStr)
          if (Array.isArray(parsed)) {
            const formatted = JSON.stringify(parsed, null, 2)
            return `${prefix}<div class="my-2 rounded border border-gray-200 bg-gray-50 p-3">
                      <details class="cursor-pointer">
                        <summary class="text-sm font-medium text-gray-700 mb-2">Array (${parsed.length} items)</summary>
                        <pre class="text-xs overflow-x-auto"><code class="language-json">${escapeHtml(formatted)}</code></pre>
                      </details>
                    </div>${suffix}`
          }
        } catch (e) {
          return match
        }
        return match
      })
      
      // Handle data tables (CSV-like data)
      .replace(/^(\s*)([^|\n]+\|[^|\n]+(?:\|[^|\n]+)*)\s*$/gm, (match, indent, row) => {
        const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell)
        if (cells.length > 1) {
          return `<tr class="border-b border-gray-100">${cells.map(cell => `<td class="px-3 py-2 text-sm text-gray-600">${cell}</td>`).join('')}</tr>`
        }
        return match
      })
      
      // Handle key-value pairs
      .replace(/^(\s*)([^:]+):\s*(.+)$/gm, (match, indent, key, value) => {
        if (key.trim() && value.trim() && !key.includes('|') && !value.includes('|')) {
          return `<div class="flex py-1">
                    <span class="font-medium text-gray-700 w-1/3">${key.trim()}:</span>
                    <span class="text-gray-600 flex-1">${value.trim()}</span>
                  </div>`
        }
        return match
      })
      
      // Handle URLs with titles (common in tool outputs)
      .replace(/(^|\s)(https?:\/\/[^\s]+)\s*-\s*([^\n]+)/g, (match, prefix, url, title) => {
        return `${prefix}<div class="my-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <a href="${url}" target="_blank" class="text-blue-600 hover:text-blue-800 font-medium block mb-1">${title.trim()}</a>
                  <a href="${url}" target="_blank" class="text-xs text-gray-500 hover:text-gray-700">${url}</a>
                </div>`
      })
      
      // Handle numbered lists with descriptions
      .replace(/^(\s*)(\d+\.)\s+([^:]+):\s*(.+)$/gm, (match, indent, number, title, description) => {
        return `<div class="flex py-2">
                  <span class="font-bold text-gray-700 w-8">${number}</span>
                  <div class="flex-1">
                    <span class="font-medium text-gray-800">${title.trim()}</span>
                    <span class="text-gray-600 ml-2">${description.trim()}</span>
                  </div>
                </div>`
      })
      
      // Handle bullet points with descriptions
      .replace(/^(\s*)([-*+])\s+([^:]+):\s*(.+)$/gm, (match, indent, bullet, title, description) => {
        return `<div class="flex py-2">
                  <span class="text-gray-500 w-6">${bullet}</span>
                  <div class="flex-1">
                    <span class="font-medium text-gray-800">${title.trim()}</span>
                    <span class="text-gray-600 ml-2">${description.trim()}</span>
                  </div>
                </div>`
      })
      
      // Handle metrics and statistics
      .replace(/(^|\s)(\d+(?:\.\d+)?%?)\s*([a-zA-Z\s]+)(?:\s*-\s*([^,\n]+))?/g, (match, prefix, value, label, description) => {
        if (value && label && label.trim().length < 50) {
          return `${prefix}<div class="inline-flex items-center bg-blue-50 text-blue-800 px-2 py-1 rounded text-sm mr-2 mb-1">
                    <span class="font-bold mr-1">${value}</span>
                    <span class="text-xs">${label.trim()}</span>
                    ${description ? `<span class="text-xs text-blue-600 ml-1">- ${description.trim()}</span>` : ''}
                  </div>`
        }
        return match
      })
      
      // Handle timestamps and dates
      .replace(/(^|\s)(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?)/g, (match, prefix, timestamp) => {
        try {
          const date = new Date(timestamp)
          const formatted = date.toLocaleString()
          return `${prefix}<span class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">${formatted}</span>`
        } catch (e) {
          return match
        }
      })
      
      // Handle file paths and code references
      .replace(/(^|\s)([a-zA-Z0-9_\-\.\/]+\.(py|js|ts|tsx|jsx|html|css|json|yaml|yml|md|txt|log|sql|sh|bash|zsh|fish|ps1|bat|cmd)(?:\:[0-9]+)?)/g, (match, prefix, filepath) => {
        return `${prefix}<code class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">${filepath}</code>`
      })
      
      // Handle error messages and warnings
      .replace(/(^|\s)(ERROR|WARNING|INFO|DEBUG|FATAL):\s*(.+)$/gm, (match, prefix, level, message) => {
        const colors = {
          'ERROR': 'bg-red-50 text-red-800 border-red-200',
          'WARNING': 'bg-yellow-50 text-yellow-800 border-yellow-200',
          'INFO': 'bg-blue-50 text-blue-800 border-blue-200',
          'DEBUG': 'bg-gray-50 text-gray-800 border-gray-200',
          'FATAL': 'bg-red-100 text-red-900 border-red-300'
        }
        const colorClass = colors[level as keyof typeof colors] || colors.INFO
        return `${prefix}<div class="my-2 p-3 border rounded-lg ${colorClass}">
                  <span class="font-bold text-xs uppercase">${level}:</span>
                  <span class="ml-2">${message}</span>
                </div>`
      })
      
      // Handle success messages
      .replace(/(^|\s)(✅|✓|SUCCESS|COMPLETED|DONE):\s*(.+)$/gm, (match, prefix, icon, message) => {
        return `${prefix}<div class="my-2 p-3 border border-green-200 rounded-lg bg-green-50 text-green-800">
                  <span class="font-bold">${icon}</span>
                  <span class="ml-2">${message}</span>
                </div>`
      })
      
      // Handle progress indicators
      .replace(/(^|\s)(\d+%)\s*(.+)$/gm, (match, prefix, percentage, description) => {
        const percent = parseInt(percentage)
        return `${prefix}<div class="my-2">
                  <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-700">${description}</span>
                    <span class="text-gray-500">${percentage}</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${percent}%"></div>
                  </div>
                </div>`
      })
      
      // Now handle regular markdown (must be after data processing)
      // Code blocks with syntax highlighting
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || 'text'
        return `<div class="my-4 rounded-lg overflow-hidden border border-gray-200 bg-gray-900">
                  <div class="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                    <span class="text-sm text-gray-300 font-medium">${language}</span>
                    <button onclick="navigator.clipboard.writeText(this.nextElementSibling.textContent)" 
                            class="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700">
                      Copy
                    </button>
                  </div>
                  <pre class="p-4 overflow-x-auto"><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>
                </div>`
      })
      
      // Headers (H1-H6)
      .replace(/^#{6}\s+(.+)$/gm, '<h6 class="text-sm font-semibold text-gray-700 mt-4 mb-2">$1</h6>')
      .replace(/^#{5}\s+(.+)$/gm, '<h5 class="text-base font-semibold text-gray-700 mt-4 mb-2">$1</h5>')
      .replace(/^#{4}\s+(.+)$/gm, '<h4 class="text-lg font-semibold text-gray-800 mt-4 mb-2">$1</h4>')
      .replace(/^#{3}\s+(.+)$/gm, '<h3 class="text-xl font-semibold text-gray-800 mt-4 mb-3">$1</h3>')
      .replace(/^#{2}\s+(.+)$/gm, '<h2 class="text-2xl font-bold text-gray-900 mt-6 mb-3">$1</h2>')
      .replace(/^#{1}\s+(.+)$/gm, '<h1 class="text-3xl font-bold text-gray-900 mt-6 mb-4">$1</h1>')
      
      // Horizontal rules
      .replace(/^(\s*[-*_]){3,}\s*$/gm, '<hr class="my-6 border-gray-300">')
      
      // Blockquotes
      .replace(/^>\s*(.+)$/gm, '<blockquote class="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 text-gray-700 italic">$1</blockquote>')
      
      // Lists (unordered and ordered)
      .replace(/^(\s*)(\*|\+|-)\s+(.+)$/gm, (match, indent, marker, content) => {
        const level = indent.length / 2
        return `<li class="ml-${level * 4} mb-1">${content}</li>`
      })
      .replace(/^(\s*)(\d+\.)\s+(.+)$/gm, (match, indent, marker, content) => {
        const level = indent.length / 2
        return `<li class="ml-${level * 4} mb-1 list-decimal">${content}</li>`
      })
      
      // Tables
      .replace(/\|(.+)\|/g, (match, content) => {
        const cells = content.split('|').map(cell => cell.trim()).filter(cell => cell)
        const isHeader = match.includes('---') || match.includes('===') || match.includes('|||')
        
        if (isHeader) {
          return '<tr class="border-b border-gray-200">' + 
                 cells.map(cell => `<th class="px-4 py-2 text-left font-semibold text-gray-700">${cell}</th>`).join('') + 
                 '</tr>'
        } else {
          return '<tr class="border-b border-gray-100">' + 
                 cells.map(cell => `<td class="px-4 py-2 text-gray-600">${cell}</td>`).join('') + 
                 '</tr>'
        }
      })
      
      // Images (must come before links)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
        // Check if it's an image URL
        if (src.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i)) {
          return `<div class="my-4 rounded-lg overflow-hidden shadow-sm border border-gray-200">
                    <img src="${src}" alt="${alt}" class="w-full max-w-md h-auto object-cover rounded-lg" 
                         style="max-height: 400px;" 
                         onerror="this.style.display='none'; this.nextSibling.style.display='block';" />
                    <div style="display: none;" class="p-4 text-center text-gray-500 bg-gray-50">
                      <span>📷 Image: ${alt || 'Image'}</span>
                      <br><a href="${src}" target="_blank" class="text-blue-600 underline text-sm">${src}</a>
                    </div>
                  </div>`
        }
        return match
      })
      
      // Auto-detect image URLs in text
      .replace(/(^|\s)(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?[^\s]*)?)/gi, (match, prefix, url) => {
        return `${prefix}<div class="my-4 rounded-lg overflow-hidden shadow-sm border border-gray-200">
                  <img src="${url}" alt="Image" class="w-full max-w-md h-auto object-cover rounded-lg" 
                       style="max-height: 400px;" 
                       onerror="this.style.display='none'; this.nextSibling.style.display='block';" />
                  <div style="display: none;" class="p-4 text-center text-gray-500 bg-gray-50">
                    <span>📷 Image</span>
                    <br><a href="${url}" target="_blank" class="text-blue-600 underline text-sm">${url}</a>
                  </div>
                </div>`
      })
      
      // Auto-detect and format URLs
      .replace(/(^|\s)(https?:\/\/[^\s]+)/gi, (match, prefix, url) => {
        return `${prefix}<a href="${url}" target="_blank" class="text-blue-600 underline hover:text-blue-800">${url}</a>`
      })
      
      // Bold and italic (order matters - bold first)
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/___(.*?)___/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/__(.*?)__/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/_(.*?)_/g, '<em class="italic">$1</em>')
      
      // Strikethrough
      .replace(/~~(.*?)~~/g, '<del class="line-through text-gray-500">$1</del>')
      
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-600 underline hover:text-blue-800">$1</a>')
      
      // Task lists
      .replace(/^(\s*)- \[ \]\s+(.+)$/gm, '<li class="flex items-center mb-1"><input type="checkbox" disabled class="mr-2">$2</li>')
      .replace(/^(\s*)- \[x\]\s+(.+)$/gm, '<li class="flex items-center mb-1"><input type="checkbox" checked disabled class="mr-2">$2</li>')
      
      // Line breaks and paragraphs
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br/>')
      
      // Wrap in paragraphs
      .replace(/^(?!<[h1-6]|<hr|<blockquote|<ul|<ol|<table|<div|<pre)/gm, '<p class="mb-4">')
      .replace(/([^>])$/gm, '$1</p>')
      
      // Clean up empty paragraphs
      .replace(/<p class="mb-4"><\/p>/g, '')
      .replace(/<p class="mb-4"><br\/><\/p>/g, '')
      
      // Wrap lists in proper containers
      .replace(/(<li class="[^"]*">[\s\S]*?<\/li>)/g, '<ul class="list-disc pl-6 mb-4">$1</ul>')
      
      // Wrap tables in proper containers
      .replace(/(<tr class="[^"]*">[\s\S]*?<\/tr>)/g, '<table class="w-full border-collapse border border-gray-300 mb-4">$1</table>')
      
      // Clean up nested tags
      .replace(/<p class="mb-4">(<h[1-6])/g, '$1')
      .replace(/(<\/h[1-6]>)<\/p>/g, '$1')
      .replace(/<p class="mb-4">(<hr)/g, '$1')
      .replace(/(<\/hr>)<\/p>/g, '$1')
      .replace(/<p class="mb-4">(<blockquote)/g, '$1')
      .replace(/(<\/blockquote>)<\/p>/g, '$1')
      .replace(/<p class="mb-4">(<ul)/g, '$1')
      .replace(/(<\/ul>)<\/p>/g, '$1')
      .replace(/<p class="mb-4">(<ol)/g, '$1')
      .replace(/(<\/ol>)<\/p>/g, '$1')
      .replace(/<p class="mb-4">(<table)/g, '$1')
      .replace(/(<\/table>)<\/p>/g, '$1')
      .replace(/<p class="mb-4">(<div)/g, '$1')
      .replace(/(<\/div>)<\/p>/g, '$1')
      .replace(/<p class="mb-4">(<pre)/g, '$1')
      .replace(/(<\/pre>)<\/p>/g, '$1')

    return processed
  }

  return (
    <div 
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  )
} 