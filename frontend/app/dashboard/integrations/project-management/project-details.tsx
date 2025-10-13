'use client'

import React, { useState, useEffect } from 'react'
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaClock, FaUser, FaTag, FaCalendarAlt, FaCheckCircle, FaCircle, FaPlay, FaPause } from 'react-icons/fa'
import { apiClient } from '../../../../lib/api'
import { useToast } from '../../../../components/ui/Toast'

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
}

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

interface ProjectDetailsProps {
  project: Project
  onBack: () => void
  onProjectUpdate: (updatedProject: Project) => void
}

export default function ProjectDetails({ project, onBack, onProjectUpdate }: ProjectDetailsProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
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
  const { showToast } = useToast()

  useEffect(() => {
    fetchTasks()
  }, [project.id])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      console.log('🔄 [FETCH_TASKS] Fetching tasks for project:', project.id)
      const response = await apiClient.getProjectTasks(project.id)
      console.log('📋 [FETCH_TASKS] Tasks response:', response)
      setTasks(response as Task[])  
      
      // Log actual_hours for debugging
      for (const task of (response as Task[])) {
        console.log(`📊 [FETCH_TASKS] Task "${task.title}": actual_hours = ${task.actual_hours}`)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch tasks'
      })
    } finally {
      setLoading(false)
    }
  }

  const createTask = async () => {
    try {
      const taskData = {
        project_id: project.id,
        title: newTask.title,
        description: newTask.description || undefined,
        priority: newTask.priority,
        due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : undefined,
        estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : undefined,
        tags: newTask.tags
      }

      await apiClient.createTask(taskData)
      await fetchTasks()
      
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        estimated_hours: '',
        tags: []
      })
      setShowCreateTask(false)
      
      showToast({
        type: 'success',
        title: 'Task Created',
        message: 'Task has been created successfully'
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

  const updateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      await apiClient.updateTask(taskId, { status: newStatus })
      await fetchTasks()
      
      showToast({
        type: 'success',
        title: 'Task Updated',
        message: 'Task status has been updated'
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

  const confirmDeleteTask = (taskId: number, taskTitle: string) => {
    setTaskToDelete({ id: taskId, title: taskTitle })
    setShowDeleteTaskConfirm(true)
  }

  const executeDeleteTask = async () => {
    if (!taskToDelete) return

    try {
      await apiClient.deleteTask(taskToDelete.id)
      await fetchTasks()
      
      setShowDeleteTaskConfirm(false)
      setTaskToDelete(null)
      
      showToast({
        type: 'success',
        title: 'Task Deleted',
        message: `"${taskToDelete.title}" has been deleted successfully`
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

  const cancelDeleteTask = () => {
    setShowDeleteTaskConfirm(false)
    setTaskToDelete(null)
  }

  // Time tracking functions
  const fetchTimeEntries = async (taskId?: number) => {
    try {
      setTimeEntriesLoading(true)
      const entries = await apiClient.getProjectTimeEntries(project.id)
      const filteredEntries = taskId ? (entries as TimeEntry[]).filter((entry: TimeEntry) => entry.task_id === taskId) : entries
      setTimeEntries(filteredEntries as TimeEntry[])
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

  const fetchAllTimeEntries = async () => {
    await fetchTimeEntries()
  }

  const recalculateTaskHours = async (taskId: number) => {
    try {
      console.log('🔄 [RECALCULATE] Manually recalculating hours for task:', taskId)
      await apiClient.recalculateTaskHours(taskId) 
      await fetchTasks() // Refresh tasks to see updated actual_hours
      showToast({
        type: 'success',
        title: 'Hours Recalculated',
        message: 'Task hours have been recalculated'
      })
    } catch (error) {
      console.error('Error recalculating task hours:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to recalculate task hours'
      })
    }
  }

  const confirmDeleteTimeEntry = (timeEntryId: number, description: string) => {
    setTimeEntryToDelete({ id: timeEntryId, description: description || 'Untitled Entry' })
    setShowDeleteTimeEntryConfirm(true)
  }

  const executeDeleteTimeEntry = async () => {
    if (!timeEntryToDelete) return

    try {
      await apiClient.deleteTimeEntry(timeEntryToDelete.id)
      await fetchAllTimeEntries()
      
      setShowDeleteTimeEntryConfirm(false)
      setTimeEntryToDelete(null)
      
      showToast({
        type: 'success',
        title: 'Time Entry Deleted',
        message: 'Time entry has been deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting time entry:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete time entry'
      })
    }
  }

  const cancelDeleteTimeEntry = () => {
    setShowDeleteTimeEntryConfirm(false)
    setTimeEntryToDelete(null)
  }

  const startTimer = (task: Task) => {
    if (activeTimer) {
      showToast({
        type: 'error',
        title: 'Timer Active',
        message: 'Please stop the current timer before starting a new one'
      })
      return
    }
    
    setActiveTimer({ taskId: task.id, startTime: new Date() })
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
    
    setNewTimeEntry({
      description: '',
      hours: duration.toFixed(2),
      date: new Date().toISOString().split('T')[0],
      is_billable: true,
      hourly_rate: ''
    })
    setSelectedTaskForTime(task)
    setShowTimeEntry(true)
    setActiveTimer(null)
  }

  const createTimeEntry = async () => {
    if (!selectedTaskForTime || isCreatingTimeEntry) return

    try {
      setIsCreatingTimeEntry(true)
      console.log('🕒 Creating time entry for task:', selectedTaskForTime.id)
      
      const timeData = {
        project_id: project.id,
        task_id: selectedTaskForTime.id,
        description: newTimeEntry.description,
        hours: parseFloat(newTimeEntry.hours),
        date: new Date(newTimeEntry.date).toISOString(),
        is_billable: newTimeEntry.is_billable,
        hourly_rate: newTimeEntry.hourly_rate ? parseFloat(newTimeEntry.hourly_rate) : undefined
      }

      console.log('📊 Time entry data:', timeData)
      const response = await apiClient.createTimeEntry(timeData)
      console.log('✅ Time entry created:', response)
      
      // Refresh tasks to get updated actual_hours from backend
      await fetchTasks()
      
      // Refresh time entries
      await fetchTimeEntries(selectedTaskForTime.id)
      
      setShowTimeEntry(false)
      setSelectedTaskForTime(null)
      setNewTimeEntry({
        description: '',
        hours: '',
        date: new Date().toISOString().split('T')[0],
        is_billable: true,
        hourly_rate: ''
      })
      
      showToast({
        type: 'success',
        title: 'Time Entry Added',
        message: `Added ${newTimeEntry.hours} hours to "${selectedTaskForTime.title}"`
      })
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

  const formatDuration = (hours: number) => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return `${wholeHours}h ${minutes}m`
  }

  // Edit task functions
  const editTask = (task: Task) => {
    setEditingTask(task)
    setNewTask({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
      estimated_hours: task.estimated_hours ? task.estimated_hours.toString() : '',
      tags: task.tags || []
    })
  }

  const updateTask = async () => {
    if (!editingTask) return

    try {
      const taskData = {
        title: newTask.title,
        description: newTask.description || undefined,
        priority: newTask.priority,
        due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : undefined,
        estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : undefined,
        tags: newTask.tags
      }

      const response = await apiClient.updateTask(editingTask.id, taskData)
      console.log('Task update response:', response)
      
      // Update task in local state
      const updatedTasks = tasks.map(task => 
        task.id === editingTask.id 
          ? { ...task, ...taskData }
          : task
      )
      setTasks(updatedTasks)
      
      setEditingTask(null)
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        estimated_hours: '',
        tags: []
      })
      
      showToast({
        type: 'success',
        title: 'Task Updated',
        message: `"${newTask.title}" has been updated successfully`
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

  const cancelEditTask = () => {
    setEditingTask(null)
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
      estimated_hours: '',
      tags: []
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'blocked': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No due date'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg shadow-sm shadow-blue-200/50 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0"
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
              fetchAllTimeEntries()
            }}
            className="w-full sm:w-auto px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg shadow-lg shadow-green-200/50 hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
          >
            <FaClock className="w-4 h-4" />
            <span>Time Log</span>
          </button>
          <button
            onClick={() => setShowCreateTask(true)}
            className="w-full sm:w-auto px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-200/50 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
          >
            <FaPlus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-lg shadow-blue-200/50">
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600">{tasks.length}</div>
          <div className="text-xs sm:text-sm text-gray-600">Total Tasks</div>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-lg shadow-blue-200/50">
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">
            {tasks.filter(t => t.status === 'completed').length}
          </div>
          <div className="text-xs sm:text-sm text-gray-600">Completed</div>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-lg shadow-blue-200/50">
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-600">
            {tasks.filter(t => t.status === 'in_progress').length}
          </div>
          <div className="text-xs sm:text-sm text-gray-600">In Progress</div>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-lg shadow-blue-200/50">
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-600">
            {Math.round((tasks.filter(t => t.status === 'completed').length / Math.max(tasks.length, 1)) * 100)}%
          </div>
          <div className="text-xs sm:text-sm text-gray-600">Progress</div>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="bg-white rounded-xl shadow-lg shadow-blue-200/50">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Tasks</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
              <FaCheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first task</p>
            <button
              onClick={() => setShowCreateTask(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-200/50 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
            >
              Create Task
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map((task) => (
              <div key={task.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <button
                        onClick={() => updateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                        className="text-gray-400 hover:text-green-600 transition-colors flex-shrink-0"
                      >
                        {task.status === 'completed' ? (
                          <FaCheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <FaCircle className="w-5 h-5" />
                        )}
                      </button>
                      <h3 className="text-sm sm:text-base font-medium text-gray-900 truncate">
                        {task.title}
                      </h3>
                    </div>
                    
                    {task.description && (
                      <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                      <span className={`px-2 py-1 rounded-full font-medium ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
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
                      {task.tags && task.tags.length > 0 && (
                        <span className="flex items-center text-gray-600">
                          <FaTag className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="hidden sm:inline">{task.tags.join(', ')}</span>
                          <span className="sm:hidden">{task.tags.length} tag{task.tags.length > 1 ? 's' : ''}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end sm:justify-start space-x-1 sm:ml-4">
                    {/* Timer Button */}
                    {activeTimer && activeTimer.taskId === task.id ? (
                      <button
                        onClick={() => stopTimer(task)}
                        className="p-2 sm:p-2 text-red-600 hover:text-red-700 transition-colors"
                        title="Stop Timer"
                      >
                        <FaPause className="w-4 h-4 sm:w-4 sm:h-4" />
                      </button> 
                    ) : (
                      <button
                        onClick={() => startTimer(task)}
                        className="p-2 sm:p-2 text-gray-400 hover:text-green-600 transition-colors"
                        title="Start Timer"
                      >
                        <FaPlay className="w-4 h-4 sm:w-4 sm:h-4" />
                      </button>
                    )}
                    
                    {/* Manual Time Entry Button */}
                    <button
                      onClick={() => {
                        setSelectedTaskForTime(task)
                        setShowTimeEntry(true)
                      }}
                      className="p-2 sm:p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Add Time Entry"
                    >
                      <FaClock className="w-4 h-4 sm:w-4 sm:h-4" />
                    </button>
                    
                    {/* Edit Button */}
                    <button
                      onClick={() => editTask(task)}
                      className="p-2 sm:p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit Task"
                    >
                      <FaEdit className="w-4 h-4 sm:w-4 sm:h-4" />
                    </button>
                    
                    {/* Recalculate Button (temporary for testing) */}
                    {task.title === 'Engagement Letter & Contract' && (
                      <button
                        onClick={() => recalculateTaskHours(task.id)}
                        className="p-2 sm:p-2 text-gray-400 hover:text-green-600 transition-colors"
                        title="Recalculate Hours"
                      >
                        🔄
                      </button>
                    )}
                    
                    {/* Delete Button */}
                    <button
                      onClick={() => confirmDeleteTask(task.id, task.title)}
                      className="p-2 sm:p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete Task"
                    >
                      <FaTrash className="w-4 h-4 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl shadow-blue-200/50 w-[95vw] sm:w-[400px] lg:w-[450px] max-w-lg mt-4 sm:mt-20">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Create New Task</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter task title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Enter task description"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newTask.estimated_hours}
                    onChange={(e) => setNewTask({ ...newTask, estimated_hours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateTask(false)}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createTask}
                  disabled={!newTask.title.trim()}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-200/50 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time Entry Modal */}
      {showTimeEntry && selectedTaskForTime && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl shadow-blue-200/50 w-[95vw] sm:w-[400px] lg:w-[450px] max-w-lg mt-4 sm:mt-20">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                Add Time Entry - {selectedTaskForTime.title}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newTimeEntry.description}
                    onChange={(e) => setNewTimeEntry({ ...newTimeEntry, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="What did you work on?"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hours *</label>
                    <input
                      type="number"
                      step="0.25"
                      value={newTimeEntry.hours}
                      onChange={(e) => setNewTimeEntry({ ...newTimeEntry, hours: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={newTimeEntry.date}
                      onChange={(e) => setNewTimeEntry({ ...newTimeEntry, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isBillable"
                    checked={newTimeEntry.is_billable}
                    onChange={(e) => setNewTimeEntry({ ...newTimeEntry, is_billable: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isBillable" className="text-sm font-medium text-gray-700">
                    Billable
                  </label>
                </div>
                
                {newTimeEntry.is_billable && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newTimeEntry.hourly_rate}
                      onChange={(e) => setNewTimeEntry({ ...newTimeEntry, hourly_rate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                )}
                
                {newTimeEntry.hours && newTimeEntry.hourly_rate && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Total Cost:</strong> ${(parseFloat(newTimeEntry.hours) * parseFloat(newTimeEntry.hourly_rate)).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowTimeEntry(false)
                    setSelectedTaskForTime(null)
                    setNewTimeEntry({
                      description: '',
                      hours: '',
                      date: new Date().toISOString().split('T')[0],
                      is_billable: true,
                      hourly_rate: ''
                    })
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createTimeEntry}
                  disabled={!newTimeEntry.hours || parseFloat(newTimeEntry.hours) <= 0 || isCreatingTimeEntry}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-200/50 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isCreatingTimeEntry ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <span>Add Time Entry</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl shadow-blue-200/50 w-[95vw] sm:w-[400px] lg:w-[450px] max-w-lg mt-4 sm:mt-20">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                Edit Task - {newTask.title || editingTask?.title || 'Untitled Task'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Title *</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter task title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Enter task description"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newTask.estimated_hours}
                    onChange={(e) => setNewTask({ ...newTask, estimated_hours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                <button
                  onClick={cancelEditTask}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updateTask}
                  disabled={!newTask.title.trim()}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg shadow-blue-200/50 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation Modal */}
      {showDeleteTaskConfirm && taskToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl shadow-red-200/50 w-[95vw] sm:w-[400px] max-w-md">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <FaTrash className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Task</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700">
                  Are you sure you want to delete <strong>"{taskToDelete.title}"</strong>?
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  This will permanently delete the task and all its time entries.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={cancelDeleteTask}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDeleteTask}
                  className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Task
                </button>
              </div>
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
                                {task && (
                                  <span className="flex items-center">
                                    <FaTag className="w-3 h-3 mr-1" />
                                    {task.title}
                                  </span>
                                )}
                                <span className="flex items-center">
                                  <FaCalendarAlt className="w-3 h-3 mr-1" />
                                  {new Date(entry.date).toLocaleDateString()}
                                </span>
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
                              onClick={() => confirmDeleteTimeEntry(entry.id, entry.description || '')}
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
                  onClick={cancelDeleteTimeEntry}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDeleteTimeEntry}
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
