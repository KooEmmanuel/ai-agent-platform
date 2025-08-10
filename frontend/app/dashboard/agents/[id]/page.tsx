'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  CpuChipIcon,
  WrenchScrewdriverIcon,
  ChatBubbleLeftRightIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  Cog6ToothIcon,
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'

import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Textarea } from '../../../../components/ui/Textarea'
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/Card'
import { apiClient } from '../../../../lib/api'

interface Agent {
  id: number
  name: string
  description?: string
  instructions: string
  model: string
  is_active: boolean
  tools: any[]
  context_config?: Record<string, any>
  created_at: string
  updated_at?: string
  tool_count: number
}

export default function AgentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const agentId = parseInt(params.id as string)
  
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  
  // Helper function to deep merge objects
  const deepMerge = (target: any, source: any): any => {
    const result = { ...target }
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    }
    return result
  }

  // Default context configuration
  const getDefaultContextConfig = () => ({
    memory_strategy: {
      type: 'hybrid',
      retention_policy: {
        conversation_history: {
          enabled: true,
          max_messages: 50,
          max_days: 30,
          auto_cleanup: true
        },
        user_preferences: {
          enabled: true,
          persistent: true,
          categories: ["product_preferences", "communication_style", "technical_level"]
        },
        session_data: {
          enabled: true,
          max_sessions: 10,
          session_timeout: 3600
        }
      }
    },
    context_management: {
      context_window: {
        max_tokens: 8000,
        reserve_tokens: 1000,
        overflow_strategy: 'summarize'
      },
      context_injection: {
        system_context: {
          enabled: true,
          include_agent_info: true,
          include_user_info: true,
          include_conversation_summary: true
        },
        dynamic_context: {
          enabled: true,
          include_relevant_history: true,
          include_user_preferences: true,
          include_session_state: true
        }
      },
      memory_summarization: {
        enabled: true,
        strategy: 'adaptive',
        trigger_conditions: {
          message_count: 20,
          token_threshold: 6000,
          time_threshold: 3600
        },
        summary_style: {
          include_key_points: true,
          include_user_preferences: true,
          include_action_items: true,
          max_summary_length: 500
        }
      }
    },
    conversation_persistence: {
      storage_strategy: {
        type: 'database',
        encryption: false,
        compression: true,
        backup_frequency: 'daily'
      },
      data_retention: {
        conversation_lifetime: 90,
        metadata_lifetime: 365,
        anonymization: {
          enabled: false,
          after_days: 30,
          fields: ["email", "phone", "address"]
        }
      }
    },
    session_management: {
      session_creation: {
        auto_create: true,
        user_initiated: true,
        timeout_creation: false
      },
      session_persistence: {
        enabled: true,
        storage_type: 'database',
        cleanup_strategy: 'timeout'
      }
    }
  })
  
  const [editForm, setEditForm] = useState<any>({
    name: '',
    description: '',
    instructions: '',
    model: '',
    is_active: true,
    context_config: getDefaultContextConfig()
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (dropdownOpen && !target.closest('.dropdown-container')) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  // Fetch agent data when component mounts
  useEffect(() => {
    if (agentId) {
      fetchAgent()
    }
  }, [agentId])

  const fetchAgent = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('auth_token')
      console.log('🔍 Fetching agent with ID:', agentId)
      console.log('🔑 Token exists:', !!token)
      
      if (!token) {
        console.log('❌ No authentication token found')
        setError('No authentication token found. Please log in.')
        setLoading(false)
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/auth/login')
        }, 2000)
        return
      }

      apiClient.setToken(token)
      console.log('📡 Making API call to get agent...')
      
      const agentData = await apiClient.getAgent(agentId)
      console.log('✅ Agent data received:', agentData)
      
      setAgent(agentData)
      
      // Initialize edit form with proper merging of context_config
      const defaultContextConfig = getDefaultContextConfig()

      // Deep merge the backend context_config with defaults
      const mergedContextConfig = agentData.context_config 
        ? deepMerge(defaultContextConfig, agentData.context_config)
        : defaultContextConfig

      setEditForm({
        name: agentData.name,
        description: agentData.description || '',
        instructions: agentData.instructions,
        model: agentData.model,
        is_active: agentData.is_active,
        context_config: mergedContextConfig
      })
    } catch (error) {
      console.error('❌ Error fetching agent:', error)
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('403')) {
          setError('Authentication failed. Please log in again.')
        } else if (error.message.includes('404')) {
          setError('Agent not found. It may have been deleted or you may not have permission to access it.')
        } else {
          setError(`Failed to fetch agent: ${error.message}`)
        }
      } else {
        setError('Failed to fetch agent: Unknown error')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setError('No authentication token found')
        return
      }

      apiClient.setToken(token)
      const updatedAgent = await apiClient.updateAgent(agentId, editForm)
      setAgent(updatedAgent)
      setEditing(false)
    } catch (error) {
      console.error('Error updating agent:', error)
      setError(error instanceof Error ? error.message : 'Failed to update agent')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      return
    }

    try {
      setSaving(true)
      setError(null)
      
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setError('No authentication token found')
        return
      }

      apiClient.setToken(token)
      await apiClient.deleteAgent(agentId)
      router.push('/dashboard/agents')
    } catch (error) {
      console.error('Error deleting agent:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete agent')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading agent...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
        <div className="flex space-x-4">
          <Button onClick={() => router.push('/dashboard/agents')}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>
          <Button onClick={() => fetchAgent()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <p className="text-gray-600">Agent not found</p>
          <Button onClick={() => router.push('/dashboard/agents')} className="mt-4">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/agents')}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 truncate">{agent.name}</h1>
            <p className="text-xs lg:text-sm text-gray-600">Agent Details</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 lg:space-x-3">
          {/* Desktop Buttons */}
          <div className="hidden lg:flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/playground/${agent.id}`)}
            >
              <PlayIcon className="w-4 h-4 mr-2" />
              Playground
            </Button>
            
            {editing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  <XMarkIcon className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  <PencilIcon className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>

          {/* Mobile/Tablet Dropdown */}
          <div className="lg:hidden relative dropdown-container">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <EllipsisVerticalIcon className="w-4 h-4" />
            </Button>
            
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-200 z-50">
                <div className="py-1">
                  <button
                    onClick={() => {
                      router.push(`/dashboard/playground/${agent.id}`)
                      setDropdownOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <PlayIcon className="w-4 h-4 mr-3" />
                    Playground
                  </button>
                  
                  {editing ? (
                    <>
                      <button
                        onClick={() => {
                          setEditing(false)
                          setDropdownOpen(false)
                        }}
                        disabled={saving}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center disabled:opacity-50"
                      >
                        <XMarkIcon className="w-4 h-4 mr-3" />
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          handleSave()
                          setDropdownOpen(false)
                        }}
                        disabled={saving}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center disabled:opacity-50"
                      >
                        <CheckIcon className="w-4 h-4 mr-3" />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditing(true)
                          setDropdownOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <PencilIcon className="w-4 h-4 mr-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          handleDelete()
                          setDropdownOpen(false)
                        }}
                        disabled={saving}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center disabled:opacity-50"
                      >
                        <TrashIcon className="w-4 h-4 mr-3" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6 lg:space-y-8">
        {/* Agent Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 lg:gap-6">
          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-3 lg:mr-4">
                <CpuChipIcon className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Status</p>
                <p className={`text-lg lg:text-2xl font-bold ${agent.is_active ? 'text-green-600' : 'text-gray-600'}`}>
                  {agent.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-lg flex items-center justify-center mr-3 lg:mr-4">
                <WrenchScrewdriverIcon className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Tools</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">{agent.tool_count}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-3 lg:mr-4">
                <ChatBubbleLeftRightIcon className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Model</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">{agent.model}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-3 lg:mr-4">
                <Cog6ToothIcon className="w-5 h-5 lg:w-6 lg:h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Created</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">
                  {new Date(agent.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6">
          <div className="flex items-center mb-6">
            <CpuChipIcon className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
          </div>
          
          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent Name
                </label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model
                </label>
                <Input
                  value={editForm.model}
                  onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">Active</label>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agent Name
                </label>
                <p className="text-gray-900 text-lg">{agent.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI Model
                </label>
                <p className="text-gray-900 text-lg">{agent.model}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <p className="text-gray-900">{agent.description || 'No description provided'}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  agent.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {agent.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6">
          <div className="flex items-center mb-6">
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Instructions</h2>
          </div>
          
          {editing ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Instructions
              </label>
              <Textarea
                value={editForm.instructions}
                onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })}
                rows={8}
                className="w-full"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Instructions
              </label>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-900 whitespace-pre-wrap">{agent.instructions}</p>
              </div>
            </div>
          )}
        </div>

        {/* Tools */}
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <WrenchScrewdriverIcon className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Tools</h2>
              <span className="ml-2 text-sm text-gray-500">({agent.tools?.length || 0})</span>
            </div>
            {!editing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/agents/${agent.id}/tools`)}
              >
                <PencilIcon className="w-4 h-4 mr-2" />
                Manage Tools
              </Button>
            )}
          </div>
          
          {agent.tools && agent.tools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agent.tools.map((tool: any, index: number) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-1">{tool.name || `Tool ${index + 1}`}</p>
                      <p className="text-sm text-gray-500 mb-2">{tool.description || 'No description'}</p>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {tool.category || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <WrenchScrewdriverIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No tools configured</p>
              <p className="text-sm text-gray-400 mb-4">Add tools to enhance your agent's capabilities</p>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/agents/${agent.id}/tools`)}
              >
                <WrenchScrewdriverIcon className="w-4 h-4 mr-2" />
                Add Tools
              </Button>
            </div>
          )}
        </div>

        {/* Quick Stats and Context Config */}
        <div className="space-y-6 lg:space-y-8">
          {/* Context Configuration */}
          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6">
            <div className="flex items-center mb-6">
              <Cog6ToothIcon className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Context Config</h2>
            </div>
            
            {editing ? (
              <div className="space-y-6">
                {/* Memory Strategy Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Memory Strategy</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Strategy Type</label>
                      <select
                        value={editForm.context_config.memory_strategy.type}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          context_config: {
                            ...editForm.context_config,
                            memory_strategy: {
                              ...editForm.context_config.memory_strategy,
                              type: e.target.value
                            }
                          }
                        })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="hybrid">Hybrid</option>
                        <option value="vector">Vector</option>
                        <option value="keyword">Keyword</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Messages</label>
                      <input
                        type="number"
                        value={editForm.context_config.memory_strategy.retention_policy.conversation_history.max_messages}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          context_config: {
                            ...editForm.context_config,
                            memory_strategy: {
                              ...editForm.context_config.memory_strategy,
                              retention_policy: {
                                ...editForm.context_config.memory_strategy.retention_policy,
                                conversation_history: {
                                  ...editForm.context_config.memory_strategy.retention_policy.conversation_history,
                                  max_messages: parseInt(e.target.value) || 50
                                }
                              }
                            }
                          }
                        })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Days</label>
                      <input
                        type="number"
                        value={editForm.context_config.memory_strategy.retention_policy.conversation_history.max_days}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          context_config: {
                            ...editForm.context_config,
                            memory_strategy: {
                              ...editForm.context_config.memory_strategy,
                              retention_policy: {
                                ...editForm.context_config.memory_strategy.retention_policy,
                                conversation_history: {
                                  ...editForm.context_config.memory_strategy.retention_policy.conversation_history,
                                  max_days: parseInt(e.target.value) || 30
                                }
                              }
                            }
                          }
                        })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editForm.context_config.memory_strategy.retention_policy.conversation_history.auto_cleanup}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          context_config: {
                            ...editForm.context_config,
                            memory_strategy: {
                              ...editForm.context_config.memory_strategy,
                              retention_policy: {
                                ...editForm.context_config.memory_strategy.retention_policy,
                                conversation_history: {
                                  ...editForm.context_config.memory_strategy.retention_policy.conversation_history,
                                  auto_cleanup: e.target.checked
                                }
                              }
                            }
                          }
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label className="ml-2 text-sm text-gray-700">Auto Cleanup</label>
                    </div>
                  </div>
                </div>

                {/* Context Management Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Context Management</h3>
                  <div className="space-y-4">
                    {/* Context Window */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-2">Context Window</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Max Tokens</label>
                          <input
                            type="number"
                            value={editForm.context_config.context_management.context_window.max_tokens}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                context_management: {
                                  ...editForm.context_config.context_management,
                                  context_window: {
                                    ...editForm.context_config.context_management.context_window,
                                    max_tokens: parseInt(e.target.value) || 8000
                                  }
                                }
                              }
                            })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Reserve Tokens</label>
                          <input
                            type="number"
                            value={editForm.context_config.context_management.context_window.reserve_tokens}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                context_management: {
                                  ...editForm.context_config.context_management,
                                  context_window: {
                                    ...editForm.context_config.context_management.context_window,
                                    reserve_tokens: parseInt(e.target.value) || 1000
                                  }
                                }
                              }
                            })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Overflow Strategy</label>
                          <select
                            value={editForm.context_config.context_management.context_window.overflow_strategy}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                context_management: {
                                  ...editForm.context_config.context_management,
                                  context_window: {
                                    ...editForm.context_config.context_management.context_window,
                                    overflow_strategy: e.target.value
                                  }
                                }
                              }
                            })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="summarize">Summarize</option>
                            <option value="discard">Discard</option>
                            <option value="error">Error</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Context Injection */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-2">Context Injection</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editForm.context_config.context_management.context_injection.system_context.enabled}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                context_management: {
                                  ...editForm.context_config.context_management,
                                  context_injection: {
                                    ...editForm.context_config.context_management.context_injection,
                                    system_context: {
                                      ...editForm.context_config.context_management.context_injection.system_context,
                                      enabled: e.target.checked
                                    }
                                  }
                                }
                              }
                            })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label className="ml-2 text-sm text-gray-700">System Context</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editForm.context_config.context_management.context_injection.dynamic_context.enabled}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                context_management: {
                                  ...editForm.context_config.context_management,
                                  context_injection: {
                                    ...editForm.context_config.context_management.context_injection,
                                    dynamic_context: {
                                      ...editForm.context_config.context_management.context_injection.dynamic_context,
                                      enabled: e.target.checked
                                    }
                                  }
                                }
                              }
                            })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label className="ml-2 text-sm text-gray-700">Dynamic Context</label>
                        </div>
                      </div>
                    </div>

                    {/* Memory Summarization */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-2">Memory Summarization</h4>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editForm.context_config.context_management.memory_summarization.enabled}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                context_management: {
                                  ...editForm.context_config.context_management,
                                  memory_summarization: {
                                    ...editForm.context_config.context_management.memory_summarization,
                                    enabled: e.target.checked
                                  }
                                }
                              }
                            })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label className="ml-2 text-sm text-gray-700">Enabled</label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Strategy</label>
                          <select
                            value={editForm.context_config.context_management.memory_summarization.strategy}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                context_management: {
                                  ...editForm.context_config.context_management,
                                  memory_summarization: {
                                    ...editForm.context_config.context_management.memory_summarization,
                                    strategy: e.target.value
                                  }
                                }
                              }
                            })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="adaptive">Adaptive</option>
                            <option value="fixed">Fixed</option>
                          </select>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Trigger Conditions</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Messages</label>
                              <input
                                type="number"
                                value={editForm.context_config.context_management.memory_summarization.trigger_conditions.message_count}
                                onChange={(e) => setEditForm({
                                  ...editForm,
                                  context_config: {
                                    ...editForm.context_config,
                                    context_management: {
                                      ...editForm.context_config.context_management,
                                      memory_summarization: {
                                        ...editForm.context_config.context_management.memory_summarization,
                                        trigger_conditions: {
                                          ...editForm.context_config.context_management.memory_summarization.trigger_conditions,
                                          message_count: parseInt(e.target.value) || 20
                                        }
                                      }
                                    }
                                  }
                                })}
                                className="block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Tokens</label>
                              <input
                                type="number"
                                value={editForm.context_config.context_management.memory_summarization.trigger_conditions.token_threshold}
                                onChange={(e) => setEditForm({
                                  ...editForm,
                                  context_config: {
                                    ...editForm.context_config,
                                    context_management: {
                                      ...editForm.context_config.context_management,
                                      memory_summarization: {
                                        ...editForm.context_config.context_management.memory_summarization,
                                        trigger_conditions: {
                                          ...editForm.context_config.context_management.memory_summarization.trigger_conditions,
                                          token_threshold: parseInt(e.target.value) || 6000
                                        }
                                      }
                                    }
                                  }
                                })}
                                className="block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Time (s)</label>
                              <input
                                type="number"
                                value={editForm.context_config.context_management.memory_summarization.trigger_conditions.time_threshold}
                                onChange={(e) => setEditForm({
                                  ...editForm,
                                  context_config: {
                                    ...editForm.context_config,
                                    context_management: {
                                      ...editForm.context_config.context_management,
                                      memory_summarization: {
                                        ...editForm.context_config.context_management.memory_summarization,
                                        trigger_conditions: {
                                          ...editForm.context_config.context_management.memory_summarization.trigger_conditions,
                                          time_threshold: parseInt(e.target.value) || 3600
                                        }
                                      }
                                    }
                                  }
                                })}
                                className="block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Summary Style</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={editForm.context_config.context_management.memory_summarization.summary_style.include_key_points}
                                onChange={(e) => setEditForm({
                                  ...editForm,
                                  context_config: {
                                    ...editForm.context_config,
                                    context_management: {
                                      ...editForm.context_config.context_management,
                                      memory_summarization: {
                                        ...editForm.context_config.context_management.memory_summarization,
                                        summary_style: {
                                          ...editForm.context_config.context_management.memory_summarization.summary_style,
                                          include_key_points: e.target.checked
                                        }
                                      }
                                    }
                                  }
                                })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <label className="ml-2 text-sm text-gray-700">Include Key Points</label>
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={editForm.context_config.context_management.memory_summarization.summary_style.include_user_preferences}
                                onChange={(e) => setEditForm({
                                  ...editForm,
                                  context_config: {
                                    ...editForm.context_config,
                                    context_management: {
                                      ...editForm.context_config.context_management,
                                      memory_summarization: {
                                        ...editForm.context_config.context_management.memory_summarization,
                                        summary_style: {
                                          ...editForm.context_config.context_management.memory_summarization.summary_style,
                                          include_user_preferences: e.target.checked
                                        }
                                      }
                                    }
                                  }
                                })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <label className="ml-2 text-sm text-gray-700">Include User Preferences</label>
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={editForm.context_config.context_management.memory_summarization.summary_style.include_action_items}
                                onChange={(e) => setEditForm({
                                  ...editForm,
                                  context_config: {
                                    ...editForm.context_config,
                                    context_management: {
                                      ...editForm.context_config.context_management,
                                      memory_summarization: {
                                        ...editForm.context_config.context_management.memory_summarization,
                                        summary_style: {
                                          ...editForm.context_config.context_management.memory_summarization.summary_style,
                                          include_action_items: e.target.checked
                                        }
                                      }
                                    }
                                  }
                                })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <label className="ml-2 text-sm text-gray-700">Include Action Items</label>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Max Length</label>
                              <input
                                type="number"
                                value={editForm.context_config.context_management.memory_summarization.summary_style.max_summary_length}
                                onChange={(e) => setEditForm({
                                  ...editForm,
                                  context_config: {
                                    ...editForm.context_config,
                                    context_management: {
                                      ...editForm.context_config.context_management,
                                      memory_summarization: {
                                        ...editForm.context_config.context_management.memory_summarization,
                                        summary_style: {
                                          ...editForm.context_config.context_management.memory_summarization.summary_style,
                                          max_summary_length: parseInt(e.target.value) || 500
                                        }
                                      }
                                    }
                                  }
                                })}
                                className="block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conversation Persistence Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Conversation Persistence</h3>
                  <div className="space-y-4">
                    {/* Storage Strategy */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-2">Storage Strategy</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                          <select
                            value={editForm.context_config.conversation_persistence.storage_strategy.type}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                conversation_persistence: {
                                  ...editForm.context_config.conversation_persistence,
                                  storage_strategy: {
                                    ...editForm.context_config.conversation_persistence.storage_strategy,
                                    type: e.target.value
                                  }
                                }
                              }
                            })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="database">Database</option>
                            <option value="memory">Memory</option>
                            <option value="redis">Redis</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
                          <select
                            value={editForm.context_config.conversation_persistence.storage_strategy.backup_frequency}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                conversation_persistence: {
                                  ...editForm.context_config.conversation_persistence,
                                  storage_strategy: {
                                    ...editForm.context_config.conversation_persistence.storage_strategy,
                                    backup_frequency: e.target.value
                                  }
                                }
                              }
                            })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editForm.context_config.conversation_persistence.storage_strategy.encryption}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                conversation_persistence: {
                                  ...editForm.context_config.conversation_persistence,
                                  storage_strategy: {
                                    ...editForm.context_config.conversation_persistence.storage_strategy,
                                    encryption: e.target.checked
                                  }
                                }
                              }
                            })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label className="ml-2 text-sm text-gray-700">Encryption</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editForm.context_config.conversation_persistence.storage_strategy.compression}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                conversation_persistence: {
                                  ...editForm.context_config.conversation_persistence,
                                  storage_strategy: {
                                    ...editForm.context_config.conversation_persistence.storage_strategy,
                                    compression: e.target.checked
                                  }
                                }
                              }
                            })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label className="ml-2 text-sm text-gray-700">Compression</label>
                        </div>
                      </div>
                    </div>

                    {/* Data Retention */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-2">Data Retention</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Conversation Lifetime (days)</label>
                          <input
                            type="number"
                            value={editForm.context_config.conversation_persistence.data_retention.conversation_lifetime}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                conversation_persistence: {
                                  ...editForm.context_config.conversation_persistence,
                                  data_retention: {
                                    ...editForm.context_config.conversation_persistence.data_retention,
                                    conversation_lifetime: parseInt(e.target.value) || 90
                                  }
                                }
                              }
                            })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Metadata Lifetime (days)</label>
                          <input
                            type="number"
                            value={editForm.context_config.conversation_persistence.data_retention.metadata_lifetime}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                conversation_persistence: {
                                  ...editForm.context_config.conversation_persistence,
                                  data_retention: {
                                    ...editForm.context_config.conversation_persistence.data_retention,
                                    metadata_lifetime: parseInt(e.target.value) || 365
                                  }
                                }
                              }
                            })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editForm.context_config.conversation_persistence.data_retention.anonymization.enabled}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                conversation_persistence: {
                                  ...editForm.context_config.conversation_persistence,
                                  data_retention: {
                                    ...editForm.context_config.conversation_persistence.data_retention,
                                    anonymization: {
                                      ...editForm.context_config.conversation_persistence.data_retention.anonymization,
                                      enabled: e.target.checked
                                    }
                                  }
                                }
                              }
                            })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label className="ml-2 text-sm text-gray-700">Anonymization</label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Anonymization After (days)</label>
                          <input
                            type="number"
                            value={editForm.context_config.conversation_persistence.data_retention.anonymization.after_days}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                conversation_persistence: {
                                  ...editForm.context_config.conversation_persistence,
                                  data_retention: {
                                    ...editForm.context_config.conversation_persistence.data_retention,
                                    anonymization: {
                                      ...editForm.context_config.conversation_persistence.data_retention.anonymization,
                                      after_days: parseInt(e.target.value) || 30
                                    }
                                  }
                                }
                              }
                            })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Session Management Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Session Management</h3>
                  <div className="space-y-4">
                    {/* Session Creation */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-2">Session Creation</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editForm.context_config.session_management.session_creation.auto_create}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                session_management: {
                                  ...editForm.context_config.session_management,
                                  session_creation: {
                                    ...editForm.context_config.session_management.session_creation,
                                    auto_create: e.target.checked
                                  }
                                }
                              }
                            })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label className="ml-2 text-sm text-gray-700">Auto Create</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editForm.context_config.session_management.session_creation.user_initiated}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                session_management: {
                                  ...editForm.context_config.session_management,
                                  session_creation: {
                                    ...editForm.context_config.session_management.session_creation,
                                    user_initiated: e.target.checked
                                  }
                                }
                              }
                            })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label className="ml-2 text-sm text-gray-700">User Initiated</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editForm.context_config.session_management.session_creation.timeout_creation}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                session_management: {
                                  ...editForm.context_config.session_management,
                                  session_creation: {
                                    ...editForm.context_config.session_management.session_creation,
                                    timeout_creation: e.target.checked
                                  }
                                }
                              }
                            })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label className="ml-2 text-sm text-gray-700">Timeout Creation</label>
                        </div>
                      </div>
                    </div>

                    {/* Session Persistence */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-2">Session Persistence</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editForm.context_config.session_management.session_persistence.enabled}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                session_management: {
                                  ...editForm.context_config.session_management,
                                  session_persistence: {
                                    ...editForm.context_config.session_management.session_persistence,
                                    enabled: e.target.checked
                                  }
                                }
                              }
                            })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label className="ml-2 text-sm text-gray-700">Enabled</label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Storage Type</label>
                          <select
                            value={editForm.context_config.session_management.session_persistence.storage_type}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                session_management: {
                                  ...editForm.context_config.session_management,
                                  session_persistence: {
                                    ...editForm.context_config.session_management.session_persistence,
                                    storage_type: e.target.value
                                  }
                                }
                              }
                            })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="database">Database</option>
                            <option value="memory">Memory</option>
                            <option value="redis">Redis</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Cleanup Strategy</label>
                          <select
                            value={editForm.context_config.session_management.session_persistence.cleanup_strategy}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              context_config: {
                                ...editForm.context_config,
                                session_management: {
                                  ...editForm.context_config.session_management,
                                  session_persistence: {
                                    ...editForm.context_config.session_management.session_persistence,
                                    cleanup_strategy: e.target.value
                                  }
                                }
                              }
                            })}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="timeout">Timeout</option>
                            <option value="manual">Manual</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Memory Strategy Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Memory Strategy</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Strategy Type</label>
                      <span className="font-medium text-gray-900 capitalize">
                        {agent.context_config?.memory_strategy?.type?.replace('_', ' ') || 'Default'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Messages</label>
                      <span className="font-medium text-gray-900">
                        {agent.context_config?.memory_strategy?.retention_policy?.conversation_history?.max_messages || 'Default'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Days</label>
                      <span className="font-medium text-gray-900">
                        {agent.context_config?.memory_strategy?.retention_policy?.conversation_history?.max_days || 'Default'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Auto Cleanup</label>
                      <span className={`font-medium ${agent.context_config?.memory_strategy?.retention_policy?.conversation_history?.auto_cleanup ? 'text-green-600' : 'text-gray-500'}`}>
                        {agent.context_config?.memory_strategy?.retention_policy?.conversation_history?.auto_cleanup ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Context Management Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Context Management</h3>
                  <div className="space-y-4">
                    {/* Context Window */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-2">Context Window</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Max Tokens</label>
                          <span className="font-medium text-gray-900">
                            {agent.context_config?.context_management?.context_window?.max_tokens || 'Default'}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Reserve Tokens</label>
                          <span className="font-medium text-gray-900">
                            {agent.context_config?.context_management?.context_window?.reserve_tokens || 'Default'}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Overflow Strategy</label>
                          <span className="font-medium text-gray-900 capitalize">
                            {agent.context_config?.context_management?.context_window?.overflow_strategy || 'Default'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Context Injection */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-2">Context Injection</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center">
                          <label className="block text-sm font-medium text-gray-700 mb-2">System Context</label>
                          <span className={`font-medium ${agent.context_config?.context_management?.context_injection?.system_context?.enabled ? 'text-green-600' : 'text-gray-500'}`}>
                            {agent.context_config?.context_management?.context_injection?.system_context?.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Dynamic Context</label>
                          <span className={`font-medium ${agent.context_config?.context_management?.context_injection?.dynamic_context?.enabled ? 'text-green-600' : 'text-gray-500'}`}>
                            {agent.context_config?.context_management?.context_injection?.dynamic_context?.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Memory Summarization */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-2">Memory Summarization</h4>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                          <span className={`font-medium ${agent.context_config?.context_management?.memory_summarization?.enabled ? 'text-green-600' : 'text-gray-500'}`}>
                            {agent.context_config?.context_management?.memory_summarization?.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Strategy</label>
                          <span className="font-medium text-gray-900 capitalize">
                            {agent.context_config?.context_management?.memory_summarization?.strategy || 'Default'}
                          </span>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Trigger Conditions</h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Messages</label>
                              <span className="font-medium text-gray-900 text-sm">
                                {agent.context_config?.context_management?.memory_summarization?.trigger_conditions?.message_count || 'Default'}
                              </span>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Tokens</label>
                              <span className="font-medium text-gray-900 text-sm">
                                {agent.context_config?.context_management?.memory_summarization?.trigger_conditions?.token_threshold || 'Default'}
                              </span>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Time (s)</label>
                              <span className="font-medium text-gray-900 text-sm">
                                {agent.context_config?.context_management?.memory_summarization?.trigger_conditions?.time_threshold || 'Default'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Summary Style</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Include Key Points</label>
                              <span className={`font-medium text-sm ${agent.context_config?.context_management?.memory_summarization?.summary_style?.include_key_points ? 'text-green-600' : 'text-gray-500'}`}>
                                {agent.context_config?.context_management?.memory_summarization?.summary_style?.include_key_points ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Include User Preferences</label>
                              <span className={`font-medium text-sm ${agent.context_config?.context_management?.memory_summarization?.summary_style?.include_user_preferences ? 'text-green-600' : 'text-gray-500'}`}>
                                {agent.context_config?.context_management?.memory_summarization?.summary_style?.include_user_preferences ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Include Action Items</label>
                              <span className={`font-medium text-sm ${agent.context_config?.context_management?.memory_summarization?.summary_style?.include_action_items ? 'text-green-600' : 'text-gray-500'}`}>
                                {agent.context_config?.context_management?.memory_summarization?.summary_style?.include_action_items ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Max Length</label>
                              <span className="font-medium text-gray-900 text-sm">
                                {agent.context_config?.context_management?.memory_summarization?.summary_style?.max_summary_length || 'Default'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conversation Persistence Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Conversation Persistence</h3>
                  <div className="space-y-4">
                    {/* Storage Strategy */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-2">Storage Strategy</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                          <span className="font-medium text-gray-900 capitalize">
                            {agent.context_config?.conversation_persistence?.storage_strategy?.type || 'Default'}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
                          <span className="font-medium text-gray-900 capitalize">
                            {agent.context_config?.conversation_persistence?.storage_strategy?.backup_frequency || 'Default'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Encryption</label>
                          <span className={`font-medium ${agent.context_config?.conversation_persistence?.storage_strategy?.encryption ? 'text-green-600' : 'text-gray-500'}`}>
                            {agent.context_config?.conversation_persistence?.storage_strategy?.encryption ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Compression</label>
                          <span className={`font-medium ${agent.context_config?.conversation_persistence?.storage_strategy?.compression ? 'text-green-600' : 'text-gray-500'}`}>
                            {agent.context_config?.conversation_persistence?.storage_strategy?.compression ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Data Retention */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-2">Data Retention</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Conversation Lifetime (days)</label>
                          <span className="font-medium text-gray-900">
                            {agent.context_config?.conversation_persistence?.data_retention?.conversation_lifetime || 'Default'}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Metadata Lifetime (days)</label>
                          <span className="font-medium text-gray-900">
                            {agent.context_config?.conversation_persistence?.data_retention?.metadata_lifetime || 'Default'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Anonymization</label>
                          <span className={`font-medium ${agent.context_config?.conversation_persistence?.data_retention?.anonymization?.enabled ? 'text-green-600' : 'text-gray-500'}`}>
                            {agent.context_config?.conversation_persistence?.data_retention?.anonymization?.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Anonymization After (days)</label>
                          <span className="font-medium text-gray-900">
                            {agent.context_config?.conversation_persistence?.data_retention?.anonymization?.after_days || 'Default'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Session Management Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Session Management</h3>
                  <div className="space-y-4">
                    {/* Session Creation */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-2">Session Creation</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Auto Create</label>
                          <span className={`font-medium ${agent.context_config?.session_management?.session_creation?.auto_create ? 'text-green-600' : 'text-gray-500'}`}>
                            {agent.context_config?.session_management?.session_creation?.auto_create ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <label className="block text-sm font-medium text-gray-700 mb-2">User Initiated</label>
                          <span className={`font-medium ${agent.context_config?.session_management?.session_creation?.user_initiated ? 'text-green-600' : 'text-gray-500'}`}>
                            {agent.context_config?.session_management?.session_creation?.user_initiated ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Timeout Creation</label>
                          <span className={`font-medium ${agent.context_config?.session_management?.session_creation?.timeout_creation ? 'text-green-600' : 'text-gray-500'}`}>
                            {agent.context_config?.session_management?.session_creation?.timeout_creation ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Session Persistence */}
                    <div>
                      <h4 className="text-md font-medium text-gray-800 mb-2">Session Persistence</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Enabled</label>
                          <span className={`font-medium ${agent.context_config?.session_management?.session_persistence?.enabled ? 'text-green-600' : 'text-gray-500'}`}>
                            {agent.context_config?.session_management?.session_persistence?.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Storage Type</label>
                          <span className="font-medium text-gray-900 capitalize">
                            {agent.context_config?.session_management?.session_persistence?.storage_type || 'Default'}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Cleanup Strategy</label>
                          <span className="font-medium text-gray-900 capitalize">
                            {agent.context_config?.session_management?.session_persistence?.cleanup_strategy || 'Default'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Created</span>
                <span className="font-medium text-gray-900">
                  {new Date(agent.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Last Updated</span>
                <span className="font-medium text-gray-900">
                  {agent.updated_at 
                    ? new Date(agent.updated_at).toLocaleDateString()
                    : 'Never'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Tools</span>
                <span className="font-medium text-gray-900">{agent.tools?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Status</span>
                <span className={`font-medium ${
                  agent.is_active ? 'text-green-600' : 'text-red-600'
                }`}>
                  {agent.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              className="w-full"
              onClick={() => router.push(`/dashboard/playground/${agent.id}`)}
            >
              <PlayIcon className="w-4 h-4 mr-2" />
              Test in Playground
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/dashboard/agents/${agent.id}/integrations`)}
            >
              <Cog6ToothIcon className="w-4 h-4 mr-2" />
              Manage Integrations
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/dashboard/agents/${agent.id}/tools`)}
            >
              <WrenchScrewdriverIcon className="w-4 h-4 mr-2" />
              Manage Tools
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 