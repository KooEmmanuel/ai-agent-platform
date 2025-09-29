'use client'

import { useState, useEffect } from 'react'
import { 
  PlusIcon, 
  GlobeAltIcon, 
  DocumentTextIcon, 
  TrashIcon, 
  EyeIcon,
  SparklesIcon,
  BookOpenIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  FolderIcon,
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon,
  ShareIcon,
  EllipsisVerticalIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import CreateCollectionModal from './components/CreateCollectionModal'
import AddWebsiteModal from './components/AddWebsiteModal'
import UploadFileModal from './components/UploadFileModal'
import FileUploadModal from './components/FileUploadModal'
import CollectionCard from './components/CollectionCard'
import FileLibrary from './components/FileLibrary'
import { apiClient } from '../../../lib/api'

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

export default function KnowledgeBasePage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAddWebsiteModal, setShowAddWebsiteModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showFileUploadModal, setShowFileUploadModal] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // New state for Library/Vector Base toggle
  const [activeTab, setActiveTab] = useState<'library' | 'vectorbase'>('library')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // File library state
  const [files, setFiles] = useState<any[]>([])

  useEffect(() => {
    loadCollections()
  }, [])

  const handleFilesChange = (newFiles: any[]) => {
    setFiles(newFiles)
  }

  // Calculate file statistics
  const getFileStats = () => {
    const totalFiles = files.length
    const images = files.filter(file => file.mime_type?.startsWith('image/')).length
    const documents = files.filter(file => 
      file.mime_type?.startsWith('application/') || 
      file.file_extension?.match(/\.(pdf|doc|docx|txt|md)$/i)
    ).length
    const sharedFiles = files.filter(file => file.is_public).length
    
    return { totalFiles, images, documents, sharedFiles }
  }

  const stats = getFileStats()

  const loadCollections = async () => {
    try {
      setLoading(true)
      const collections = await apiClient.getKnowledgeBaseCollections()
      console.log('Collections received:', collections)
      setCollections(collections)
    } catch (err) {
      console.error('Failed to load collections:', err)
      setError('Failed to load collections')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCollection = async (collectionData: { name: string; description?: string; collection_type: string }) => {
    try {
      const collection = await apiClient.createKnowledgeBaseCollection(collectionData)
      // Ensure updated_at exists, fallback to created_at if missing
      const collectionWithUpdatedAt = {
        ...collection,
        updated_at: collection.updated_at || collection.created_at,
        pages_extracted: collection.pages_extracted || 0
      }
      setCollections(prev => [...prev, collectionWithUpdatedAt])
      setShowCreateModal(false)
    } catch (err) {
      console.error('Failed to create collection:', err)
      setError('Failed to create collection')
    }
  }

  const handleAddWebsite = async (websiteUrl: string) => {
    if (!selectedCollection) return { crawl_id: 0 }
    try {
      const result = await apiClient.crawlWebsiteToCollection(selectedCollection.id, { website_url: websiteUrl, max_pages: 50, max_depth: 3 })
      await loadCollections() // Reload to get updated document count
      setShowAddWebsiteModal(false)
      return { crawl_id: result.data?.crawl_id || 0 }
    } catch (err) {
      console.error('Failed to add website:', err)
      setError('Failed to add website')
      return { crawl_id: 0 }
    }
  }

  const handleUploadFile = async (file: File) => {
    if (!selectedCollection) return
    try {
      await apiClient.uploadFileToCollection(selectedCollection.id, file)
      await loadCollections() // Reload to get updated document count
      setShowUploadModal(false)
    } catch (err) {
      console.error('Failed to upload file:', err)
      setError('Failed to upload file')
    }
  }

  const handleDeleteCollection = async (collectionId: number) => {
    if (!confirm('Are you sure you want to delete this collection? This action cannot be undone.')) {
      return
    }

    try {
      await apiClient.deleteKnowledgeBaseCollection(collectionId)
      setCollections(prev => prev.filter(c => c.id !== collectionId))
    } catch (err) {
      console.error('Failed to delete collection:', err)
      setError('Failed to delete collection')
    }
  }

  const filteredCollections = collections.filter(collection =>
    collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (collection.description && collection.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const totalDocuments = collections.reduce((sum, collection) => sum + collection.document_count, 0)
  const websiteCollections = collections.filter(c => c.collection_type === 'website').length
  const mixedCollections = collections.filter(c => c.collection_type === 'mixed').length

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your knowledge base...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Mobile-First Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          {/* Page Title - Mobile Optimized */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Knowledge Base</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage your files and AI-powered collections</p>
          </div>
          
          {/* Library/Vector Base Toggle - Mobile Full Width */}
          <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-gray-200 w-full mb-6">
            <button
              onClick={() => setActiveTab('library')}
              className={`flex items-center justify-center flex-1 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'library'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <FolderIcon className="w-4 h-4 mr-2" />
              <span className="hidden xs:inline">Library</span>
              <span className="xs:hidden">Files</span>
            </button>
            <button
              onClick={() => setActiveTab('vectorbase')}
              className={`flex items-center justify-center flex-1 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'vectorbase'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <SparklesIcon className="w-4 h-4 mr-2" />
              <span className="hidden xs:inline">Vector Base</span>
              <span className="xs:hidden">AI</span>
            </button>
          </div>

          {/* Stats Cards - Mobile Responsive Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
            {activeTab === 'library' ? (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] border border-gray-100"
                >
                  <div className="flex items-center">
                    <div className="p-2 sm:p-3 bg-blue-100 rounded-lg sm:rounded-xl">
                      <DocumentIcon className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                    <div className="ml-3 sm:ml-4">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Total Files</p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalFiles}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] border border-gray-100"
                >
                  <div className="flex items-center">
                    <div className="p-2 sm:p-3 bg-green-100 rounded-lg sm:rounded-xl">
                      <PhotoIcon className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                    </div>
                    <div className="ml-3 sm:ml-4">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Images</p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.images}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] border border-gray-100"
                >
                  <div className="flex items-center">
                    <div className="p-2 sm:p-3 bg-purple-100 rounded-lg sm:rounded-xl">
                      <ArchiveBoxIcon className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                    </div>
                    <div className="ml-3 sm:ml-4">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Documents</p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.documents}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] border border-gray-100"
                >
                  <div className="flex items-center">
                    <div className="p-2 sm:p-3 bg-orange-100 rounded-lg sm:rounded-xl">
                      <ShareIcon className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />
                    </div>
                    <div className="ml-3 sm:ml-4">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Shared Files</p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.sharedFiles}</p>
                    </div>
                  </div>
                </motion.div>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] border border-gray-100"
                >
                  <div className="flex items-center">
                    <div className="p-1.5 sm:p-2 lg:p-3 bg-blue-100 rounded-lg sm:rounded-xl">
                      <BookOpenIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
                    </div>
                    <div className="ml-2 sm:ml-3 lg:ml-4">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Total Collections</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{collections.length}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] border border-gray-100"
                >
                  <div className="flex items-center">
                    <div className="p-1.5 sm:p-2 lg:p-3 bg-green-100 rounded-lg sm:rounded-xl">
                      <DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
                    </div>
                    <div className="ml-2 sm:ml-3 lg:ml-4">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Total Documents</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{totalDocuments}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] border border-gray-100"
                >
                  <div className="flex items-center">
                    <div className="p-1.5 sm:p-2 lg:p-3 bg-purple-100 rounded-lg sm:rounded-xl">
                      <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600" />
                    </div>
                    <div className="ml-2 sm:ml-3 lg:ml-4">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Mixed Collections</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{mixedCollections}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] border border-gray-100"
                >
                  <div className="flex items-center">
                    <div className="p-1.5 sm:p-2 lg:p-3 bg-orange-100 rounded-lg sm:rounded-xl">
                      <GlobeAltIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-orange-600" />
                    </div>
                    <div className="ml-2 sm:ml-3 lg:ml-4">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Website Collections</p>
                      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{websiteCollections}</p>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </div>

          {/* Mobile-First Search and Actions */}
          <div className="space-y-4 mb-6 sm:mb-8">
            {/* Search Bar with View Toggle and Action Button - Same Line */}
            <div className="flex gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={activeTab === 'library' ? "Search files..." : "Search collections..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm text-sm sm:text-base"
                />
              </div>
              
              {/* View Mode Toggle - Only show for Library */}
              {activeTab === 'library' && (
                <div className="flex items-center bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title="Grid View"
                  >
                    <Squares2X2Icon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title="List View"
                  >
                    <ListBulletIcon className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Action Button - Hidden on Mobile (FAB used instead) */}
              {activeTab === 'library' ? (
                <button
                  onClick={() => setShowFileUploadModal(true)}
                  className="hidden sm:inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-transparent text-sm font-semibold rounded-lg sm:rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <ArrowUpTrayIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="hidden xs:inline">Upload Files</span>
                  <span className="xs:hidden">Upload</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="hidden sm:inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-transparent text-sm font-semibold rounded-lg sm:rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="hidden xs:inline">Create Collection</span>
                  <span className="xs:hidden">Create</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4"
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    onClick={() => setError(null)}
                    className="inline-flex text-red-400 hover:text-red-500"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area - Library or Vector Base */}
        <AnimatePresence mode="wait">
          {activeTab === 'library' ? (
            <motion.div
              key="library"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <FileLibrary 
                viewMode={viewMode}
                searchTerm={searchTerm}
                onUpload={() => setShowFileUploadModal(true)}
                onFilesChange={handleFilesChange}
              />
            </motion.div>
          ) : (
            <motion.div
              key="vectorbase"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Vector Base Collections */}
              {filteredCollections.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="mx-auto h-24 w-24 text-gray-300 mb-6">
                    <BookOpenIcon className="h-full w-full" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {searchTerm ? 'No collections found' : 'No collections yet'}
                  </h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    {searchTerm 
                      ? 'Try adjusting your search terms or create a new collection.'
                      : 'Get started by creating your first knowledge base collection to power your AI agents.'
                    }
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <PlusIcon className="w-5 h-5 mr-2" />
                      Create Your First Collection
                    </button>
                  )}
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                  <AnimatePresence>
                    {filteredCollections.map((collection, index) => (
                      <motion.div
                        key={collection.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="h-full"
                      >
                        <CollectionCard
                          collection={collection} 
                          onAddWebsite={() => {
                            setSelectedCollection(collection)
                            setShowAddWebsiteModal(true)
                          }}
                          onUploadFile={() => {
                            setSelectedCollection(collection)
                            setShowUploadModal(true)
                          }}
                          onDelete={() => handleDeleteCollection(collection.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <CreateCollectionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateCollection}
      />

      <AddWebsiteModal
        isOpen={showAddWebsiteModal}
        onClose={() => setShowAddWebsiteModal(false)}
        onCrawl={handleAddWebsite} 
        collection={selectedCollection}
      />

      <UploadFileModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUploadFile}
        collection={selectedCollection}
      />

      <FileUploadModal
        isOpen={showFileUploadModal}
        onClose={() => setShowFileUploadModal(false)}
        onUploadSuccess={() => {
          // Refresh file library if needed
          console.log('Files uploaded successfully')
        }}
      />

      {/* Mobile Floating Action Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0 }}
        className="fixed bottom-6 right-6 z-50 sm:hidden"
      >
        {activeTab === 'library' ? (
          <button
            onClick={() => setShowFileUploadModal(true)}
            className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
            title="Upload Files"
          >
            <ArrowUpTrayIcon className="w-6 h-6 transition-transform group-hover:scale-110" />
          </button>
        ) : (
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
            title="Create Collection"
          >
            <PlusIcon className="w-6 h-6 transition-transform group-hover:scale-110" />
          </button>
        )}
      </motion.div>
    </div>
  )
} 