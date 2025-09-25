'use client'

import { useState, useEffect } from 'react'
import { 
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon,
  FolderIcon,
  ShareIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '../../../../lib/api'

interface FileItem {
  id: number
  original_name: string
  stored_name: string
  blob_url: string
  file_size: number
  mime_type: string
  file_extension: string
  folder_path: string
  is_public: boolean
  created_at: string
  expires_at?: string
}

interface FileLibraryProps {
  viewMode: 'grid' | 'list'
  searchTerm: string
  onUpload: () => void
}

export default function FileLibrary({ viewMode, searchTerm, onUpload }: FileLibraryProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set())
  const [showUploadArea, setShowUploadArea] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      setLoading(true)
      const files = await apiClient.getFiles()
      setFiles(files)
    } catch (err) {
      console.error('Failed to load files:', err)
      setError('Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (uploadedFiles: FileList) => {
    try {
      setLoading(true)
      
      // Upload each file
      const uploadPromises = Array.from(uploadedFiles).map(file => 
        apiClient.uploadFile(file)
      )
      
      await Promise.all(uploadPromises)
      await loadFiles()
      setShowUploadArea(false)
    } catch (err) {
      console.error('Failed to upload files:', err)
      setError('Failed to upload files')
    } finally {
      setLoading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      handleFileUpload(droppedFiles)
    }
  }

  const getFileIcon = (mimeType: string, extension: string) => {
    if (mimeType.startsWith('image/')) {
      return <PhotoIcon className="w-8 h-8 text-green-500" />
    } else if (mimeType.startsWith('video/')) {
      return <FilmIcon className="w-8 h-8 text-purple-500" />
    } else if (mimeType.startsWith('audio/')) {
      return <MusicalNoteIcon className="w-8 h-8 text-pink-500" />
    } else if (extension === '.zip' || extension === '.rar' || extension === '.7z') {
      return <ArchiveBoxIcon className="w-8 h-8 text-orange-500" />
    } else {
      return <DocumentIcon className="w-8 h-8 text-blue-500" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const filteredFiles = files.filter(file =>
    file.original_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading files...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <AnimatePresence>
        {showUploadArea && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {dragOver ? 'Drop files here' : 'Upload files'}
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop files here, or click to browse
            </p>
            <input
              type="file"
              multiple
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
            >
              Choose Files
            </label>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Files Content */}
      {filteredFiles.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="mx-auto h-24 w-24 text-gray-300 mb-6">
            <FolderIcon className="h-full w-full" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm ? 'No files found' : 'No files yet'}
          </h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {searchTerm 
              ? 'Try adjusting your search terms or upload new files.'
              : 'Get started by uploading your first files to your library.'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowUploadArea(true)}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <CloudArrowUpIcon className="w-5 h-5 mr-2" />
              Upload Your First Files
            </button>
          )}
        </motion.div>
      ) : (
        <>
          {/* Files Grid/List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              <AnimatePresence>
                {filteredFiles.map((file, index) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className={`group relative bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all duration-200 cursor-pointer ${
                      selectedFiles.has(file.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      const newSelected = new Set(selectedFiles)
                      if (newSelected.has(file.id)) {
                        newSelected.delete(file.id)
                      } else {
                        newSelected.add(file.id)
                      }
                      setSelectedFiles(newSelected)
                    }}
                  >
                    {/* File Icon */}
                    <div className="flex justify-center mb-3">
                      {getFileIcon(file.mime_type, file.file_extension)}
                    </div>
                    
                    {/* File Name */}
                    <h4 className="text-sm font-medium text-gray-900 truncate mb-1" title={file.original_name}>
                      {file.original_name}
                    </h4>
                    
                    {/* File Size */}
                    <p className="text-xs text-gray-500 mb-2">
                      {formatFileSize(file.file_size)}
                    </p>
                    
                    {/* File Date */}
                    <p className="text-xs text-gray-400">
                      {new Date(file.created_at).toLocaleDateString()}
                    </p>
                    
                    {/* Actions Menu */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 rounded-md hover:bg-gray-100">
                        <EllipsisVerticalIcon className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Modified
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <AnimatePresence>
                      {filteredFiles.map((file) => (
                        <motion.tr
                          key={file.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`hover:bg-gray-50 cursor-pointer ${
                            selectedFiles.has(file.id) ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => {
                            const newSelected = new Set(selectedFiles)
                            if (newSelected.has(file.id)) {
                              newSelected.delete(file.id)
                            } else {
                              newSelected.add(file.id)
                            }
                            setSelectedFiles(newSelected)
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                {getFileIcon(file.mime_type, file.file_extension)}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {file.original_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {file.file_extension.toUpperCase()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatFileSize(file.file_size)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(file.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button className="text-blue-600 hover:text-blue-900">
                                <EyeIcon className="w-4 h-4" />
                              </button>
                              <button className="text-green-600 hover:text-green-900">
                                <ArrowDownTrayIcon className="w-4 h-4" />
                              </button>
                              <button className="text-red-600 hover:text-red-900">
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
