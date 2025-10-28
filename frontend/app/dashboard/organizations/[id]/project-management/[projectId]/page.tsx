'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaClock, FaUser, FaTag, FaCalendarAlt, FaCheckCircle, FaCircle, FaPlay, FaPause } from 'react-icons/fa'
import { apiClient } from '../../../../../../lib/api'
import { useToast } from '../../../../../../components/ui/Toast'

interface Task {
  id: number
  project_id: number
  parent_task_id?: number
  title: string
  description?: string
  status: string
  priority: string
  assignee_id?: number
  due_date?: string
  estimated_hours?: number
  actual_hours: number
  progress: number
  tags?: string[]
  custom_fields?: Record<string, any>
  created_at: string
  updated_at?: string
}

interface TimeEntry {
  id: number
  project_id: number
  task_id?: number
  user_id: number
  description?: string
  hours: number
  date: string
  is_billable: boolean
  hourly_rate?: number
  created_at: string
  updated_at?: string
  user_name?: string
  task_title?: string
}

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

export default function OrganizationProjectDetails() {
  const router = useRouter()
  const params = useParams()
  const organizationId = parseInt(params.id as string)
  const projectId = parseInt(params.projectId as string)
  
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    due_date: '',
    estimated_hours: '',
    tags: [] as string[]
  })
  
  // Time tracking state
  const [showTimeEntry, setShowTimeEntry] = useState(false)
  const [selectedTaskForTime, setSelectedTaskForTime] = useState<Task | null>(null)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [newTimeEntry, setNewTimeEntry] = useState({
    description: '',
    hours: '',
    date: new Date().toISOString().split('T')[0],
    is_billable: true,
    hourly_rate: ''
  })
  const [activeTimer, setActiveTimer] = useState<{taskId: number, startTime: Date} | null>(null)
  const [showDeleteTaskConfirm, setShowDeleteTaskConfirm] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<{id: number, title: string} | null>(null)
  const [showTimeEntries, setShowTimeEntries] = useState(false)
  const [timeEntriesLoading, setTimeEntriesLoading] = useState(false)
  const [showDeleteTimeEntryConfirm, setShowDeleteTimeEntryConfirm] = useState(false)
  const [timeEntryToDelete, setTimeEntryToDelete] = useState<{id: number, description: string} | null>(null)
  const [isCreatingTimeEntry, setIsCreatingTimeEntry] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<string>('todo')
  const [showTaskDetail, setShowTaskDetail] = useState(false)
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null)
  const [taskFiles, setTaskFiles] = useState<any[]>([])
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [taskEmails, setTaskEmails] = useState<any[]>([])
  const [taskExternalTools, setTaskExternalTools] = useState<any[]>([])
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [uploadedDocument, setUploadedDocument] = useState<any>(null)
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const { showToast } = useToast()

  useEffect(() => {
    fetchProjectData()
  }, [organizationId, projectId])

  const fetchProjectData = async () => {
    try {
      setLoading(true)
      const [projectData, tasksData] = await Promise.all([
        apiClient.getOrganizationProject(organizationId, projectId),
        apiClient.getOrganizationProjectTasks(organizationId, projectId)
      ])
      setProject(projectData as Project)
      setTasks(tasksData as Task[])
    } catch (error) {
      console.error('Error fetching project data:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load project data'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTimeEntries = async () => {
    try {
      setTimeEntriesLoading(true)
      const timeData = await apiClient.getOrganizationProjectTimeEntries(organizationId, projectId)
      setTimeEntries(timeData as TimeEntry[])
    } catch (error) {
      console.error('Error fetching time entries:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch time entries'
      })
    } finally {
      setTimeEntriesLoading(false)
    }
  }

  const createTask = async () => {
    try {
      const taskData = {
        ...newTask,
        estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : undefined,
        due_date: newTask.due_date ? `${newTask.due_date}T00:00:00` : undefined
      }
      
      const createdTask = await apiClient.createOrganizationProjectTask(organizationId, projectId, taskData)
      setTasks([...tasks, createdTask])
      setShowCreateTask(false)
      setNewTask({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        due_date: '',
        estimated_hours: '',
        tags: []
      })
      
      showToast({
        type: 'success',
        title: 'Success',
        message: 'Task created successfully'
      })
    } catch (error) {
      console.error('Error creating task:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to create task'
      })
    }
  }

  const updateTask = async (taskId: number, updates: Partial<Task>) => {
    try {
      const updatedTask = await apiClient.updateOrganizationProjectTask(organizationId, projectId, taskId, updates)
      setTasks(tasks.map(task => task.id === taskId ? updatedTask : task))
      
      showToast({
        type: 'success',
        title: 'Success',
        message: 'Task updated successfully'
      })
    } catch (error) {
      console.error('Error updating task:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update task'
      })
    }
  }

  const formatDuration = (hours: number) => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return `${wholeHours}h ${minutes}m`
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No due date'
    return new Date(dateString).toLocaleDateString()
  }

  const handleFileUpload = async (file: File) => {
    if (!selectedTaskDetail) return
    
    try {
      setIsUploadingFile(true)
      
      // Show upload start toast
      showToast({
        type: 'info',
        title: 'Uploading File',
        message: `Uploading ${file.name}...`
      })
      
      // Upload file to backend
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await apiClient.uploadOrganizationTaskFile(organizationId, projectId, selectedTaskDetail.id, formData)
      
      if (response.success) {
        // Refresh files list
        const files = await apiClient.getOrganizationTaskFiles(organizationId, projectId, selectedTaskDetail.id)
        setTaskFiles(files || [])
        
        showToast({
          type: 'success',
          title: 'File Uploaded Successfully',
          message: `${file.name} has been uploaded successfully`
        })
        
        // Show notification option
        setShowNotificationModal(true)
        setUploadedDocument(response.document)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      showToast({
        type: 'error',
        title: 'Upload Failed',
        message: `Failed to upload ${file.name}. Please try again.`
      })
    } finally {
      setIsUploadingFile(false)
    }
  }

  const handleDeleteFile = async (documentId: number) => {
    if (!selectedTaskDetail) return
    
    try {
      await apiClient.deleteOrganizationTaskFile(organizationId, projectId, selectedTaskDetail.id, documentId)
      
      // Refresh files list
      const files = await apiClient.getOrganizationTaskFiles(organizationId, projectId, selectedTaskDetail.id)
      setTaskFiles(files || [])
      
      showToast({
        type: 'success',
        title: 'File Deleted',
        message: 'File has been deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting file:', error)
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete file. Please try again.'
      })
    }
  }

  const deleteTask = async (taskId: number) => {
    try {
      await apiClient.deleteOrganizationProjectTask(organizationId, projectId, taskId)
      setTasks(tasks.filter(task => task.id !== taskId))
      setShowDeleteTaskConfirm(false)
      setTaskToDelete(null)
      
      showToast({
        type: 'success',
        title: 'Success',
        message: 'Task deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting task:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete task'
      })
    }
  }

  const startTimer = (task: Task) => {
    if (activeTimer) {
      showToast({
        type: 'warning',
        title: 'Timer Already Running',
        message: 'Please stop the current timer before starting a new one'
      })
      return
    }

    setActiveTimer({
      taskId: task.id,
      startTime: new Date()
    })

    showToast({
      type: 'success',
      title: 'Timer Started',
      message: `Started tracking time for "${task.title}"`
    })
  }

  const stopTimer = async (task: Task) => {
    if (!activeTimer || activeTimer.taskId !== task.id) {
      showToast({
        type: 'error',
        title: 'No Active Timer',
        message: 'No active timer found for this task'
      })
      return
    }

    const endTime = new Date()
    const duration = (endTime.getTime() - activeTimer.startTime.getTime()) / (1000 * 60 * 60) // Convert to hours

    setSelectedTaskForTime(task)
    setNewTimeEntry({
      description: '',
      hours: duration.toFixed(2),
      date: new Date().toISOString().split('T')[0],
      is_billable: true,
      hourly_rate: ''
    })
    setShowTimeEntry(true)
    setActiveTimer(null)
  }

  const createTimeEntry = async () => {
    if (!selectedTaskForTime) return

    try {
      setIsCreatingTimeEntry(true)
      console.log('🕒 Creating time entry for task:', selectedTaskForTime.id)

      const timeData = {
        project_id: projectId,
        task_id: selectedTaskForTime.id,
        description: newTimeEntry.description,
        hours: parseFloat(newTimeEntry.hours),
        date: new Date(newTimeEntry.date).toISOString(),
        is_billable: newTimeEntry.is_billable,
        hourly_rate: newTimeEntry.hourly_rate ? parseFloat(newTimeEntry.hourly_rate) : undefined
      }

      console.log('📊 Time entry data:', timeData)
      const response = await apiClient.createOrganizationTimeEntry(organizationId, projectId, timeData)
      
      showToast({
        type: 'success',
        title: 'Time Entry Added',
        message: 'Time entry has been added successfully'
      })

      setShowTimeEntry(false)
      setSelectedTaskForTime(null)
      setNewTimeEntry({
        description: '',
        hours: '',
        date: new Date().toISOString().split('T')[0],
        is_billable: true,
        hourly_rate: ''
      })

      // Refresh time entries
      await fetchTimeEntries()
    } catch (error) {
      console.error('Error creating time entry:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to add time entry'
      })
    } finally {
      setIsCreatingTimeEntry(false)
    }
  }

  const editTask = async () => {
    if (!editingTask) return

    try {
      const taskData = {
        ...newTask,
        estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : undefined,
        due_date: newTask.due_date ? `${newTask.due_date}T00:00:00` : undefined
      }

      const response = await apiClient.updateOrganizationProjectTask(organizationId, projectId, editingTask.id, taskData)
      setTasks(tasks.map(task => task.id === editingTask.id ? response : task))
      
      showToast({
        type: 'success',
        title: 'Task Updated',
        message: 'Task has been updated successfully'
      })
      
      setShowCreateTask(false)
      setEditingTask(null)
      setNewTask({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        due_date: '',
        estimated_hours: '',
        tags: []
      })
    } catch (error) {
      console.error('Error updating task:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update task'
      })
    }
  }

  const openTaskDetail = async (task: Task) => {
    setSelectedTaskDetail(task)
    setShowTaskDetail(true)
    
    try {
      // Fetch files for this task
      const files = await apiClient.getOrganizationTaskFiles(organizationId, projectId, task.id)
      setTaskFiles(files || [])
      
      // Fetch emails for this task
      // const emails = await apiClient.getOrganizationTaskEmails(organizationId, projectId, task.id)
      // setTaskEmails(emails || [])
      
      // Fetch external tools for this task
      // const tools = await apiClient.getOrganizationTaskExternalTools(organizationId, projectId, task.id)
      // setTaskExternalTools(tools || [])
      
      // Fetch time entries for this task
      // const timeEntries = await apiClient.getOrganizationTaskTimeEntries(organizationId, projectId, task.id)
      // setTimeEntries(timeEntries || [])
    } catch (error) {
      console.error('Error fetching task details:', error)
    }
  }

  const deleteTimeEntry = async (timeEntryId: number) => {
    try {
      await apiClient.deleteOrganizationTimeEntry(organizationId, projectId, timeEntryId)
      
      showToast({
        type: 'success',
        title: 'Time Entry Deleted',
        message: 'Time entry has been deleted successfully'
      })
      
      setShowDeleteTimeEntryConfirm(false)
      setTimeEntryToDelete(null)
      
      // Refresh time entries
      await fetchTimeEntries()
    } catch (error) {
      console.error('Error deleting time entry:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete time entry'
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'in_progress': return 'text-blue-600 bg-blue-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'closed': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h2>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 shadow-sm shadow-blue-200/50 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0"
          >
            <FaArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
              {project.name}
            </h1>
          </div>
        </div>
        
        {project.description && (
          <div className="ml-11">
            <p className="text-sm text-gray-600 line-clamp-2">
              {project.description}
            </p>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={() => {
              setShowTimeEntries(true)
              fetchTimeEntries()
            }}
            className="w-full sm:w-auto px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-200/50 hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
          >
            <FaClock className="w-4 h-4" />
            <span>Time Log</span>
          </button>
          <button
            onClick={() => setShowCreateTask(true)}
            className="w-full sm:w-auto px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200/50 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
          >
            <FaPlus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        <div className="p-2 sm:p-3 md:p-4 shadow-lg shadow-blue-200/50">
          <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-blue-600">{tasks.length}</div>
          <div className="text-xs sm:text-sm text-gray-600">Total Tasks</div>
        </div>
        <div className="p-2 sm:p-3 md:p-4 shadow-lg shadow-blue-200/50">
          <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-green-600">
            {Math.round(project.progress)}%
          </div>
          <div className="text-xs sm:text-sm text-gray-600">Progress</div>
        </div>
        <div className="col-span-2 lg:col-span-1 p-2 sm:p-3 md:p-4 shadow-lg shadow-blue-200/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs sm:text-sm text-gray-600">Filter by Status</div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-2 py-1 text-xs sm:text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Tasks ({tasks.length})</option>
            <option value="pending">Pending ({tasks.filter(t => t.status === 'pending').length})</option>
            <option value="in_progress">In Progress ({tasks.filter(t => t.status === 'in_progress').length})</option>
            <option value="completed">Completed ({tasks.filter(t => t.status === 'completed').length})</option>
            <option value="achieved">Achieved ({tasks.filter(t => t.status === 'achieved').length})</option>
            <option value="closed">Closed ({tasks.filter(t => t.status === 'closed').length})</option>
          </select>
        </div>
      </div>

      {/* Tasks Section */}
      <div>
        <div className="p-1 sm:p-4 md:p-6 border-b border-gray-100">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">Tasks</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading tasks...</p>
          </div>
        ) : (
          <>
            {/* Status Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex justify-between px-1 sm:px-4 md:px-6" aria-label="Tabs">
                {[
                  { key: 'todo', label: 'To Do', shortLabel: 'Todo', count: tasks.filter(t => t.status === 'pending' || t.status === 'todo').length },
                  { key: 'in_progress', label: 'In Progress', shortLabel: 'Active', count: tasks.filter(t => t.status === 'in_progress' || t.status === 'in progress').length },
                  { key: 'done', label: 'Done', shortLabel: 'Done', count: tasks.filter(t => t.status === 'completed' || t.status === 'achieved' || t.status === 'done').length },
                  { key: 'cancelled', label: 'Cancelled', shortLabel: 'Cancel', count: tasks.filter(t => t.status === 'closed' || t.status === 'blocked' || t.status === 'cancelled').length }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`py-3 sm:py-4 px-1 sm:px-2 md:px-3 border-b-2 font-medium text-xs sm:text-sm flex-1 text-center ${
                      activeTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.shortLabel}</span>
                      <span className="text-xs">({tab.count})</span>
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            {/* Task Cards */}
            <div className="p-1 sm:p-4 md:p-6">
              {(() => {
                const getTasksForTab = () => {
                  switch (activeTab) {
                    case 'todo':
                      return tasks.filter(t => t.status === 'pending' || t.status === 'todo')
                    case 'in_progress':
                      return tasks.filter(t => t.status === 'in_progress' || t.status === 'in progress')
                    case 'done':
                      return tasks.filter(t => t.status === 'completed' || t.status === 'achieved' || t.status === 'done')
                    case 'cancelled':
                      return tasks.filter(t => t.status === 'closed' || t.status === 'blocked' || t.status === 'cancelled')
                    default:
                      return []
                  }
                }

                const tabTasks = getTasksForTab()

                // Show inline task detail if a task is selected
                if (showTaskDetail && selectedTaskDetail) {
                  return (
                    <div className="space-y-6">
                      {/* Back Button */}
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => {
                            setShowTaskDetail(false)
                            setSelectedTaskDetail(null)
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <FaArrowLeft className="w-5 h-5" />
                        </button>
                        <h2 className="text-lg font-semibold text-gray-900">Task Details</h2>
                      </div>

                      {/* Task Detail Content */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                          {/* Task Header */}
                          <div className="bg-white shadow-lg shadow-blue-200/50 p-4 sm:p-6">
                            <div className="flex items-center space-x-3 mb-4">
                              <button
                                onClick={() => {
                                  const nextStatus = selectedTaskDetail.status === 'completed' ? 'pending' : 
                                                   selectedTaskDetail.status === 'pending' ? 'in_progress' :
                                                   selectedTaskDetail.status === 'in_progress' ? 'completed' : 'pending'
                                  updateTask(selectedTaskDetail.id, { status: nextStatus })
                                }}
                                className="text-gray-400 hover:text-green-600 transition-colors"
                              >
                                {selectedTaskDetail.status === 'completed' || selectedTaskDetail.status === 'achieved' ? (
                                  <FaCheckCircle className="w-6 h-6 text-green-600" />
                                ) : (
                                  <FaCircle className="w-6 h-6" />
                                )}
                              </button>
                              <div className="flex-1">
                                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{selectedTaskDetail.title}</h3>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className={`px-2 py-1 font-medium text-xs ${getStatusColor(selectedTaskDetail.status)}`}>
                                    {selectedTaskDetail.status.replace('_', ' ')}
                                  </span>
                                  <span className={`px-2 py-1 font-medium text-xs ${getPriorityColor(selectedTaskDetail.priority)}`}>
                                    {selectedTaskDetail.priority}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Description */}
                            {selectedTaskDetail.description && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                                <p className="text-sm text-gray-600">{selectedTaskDetail.description}</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Time Tracking */}
                          <div className="bg-white shadow-lg shadow-blue-200/50 p-4 sm:p-6">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Time Tracking</h4>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="bg-blue-50 p-3">
                                <div className="text-lg font-bold text-blue-600">
                                  {selectedTaskDetail.estimated_hours || 0}h
                                </div>
                                <div className="text-xs text-blue-800">Estimated</div>
                              </div>
                              <div className="bg-green-50 p-3">
                                <div className="text-lg font-bold text-green-600">
                                  {formatDuration(selectedTaskDetail.actual_hours || 0)}
                                </div>
                                <div className="text-xs text-green-800">Actual</div>
                              </div>
                            </div>
                            
                            {/* Timer Controls */}
                            <div className="flex items-center space-x-3">
                              {activeTimer && activeTimer.taskId === selectedTaskDetail.id ? (
                                <button
                                  onClick={() => stopTimer(selectedTaskDetail)}
                                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center space-x-2"
                                >
                                  <FaPause className="w-4 h-4" />
                                  <span>Stop Timer</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => startTimer(selectedTaskDetail)}
                                  className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center space-x-2"
                                >
                                  <FaPlay className="w-4 h-4" />
                                  <span>Start Timer</span>
                                </button>
                              )}
                              
                              <button
                                onClick={() => {
                                  setSelectedTaskForTime(selectedTaskDetail)
                                  setNewTimeEntry({
                                    description: '',
                                    hours: '',
                                    date: new Date().toISOString().split('T')[0],
                                    is_billable: true,
                                    hourly_rate: ''
                                  })
                                  setShowTimeEntry(true)
                                }}
                                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center space-x-2"
                              >
                                <FaClock className="w-4 h-4" />
                                <span>Add Time</span>
                              </button>
                            </div>
                          </div>
                          
                          {/* Files & Documents */}
                          <div className="bg-white shadow-lg shadow-blue-200/50 p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-gray-900">Files & Documents</h4>
                              <label className={`px-3 py-1 text-white text-xs transition-colors cursor-pointer ${
                                isUploadingFile 
                                  ? 'bg-gray-400 cursor-not-allowed' 
                                  : 'bg-blue-600 hover:bg-blue-700'
                              }`}>
                                {isUploadingFile ? 'Uploading...' : 'Upload File'}
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleFileUpload(file)
                                  }}
                                  disabled={isUploadingFile}
                                />
                              </label>
                            </div>
                            
                            {/* Upload Progress Indicator */}
                            {isUploadingFile && (
                              <div className="mb-4 p-3 bg-blue-50 border border-blue-200">
                                <div className="flex items-center space-x-3">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                  <span className="text-sm text-blue-700">Uploading file...</span>
                                </div>
                              </div>
                            )}
                            
                            {taskFiles.length === 0 ? (
                              <div className="text-center py-8 border-2 border-dashed border-gray-300">
                                <p className="text-sm text-gray-500">No files uploaded yet</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {taskFiles.map((file) => (
                                  <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50">
                                    <div className="flex items-center space-x-3">
                                      <FaTag className="w-4 h-4 text-gray-400" />
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">{file.filename}</p>
                                        <p className="text-xs text-gray-500">
                                          {(file.size / 1024 / 1024).toFixed(2)} MB • 
                                          Uploaded by {file.uploaded_by} • 
                                          {new Date(file.uploaded_at).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 text-sm"
                                      >
                                        View
                                      </a>
                                      <button 
                                        onClick={() => handleDeleteFile(file.id)}
                                        className="text-red-600 hover:text-red-800 text-sm"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Sidebar */}
                        <div className="space-y-6">
                          {/* Task Info */}
                          <div className="bg-white shadow-lg shadow-blue-200/50 p-4 sm:p-6">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Task Information</h4>
                            <div className="space-y-3">
                              <div>
                                <span className="text-xs text-gray-500">Status</span>
                                <div className="mt-1">
                                  <span className={`px-2 py-1 font-medium text-xs ${getStatusColor(selectedTaskDetail.status)}`}>
                                    {selectedTaskDetail.status.replace('_', ' ')}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500">Priority</span>
                                <div className="mt-1">
                                  <span className={`px-2 py-1 font-medium text-xs ${getPriorityColor(selectedTaskDetail.priority)}`}>
                                    {selectedTaskDetail.priority}
                                  </span>
                                </div>
                              </div>
                              {selectedTaskDetail.due_date && (
                                <div>
                                  <span className="text-xs text-gray-500">Due Date</span>
                                  <div className="mt-1">
                                    <span className="text-gray-900">{new Date(selectedTaskDetail.due_date).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              )}
                              <div>
                                <span className="text-xs text-gray-500">Created</span>
                                <div className="mt-1">
                                  <span className="text-gray-900">{new Date(selectedTaskDetail.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="bg-white shadow-lg shadow-blue-200/50 p-4 sm:p-6">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Actions</h4>
                            <div className="space-y-2">
                              <button
                                onClick={() => {
                                  setEditingTask(selectedTaskDetail)
                                  setNewTask({
                                    title: selectedTaskDetail.title,
                                    description: selectedTaskDetail.description || '',
                                    status: selectedTaskDetail.status,
                                    priority: selectedTaskDetail.priority,
                                    due_date: selectedTaskDetail.due_date ? new Date(selectedTaskDetail.due_date).toISOString().split('T')[0] : '',
                                    estimated_hours: selectedTaskDetail.estimated_hours?.toString() || '',
                                    tags: selectedTaskDetail.tags || []
                                  })
                                  setShowCreateTask(true)
                                  setShowTaskDetail(false)
                                }}
                                className="w-full px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                              >
                                <FaEdit className="w-4 h-4" />
                                <span>Edit Task</span>
                              </button>
                              <button
                                onClick={() => {
                                  setTaskToDelete({ id: selectedTaskDetail.id, title: selectedTaskDetail.title })
                                  setShowDeleteTaskConfirm(true)
                                }}
                                className="w-full px-3 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                              >
                                <FaTrash className="w-4 h-4" />
                                <span>Delete Task</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }

                if (tabTasks.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <FaCheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No {activeTab.replace('_', ' ')} tasks
                      </h3>
                      <p className="text-gray-600 mb-6">
                        {activeTab === 'todo' 
                          ? 'Create your first task to get started.'
                          : `No tasks found in ${activeTab.replace('_', ' ')} status.`
                        }
                      </p>
                      {activeTab === 'todo' && (
                        <button
                          onClick={() => setShowCreateTask(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <FaPlus className="w-4 h-4 mr-2 inline" />
                          Create Task
                        </button>
                      )}
                    </div>
                  )
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                    {tabTasks.map((task) => (
                      <div key={task.id} className="shadow-lg shadow-blue-200/50 p-3 sm:p-4 md:p-6 hover:shadow-xl hover:shadow-blue-200/60 transition-all duration-200 cursor-pointer" onClick={() => openTaskDetail(task)}>
                        <div className="space-y-2 sm:space-y-3">
                          {/* Task Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const nextStatus = task.status === 'completed' ? 'pending' : 
                                                   task.status === 'pending' ? 'in_progress' :
                                                   task.status === 'in_progress' ? 'completed' : 'pending'
                                  updateTask(task.id, { status: nextStatus })
                                }}
                                className="text-gray-400 hover:text-green-600 transition-colors flex-shrink-0"
                                title={`Mark as ${task.status === 'completed' ? 'pending' : 
                                       task.status === 'pending' ? 'in progress' :
                                       task.status === 'in_progress' ? 'completed' : 'pending'}`}
                              >
                                {task.status === 'completed' || task.status === 'achieved' ? (
                                  <FaCheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                                ) : (
                                  <FaCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                )}
                              </button>
                              <h3 className="text-xs sm:text-sm md:text-base font-medium text-gray-900 truncate">
                                {task.title}
                              </h3>
                            </div>
                          </div>
                          
                          {/* Task Description */}
                          {task.description && (
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-3">
                              {task.description}
                            </p>
                          )}
                          
                          {/* Task Meta */}
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs">
                            <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 font-medium ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            {task.due_date && (
                              <span className="flex items-center text-gray-600">
                                <FaCalendarAlt className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="hidden sm:inline">{formatDate(task.due_date)}</span>
                                <span className="sm:hidden">{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              </span>
                            )}
                            {task.estimated_hours && (
                              <span className="flex items-center text-gray-600">
                                <FaClock className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="hidden sm:inline">Est: {task.estimated_hours}h</span>
                                <span className="sm:hidden">{task.estimated_hours}h</span>
                              </span>
                            )}
                            {task.actual_hours > 0 && (
                              <span className="flex items-center text-blue-600 font-medium">
                                <FaClock className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="hidden sm:inline">Actual: {formatDuration(task.actual_hours)}</span>
                                <span className="sm:hidden">{formatDuration(task.actual_hours)}</span>
                              </span>
                            )}
                          </div>
                          
                          {/* Task Actions */}
                          <div className="flex items-center justify-end space-x-1 pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                            {/* Timer Button */}
                            {activeTimer && activeTimer.taskId === task.id ? (
                              <button
                                onClick={() => stopTimer(task)}
                                className="p-1.5 sm:p-2 text-red-600 hover:text-red-700 transition-colors"
                                title="Stop Timer"
                              >
                                <FaPause className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button> 
                            ) : (
                              <button
                                onClick={() => startTimer(task)}
                                className="p-1.5 sm:p-2 text-gray-400 hover:text-green-600 transition-colors"
                                title="Start Timer"
                              >
                                <FaPlay className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                            )}
                            
                            {/* Manual Time Entry Button */}
                            <button
                              onClick={() => {
                                setSelectedTaskForTime(task)
                                setNewTimeEntry({
                                  description: '',
                                  hours: '',
                                  date: new Date().toISOString().split('T')[0],
                                  is_billable: true,
                                  hourly_rate: ''
                                })
                                setShowTimeEntry(true)
                              }}
                              className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Add Time Entry"
                            >
                              <FaClock className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                            
                            {/* Edit Button */}
                            <button
                              onClick={() => {
                                setEditingTask(task)
                                setNewTask({
                                  title: task.title,
                                  description: task.description || '',
                                  status: task.status,
                                  priority: task.priority,
                                  due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
                                  estimated_hours: task.estimated_hours?.toString() || '',
                                  tags: task.tags || []
                                })
                                setShowCreateTask(true)
                              }}
                              className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Edit Task"
                            >
                              <FaEdit className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                            
                            {/* Delete Button */}
                            <button
                              onClick={() => {
                                setTaskToDelete({ id: task.id, title: task.title })
                                setShowDeleteTaskConfirm(true)
                              }}
                              className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete Task"
                            >
                              <FaTrash className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingTask ? `Edit Task - ${newTask.title || editingTask?.title || 'Untitled Task'}` : 'Create New Task'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter task description"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newTask.estimated_hours}
                    onChange={(e) => setNewTask({ ...newTask, estimated_hours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateTask(false)
                  setEditingTask(null)
                  setNewTask({
                    title: '',
                    description: '',
                    status: 'pending',
                    priority: 'medium',
                    due_date: '',
                    estimated_hours: '',
                    tags: []
                  })
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={editingTask ? editTask : createTask}
                disabled={!newTask.title.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Entry Modal */}
      {showTimeEntry && selectedTaskForTime && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Time Entry - {selectedTaskForTime.title}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newTimeEntry.description}
                  onChange={(e) => setNewTimeEntry({ ...newTimeEntry, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What did you work on?"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
                  <input
                    type="number"
                    step="0.25"
                    value={newTimeEntry.hours}
                    onChange={(e) => setNewTimeEntry({ ...newTimeEntry, hours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newTimeEntry.date}
                    onChange={(e) => setNewTimeEntry({ ...newTimeEntry, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newTimeEntry.is_billable}
                    onChange={(e) => setNewTimeEntry({ ...newTimeEntry, is_billable: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Billable</span>
                </label>
                
                {newTimeEntry.is_billable && (
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newTimeEntry.hourly_rate}
                      onChange={(e) => setNewTimeEntry({ ...newTimeEntry, hourly_rate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>
              
              {newTimeEntry.hours && newTimeEntry.hourly_rate && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Total Cost:</strong> ${(parseFloat(newTimeEntry.hours) * parseFloat(newTimeEntry.hourly_rate)).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowTimeEntry(false)
                  setSelectedTaskForTime(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={createTimeEntry}
                disabled={!newTimeEntry.hours || parseFloat(newTimeEntry.hours) <= 0 || isCreatingTimeEntry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingTimeEntry ? 'Adding...' : 'Add Time Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation */}
      {showDeleteTaskConfirm && taskToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Task</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{taskToDelete.title}"? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteTaskConfirm(false)
                  setTaskToDelete(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteTask(taskToDelete.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Entries Modal */}
      {showTimeEntries && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl shadow-blue-200/50 w-[98vw] sm:w-[90vw] lg:w-[80vw] max-w-6xl mt-2 sm:mt-8 max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Time Entries</h3>
                  <p className="text-sm text-gray-600 mt-1">All logged time for this project</p>
                </div>
                <button
                  onClick={() => setShowTimeEntries(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaArrowLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {timeEntriesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading time entries...</span>
                </div>
              ) : timeEntries.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <FaClock className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No time entries yet</h3>
                  <p className="text-gray-600">Start tracking time on your tasks to see entries here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                      <div className="text-xl sm:text-2xl font-bold text-blue-600">
                        {timeEntries.reduce((total, entry) => total + entry.hours, 0).toFixed(1)}h
                      </div>
                      <div className="text-xs sm:text-sm text-blue-800">Total Time</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                      <div className="text-xl sm:text-2xl font-bold text-green-600">
                        {timeEntries.filter(entry => entry.is_billable).reduce((total, entry) => total + entry.hours, 0).toFixed(1)}h
                      </div>
                      <div className="text-xs sm:text-sm text-green-800">Billable Time</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                      <div className="text-lg sm:text-2xl font-bold text-purple-600">
                        ${timeEntries.filter(entry => entry.is_billable && entry.hourly_rate).reduce((total, entry) => total + (entry.hours * (entry.hourly_rate || 0)), 0).toFixed(2)}
                      </div>
                      <div className="text-xs sm:text-sm text-purple-800">Total Revenue</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 sm:p-4">
                      <div className="text-xl sm:text-2xl font-bold text-orange-600">
                        {timeEntries.length}
                      </div>
                      <div className="text-xs sm:text-sm text-orange-800">Entries</div>
                    </div>
                  </div>

                  {/* Time Entries List */}
                  <div className="space-y-3">
                    {timeEntries.map((entry) => {
                      const task = tasks.find(t => t.id === entry.task_id)
                      return (
                        <div key={entry.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors relative group">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-2">
                                <div className="flex items-center space-x-2">
                                  <FaClock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <span className="text-lg font-semibold text-gray-900">
                                    {entry.hours}h
                                  </span>
                                </div>
                                {entry.is_billable && (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                    Billable
                                  </span>
                                )}
                                {entry.hourly_rate && (
                                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                                    ${entry.hourly_rate}/hr
                                  </span>
                                )}
                              </div>
                              
                              {entry.description && (
                                <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                                  {entry.description}
                                </p>
                              )}
                              
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                <span className="flex items-center">
                                  <FaTag className="w-3 h-3 mr-1" />
                                  {entry.task_title || task?.title || 'Unknown Task'}
                                </span>
                                <span className="flex items-center">
                                  <FaCalendarAlt className="w-3 h-3 mr-1" />
                                  {new Date(entry.date).toLocaleDateString()}
                                </span>
                                {entry.user_name && (
                                  <span className="flex items-center text-blue-600 font-medium">
                                    <FaUser className="w-3 h-3 mr-1" />
                                    {entry.user_name}
                                  </span>
                                )}
                                {entry.hourly_rate && entry.is_billable && (
                                  <span className="flex items-center text-green-600 font-medium">
                                    <span className="mr-1">$</span>
                                    {(entry.hours * entry.hourly_rate).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Delete Button */}
                            <button
                              onClick={() => {
                                setTimeEntryToDelete({ id: entry.id, description: entry.description || 'Untitled Entry' })
                                setShowDeleteTimeEntryConfirm(true)
                              }}
                              className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                              title="Delete Time Entry"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Time Entry Confirmation Modal */}
      {showDeleteTimeEntryConfirm && timeEntryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl shadow-red-200/50 w-[95vw] sm:w-[400px] max-w-md">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <FaTrash className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Time Entry</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700">
                  Are you sure you want to delete this time entry?
                </p>
                {timeEntryToDelete.description && (
                  <p className="text-sm text-gray-600 mt-2 font-medium">
                    "{timeEntryToDelete.description}"
                  </p>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteTimeEntryConfirm(false)
                    setTimeEntryToDelete(null)
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteTimeEntry(timeEntryToDelete.id)}
                  className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Time Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}