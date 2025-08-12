'use client'

import { useState } from 'react'
import { XMarkIcon, GlobeAltIcon } from '@heroicons/react/24/outline'

interface Collection {
  id: number
  name: string
  description: string | null
  collection_type: string
  chroma_collection_name: string
  created_at: string
  updated_at: string
  document_count: number
}

interface AddWebsiteModalProps {
  isOpen: boolean
  onClose: () => void
  collection: {
    id: number
    name: string
    chroma_collection_name: string
  }
  onCrawl: (websiteUrl: string) => void
}

export default function AddWebsiteModal({ isOpen, onClose, collection, onCrawl }: AddWebsiteModalProps) {
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [isCrawling, setIsCrawling] = useState(false)
  const [error, setError] = useState('')

  const truncateName = (name: string, maxLength: number = 25) => {
    if (name.length <= maxLength) return name
    return name.substring(0, maxLength) + '...'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!websiteUrl.trim() || !collection) {
      return
    }

    setIsCrawling(true)
    try {
      await onCrawl(websiteUrl.trim())
      
      // Reset form
      setWebsiteUrl('')
    } catch (err) {
      setError('Failed to crawl website.')
    } finally {
      setIsCrawling(false)
    }
  }

  if (!isOpen || !collection) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Add Website</h3>
            <p className="text-sm text-gray-600">Crawl website into "{truncateName(collection.name)}"</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Website URL *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <GlobeAltIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="url"
                id="websiteUrl"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full pl-10 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com"
                required
              />
            </div>
          </div>



          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Crawling Information</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>• Only internal links will be crawled</p>
                  <p>• Content will be extracted and stored</p>
                  <p>• Process may take several minutes</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCrawling || !websiteUrl.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCrawling ? 'Crawling...' : 'Start Crawling'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 