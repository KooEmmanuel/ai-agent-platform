'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
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
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useToast } from '../../../../components/ui/Toast'
import { apiClient } from '../../../../lib/api'
import ProjectDetails from './project-details'

interface Project {
  id: number
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
  created_at: string
  updated_at?: string
  task_count?: number
  team_member_count?: number
}

export default function ProjectManagementPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showProjectDetails, setShowProjectDetails] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [integrationId, setIntegrationId] = useState<number | null>(null)
  const [integrationConfig, setIntegrationConfig] = useState<any>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [useTemplate, setUseTemplate] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
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
    fetchProjectManagementIntegration()
  }, [])

  const fetchProjectManagementIntegration = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all integrations
      const integrationsResponse = await apiClient.getIntegrations()
      console.log('All integrations:', integrationsResponse)

      // Find project management integration
      const projectManagementIntegration = integrationsResponse.find(
        (integration: any) => integration.platform === 'project_management'
      )

      if (projectManagementIntegration) {
        console.log('Project Management integration found:', projectManagementIntegration)
        setIntegrationId(projectManagementIntegration.id)
        setIntegrationConfig(projectManagementIntegration.config)

        // Fetch projects for this integration
        const projectsResponse = await apiClient.getProjects(projectManagementIntegration.id)
        console.log('Projects API response:', projectsResponse)
        console.log('Projects count:', (projectsResponse as Project[]).length)
        setProjects(projectsResponse as Project[])

        // Fetch templates
        const templatesResponse = await apiClient.getProjectTemplates()
        console.log('Templates API response:', templatesResponse)
        console.log('Templates count:', (templatesResponse as any[]).length)
        setTemplates(templatesResponse as any[])

        // Set default template from config
        if (projectManagementIntegration.config?.default_project_template) {
          setSelectedTemplate(projectManagementIntegration.config.default_project_template)
        }
      } else {
        setError('Project Management integration not found. Please create one first.')
      }
    } catch (error) {
      console.error('Error fetching project management integration:', error)
      setError('Failed to load project management data')
    } finally {
      setLoading(false)
    }
  }

  const createProject = async () => {
    if (!integrationId) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Integration not found'
      })
      return
    }

    try {
      setIsCreatingProject(true)
      
      let projectData: any = {
        integration_id: integrationId,
        name: newProject.name,
        description: newProject.description || undefined,
        priority: newProject.priority,
        start_date: newProject.start_date ? new Date(newProject.start_date).toISOString() : undefined,
        end_date: newProject.end_date ? new Date(newProject.end_date).toISOString() : undefined,
        budget: newProject.budget ? parseFloat(newProject.budget) : undefined,
        color: newProject.color
      }

      let response
      if (useTemplate && selectedTemplate) {
        console.log('Creating project from template:', selectedTemplate)
        response = await apiClient.createProjectFromTemplate({
          integration_id: integrationId,
          name: newProject.name,
          template_id: selectedTemplate,
          start_date: newProject.start_date ? new Date(newProject.start_date).toISOString() : undefined,
          custom_settings: {
            priority: newProject.priority,
            budget: newProject.budget ? parseFloat(newProject.budget) : undefined,
            color: newProject.color
          }
        })
      } else {
        console.log('Creating regular project')
        response = await apiClient.createProject(projectData)
      }

      console.log('Project creation response:', response)
      console.log('Created project ID:', response.id)
      
      // Add a delay to allow user to see the success message
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Refresh projects list
      console.log('Refreshing projects list...')
      await fetchProjectManagementIntegration()
      console.log('Projects list refreshed')
      
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
      
      showToast({
        type: 'success',
        title: 'Project Created',
        message: 'Project has been created successfully'
      })
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

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project)
    setShowProjectDetails(true)
  }

  const handleBackToProjects = () => {
    setShowProjectDetails(false)
    setSelectedProject(null)
  }

  const handleProjectUpdate = (updatedProject: Project) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p))
    setSelectedProject(updatedProject)
  }

  const confirmDeleteProject = (projectId: number, projectName: string) => {
    console.log('🔍 Delete confirmation requested for project:', projectId, projectName)
    setProjectToDelete({ id: projectId, name: projectName })
    setShowDeleteConfirm(true)
  }

  const executeDeleteProject = async () => {
    if (!projectToDelete) return

    try {
      console.log('🗑️ Starting project deletion for ID:', projectToDelete.id)
      const response = await apiClient.deleteProject(projectToDelete.id)
      console.log('✅ Delete response:', response)
      
      // Remove project from local state
      setProjects(projects.filter(p => p.id !== projectToDelete.id))
      console.log('🔄 Updated projects list, removed project ID:', projectToDelete.id)
      
      // If the deleted project was selected, clear selection
      if (selectedProject?.id === projectToDelete.id) {
        setSelectedProject(null)
        setShowProjectDetails(false)
        console.log('🔄 Cleared selected project')
      }
      
      showToast({
        type: 'success',
        title: 'Project Deleted',
        message: `"${projectToDelete.name}" has been deleted successfully`
      })
    } catch (error) {
      console.error('❌ Error deleting project:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete project'
      })
    } finally {
      setShowDeleteConfirm(false)
      setProjectToDelete(null)
    }
  }

  const cancelDeleteProject = () => {
    setShowDeleteConfirm(false)
    setProjectToDelete(null)
  }

  const editProject = (project: Project) => {
    setEditingProject(project)
    setNewProject({
      name: project.name,
      description: project.description || '',
      priority: project.priority,
      start_date: project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '',
      end_date: project.end_date ? new Date(project.end_date).toISOString().split('T')[0] : '',
      budget: project.budget ? project.budget.toString() : '',
      color: project.color || '#3B82F6'
    })
    setShowEditProject(true)
  }

  const updateProject = async () => {
    if (!editingProject) return

    try {
      setIsUpdatingProject(true)
      
      const projectData = {
        name: newProject.name,
        description: newProject.description || undefined,
        priority: newProject.priority,
        start_date: newProject.start_date ? new Date(newProject.start_date).toISOString() : undefined,
        end_date: newProject.end_date ? new Date(newProject.end_date).toISOString() : undefined,
        budget: newProject.budget ? parseFloat(newProject.budget) : undefined,
        color: newProject.color
      }

      const response = await apiClient.updateProject(editingProject.id, projectData)
      console.log('Project update response:', response)
      
      // Update project in local state
      const updatedProject = { ...editingProject, ...projectData }
      setProjects(projects.map(p => p.id === editingProject.id ? updatedProject : p))
      
      // If the edited project was selected, update selection
      if (selectedProject?.id === editingProject.id) {
        setSelectedProject(updatedProject)
      }
      
      setShowEditProject(false)
      setEditingProject(null)
      
      showToast({
        type: 'success',
        title: 'Project Updated',
        message: `"${newProject.name}" has been updated successfully`
      })
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

  const cancelEditProject = () => {
    setShowEditProject(false)
    setEditingProject(null)
    setNewProject({
      name: '',
      description: '',
      priority: 'medium',
      start_date: '',
      end_date: '',
      budget: '',
      color: '#3B82F6'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date set'
    return new Date(dateString).toLocaleDateString()
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
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  // Show project details if a project is selected
  if (showProjectDetails && selectedProject) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ProjectDetails 
            project={selectedProject}
            onBack={handleBackToProjects}
            onProjectUpdate={handleProjectUpdate}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              {integrationConfig?.logo_url && (
                <img 
                  src={integrationConfig.logo_url} 
                  alt="Workspace Logo"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover shadow-lg shadow-blue-200/50 flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
                  {integrationConfig?.workspace_name || 'Project Management'}
                </h1>
                <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 font-medium">Manage your projects, tasks, and team collaboration</p>
              </div>
            </div>
            <button
              onClick={() => {
                console.log('Opening modal - Current templates:', templates)
                setShowCreateProject(true)
              }}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-200/50 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {projects.length === 0 ? (
            <div className="col-span-full">
              <div className="bg-white rounded-xl shadow-lg shadow-blue-200/50">
                <div className="px-6 py-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    <FolderIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
                  <p className="text-gray-600 mb-4">Create your first project to get started</p>
                  <button
                    onClick={() => setShowCreateProject(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-200/50 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                  >
                    Create Project
                  </button>
                </div>
              </div>
            </div>
          ) : (
            projects.map((project) => (
              <motion.div
                key={project.id}
                className="bg-white rounded-xl shadow-lg shadow-blue-200/50 p-4 sm:p-6 hover:shadow-xl hover:shadow-blue-200/60 transition-all duration-200 relative group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Action Buttons */}
                <div className="absolute top-3 right-3 flex space-x-1 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      editProject(project)
                    }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    title="Edit project"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('🗑️ Delete button clicked for project:', project.id, project.name)
                      confirmDeleteProject(project.id, project.name)
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                    title="Delete project"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
                <div 
                  className="mb-4 cursor-pointer"
                  onClick={() => handleProjectSelect(project)}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color || '#3B82F6' }}
                    ></div>
                    <h3 className="text-lg font-semibold text-gray-900 truncate flex-1">
                      {project.name}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {project.description || 'No description'}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
                      {project.priority}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <ChartBarIcon className="w-4 h-4" />
                      <span>{project.task_count || 0} tasks</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <UserGroupIcon className="w-4 h-4" />
                      <span>{project.team_member_count || 0} members</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{formatDate(project.start_date)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>{project.progress}%</span>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Create Project Modal */}
        {showCreateProject && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-4 sm:top-20 mx-auto p-4 sm:p-6 w-[95vw] sm:w-[600px] lg:w-[700px] max-w-4xl shadow-2xl shadow-blue-200/50 rounded-xl bg-white">
              <div className="mt-3">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Create New Project</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
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

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="useTemplate"
                      checked={useTemplate}
                      onChange={(e) => setUseTemplate(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="useTemplate" className="text-sm font-medium text-gray-700">
                      Use Project Template
                    </label>
                  </div>

                  {useTemplate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Template</label>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Choose a template...</option>
                        {templates.length > 0 ? (
                          templates.map((template) => {
                            console.log('Rendering template:', template)
                            return (
                              <option key={template.id} value={template.id}>
                                {template.name} ({template.estimated_duration})
                              </option>
                            )
                          })
                        ) : (
                          <option value="" disabled>No templates available (templates.length: {templates.length})</option>
                        )}
                      </select>
                      
                      {selectedTemplate && templates.find(t => t.id === selectedTemplate) && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>Description:</strong> {templates.find(t => t.id === selectedTemplate)?.description}
                          </p>
                          <p className="text-sm text-blue-800 mt-1">
                            <strong>Methodology:</strong> {templates.find(t => t.id === selectedTemplate)?.methodology}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
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
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={newProject.start_date}
                        onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={newProject.end_date}
                        onChange={(e) => setNewProject({ ...newProject, end_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Budget ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newProject.budget}
                        onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Color</label>
                    <input
                      type="color"
                      value={newProject.color}
                      onChange={(e) => setNewProject({ ...newProject, color: e.target.value })}
                      className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateProject(false)}
                    className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createProject}
                    disabled={!newProject.name.trim() || isCreatingProject}
                    className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-200/50 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isCreatingProject ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating...</span>
                      </>
                    ) : (
                      <span>Create Project</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Project Modal */}
        {showEditProject && editingProject && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-4 sm:top-20 mx-auto p-4 sm:p-6 w-[95vw] sm:w-[600px] lg:w-[700px] max-w-4xl shadow-2xl shadow-blue-200/50 rounded-xl bg-white">
              <div className="mt-3">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Edit Project</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
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
                  
                  <div className="grid grid-cols-2 gap-4">
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
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={newProject.start_date}
                        onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={newProject.end_date}
                        onChange={(e) => setNewProject({ ...newProject, end_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Budget ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newProject.budget}
                        onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Color</label>
                    <input
                      type="color"
                      value={newProject.color}
                      onChange={(e) => setNewProject({ ...newProject, color: e.target.value })}
                      className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                  <button
                    onClick={cancelEditProject}
                    className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateProject}
                    disabled={!newProject.name.trim() || isUpdatingProject}
                    className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-200/50 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isUpdatingProject ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Update Project</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Toast */}
        {showDeleteConfirm && projectToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl shadow-red-200/50 w-[95vw] sm:w-[400px] max-w-md">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <XMarkIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Delete Project</h3>
                    <p className="text-sm text-gray-600">This action cannot be undone</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <p className="text-gray-700">
                    Are you sure you want to delete <strong>"{projectToDelete.name}"</strong>?
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    This will permanently delete the project and all its tasks, milestones, and team members.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={cancelDeleteProject}
                    className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeDeleteProject}
                    className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete Project
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
