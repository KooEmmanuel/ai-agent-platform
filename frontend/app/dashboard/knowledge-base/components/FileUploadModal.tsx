'use client'

import { useState, useRef } from 'react'
import { 
  XMarkIcon, 
  CloudArrowUpIcon, 
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '../../../../lib/api'

interface FileUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadSuccess?: () => void
}

interface UploadFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

export default function FileUploadModal({ isOpen, onClose, onUploadSuccess }: FileUploadModalProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <PhotoIcon className="w-8 h-8 text-green-500" />
    } else if (file.type.startsWith('video/')) {
      return <FilmIcon className="w-8 h-8 text-purple-500" />
    } else if (file.type.startsWith('audio/')) {
      return <MusicalNoteIcon className="w-8 h-8 text-pink-500" />
    } else if (file.name.endsWith('.zip') || file.name.endsWith('.rar') || file.name.endsWith('.7z')) {
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

  const handleFileSelect = (selectedFiles: FileList) => {
    const newFiles: UploadFile[] = Array.from(selectedFiles).map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      progress: 0
    }))
    setFiles(prev => [...prev, ...newFiles])
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
    handleFileSelect(e.dataTransfer.files)
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const uploadFiles = async () => {
    if (files.length === 0) return

    setUploading(true)
    
    try {
      const uploadPromises = files.map(async (uploadFile) => {
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        ))

        try {
          // Simulate progress
          const progressInterval = setInterval(() => {
            setFiles(prev => prev.map(f => 
              f.id === uploadFile.id && f.progress < 90
                ? { ...f, progress: f.progress + 10 }
                : f
            ))
          }, 100)

          const result = await apiClient.uploadFile(uploadFile.file)
          
          clearInterval(progressInterval)
          
          if (result.success) {
            setFiles(prev => prev.map(f => 
              f.id === uploadFile.id 
                ? { ...f, status: 'success', progress: 100 }
                : f
            ))
          } else {
            throw new Error(result.error || 'Upload failed')
          }
        } catch (error) {
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
              : f
          ))
        }
      })

      await Promise.all(uploadPromises)
      
      // Check if all uploads were successful
      const allSuccessful = files.every(f => f.status === 'success')
      if (allSuccessful) {
        onUploadSuccess?.()
        handleClose()
      }
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFiles([])
    setUploading(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Upload Files</h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Drop Zone */}
              <div
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
                  {dragOver ? 'Drop files here' : 'Upload files to your library'}
                </h3>
                <p className="text-gray-600 mb-4">
                  Drag and drop files here, or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                >
                  Choose Files
                </button>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">Files to upload ({files.length})</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {files.map((uploadFile) => (
                      <div
                        key={uploadFile.id}
                        className="flex items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-shrink-0 mr-3">
                          {getFileIcon(uploadFile.file)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {uploadFile.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(uploadFile.file.size)}
                          </p>
                          {uploadFile.status === 'uploading' && (
                            <div className="mt-2">
                              <div className="bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${uploadFile.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                          {uploadFile.status === 'error' && uploadFile.error && (
                            <p className="text-xs text-red-600 mt-1 flex items-center">
                              <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                              {uploadFile.error}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 ml-3">
                          {uploadFile.status === 'success' && (
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          {uploadFile.status !== 'success' && (
                            <button
                              onClick={() => removeFile(uploadFile.id)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <XMarkIcon className="w-4 h-4 text-gray-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={uploadFiles}
                disabled={files.length === 0 || uploading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}
