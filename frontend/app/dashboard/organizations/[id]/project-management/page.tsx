'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { 
  PlusIcon,
  FolderIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  XMarkIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { useToast } from '../../../../../components/ui/Toast'
import { apiClient } from '../../../../../lib/api'

interface Project {
  id: number
  organization_id: number
  integration_id: number
  name: string
  description?: string
  status: string
  priority: string
  start_date?: string
  end_date?: string
  budget?: number
  progress: number
  color?: string
  icon?: string
  settings?: Record<string, any>
  created_by_id: number
  created_at: string
  updated_at?: string
  task_count?: number
  team_member_count?: number
}

interface Integration {
  id: number
  organization_id: number
  agent_id: number
  platform: string
  config: Record<string, any>
  webhook_url?: string
  is_active: boolean
  created_by_id: number
  created_at: string
  updated_at?: string
}

export default function OrganizationProjectManagementPage() {
  const params = useParams()
  const router = useRouter()
  const organizationId = parseInt(params.id as string)
  
  const [projects, setProjects] = useState<Project[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<{id: number, name: string} | null>(null)
  const [showEditProject, setShowEditProject] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isUpdatingProject, setIsUpdatingProject] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    priority: 'medium',
    start_date: '',
    end_date: '',
    budget: '',
    color: '#3B82F6'
  })

  const { showToast } = useToast()

  useEffect(() => {
    fetchData()
  }, [organizationId])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch organization integrations
      const integrationsResponse = await apiClient.getOrganizationIntegrations(organizationId)
      const projectManagementIntegrations = integrationsResponse.filter(
        (integration: Integration) => integration.platform === 'project_management'
      )
      setIntegrations(projectManagementIntegrations as Integration[])

      if (projectManagementIntegrations.length > 0) {
        // Fetch projects for the first project management integration
        const projectsResponse = await apiClient.getOrganizationProjects(
          organizationId, 
          projectManagementIntegrations[0].id
        )
        setProjects(projectsResponse)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load project management data')
    } finally {
      setLoading(false)
    }
  }

  const createProject = async () => {
    if (integrations.length === 0) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'No project management integration found'
      })
      return
    }

    try {
      setIsCreatingProject(true)
      
      const projectData = {
        integration_id: integrations[0].id,
        name: newProject.name,
        description: newProject.description || undefined,
        priority: newProject.priority,
        start_date: newProject.start_date ? new Date(newProject.start_date).toISOString() : undefined,
        end_date: newProject.end_date ? new Date(newProject.end_date).toISOString() : undefined,
        budget: newProject.budget ? parseFloat(newProject.budget) : undefined,
        color: newProject.color
      }

      await apiClient.createOrganizationProject(organizationId, projectData)
      
      showToast({
        type: 'success',
        title: 'Success',
        message: 'Project created successfully'
      })
      
      // Reset form
      setNewProject({
        name: '',
        description: '',
        priority: 'medium',
        start_date: '',
        end_date: '',
        budget: '',
        color: '#3B82F6'
      })
      setShowCreateProject(false)
      
      // Refresh projects list
      await fetchData()
    } catch (error) {
      console.error('Error creating project:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to create project'
      })
    } finally {
      setIsCreatingProject(false)
    }
  }

  const updateProject = async () => {
    if (!editingProject) return

    try {
      setIsUpdatingProject(true)
      
      const updateData = {
        name: newProject.name,
        description: newProject.description || undefined,
        priority: newProject.priority,
        start_date: newProject.start_date ? new Date(newProject.start_date).toISOString() : undefined,
        end_date: newProject.end_date ? new Date(newProject.end_date).toISOString() : undefined,
        budget: newProject.budget ? parseFloat(newProject.budget) : undefined,
        color: newProject.color
      }

      await apiClient.updateOrganizationProject(organizationId, editingProject.id, updateData)
      
      showToast({
        type: 'success',
        title: 'Success',
        message: 'Project updated successfully'
      })
      
      setShowEditProject(false)
      setEditingProject(null)
      
      // Refresh projects list
      await fetchData()
    } catch (error) {
      console.error('Error updating project:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update project'
      })
    } finally {
      setIsUpdatingProject(false)
    }
  }

  const deleteProject = async () => {
    if (!projectToDelete) return

    try {
      await apiClient.deleteOrganizationProject(organizationId, projectToDelete.id)
      
      showToast({
        type: 'success',
        title: 'Success',
        message: 'Project deleted successfully'
      })
      
      setShowDeleteConfirm(false)
      setProjectToDelete(null)
      
      // Refresh projects list
      await fetchData()
    } catch (error) {
      console.error('Error deleting project:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete project'
      })
    }
  }

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    setNewProject({
      name: project.name,
      description: project.description || '',
      priority: project.priority,
      start_date: project.start_date ? project.start_date.split('T')[0] : '',
      end_date: project.end_date ? project.end_date.split('T')[0] : '',
      budget: project.budget ? project.budget.toString() : '',
      color: project.color || '#3B82F6'
    })
    setShowEditProject(true)
  }

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete({ id: project.id, name: project.name })
    setShowDeleteConfirm(true)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <PlayIcon className="w-4 h-4 text-green-500" />
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-blue-500" />
      case 'paused':
        return <PauseIcon className="w-4 h-4 text-yellow-500" />
      case 'cancelled':
        return <XMarkIcon className="w-4 h-4 text-red-500" />
      default:
        return <ClockIcon className="w-4 h-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project management...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto" />
          <p className="mt-4 text-red-600">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Project Management</h1>
                <p className="text-sm text-gray-600">Manage organization projects</p>
              </div>
            </div>
            {integrations.length > 0 && (
              <button
                onClick={() => setShowCreateProject(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Project
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {integrations.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Management Integration</h3>
            <p className="text-gray-600 mb-6">You need to create a project management integration first.</p>
            <button
              onClick={() => router.push(`/dashboard/organizations/${organizationId}/integrations?platform=project_management`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Project Management Integration
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Yet</h3>
            <p className="text-gray-600 mb-6">Create your first project to get started.</p>
            <button
              onClick={() => setShowCreateProject(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/dashboard/organizations/${organizationId}/project-management/${project.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: project.color || '#3B82F6' }}
                    >
                      {project.icon || project.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3">
                      <h3 className="font-semibold text-gray-900">{project.name}</h3>
                      <div className="flex items-center mt-1">
                        {getStatusIcon(project.status)}
                        <span className="ml-1 text-sm text-gray-600 capitalize">{project.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditProject(project)
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteProject(project)
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {project.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Priority</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
                      {project.priority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <UserGroupIcon className="w-4 h-4 mr-1" />
                    {project.team_member_count || 0}
                  </div>
                  <div className="flex items-center">
                    <ChartBarIcon className="w-4 h-4 mr-1" />
                    {project.task_count || 0} tasks
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create New Project</h2>
              <button
                onClick={() => setShowCreateProject(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter project description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={newProject.priority}
                  onChange={(e) => setNewProject({ ...newProject, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newProject.start_date}
                    onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newProject.end_date}
                    onChange={(e) => setNewProject({ ...newProject, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                <input
                  type="number"
                  value={newProject.budget}
                  onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter budget"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="color"
                  value={newProject.color}
                  onChange={(e) => setNewProject({ ...newProject, color: e.target.value })}
                  className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateProject(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={!newProject.name || isCreatingProject}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isCreatingProject ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditProject && editingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Project</h2>
              <button
                onClick={() => setShowEditProject(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter project description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={newProject.priority}
                  onChange={(e) => setNewProject({ ...newProject, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newProject.start_date}
                    onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newProject.end_date}
                    onChange={(e) => setNewProject({ ...newProject, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                <input
                  type="number"
                  value={newProject.budget}
                  onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter budget"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="color"
                  value={newProject.color}
                  onChange={(e) => setNewProject({ ...newProject, color: e.target.value })}
                  className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditProject(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={updateProject}
                disabled={!newProject.name || isUpdatingProject}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isUpdatingProject ? 'Updating...' : 'Update Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && projectToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-500 mr-3" />
              <h2 className="text-lg font-semibold">Delete Project</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{projectToDelete.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={deleteProject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
