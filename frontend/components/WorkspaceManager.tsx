'use client'

import React, { useState, useEffect } from 'react'
import { FolderIcon, FolderOpenIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { HiPencilAlt } from "react-icons/hi"
import { apiClient, Workspace } from '../lib/api'

interface WorkspaceManagerProps {
  agentId: number
  selectedWorkspaceId?: number
  onWorkspaceSelect: (workspaceId: number | undefined) => void
  onWorkspaceCreate: (workspace: Workspace) => void
}

export default function WorkspaceManager({
  agentId,
  selectedWorkspaceId,
  onWorkspaceSelect,
  onWorkspaceCreate
}: WorkspaceManagerProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: '📁'
  })

  useEffect(() => {
    loadWorkspaces()
  }, [agentId])

  const loadWorkspaces = async () => {
    try {
      setLoading(true)
      const workspacesData = await apiClient.getWorkspaces(agentId)
      setWorkspaces(workspacesData)
    } catch (error) {
      console.error('Failed to load workspaces:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newWorkspace = await apiClient.createWorkspace(agentId, formData)
      setWorkspaces(prev => [newWorkspace, ...prev])
      onWorkspaceCreate(newWorkspace)
      setShowCreateForm(false)
      setShowIconPicker(false)
      setShowColorPicker(false)
      setFormData({ name: '', description: '', color: '#3B82F6', icon: '📁' })
    } catch (error) {
      console.error('Failed to create workspace:', error)
    }
  }

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingWorkspace) return

    try {
      const updatedWorkspace = await apiClient.updateWorkspace(agentId, editingWorkspace.id, formData)
      setWorkspaces(prev => prev.map(w => w.id === editingWorkspace.id ? updatedWorkspace : w))
      setEditingWorkspace(null)
      setShowIconPicker(false)
      setShowColorPicker(false)
      setFormData({ name: '', description: '', color: '#3B82F6', icon: '📁' })
    } catch (error) {
      console.error('Failed to update workspace:', error)
    }
  }

  const handleDeleteWorkspace = async (workspace: Workspace) => {
    if (workspace.is_default) {
      alert('Cannot delete default workspace')
      return
    }

    if (confirm(`Are you sure you want to delete "${workspace.name}"?`)) {
      try {
        await apiClient.deleteWorkspace(agentId, workspace.id)
        setWorkspaces(prev => prev.filter(w => w.id !== workspace.id))
        if (selectedWorkspaceId === workspace.id) {
          onWorkspaceSelect(undefined)
        }
      } catch (error) {
        console.error('Failed to delete workspace:', error)
      }
    }
  }

  const startEdit = (workspace: Workspace) => {
    setEditingWorkspace(workspace)
    setFormData({
      name: workspace.name,
      description: workspace.description || '',
      color: workspace.color || '#3B82F6',
      icon: workspace.icon || '📁'
    })
  }

  const cancelEdit = () => {
    setEditingWorkspace(null)
    setShowIconPicker(false)
    setShowColorPicker(false)
    setFormData({ name: '', description: '', color: '#3B82F6', icon: '📁' })
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Workspaces</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          title="New Workspace"
        >
          <HiPencilAlt className="w-4 h-4" />
        </button>
      </div>

      {/* Workspace List */}
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {/* Default/All Conversations */}
        <button
          onClick={() => onWorkspaceSelect(undefined)}
          className={`w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors ${
            selectedWorkspaceId === undefined
              ? 'bg-blue-50 border border-blue-200'
              : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
          }`}
        >
          <FolderIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">All Conversations</div>
          </div>
        </button>

        {/* Workspaces */}
        {workspaces.map((workspace) => (
          <div
            key={workspace.id}
            className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
              selectedWorkspaceId === workspace.id
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
            }`}
          >
            <button
              onClick={() => onWorkspaceSelect(workspace.id)}
              className="flex-1 flex items-center gap-2 text-left min-w-0"
            >
              <span className="text-sm flex-shrink-0">{workspace.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{workspace.name}</div>
              </div>
            </button>
            
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => startEdit(workspace)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Edit workspace"
              >
                <PencilIcon className="w-3 h-3" />
              </button>
              {!workspace.is_default && (
                <button
                  onClick={() => handleDeleteWorkspace(workspace)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete workspace"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingWorkspace) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold mb-3">
              {editingWorkspace ? 'Edit Workspace' : 'Create New Workspace'}
            </h3>
            
            <form onSubmit={editingWorkspace ? handleUpdateWorkspace : handleCreateWorkspace}>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors"
                        style={{ backgroundColor: formData.color }}
                        title="Choose color"
                      />
                      <span className="text-sm text-gray-600">{formData.color}</span>
                    </div>
                    
                    {/* Color Picker Grid */}
                    {showColorPicker && (
                      <div className="absolute z-10 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg grid grid-cols-6 gap-2 max-w-48">
                        {[
                          '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
                          '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6', '#F43F5E',
                          '#8B5A2B', '#6B7280', '#374151', '#1F2937', '#111827', '#000000'
                        ].map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, color }))
                              setShowColorPicker(false)
                            }}
                            className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Icon
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowIconPicker(!showIconPicker)}
                        className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors flex items-center justify-center text-lg"
                        title="Choose icon"
                      >
                        {formData.icon}
                      </button>
                      <span className="text-sm text-gray-600">{formData.icon}</span>
                    </div>
                    
                    {/* Icon Picker Grid */}
                    {showIconPicker && (
                      <div className="absolute z-10 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg grid grid-cols-6 gap-2 max-w-48">
                        {[
                          '📁', '📂', '💼', '🏢', '🎯', '⚡',
                          '🔥', '💡', '🚀', '⭐', '❤️', '🎨',
                          '📊', '📈', '📝', '🔧', '⚙️', '🎪',
                          '🏠', '🌍', '💻', '📱', '🎵', '🎮',
                          '📚', '🔍', '💎', '🌟', '🎭', '🎨'
                        ].map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, icon }))
                              setShowIconPicker(false)
                            }}
                            className="w-8 h-8 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center text-lg"
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={editingWorkspace ? cancelEdit : () => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                >
                  {editingWorkspace ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}