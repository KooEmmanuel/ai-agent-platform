'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useParams } from 'next/navigation'
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

import { Button } from '../../../../../../components/ui/Button'
import { Input } from '../../../../../../components/ui/Input'
import { Textarea } from '../../../../../../components/ui/Textarea'
import { Select } from '../../../../../../components/ui/Select'
import { Card, CardHeader, CardTitle, CardContent } from '../../../../../../components/ui/Card'
import { apiClient } from '../../../../../../lib/api' 
import { useToast } from '../../../../../../components/ui/Toast'

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
}

export default function CreateOrganizationAgentPage() {
  const router = useRouter()
  const params = useParams()
  const organizationId = parseInt(params.id as string)
  const { showToast } = useToast()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [availableTools, setAvailableTools] = useState<Tool[]>([])
  const [selectedTools, setSelectedTools] = useState<Tool[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showToolSelector, setShowToolSelector] = useState(false)
  const [loadingTools, setLoadingTools] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructions: '',
    model: 'gpt-4o-mini',
    context_config: {
      memory_enabled: true,
      max_memory_items: 10,
      temperature: 0.7,
      max_tokens: 2000
    }
  })

  useEffect(() => {
    fetchAvailableTools()
  }, [])

  const fetchAvailableTools = async () => {
    setLoadingTools(true)
    try {
      // Prefer marketplace tools so users always see options
      let tools = await apiClient.getMarketplaceTools()
      // Fallback to user's collection if marketplace is empty
      if (!tools || tools.length === 0) {
        tools = await apiClient.getTools()
      }
      console.log('Fetched tools:', tools)
      setAvailableTools((tools || []).filter((tool: any) => tool.is_active !== false))
    } catch (error) {
      console.error('Error fetching tools:', error)
      showToast({
        type: 'error',
        message: 'Failed to load available tools'
      })
    } finally {
      setLoadingTools(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleContextConfigChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      context_config: {
        ...prev.context_config,
        [field]: value
      }
    }))
  }

  const toggleTool = (tool: Tool) => {
    setSelectedTools(prev => {
      const isSelected = prev.some(t => t.id === tool.id)
      if (isSelected) {
        return prev.filter(t => t.id !== tool.id)
      } else {
        return [...prev, tool]
      }
    })
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.instructions.trim()) {
      showToast({
        type: 'error',
        message: 'Name and instructions are required'
      })
      return
    }

    setLoading(true)
    try {
      const agentData = {
        ...formData,
        tools: selectedTools.map(tool => ({
          id: tool.id,
          name: tool.name,
          config: tool.config
        }))
      }

      await apiClient.createOrganizationAgent(organizationId, agentData)
      
      showToast({
        type: 'success',
        message: 'Organization agent created successfully!'
      })
      
      router.push(`/dashboard/organizations/${organizationId}/agents`)
    } catch (error) {
      console.error('Error creating organization agent:', error)
      showToast({
        type: 'error',
        message: 'Failed to create organization agent'
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredTools = availableTools.filter(tool =>
    tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowRightIcon className="w-5 h-5 text-gray-600 rotate-180" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create Organization Agent</h1>
                <p className="text-sm text-gray-600">Build an AI agent for your organization</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  step >= stepNumber
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {step > stepNumber ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{stepNumber}</span>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    step >= stepNumber ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {stepNumber === 1 && 'Basic Info'}
                    {stepNumber === 2 && 'Tools'}
                    {stepNumber === 3 && 'Configuration'}
                  </p>
                </div>
                {stepNumber < 3 && (
                  <div className={`ml-8 w-16 h-0.5 ${
                    step > stepNumber ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <Card className="shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CpuChipIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Agent Name *
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter agent name"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Describe what this agent does"
                      rows={3}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instructions *
                    </label>
                    <Textarea
                      value={formData.instructions}
                      onChange={(e) => handleInputChange('instructions', e.target.value)}
                      placeholder="Provide detailed instructions for how the agent should behave..."
                      rows={6}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Be specific about the agent's role, tone, and behavior patterns.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      AI Model
                    </label>
                    <Select
                      value={formData.model}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                      className="w-full"
                    >
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Tools */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <Card className="shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <WrenchScrewdriverIcon className="w-5 h-5 mr-2 text-purple-600" />
                    Select Tools
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">
                        {loadingTools ? 'Loading...' : `${availableTools.length} tools available`}
                      </p>
                      {!loadingTools && availableTools.length > 0 && (
                        <p className="text-xs text-gray-500">
                          {selectedTools.length} selected
                        </p>
                      )}
                    </div>
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search tools..."
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {loadingTools ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">Loading available tools...</p>
                    </div>
                  ) : filteredTools.length === 0 ? (
                    <div className="text-center py-8">
                      <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No tools found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {searchTerm ? 'Try adjusting your search terms' : 'No tools are currently available'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                      {filteredTools.map((tool) => (
                        <button
                          key={tool.id}
                          onClick={() => toggleTool(tool)}
                          disabled={selectedTools.some(t => t.id === tool.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg shadow-sm transition-all text-left ${
                            selectedTools.some(t => t.id === tool.id)
                              ? 'bg-blue-50 shadow-[0_2px_8px_rgba(59,130,246,0.1)]'
                              : 'bg-white hover:shadow-[0_4px_16px_rgba(59,130,246,0.15)]'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <WrenchScrewdriverIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{tool.name}</div>
                            <div className="text-xs text-gray-500 truncate">{tool.description}</div>
                          </div>
                          {selectedTools.some(t => t.id === tool.id) && (
                            <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedTools.length > 0 && (
                    <div className="mt-6">
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
                              onClick={() => toggleTool(tool)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Configuration */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <Card className="shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Cog6ToothIcon className="w-5 h-5 mr-2 text-green-600" />
                    Advanced Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Temperature
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={formData.context_config.temperature}
                        onChange={(e) => handleContextConfigChange('temperature', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">Controls randomness (0.0 = deterministic, 2.0 = very random)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Tokens
                      </label>
                      <Input
                        type="number"
                        min="100"
                        max="4000"
                        value={formData.context_config.max_tokens}
                        onChange={(e) => handleContextConfigChange('max_tokens', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">Maximum response length</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Memory Items
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.context_config.max_memory_items}
                      onChange={(e) => handleContextConfigChange('max_memory_items', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">Number of previous conversations to remember</p>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="memory_enabled"
                      checked={formData.context_config.memory_enabled}
                      onChange={(e) => handleContextConfigChange('memory_enabled', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="memory_enabled" className="ml-2 block text-sm text-gray-700">
                      Enable conversation memory
                    </label>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : router.back()}
            disabled={loading}
          >
            {step > 1 ? 'Previous' : 'Cancel'}
          </Button>

          <div className="flex items-center space-x-3">
            {step < 3 && (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={loading}
              >
                Next
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Button>
            )}
            
            {step === 3 && (
              <Button
                onClick={handleSubmit}
                disabled={loading || !formData.name.trim() || !formData.instructions.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Create Agent
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
