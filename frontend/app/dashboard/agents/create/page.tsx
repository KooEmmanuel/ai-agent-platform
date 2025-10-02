'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
// Simple toast notification without external dependency
import {
  CpuChipIcon,
  WrenchScrewdriverIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  PlusIcon,
  XMarkIcon,
  ArrowRightIcon,
  PlayIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  CheckIcon,
  ShieldCheckIcon,
  ClockIcon,
  CircleStackIcon,
  ChevronDownIcon,
  EyeIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'

import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Textarea } from '../../../../components/ui/Textarea'
import { Select } from '../../../../components/ui/Select'
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/Card'
import { apiClient } from '../../../../lib/api' 

interface Tool {
  id: number
  name: string
  description?: string
  category: string
  tool_type: string
  config: any
  is_public: boolean
  is_active: boolean
  created_at: string
  updated_at?: string
  user_id: number
  icon?: any
  cost?: number
}

interface ContextConfig {
  memory_strategy: {
    type: 'conversation_only' | 'summarized' | 'hybrid' | 'minimal'
    retention_policy: {
      conversation_history: {
        enabled: boolean
        max_messages: number
        max_days: number
        auto_cleanup: boolean
      }
      user_preferences: {
        enabled: boolean
        persistent: boolean
        categories: string[]
      }
      session_data: {
        enabled: boolean
        max_sessions: number
        session_timeout: number
      }
    }
  }
  context_management: {
    context_window: {
      max_tokens: number
      reserve_tokens: number
      overflow_strategy: 'truncate' | 'summarize' | 'error'
    }
    context_injection: {
      system_context: {
        enabled: boolean
        include_agent_info: boolean
        include_user_info: boolean
        include_conversation_summary: boolean
      }
      dynamic_context: {
        enabled: boolean
        include_relevant_history: boolean
        include_user_preferences: boolean
        include_session_state: boolean
      }
    }
    memory_summarization: {
      enabled: boolean
      strategy: 'fixed' | 'adaptive' | 'intelligent'
      trigger_conditions: {
        message_count: number
        token_threshold: number
        time_threshold: number
      }
      summary_style: {
        include_key_points: boolean
        include_user_preferences: boolean
        include_action_items: boolean
        max_summary_length: number
      }
    }
  }
  user_control: {
    memory_permissions: {
      allow_memory_clear: boolean
      allow_preference_edit: boolean
      allow_context_export: boolean
      allow_memory_import: boolean
    }
    privacy_controls: {
      data_collection: {
        conversation_content: boolean
        user_preferences: boolean
        interaction_patterns: boolean
        performance_metrics: boolean
      }
      data_sharing: {
        with_agent_owner: boolean
        for_improvement: boolean
        with_third_parties: boolean
      }
    }
  }
}

interface AgentConfig {
  name: string
  description: string
  instructions: string
  model: string
  tools: Tool[]
  context_config: ContextConfig
}

