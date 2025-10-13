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
  EyeIcon
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
  created_at: string
  updated_at?: string
  task_count: number
  team_member_count: number
}

interface Task {
  id: number
  project_id: number
  title: string
  description?: string
  status: string
  priority: string
  assignee_id?: number
  due_date?: string
  estimated_hours?: number
  actual_hours: number
  progress: number
  created_at: string
  assignee_name?: string
  subtask_count: number
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
      
      // Get all integrations and find the project management one
      const integrations = await apiClient.getIntegrations()
      console.log('All integrations:', integrations)
      const pmIntegration = integrations.find((integration: any) => integration.platform === 'project_management')
      console.log('Project Management integration found:', pmIntegration)
      
      if (pmIntegration) {
        setIntegrationId(pmIntegration.id)
        setIntegrationConfig(pmIntegration.config)
        
        // Set default template from integration config
        if (pmIntegration.config?.default_project_template) {
          setSelectedTemplate(pmIntegration.config.default_project_template)
        }
        
        // Fetch templates and projects
        await Promise.all([
          fetchTemplates(),
          fetchProjects(pmIntegration.id)
        ])
      } else {
        setError('No project management integration found. Please create one first.')
        setLoading(false)
      }
    } catch (error) {
      console.error('Error fetching project management integration:', error)
      setError('Failed to load project management integration')
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await apiClient.getProjectTemplates()
      console.log('Templates API response:', response)
      console.log('Templates count:', (response as any[])?.length || 0)
      console.log('Templates data:', JSON.stringify(response, null, 2))
      setTemplates(response as any[])
    } catch (error) {
      console.error('Error fetching templates:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load project templates'
      })
    }
  }

  useEffect(() => {
    if (selectedProject) {
      fetchProjectTasks(selectedProject.id)
    }
  }, [selectedProject])

  // Debug: Log templates when they change
  useEffect(() => {
    console.log('Templates state updated:', templates)
    console.log('Templates length:', templates.length)
  }, [templates])

  const fetchProjects = async (integrationId?: number) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.getProjects(integrationId)
      console.log('Projects API response:', response)
      console.log('Projects count:', (response as any[])?.length || 0)
      setProjects(response as Project[])
    } catch (error) {
      console.error('Error fetching projects:', error)
      setError('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }


  const createProject = async () => {
    if (!integrationId) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'No project management integration found'
      })
      return
    }

    setIsCreatingProject(true)
    try {
      let response

      if (useTemplate && selectedTemplate) {
        // Create project from template
        const templateData = {
          integration_id: integrationId,
          name: newProject.name,
          template_id: selectedTemplate,
          start_date: newProject.start_date ? new Date(newProject.start_date).toISOString() : null,
          custom_settings: {
            priority: newProject.priority,
            budget: newProject.budget ? parseFloat(newProject.budget) : null,
            color: newProject.color,
            description: newProject.description
          }
        }

        console.log('Creating project from template:', templateData)
        response = await apiClient.createProjectFromTemplate(templateData)
        console.log('Template project created:', response)
        console.log('Project details:', {
          id: response.id,
          name: response.name,
          task_count: response.task_count,
          team_member_count: response.team_member_count
        })
        
        showToast({
          type: 'success',
          title: 'Project Created',
          message: `Project created successfully from ${templates.find(t => t.id === selectedTemplate)?.name} template!`
        })
        
        // Add delay to see the project being added
        await new Promise(resolve => setTimeout(resolve, 1000))
      } else {
        // Create basic project
        const projectData = {
          integration_id: integrationId,
          name: newProject.name,
          description: newProject.description,
          priority: newProject.priority,
          start_date: newProject.start_date ? new Date(newProject.start_date).toISOString() : null,
          end_date: newProject.end_date ? new Date(newProject.end_date).toISOString() : null,
          budget: newProject.budget ? parseFloat(newProject.budget) : null,
          color: newProject.color
        }

        console.log('Creating basic project:', projectData)
        response = await apiClient.createProject(projectData)
        console.log('Basic project created:', response)
        console.log('Project details:', {
          id: response.id,
          name: response.name,
          task_count: response.task_count,
          team_member_count: response.team_member_count
        })
        
        showToast({
          type: 'success',
          title: 'Project Created',
          message: 'Project created successfully!'
        })
        
        // Add delay to see the project being added
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      setProjects([response, ...projects])
      setShowCreateProject(false)
      setNewProject({
        name: '',
        description: '',
        priority: 'medium',
        start_date: '',
        end_date: '',
        budget: '',
        color: '#3B82F6'
      })
    } catch (error) {
      console.error('Error creating project:', error)
      console.error('Error details:', error.response?.data || error.message)
      showToast({
        type: 'error',
        title: 'Error',
        message: `Failed to create project: ${error.response?.data?.detail || error.message}`
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

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'review': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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
              className="inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 text-sm font-semibold rounded-xl shadow-lg shadow-blue-200/50 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 w-full sm:w-auto"
            >
              <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">New Project</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 rounded-xl p-4 shadow-lg shadow-red-200/50">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Projects List */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white rounded-xl shadow-lg shadow-blue-200/50">
              <div className="px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {projects.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                      <FolderIcon className="h-8 w-8 text-blue-500" />
                    </div>
                    <p className="text-gray-600 font-medium">No projects yet</p>
                    <p className="text-sm text-gray-500 mt-1">Create your first project to get started</p>
                  </div>
                ) : (
                  projects.map((project) => (
                    <motion.div
                      key={project.id}
                      className={`p-4 sm:p-6 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 rounded-lg mx-1 sm:mx-2 my-1 ${
                        selectedProject?.id === project.id ? 'bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md shadow-blue-200/50' : ''
                      }`}
                      onClick={() => handleProjectSelect(project)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2 sm:mr-3 flex-shrink-0"
                              style={{ backgroundColor: project.color || '#3B82F6' }}
                            />
                            <h3 className="text-sm font-medium text-gray-900 truncate">{project.name}</h3>
                          </div>
                          {project.description && (
                            <p className="mt-1 text-xs sm:text-sm text-gray-500 line-clamp-2">{project.description}</p>
                          )}
                          <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              <CheckCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              {project.task_count} tasks
                            </span>
                            <span className="flex items-center">
                              <UserGroupIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              {project.team_member_count} members
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1 sm:space-y-2 ml-2">
                          <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                            {project.status}
                          </span>
                          <div className="w-12 sm:w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

                {/* Project Header */}
                <div className="bg-white rounded-xl shadow-lg shadow-blue-200/50">
                  <div className="px-4 sm:px-6 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                      <div className="flex items-center min-w-0 flex-1">
                        <div 
                          className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
                          style={{ backgroundColor: selectedProject.color || '#3B82F6' }}
                        />
                        <div className="min-w-0 flex-1">
                          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{selectedProject.name}</h2>
                          <p className="text-sm text-gray-500 truncate">{selectedProject.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(selectedProject.status)}`}>
                          {selectedProject.status}
                        </span>
                        <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getPriorityColor(selectedProject.priority)}`}>
                          {selectedProject.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 sm:px-6 py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                      <div className="text-center">
                        <div className="text-xl sm:text-2xl font-bold text-gray-900">{selectedProject.progress}%</div>
                        <div className="text-xs sm:text-sm text-gray-500">Progress</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl sm:text-2xl font-bold text-gray-900">{selectedProject.task_count}</div>
                        <div className="text-xs sm:text-sm text-gray-500">Tasks</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl sm:text-2xl font-bold text-gray-900">{selectedProject.team_member_count}</div>
                        <div className="text-xs sm:text-sm text-gray-500">Members</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg sm:text-2xl font-bold text-gray-900">
                          {selectedProject.budget ? `$${selectedProject.budget.toLocaleString()}` : 'N/A'}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">Budget</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tasks */}
                <div className="bg-white rounded-xl shadow-lg shadow-blue-200/50">
                  <div className="px-4 sm:px-6 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                      <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
                      <button
                        onClick={() => setShowCreateTask(true)}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm shadow-blue-200/50 w-full sm:w-auto"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Task
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {tasks.length === 0 ? (
                      <div className="px-6 py-8 text-center">
                        <CheckCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No tasks yet</p>
                        <p className="text-sm text-gray-400 mt-1">Create your first task to get started</p>
                      </div>
                    ) : (
                      tasks.map((task) => (
                        <div key={task.id} className="px-4 sm:px-6 py-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 truncate">{task.title}</h4>
                              {task.description && (
                                <p className="mt-1 text-xs sm:text-sm text-gray-500 line-clamp-2">{task.description}</p>
                              )}
                              <div className="mt-2 flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs text-gray-500">
                                {task.assignee_name && (
                                  <span className="truncate">Assigned to {task.assignee_name}</span>
                                )}
                                {task.due_date && (
                                  <span className="flex items-center">
                                    <CalendarIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                                    {new Date(task.due_date).toLocaleDateString()}
                                  </span>
                                )}
                                {task.estimated_hours && (
                                  <span className="flex items-center">
                                    <ClockIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                                    {task.estimated_hours}h estimated
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 ml-2">
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                                  {task.status.replace('_', ' ')}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                              </div>
                              <div className="w-12 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full"
                                  style={{ width: `${task.progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg shadow-blue-200/50">
                <div className="px-6 py-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    <FolderIcon className="h-10 w-10 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Project</h3>
                  <p className="text-gray-600">Choose a project from the list to view its details and tasks</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Project Modal */}
        {showCreateProject && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-4 sm:top-20 mx-auto p-4 sm:p-6 w-[95vw] sm:w-[600px] lg:w-[700px] max-w-4xl shadow-2xl shadow-blue-200/50 rounded-xl bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Project</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Project Name</label>
                    <input
                      type="text"
                      value={newProject.name}
                      onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter project name"
                    />
                  </div>
                  
                  {/* Template Selection */}
                  <div className="border-t pt-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <input
                        type="checkbox"
                        id="useTemplate"
                        checked={useTemplate}
                        onChange={(e) => setUseTemplate(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="useTemplate" className="text-sm font-medium text-gray-700">
                        Use Project Template
                      </label>
                    </div>
                    
                    {useTemplate && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Template</label>
                        <select
                          value={selectedTemplate}
                          onChange={(e) => setSelectedTemplate(e.target.value)}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                        {selectedTemplate && (
                          <div className="mt-2 p-3 bg-blue-50 rounded-md">
                            <p className="text-sm text-blue-800">
                              <strong>{templates.find(t => t.id === selectedTemplate)?.name}</strong>
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              {templates.find(t => t.id === selectedTemplate)?.description}
                            </p>
                            <p className="text-xs text-blue-600">
                              Methodology: {templates.find(t => t.id === selectedTemplate)?.methodology}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={newProject.description}
                      onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter project description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Priority</label>
                      <select
                        value={newProject.priority}
                        onChange={(e) => setNewProject({...newProject, priority: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Color</label>
                      <input
                        type="color"
                        value={newProject.color}
                        onChange={(e) => setNewProject({...newProject, color: e.target.value})}
                        className="mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Start Date</label>
                      <input
                        type="date"
                        value={newProject.start_date}
                        onChange={(e) => setNewProject({...newProject, start_date: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">End Date</label>
                      <input
                        type="date"
                        value={newProject.end_date}
                        onChange={(e) => setNewProject({...newProject, end_date: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Budget</label>
                    <input
                      type="number"
                      value={newProject.budget}
                      onChange={(e) => setNewProject({...newProject, budget: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter budget amount"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateProject(false)}
                    className="px-6 py-2 text-sm font-semibold rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createProject}
                    disabled={!newProject.name || isCreatingProject}
                    className="px-6 py-2 text-sm font-semibold rounded-lg shadow-lg shadow-blue-200/50 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 w-full sm:w-auto"
                  >
                    {isCreatingProject ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Task Modal */}
        {showCreateTask && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-4 sm:top-20 mx-auto p-4 sm:p-6 w-[95vw] sm:w-[400px] lg:w-[450px] max-w-lg shadow-2xl shadow-blue-200/50 rounded-xl bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Task</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Task Title</label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter task title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter task description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Priority</label>
                      <select
                        value={newTask.priority}
                        onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Due Date</label>
                      <input
                        type="date"
                        value={newTask.due_date}
                        onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estimated Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newTask.estimated_hours}
                      onChange={(e) => setNewTask({...newTask, estimated_hours: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter estimated hours"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateTask(false)}
                    className="px-6 py-2 text-sm font-semibold rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createTask}
                    disabled={!newTask.title}
                    className="px-6 py-2 text-sm font-semibold rounded-lg shadow-lg shadow-blue-200/50 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 w-full sm:w-auto"
                  >
                    Create Task
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
