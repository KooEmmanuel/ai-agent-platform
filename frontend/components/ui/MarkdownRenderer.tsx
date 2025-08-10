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
      try {
        // Try to import remark
        let remark = null
        try {
          const remarkModule = await import("remark")
          remark = remarkModule.remark || remarkModule.default
        } catch (err) {
          console.warn("Remark not available, using fallback")
        }

        // If remark not available, fallback to simple HTML escaping
        if (!remark) {
          setHtml(convertMarkdownToHtml(content))
          return
        }

        // Import other plugins
        const remarkPlugins = []
        try {
          const gfm = await import("remark-gfm")
          remarkPlugins.push(gfm.default || gfm)
        } catch (err) {}

        try {
          const rehype = await import("remark-rehype")
          const rehypeModule = rehype.default || rehype
          remarkPlugins.push(rehypeModule, { allowDangerousHtml: true })
        } catch (err) {
          console.warn("Remark-rehype not available")
          setHtml(convertMarkdownToHtml(content))
          return
        }

        try {
          const rehypeStringify = await import("rehype-stringify")
          const stringifyModule = rehypeStringify.default || rehypeStringify
          remarkPlugins.push(stringifyModule, { allowDangerousHtml: true })
        } catch (err) {
          console.warn("Rehype-stringify not available")
          setHtml(convertMarkdownToHtml(content))
          return
        }

        // Try syntax highlighting
        try {
          const highlight = await import("rehype-highlight")
          remarkPlugins.push(highlight.default || highlight)
        } catch (err) {}

        // Process the markdown
        const processor = remark().use(remarkPlugins)
        const file = await processor.process(content)
        
        if (!cancelled) {
          setHtml(String(file))
        }
      } catch (err) {
        console.warn("Markdown processing failed, using fallback:", err)
        // fallback: simple conversion
        setHtml(convertMarkdownToHtml(content))
      }
    }

    render()

    return () => {
      cancelled = true
    }
  }, [content])

  function escapeHtml(md: string) {
    return md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }

  function convertMarkdownToHtml(md: string) {
    return md
      // Horizontal rules
      .replace(/^(\s*[-*_]){3,}\s*$/gm, '<hr>')
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
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Inline code
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-600 underline">$1</a>')
      // Line breaks
      .replace(/\n/g, '<br/>')
  }

  return (
    <div 
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  )
} 