export default function CreateAgentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Toast notifications
  const [toasts, setToasts] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message?: string;
  }>>([])
  const [userCredits, setUserCredits] = useState(0)
  const [availableTools, setAvailableTools] = useState<Tool[]>([])
  const [selectedTools, setSelectedTools] = useState<Tool[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [availableModels, setAvailableModels] = useState<Array<{
    id: string
    name: string
    description: string
    context_window: number
    cost_per_1k_tokens: number
  }>>([])

  // Helper function to show toast
  const showToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { id, type, title, message }])
    
    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }

  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    name: '',
    description: '',
    instructions: '',
    model: 'gpt-4o-mini',
    tools: [],
    context_config: getDefaultContextConfig()
  })

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setError('No authentication token found')
        return
      }

      apiClient.setToken(token)
      
      const [creditsResponse, toolsResponse, modelsResponse] = await Promise.all([
        apiClient.getCredits(),
        apiClient.getTools(),
        apiClient.getAvailableModels()
      ])

      setUserCredits(creditsResponse.available_credits)
      setAvailableTools(toolsResponse || [])
      setAvailableModels(modelsResponse.models || [])
    } catch (error) {
      console.error('Error fetching initial data:', error)
      setError('Failed to load initial data')
    }
  }

  useEffect(() => {
    fetchInitialData()
  }, [])

  function getDefaultContextConfig(): ContextConfig {
    return {
      memory_strategy: {
        type: 'conversation_only',
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
            categories: ['general', 'work', 'personal']
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
      user_control: {
        memory_permissions: {
          allow_memory_clear: true,
          allow_preference_edit: true,
          allow_context_export: true,
          allow_memory_import: false
        },
        privacy_controls: {
          data_collection: {
            conversation_content: true,
            user_preferences: true,
            interaction_patterns: false,
            performance_metrics: true
          },
          data_sharing: {
            with_agent_owner: true,
            for_improvement: false,
            with_third_parties: false
          }
        }
      }
    }
  }

  const addTool = (tool: Tool) => {
    if (!selectedTools.find(t => t.id === tool.id)) {
      setSelectedTools([...selectedTools, tool])
    }
  }

  const removeTool = (toolId: number) => {
    setSelectedTools(selectedTools.filter(tool => tool.id !== toolId))
  }

  const calculateCost = () => {
    const baseCost = 50
    const toolCost = selectedTools.reduce((total, tool) => total + (tool.cost || 10), 0)
    return baseCost + toolCost
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('auth_token')
      if (!token) {
        setError('No authentication token found')
        return
      }

      const totalCost = calculateCost()
      if (totalCost > userCredits) {
        setError(`Insufficient credits. Required: ${totalCost.toFixed(1)}, Available: ${userCredits.toFixed(1)}`)
        return
      }

      apiClient.setToken(token)

      const newAgent = await apiClient.createAgent({
        name: agentConfig.name,
        description: agentConfig.description,
        instructions: agentConfig.instructions,
        model: agentConfig.model,
        tools: selectedTools,
        context_config: agentConfig.context_config
      })

      router.push(`/dashboard/agents/${newAgent.id}`)
    } catch (error) {
      console.error('Error creating agent:', error)
      
      // Check if it's a 400 error (agent limit)
      if (error instanceof Error && error.message.includes('HTTP 400')) {
        showToast('warning', 'Agent Limit Reached', 'You have reached the maximum number of agents for your plan. Upgrade your plan to create more agents.')
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create agent'
        showToast('error', 'Failed to Create Agent', errorMessage)
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = () => {
    // TODO: Implement preview functionality
    console.log('Preview agent:', agentConfig)
  }

  const filteredTools = availableTools.filter(tool =>
    tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalCost = calculateCost()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create New Agent</h1>
              <p className="text-gray-600 mt-1">Build a custom AI agent with powerful tools and memory</p>
            </div>
            
            {/* Credits and Actions */}
            <div className="flex items-center justify-between w-full sm:w-auto sm:gap-3">
              {/* Credits - Left side on mobile */}
              <div className="text-sm text-gray-500 bg-white px-3 py-2 rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.1)]">
                Credits: <span className="font-medium text-blue-600">{userCredits.toFixed(1)}</span>
              </div>
              
              {/* Actions - Right side on mobile, dropdown on desktop */}
              <div className="relative">
                {/* Mobile: Dots icon */}
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="sm:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <EllipsisVerticalIcon className="w-5 h-5" />
                </button>
                
                {/* Desktop: Button */}
                <Button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_14px_rgba(59,130,246,0.3)]"
                >
                  Actions
                  <ChevronDownIcon className="w-4 h-4" />
                </Button>
                
                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-[0_8px_32px_rgba(59,130,246,0.15)] border border-blue-100 z-10"
                    >
                      <div className="py-1">
                        <button
                          onClick={handlePreview}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                        >
                          <EyeIcon className="w-4 h-4" />
                          Preview Agent
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={loading || !agentConfig.name || !agentConfig.instructions}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <SparklesIcon className="w-4 h-4" />
                          {loading ? 'Creating...' : 'Create Agent'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 shadow-[0_2px_8px_rgba(239,68,68,0.1)]"
          >
            <p className="text-red-600">{error}</p>
          </motion.div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Agent Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="shadow-[0_4px_20px_rgba(59,130,246,0.08)] border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CpuChipIcon className="w-5 h-5 text-blue-600" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agent Name *
                  </label>
                  <Input
                    value={agentConfig.name}
                    onChange={(e) => setAgentConfig({...agentConfig, name: e.target.value})}
                    placeholder="Enter agent name"
                    className="shadow-[0_2px_8px_rgba(59,130,246,0.1)] border-0 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <Textarea
                    value={agentConfig.description}
                    onChange={(e) => setAgentConfig({...agentConfig, description: e.target.value})}
                    placeholder="Describe what this agent does"
                    rows={3}
                    className="shadow-[0_2px_8px_rgba(59,130,246,0.1)] border-0 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Model
                  </label>
                  <Select
                    value={agentConfig.model}
                    onChange={(e) => setAgentConfig({...agentConfig, model: e.target.value})}
                    className="shadow-[0_2px_8px_rgba(59,130,246,0.1)] border-0 focus:ring-2 focus:ring-blue-500"
                  >
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </option>
                    ))}
                  </Select>
                  {agentConfig.model && (
                    <div className="mt-2 text-sm text-gray-600">
                      {(() => {
                        const selectedModel = availableModels.find(m => m.id === agentConfig.model)
                        return selectedModel ? (
                          <div>
                            <div>Context Window: {selectedModel.context_window.toLocaleString()} tokens</div>
                            <div>Cost: ${selectedModel.cost_per_1k_tokens}/1K tokens</div>
                          </div>
                        ) : null
                      })()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="shadow-[0_4px_20px_rgba(59,130,246,0.08)] border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                  Instructions *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agent Instructions
                  </label>
                  <Textarea
                    value={agentConfig.instructions}
                    onChange={(e) => setAgentConfig({...agentConfig, instructions: e.target.value})}
                    placeholder="Define how this agent should behave, what it can do, and how it should respond..."
                    rows={6}
                    className="shadow-[0_2px_8px_rgba(59,130,246,0.1)] border-0 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tools Selection */}
            <Card className="shadow-[0_4px_20px_rgba(59,130,246,0.08)] border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <WrenchScrewdriverIcon className="w-5 h-5 text-blue-600" />
                  Tools & Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search tools..."
                      className="pl-10 shadow-[0_2px_8px_rgba(59,130,246,0.1)] border-0 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Selected Tools */}
                  {selectedTools.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Selected Tools ({selectedTools.length})</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedTools.map((tool) => (
                          <div
                            key={tool.id}
                            className="flex items-center justify-between p-3 bg-blue-50 rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.1)]"
                          >
                            <div className="flex items-center gap-2">
                              <WrenchScrewdriverIcon className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-gray-900">{tool.name}</span>
                            </div>
                            <button
                              onClick={() => removeTool(tool.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Available Tools */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Available Tools</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                      {filteredTools.map((tool) => (
                        <button
                          key={tool.id}
                          onClick={() => addTool(tool)}
                                                     disabled={!!selectedTools.find(t => t.id === tool.id)}
                          className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.1)] hover:shadow-[0_4px_16px_rgba(59,130,246,0.15)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
                        >
                          <WrenchScrewdriverIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{tool.name}</div>
                            <div className="text-xs text-gray-500 truncate">{tool.description}</div>
                          </div>
                          {selectedTools.find(t => t.id === tool.id) && (
                            <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary & Cost */}
          <div className="space-y-6">
            {/* Cost Summary */}
            <Card className="shadow-[0_4px_20px_rgba(59,130,246,0.08)] border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CircleStackIcon className="w-5 h-5 text-blue-600" />
                  Cost Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Base Cost:</span>
                  <span className="font-medium">50.0 credits</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tools ({selectedTools.length}):</span>
                  <span className="font-medium">{(totalCost - 50).toFixed(1)} credits</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-base font-semibold">
                    <span className="text-gray-900">Total:</span>
                    <span className="text-blue-600">{totalCost.toFixed(1)} credits</span>
                  </div>
                </div>
                
                {totalCost > userCredits && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600">
                      Insufficient credits. Need {totalCost.toFixed(1)}, have {userCredits.toFixed(1)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-[0_4px_20px_rgba(59,130,246,0.08)] border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cog6ToothIcon className="w-5 h-5 text-blue-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handlePreview}
                  variant="outline"
                  className="w-full shadow-[0_2px_8px_rgba(59,130,246,0.1)] border-blue-200 hover:bg-blue-50"
                >
                  <EyeIcon className="w-4 h-4 mr-2" />
                  Preview Agent
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading || !agentConfig.name || !agentConfig.instructions || totalCost > userCredits}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_14px_rgba(59,130,246,0.3)]"
                >
                  {loading ? (
                    <>
                      <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-4 h-4 mr-2" />
                      Create Agent
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-lg shadow-lg border p-4 ${
            toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            toast.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
            toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-start">
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.title}</p>
              {toast.message && (
                <p className="mt-1 text-sm opacity-90">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
} 