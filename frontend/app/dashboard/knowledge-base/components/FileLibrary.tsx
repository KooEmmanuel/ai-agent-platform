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
  onFilesChange?: (files: FileItem[]) => void
}

export default function FileLibrary({ viewMode, searchTerm, onUpload, onFilesChange }: FileLibraryProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set())
  const [showUploadArea, setShowUploadArea] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    loadFiles()
  }, [])

  // Notify parent when files change
  useEffect(() => {
    if (onFilesChange) {
      onFilesChange(files)
    }
  }, [files, onFilesChange])

  const loadFiles = async () => {
    try {
      setLoading(true)
      console.log('🔍 FileLibrary: Loading files...')
      const files = await apiClient.getFiles()
      console.log('📁 FileLibrary: Files received:', files)
      setFiles(files)
    } catch (err) {
      console.error('❌ FileLibrary: Failed to load files:', err)
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

  const handlePreview = (file: FileItem) => {
    window.open(file.blob_url, '_blank')
  }

  const handleDownload = (file: FileItem) => {
    const link = document.createElement('a')
    link.href = file.blob_url
    link.download = file.original_name
    link.click()
  }

  const handleBulkDownload = async () => {
    if (selectedFiles.size === 0) return
    
    const selectedFilesList = Array.from(selectedFiles)
    const filesToDownload = files.filter(file => selectedFilesList.includes(file.id))
    
    // Download each file
    filesToDownload.forEach(file => {
      const link = document.createElement('a')
      link.href = file.blob_url
      link.download = file.original_name
      link.click()
    })
  }

  const handleBulkShare = async () => {
    if (selectedFiles.size === 0) return
    
    // TODO: Implement bulk sharing functionality
    console.log('Bulk share not implemented yet')
    alert('Bulk sharing functionality will be implemented soon!')
  }

  const handleDeleteFile = async (fileId: number) => {
    try {
      setLoading(true)
      await apiClient.deleteFile(fileId)
      await loadFiles()
    } catch (err) {
      console.error('Failed to delete file:', err)
      setError('Failed to delete file')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} file(s)? This action cannot be undone.`)) {
      return
    }
    
    try {
      setLoading(true)
      const selectedFilesList = Array.from(selectedFiles)
      
      // Delete each file
      const deletePromises = selectedFilesList.map(fileId => 
        apiClient.deleteFile(fileId)
      )
      
      await Promise.all(deletePromises)
      await loadFiles()
      setSelectedFiles(new Set())
    } catch (err) {
      console.error('Failed to delete files:', err)
      setError('Failed to delete files')
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
    } else if (extension === '.pdf') {
      return <DocumentIcon className="w-8 h-8 text-red-500" />
    } else if (extension === '.doc' || extension === '.docx') {
      return <DocumentIcon className="w-8 h-8 text-blue-600" />
    } else if (extension === '.xls' || extension === '.xlsx') {
      return <DocumentIcon className="w-8 h-8 text-green-600" />
    } else if (extension === '.ppt' || extension === '.pptx') {
      return <DocumentIcon className="w-8 h-8 text-orange-600" />
    } else {
      return <DocumentIcon className="w-8 h-8 text-gray-500" />
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
  
  console.log('🔍 FileLibrary Debug:', {
    totalFiles: files.length,
    searchTerm,
    filteredFiles: filteredFiles.length,
    files: files.map(f => ({ id: f.id, name: f.original_name }))
  })

  console.log('🔍 FileLibrary State:', { loading, filesCount: files.length, filteredCount: filteredFiles.length })
  
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

      {/* Bulk Actions Bar - Mobile Responsive */}
      {selectedFiles.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedFiles.size} file{selectedFiles.size > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedFiles(new Set())}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleBulkDownload}
                className="px-2 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm bg-blue-600 text-white rounded-md sm:rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span className="hidden sm:inline">Download</span>
                <span className="sm:hidden">↓</span>
              </button>
              <button 
                onClick={handleBulkShare}
                className="px-2 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm bg-gray-600 text-white rounded-md sm:rounded-lg hover:bg-gray-700 transition-colors"
              >
                <span className="hidden sm:inline">Share</span>
                <span className="sm:hidden">↗</span>
              </button>
              <button 
                onClick={handleBulkDelete}
                className="px-2 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm bg-red-600 text-white rounded-md sm:rounded-lg hover:bg-red-700 transition-colors"
              >
                <span className="hidden sm:inline">Delete</span>
                <span className="sm:hidden">×</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
              <AnimatePresence>
                {filteredFiles.map((file, index) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className={`group relative bg-white rounded-xl sm:rounded-2xl border border-gray-200 hover:border-gray-300 p-3 sm:p-6 hover:shadow-xl transition-all duration-300 cursor-pointer ${
                      selectedFiles.has(file.id) ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' : ''
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
                    {/* Selection Indicator */}
                    {selectedFiles.has(file.id) && (
                      <div className="absolute top-3 left-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}

                    {/* File Preview/Icon - Mobile Responsive */}
                    <div className="flex justify-center mb-3 sm:mb-4">
                      {file.mime_type?.startsWith('image/') ? (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden bg-gray-100">
                          <img 
                            src={file.blob_url} 
                            alt={file.original_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                              if (nextElement) {
                                nextElement.style.display = 'flex'
                              }
                            }}
                          />
                          <div className="w-full h-full flex items-center justify-center" style={{display: 'none'}}>
                            {getFileIcon(file.mime_type, file.file_extension)}
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          {getFileIcon(file.mime_type, file.file_extension)}
                        </div>
                      )}
                    </div>
                    
                    {/* File Name - Mobile Responsive */}
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900 truncate mb-1 sm:mb-2 text-center" title={file.original_name}>
                      {file.original_name}
                    </h4>
                    
                    {/* File Info - Mobile Optimized */}
                    <div className="space-y-1 text-center">
                      <p className="text-xs text-gray-500 font-medium">
                        {formatFileSize(file.file_size)}
                      </p>
                      <p className="text-xs text-gray-400 hidden sm:block">
                        {new Date(file.created_at).toLocaleDateString()}
                      </p>
                      {file.is_public && (
                        <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <ShareIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                          <span className="hidden sm:inline">Shared</span>
                          <span className="sm:hidden">S</span>
                        </span>
                      )}
                    </div>
                    
                    {/* Actions Menu - Mobile Responsive */}
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex space-x-0.5 sm:space-x-1">
                        <button 
                          className="p-1.5 sm:p-2 rounded-md sm:rounded-lg hover:bg-gray-100 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePreview(file)
                          }}
                          title="Preview"
                        >
                          <EyeIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                        </button>
                        <button 
                          className="p-1.5 sm:p-2 rounded-md sm:rounded-lg hover:bg-gray-100 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(file)
                          }}
                          title="Download"
                        >
                          <ArrowDownTrayIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                        </button>
                        <button 
                          className="p-1.5 sm:p-2 rounded-md sm:rounded-lg hover:bg-gray-100 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            // TODO: Implement file actions menu
                          }}
                          title="More actions"
                        >
                          <EllipsisVerticalIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                        </button>
                      </div>
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
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handlePreview(file)
                                }}
                                className="text-blue-600 hover:text-blue-900"
                                title="Preview"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDownload(file)
                                }}
                                className="text-green-600 hover:text-green-900"
                                title="Download"
                              >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (confirm(`Are you sure you want to delete "${file.original_name}"?`)) {
                                    handleDeleteFile(file.id)
                                  }
                                }}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
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
