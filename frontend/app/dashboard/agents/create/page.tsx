'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
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
  CircleStackIcon
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
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableTools, setAvailableTools] = useState<Tool[]>([])
  const [userCredits, setUserCredits] = useState(0)
  
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    name: '',
    description: '',
    instructions: '',
    model: 'gpt-4o-mini',
    tools: [],
    context_config: getDefaultContextConfig()
  })

  const [selectedTools, setSelectedTools] = useState<Tool[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setError('No authentication token found')
        return
      }

      // Set the token in the API client
      apiClient.setToken(token)

      // Fetch available tools and user credits using the API client
      const [tools, credits] = await Promise.all([
        apiClient.getTools(),
        apiClient.getCredits()
      ])

      setAvailableTools(tools as Tool[])
      setUserCredits(credits.available_credits)
    } catch (error) {
      console.error('Error fetching initial data:', error)
      setError('Failed to load initial data')
    }
  }

  function getDefaultContextConfig(): ContextConfig {
    return {
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
            categories: ['product_preferences', 'communication_style', 'technical_level']
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
          allow_memory_import: true
        },
        privacy_controls: {
          data_collection: {
            conversation_content: true,
            user_preferences: true,
            interaction_patterns: false,
            performance_metrics: true
          },
          data_sharing: {
            with_agent_owner: false,
            for_improvement: false,
            with_third_parties: false
          }
        }
      }
    }
  }

  const categories = [
    { id: 'all', name: 'All Tools', count: availableTools.length },
    { id: 'search', name: 'Search', count: availableTools.filter(t => t.category === 'search').length },
    { id: 'scheduling', name: 'Scheduling', count: availableTools.filter(t => t.category === 'scheduling').length },
    { id: 'communication', name: 'Communication', count: availableTools.filter(t => t.category === 'communication').length },
    { id: 'data', name: 'Data', count: availableTools.filter(t => t.category === 'data').length }
  ]

  const filteredTools = availableTools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const addTool = (tool: Tool) => {
    if (!selectedTools.find(t => t.id === tool.id)) {
      setSelectedTools([...selectedTools, tool])
    }
  }

  const removeTool = (toolId: number) => {
    setSelectedTools(selectedTools.filter(t => t.id !== toolId))
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
        setError(`Insufficient credits. Required: ${totalCost}, Available: ${userCredits}`)
        return
      }

      // Set the token in the API client
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
      setError(error instanceof Error ? error.message : 'Failed to create agent')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { id: 1, name: 'Basic Info', description: 'Agent name and description' },
    { id: 2, name: 'Instructions', description: 'Define agent behavior' },
    { id: 3, name: 'Tools', description: 'Select capabilities' },
    { id: 4, name: 'Context & Memory', description: 'Configure memory settings' },
    { id: 5, name: 'Review', description: 'Final configuration' }
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Agent</h1>
            <p className="text-gray-600">Build a custom AI agent with powerful tools and memory</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-500">
              Credits: <span className="font-medium">{userCredits}</span>
            </div>
            <Button variant="outline" size="sm">
              <PlayIcon className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button 
              onClick={handleSave}
              disabled={loading || currentStep < 5}
              size="sm"
            >
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, stepIdx) => (
              <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''} ${stepIdx !== 0 ? 'pl-8 sm:pl-20' : ''}`}>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  {stepIdx !== 0 && (
                    <div className={`h-0.5 w-full ${step.id <= currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  )}
                </div>
                <div className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                  step.id < currentStep ? 'bg-blue-600' : step.id === currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}>
                  {step.id < currentStep ? (
                    <CheckIcon className="h-5 w-5 text-white" /> 
                  ) : (
                    <span className={`text-sm font-medium ${step.id === currentStep ? 'text-white' : 'text-gray-500'}`}>
                      {step.id}
                    </span>
                  )}
                </div>
                <div className="absolute top-10 left-1/2 transform -translate-x-1/2">
                  <span className={`text-xs font-medium ${step.id === currentStep ? 'text-blue-600' : 'text-gray-500'}`}>
                    {step.name}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel - Agent Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CpuChipIcon className="w-5 h-5 mr-2" />
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
                        onChange={(e) => setAgentConfig({ ...agentConfig, name: e.target.value })}
                        placeholder="e.g., Customer Support Bot"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <Textarea
                        value={agentConfig.description}
                        onChange={(e) => setAgentConfig({ ...agentConfig, description: e.target.value })}
                        placeholder="Describe what this agent does..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        AI Model
                      </label>
                      <Select
                        value={agentConfig.model}
                        onChange={(e) => setAgentConfig({ ...agentConfig, model: e.target.value })}
                      >
                        <option value="gpt-4o-mini">GPT-4o Mini (Fast & Cost-effective)</option>
                        <option value="gpt-4o">GPT-4o (Most Capable)</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Balanced)</option>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DocumentTextIcon className="w-5 h-5 mr-2" />
                      Agent Instructions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Instructions *
                      </label>
                      <Textarea
                        value={agentConfig.instructions}
                        onChange={(e) => setAgentConfig({ ...agentConfig, instructions: e.target.value })}
                        placeholder="Define how this agent should behave, what it can do, and how it should respond..."
                        rows={8}
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        Be specific about the agent's role, capabilities, and behavior patterns.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <WrenchScrewdriverIcon className="w-5 h-5 mr-2" />
                      Select Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Search and Filter */}
                      <div className="flex space-x-4">
                        <div className="flex-1">
                          <Input
                            placeholder="Search tools..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                        <Select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                          {categories.map(category => (
                            <option key={category.id} value={category.id}>
                              {category.name} ({category.count})
                            </option>
                          ))}
                        </Select>
                      </div>

                      {/* Tools Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredTools.map((tool) => (
                          <div
                            key={tool.id}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedTools.find(t => t.id === tool.id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => addTool(tool)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <tool.icon className="w-5 h-5 text-blue-500" />
                                <div>
                                  <h4 className="font-medium text-gray-900">{tool.name}</h4>
                                  <p className="text-sm text-gray-500">{tool.description}</p>
                                </div>
                              </div>
                              <div className="text-sm text-gray-500">
                                {tool.cost || 10} credits
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Selected Tools */}
                      {selectedTools.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Selected Tools</h4>
                          <div className="space-y-2">
                            {selectedTools.map((tool) => (
                              <div key={tool.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <tool.icon className="w-5 h-5 text-blue-500" />
                                  <span className="font-medium">{tool.name}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeTool(tool.id)}
                                >
                                  <XMarkIcon className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CircleStackIcon className="w-5 h-5 mr-2" />
                      Context & Memory Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Memory Strategy */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Memory Strategy</h4>
                        <Select
                          value={agentConfig.context_config.memory_strategy.type}
                          onChange={(e) => setAgentConfig({
                            ...agentConfig,
                            context_config: {
                              ...agentConfig.context_config,
                              memory_strategy: {
                                ...agentConfig.context_config.memory_strategy,
                                type: e.target.value as any
                              }
                            }
                          })}
                        >
                          <option value="conversation_only">Conversation Only</option>
                          <option value="summarized">Summarized Memory</option>
                          <option value="hybrid">Hybrid (Recommended)</option>
                          <option value="minimal">Minimal Memory</option>
                        </Select>
                      </div>

                      {/* Context Window */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Context Window</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">Max Tokens</label>
                            <Input
                              type="number"
                              value={agentConfig.context_config.context_management.context_window.max_tokens}
                              onChange={(e) => setAgentConfig({
                                ...agentConfig,
                                context_config: {
                                  ...agentConfig.context_config,
                                  context_management: {
                                    ...agentConfig.context_config.context_management,
                                    context_window: {
                                      ...agentConfig.context_config.context_management.context_window,
                                      max_tokens: parseInt(e.target.value)
                                    }
                                  }
                                }
                              })}
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-700 mb-1">Reserve Tokens</label>
                            <Input
                              type="number"
                              value={agentConfig.context_config.context_management.context_window.reserve_tokens}
                              onChange={(e) => setAgentConfig({
                                ...agentConfig,
                                context_config: {
                                  ...agentConfig.context_config,
                                  context_management: {
                                    ...agentConfig.context_config.context_management,
                                    context_window: {
                                      ...agentConfig.context_config.context_management.context_window,
                                      reserve_tokens: parseInt(e.target.value)
                                    }
                                  }
                                }
                              })}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Privacy Controls */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Privacy Controls</h4>
                        <div className="space-y-3">
                          {Object.entries(agentConfig.context_config.user_control.privacy_controls.data_collection).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between">
                              <span className="text-sm text-gray-700 capitalize">
                                {key.replace(/_/g, ' ')}
                              </span>
                              <input
                                type="checkbox"
                                checked={value}
                                onChange={(e) => setAgentConfig({
                                  ...agentConfig,
                                  context_config: {
                                    ...agentConfig.context_config,
                                    user_control: {
                                      ...agentConfig.context_config.user_control,
                                      privacy_controls: {
                                        ...agentConfig.context_config.user_control.privacy_controls,
                                        data_collection: {
                                          ...agentConfig.context_config.user_control.privacy_controls.data_collection,
                                          [key]: e.target.checked
                                        }
                                      }
                                    }
                                  }
                                })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 5 && (
              <motion.div
                key="step-5"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CheckIcon className="w-5 h-5 mr-2" />
                      Review Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Agent Info */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Agent Information</h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p><strong>Name:</strong> {agentConfig.name}</p>
                          <p><strong>Description:</strong> {agentConfig.description}</p>
                          <p><strong>Model:</strong> {agentConfig.model}</p>
                        </div>
                      </div>

                      {/* Tools */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Selected Tools ({selectedTools.length})</h4>
                        <div className="space-y-2">
                          {selectedTools.map((tool) => (
                            <div key={tool.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <tool.icon className="w-5 h-5 text-blue-500" />
                                <span>{tool.name}</span>
                              </div>
                              <span className="text-sm text-gray-500">{tool.cost || 10} credits</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Memory Strategy */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Memory Configuration</h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p><strong>Strategy:</strong> {agentConfig.context_config.memory_strategy.type}</p>
                          <p><strong>Max Tokens:</strong> {agentConfig.context_config.context_management.context_window.max_tokens}</p>
                          <p><strong>Reserve Tokens:</strong> {agentConfig.context_config.context_management.context_window.reserve_tokens}</p>
                        </div>
                      </div>

                      {/* Cost Summary */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Cost Summary</h4>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span>Base Cost:</span>
                            <span>50 credits</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Tools Cost:</span>
                            <span>{selectedTools.reduce((total, tool) => total + (tool.cost || 10), 0)} credits</span>
                          </div>
                          <div className="border-t pt-2 mt-2">
                            <div className="flex justify-between items-center font-medium">
                              <span>Total Cost:</span>
                              <span>{calculateCost()} credits</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
                            <span>Available Credits:</span>
                            <span>{userCredits} credits</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel - Navigation and Summary */}
        <div className="space-y-6">
          {/* Step Navigation */}
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {steps.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      step.id === currentStep
                        ? 'bg-blue-50 border border-blue-200'
                        : step.id < currentStep
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${
                          step.id === currentStep ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {step.name}
                        </p>
                        <p className="text-sm text-gray-500">{step.description}</p>
                      </div>
                      {step.id < currentStep && (
                        <CheckIcon className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tools Selected:</span>
                  <span className="font-medium">{selectedTools.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Memory Strategy:</span>
                  <span className="font-medium capitalize">
                    {agentConfig.context_config.memory_strategy.type.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="font-medium">{calculateCost()} credits</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="flex-1"
            >
              Previous
            </Button>
            <Button
              onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
              disabled={currentStep === 5}
              className="flex-1"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 