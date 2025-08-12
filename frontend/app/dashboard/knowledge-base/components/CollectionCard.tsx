'use client'

import { useState } from 'react'
import { 
  GlobeAltIcon, 
  DocumentTextIcon, 
  TrashIcon, 
  PlusIcon,
  EllipsisVerticalIcon,
  CalendarIcon,
  ChartBarIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'

interface Collection {
  id: number
  name: string
  description: string | null
  collection_type: string
  chroma_collection_name: string
  created_at: string
  updated_at: string
  document_count: number
  pages_extracted: number
}

interface CollectionCardProps {
  collection: Collection
  onAddWebsite: () => void
  onUploadFile: () => void
  onDelete: () => void
}

export default function CollectionCard({ collection, onAddWebsite, onUploadFile, onDelete }: CollectionCardProps) {
  const [showActions, setShowActions] = useState(false)

  const getCollectionIcon = () => {
    switch (collection.collection_type) {
      case 'website':
        return <GlobeAltIcon className="w-6 h-6 text-blue-500" />
      case 'files':
        return <DocumentTextIcon className="w-6 h-6 text-green-500" />
      default:
        return <DocumentTextIcon className="w-6 h-6 text-purple-500" />
    }
  }

  const getCollectionTypeLabel = () => {
    switch (collection.collection_type) {
      case 'website':
        return 'Website'
      case 'files':
        return 'Files'
      default:
        return 'Mixed'
    }
  }

  const getCollectionTypeColor = () => {
    switch (collection.collection_type) {
      case 'website':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'files':
        return 'bg-green-100 text-green-700 border-green-200'
      default:
        return 'bg-purple-100 text-purple-700 border-purple-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const truncateName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name
    return name.substring(0, maxLength) + '...'
  }

  const getDocumentCountColor = () => {
    if (collection.document_count === 0) return 'text-gray-400'
    if (collection.document_count < 10) return 'text-green-600'
    if (collection.document_count < 50) return 'text-blue-600'
    return 'text-purple-600'
  }

  return (
    <motion.div 
      className="group bg-white rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] border border-gray-100 hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)] transition-all duration-300 overflow-hidden h-full flex flex-col"
      whileHover={{ y: -4 }}
    >
      <div className="p-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 p-3 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition-colors">
              {getCollectionIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 
                className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors cursor-help" 
                title={collection.name.length > 20 ? collection.name : undefined}
              >
                {truncateName(collection.name)}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCollectionTypeColor()}`}>
                  {getCollectionTypeLabel()} Collection
                </span>
              </div>
            </div>
          </div>
          
          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <EllipsisVerticalIcon className="w-5 h-5" />
            </button>
            
            <AnimatePresence>
              {showActions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-10"
                >
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onAddWebsite()
                        setShowActions(false)
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <GlobeAltIcon className="w-4 h-4 mr-2" />
                      Add Website
                    </button>
                    <button
                      onClick={() => {
                        onUploadFile()
                        setShowActions(false)
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <DocumentTextIcon className="w-4 h-4 mr-2" />
                      Upload File
                    </button>
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={() => {
                        onDelete()
                        setShowActions(false)
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4 mr-2" />
                      Delete Collection
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Description */}
        {collection.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-shrink-0">{collection.description}</p>
        )}

        {/* Stats */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className={`font-medium ${getDocumentCountColor()}`}>
                {collection.document_count} documents
              </span>
            </div>
            <span className="text-gray-500">
              Created {formatDate(collection.created_at)}
            </span>
          </div>
        </div>

        {/* Quick Actions - Push to bottom */}
        <div className="flex space-x-2 mt-auto">
          <button
            onClick={onAddWebsite}
            className="flex-1 flex items-center justify-center px-3 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors group/btn"
          >
            <GlobeAltIcon className="w-4 h-4 mr-1.5 group-hover/btn:scale-110 transition-transform" />
            Add Website
          </button>
          <button
            onClick={onUploadFile}
            className="flex-1 flex items-center justify-center px-3 py-2.5 text-sm font-medium text-green-600 bg-green-50 rounded-xl hover:bg-green-100 transition-colors group/btn"
          >
            <PlusIcon className="w-4 h-4 mr-1.5 group-hover/btn:scale-110 transition-transform" />
            Upload File
          </button>
        </div>

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />
      </div>
    </motion.div>
  )
} 