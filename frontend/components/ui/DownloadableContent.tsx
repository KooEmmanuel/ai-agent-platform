import React from 'react'
import { DocumentArrowDownIcon, EyeIcon } from '@heroicons/react/24/outline'

interface DownloadableContentProps {
  content: string
  downloadUrl?: string
  filename?: string
  fileType?: string
  fileSize?: number
  showPreview?: boolean
}

const DownloadableContent: React.FC<DownloadableContentProps> = ({
  content,
  downloadUrl,
  filename = 'download',
  fileType = 'application/pdf',
  fileSize,
  showPreview = false
}) => {
  const handleDownload = () => {
    const urlToUse = downloadUrl || content
    
    // Check if it's a data URL or file URL
    if (urlToUse.startsWith('data:') || urlToUse.startsWith('http://')) {
      // Content is already a data URL or full file URL
      const link = document.createElement('a')
      link.href = urlToUse
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      // Assume content is base64 encoded
      try {
        const byteCharacters = atob(content)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: fileType })
        
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Error downloading file:', error)
        // Fallback: try to download as text
        const blob = new Blob([content], { type: fileType })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }
    }
  }

  const handlePreview = () => {
    const urlToUse = downloadUrl || content
    
    if (urlToUse.startsWith('data:') || urlToUse.startsWith('http://')) {
      // Open in new tab
      window.open(urlToUse, '_blank')
    } else {
      // Create blob URL for preview
      try {
        const byteCharacters = atob(content)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: fileType })
        const url = window.URL.createObjectURL(blob)
        window.open(url, '_blank')
        // Clean up URL after a delay
        setTimeout(() => window.URL.revokeObjectURL(url), 1000)
      } catch (error) {
        console.error('Error previewing file:', error)
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DocumentArrowDownIcon className="w-5 h-5 text-blue-600" />
          <div>
            <div className="font-medium text-gray-900">{filename}</div>
            <div className="text-sm text-gray-500">
              {fileType.split('/')[1]?.toUpperCase() || 'File'}
              {fileSize && ` • ${formatFileSize(fileSize)}`}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {showPreview && (
            <button
              onClick={handlePreview}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <EyeIcon className="w-4 h-4" />
              Preview
            </button>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>
      
      {fileType === 'application/pdf' && (
        <div className="text-xs text-gray-500 bg-white p-2 rounded border">
          📄 PDF document ready for download. Click the download button to save to your device.
        </div>
      )}
    </div>
  )
}

export default DownloadableContent 