'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  WrenchScrewdriverIcon,
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  GlobeAltIcon,
  CodeBracketIcon,
  BoltIcon,
  CircleStackIcon,
  CpuChipIcon,
  EyeIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { apiClient, type Tool, type Agent } from '../../../../lib/api'

export default function ToolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const toolId = parseInt(params.id as string)
  
  const [tool, setTool] = useState<Tool | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddToAgent, setShowAddToAgent] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (toolId) {
      fetchTool()
      fetchAgents()
    }
  }, [toolId])

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.dropdown-container')) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchTool = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setError('No authentication token found')
        return
      }

      apiClient.setToken(token)
      const toolData = await apiClient.getTool(toolId)
      setTool(toolData)
    } catch (error) {
      console.error('Error fetching tool:', error)
      setError('Failed to load tool')
    } finally {
      setLoading(false)
    }
  }

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      apiClient.setToken(token)
      const agentsData = await apiClient.getAgents()
      setAgents(agentsData)
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const handleDeleteTool = async () => {
    if (!confirm('Are you sure you want to delete this tool? This action cannot be undone.')) {
      return
    }

    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      apiClient.setToken(token)
      await apiClient.deleteTool(toolId)
      router.push('/dashboard/tools')
    } catch (error) {
      console.error('Error deleting tool:', error)
      setError('Failed to delete tool')
    }
  }

  const handleAddToAgent = async () => {
    if (!selectedAgentId) return

    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      apiClient.setToken(token)
      
      // Get the current agent
      const agent = await apiClient.getAgent(selectedAgentId)
      
      // Add the tool to the agent's tools array
      const updatedTools = [...(agent.tools || []), toolId]
      
      // Update the agent
      await apiClient.updateAgent(selectedAgentId, {
        tools: updatedTools
      })

      alert('Tool added to agent successfully!')
      setShowAddToAgent(false)
      setSelectedAgentId(null)
    } catch (error) {
      console.error('Error adding tool to agent:', error)
      setError('Failed to add tool to agent')
    }
  }

  const getToolIcon = (toolType: string) => {
    switch (toolType) {
      case 'API':
        return GlobeAltIcon
      case 'Function':
        return CodeBracketIcon
      case 'Webhook':
        return BoltIcon
      case 'Database':
        return CircleStackIcon
      default:
        return WrenchScrewdriverIcon
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-2 text-gray-600">Loading tool...</p>
      </div>
    )
  }

  if (error || !tool) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Tool not found'}</p>
          <Link
            href="/dashboard/tools"
            className="text-blue-600 hover:text-blue-700"
          >
            Back to Tools
          </Link>
        </div>
      </div>
    )
  }

  const ToolIcon = getToolIcon(tool.tool_type)

  return (
    <div className="space-y-4 lg:space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 lg:space-x-4">
          <Link
            href="/dashboard/tools"
            className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 lg:w-5 lg:h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 truncate">{tool.name}</h1>
            <p className="text-xs lg:text-sm text-gray-600">Tool Details</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 lg:space-x-3">
          {/* Desktop Buttons */}
          <div className="hidden lg:flex items-center space-x-3">
            <button
              onClick={() => setShowAddToAgent(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add to Agent
            </button>
            
            <Link
              href={`/dashboard/tools/configure/${tool.id}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Edit
            </Link>
            
            <button
              onClick={handleDeleteTool}
              className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>

          {/* Mobile/Tablet Dropdown */}
          <div className="lg:hidden relative dropdown-container">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
            >
              <EllipsisVerticalIcon className="w-5 h-5" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-200 z-50">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowAddToAgent(true)
                      setDropdownOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <PlusIcon className="w-4 h-4 mr-3" />
                    Add to Agent
                  </button>
                  <Link
                    href={`/dashboard/tools/configure/${tool.id}`}
                    onClick={() => setDropdownOpen(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <PencilIcon className="w-4 h-4 mr-3" />
                    Edit
                  </Link>
                  <button
                    onClick={() => {
                      handleDeleteTool()
                      setDropdownOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <TrashIcon className="w-4 h-4 mr-3" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tool Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          {/* Basic Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6"
          >
            <div className="flex items-center mb-4 lg:mb-6">
              <div className="p-2 lg:p-3 bg-blue-100 rounded-lg mr-3 lg:mr-4">
                <ToolIcon className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base lg:text-xl font-semibold text-gray-900 truncate">{tool.name}</h2>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 lg:px-2.5 lg:py-0.5 rounded-full text-xs font-medium ${
                    tool.is_public ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {tool.is_public ? 'Public' : 'Private'}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 lg:px-2.5 lg:py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {tool.tool_type}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 lg:px-2.5 lg:py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {tool.category}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 lg:space-y-4">
              <div>
                <h3 className="text-xs lg:text-sm font-medium text-gray-700 mb-1 lg:mb-2">Description</h3>
                <p className="text-sm lg:text-base text-gray-900">{tool.description || 'No description provided'}</p>
              </div>

              <div>
                <h3 className="text-xs lg:text-sm font-medium text-gray-700 mb-1 lg:mb-2">Configuration</h3>
                <div className="bg-gray-50 rounded-lg p-3 lg:p-4">
                  <pre className="text-xs lg:text-sm text-gray-800 overflow-x-auto">
                    {JSON.stringify(tool.config, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Usage Examples */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6"
          >
            <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-3 lg:mb-4">Usage Examples</h2>
            <div className="space-y-3 lg:space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 lg:p-4">
                <h4 className="text-xs lg:text-sm font-medium text-gray-700 mb-1 lg:mb-2">Agent Integration</h4>
                <p className="text-xs lg:text-sm text-gray-600">
                  This tool can be integrated into your AI agents to extend their capabilities. 
                  When added to an agent, it will be available for the agent to use during conversations.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 lg:p-4">
                <h4 className="text-xs lg:text-sm font-medium text-gray-700 mb-1 lg:mb-2">Configuration</h4>
                <p className="text-xs lg:text-sm text-gray-600">
                  The tool's configuration determines how it behaves when executed. 
                  Make sure to properly configure API keys, endpoints, and other required parameters.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:space-y-6">
          {/* Tool Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6"
          >
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-3 lg:mb-4">Tool Information</h3>
            <div className="space-y-2 lg:space-y-3">
              <div className="flex justify-between">
                <span className="text-xs lg:text-sm text-gray-600">Status</span>
                <span className={`text-xs lg:text-sm font-medium ${
                  tool.is_active ? 'text-green-600' : 'text-red-600'
                }`}>
                  {tool.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs lg:text-sm text-gray-600">Created</span>
                <span className="text-xs lg:text-sm text-gray-900">
                  {new Date(tool.created_at).toLocaleDateString()}
                </span>
              </div>
              {tool.updated_at && (
                <div className="flex justify-between">
                  <span className="text-xs lg:text-sm text-gray-600">Updated</span>
                  <span className="text-xs lg:text-sm text-gray-900">
                    {new Date(tool.updated_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6"
          >
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-3 lg:mb-4">Quick Actions</h3>
            <div className="space-y-2 lg:space-y-3">
              <button
                onClick={() => setShowAddToAgent(true)}
                className="w-full flex items-center justify-center px-3 lg:px-4 py-2 border border-transparent text-xs lg:text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add to Agent
              </button>
              
              <Link
                href={`/dashboard/tools/configure/${tool.id}`}
                className="w-full flex items-center justify-center px-3 lg:px-4 py-2 border border-gray-300 text-xs lg:text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <PencilIcon className="w-4 h-4 mr-2" />
                Edit Tool
              </Link>
              
              <button
                onClick={handleDeleteTool}
                className="w-full flex items-center justify-center px-3 lg:px-4 py-2 border border-red-300 text-xs lg:text-sm font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Delete Tool
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Add to Agent Modal */}
      {showAddToAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Tool to Agent</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Agent
                </label>
                <select
                  value={selectedAgentId || ''}
                  onChange={(e) => setSelectedAgentId(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose an agent...</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddToAgent(false)
                    setSelectedAgentId(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddToAgent}
                  disabled={!selectedAgentId}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add to Agent
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
} 