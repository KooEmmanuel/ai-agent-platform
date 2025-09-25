'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  WrenchScrewdriverIcon,
  PlusIcon,
  TrashIcon,
  Cog6ToothIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  StarIcon,
  EyeIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  BookOpenIcon,
  NewspaperIcon,
  CloudIcon,
  TableCellsIcon,
  CircleStackIcon,
  GlobeAltIcon,
  DocumentIcon,
  PhotoIcon,
  DocumentMagnifyingGlassIcon,
  LanguageIcon,
  ChartBarIcon,
  ChartPieIcon,
  CalendarIcon,
  BellIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  ShareIcon,
  CreditCardIcon,
  BoltIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { apiClient, type Tool, type Agent } from '../../../../../lib/api'
import ToolConfigForm from '../../../../../components/ToolConfigForm'
import { useToast } from '../../../../../components/ui/Toast'
import { getToolDisplayName, getToolLogo, getToolIcon, getStyledToolIcon } from '../../../../../lib/toolMetadata'

interface AgentTool {
  id: number
  name: string
  display_name?: string
  description?: string
  category: string
  tool_type: string
  config: Record<string, any>
  parameters?: Record<string, any>
  is_public: boolean
  is_active: boolean
  created_at: string
  updated_at?: string
  user_id: number
  is_in_user_collection?: boolean
  is_configured?: boolean
  custom_config?: Record<string, any>
}

// Function to convert display names to technical names for documentation URLs
const getToolTechnicalName = (displayName: string): string => {
  // Complete mapping based on actual database tool names
  const nameMap: Record<string, string> = {
    // Search Tools
    'Web Search': 'web_search',
    'News Search': 'news_search',
    
    // Data Tools  
    'Weather API': 'weather_api',
    'CSV Processor': 'csv_processor',
    'Database Query': 'database_query', 
    'Data Scraper': 'data_scraper',
    'File Processor': 'file_processor',
    'Image Processor': 'image_processor',
    'PDF Processor': 'pdf_processor',
    'Text Analyzer': 'text_analyzer',
    'Translation Service': 'translation_service',
    'Data Visualization': 'data_visualization',
    'Statistical Analysis': 'statistical_analysis',
    
    // Scheduling Tools
    'Calendar Manager': 'calendar_manager',
    'Reminder Tool': 'reminder_tool',
    'Date Calculator': 'date_calculator',
    
    // Communication Tools
    'Email Sender': 'email_sender',
    'Email': 'email_sender', // Alternative name
    'Slack Integration': 'slack_integration',
    'Slack': 'slack_integration', // Alternative name
    'Notification Service': 'notification_service',
    'Social Media': 'social_media',
    
    // Common variations/shortened names
    'Weather': 'weather_api',
    'weather': 'weather_api', // lowercase variation
    
    // Integration Tools
    'Google Sheets Integration': 'google_sheets_integration',
    'Payment Processor': 'payment_processor',
    'Webhook Handler': 'webhook_handler',
    'Zapier Webhook': 'zapier_webhook'
  }
  
  // If exact match found, use it
  if (nameMap[displayName]) {
    return nameMap[displayName]
  }
  
  // If the displayName is already a technical name, use it as-is
  if (displayName.includes('_') && !displayName.includes(' ')) {
    return displayName
  }
  
  // Handle cases where database stores technical names but they get displayed differently
  // Convert back to technical name if it's a known technical name
  const technicalNames = [
    'web_search', 'news_search', 'weather_api', 'csv_processor', 'database_query',
    'data_scraper', 'file_processor', 'image_processor', 'pdf_processor', 
    'text_analyzer', 'translation_service', 'data_visualization', 'statistical_analysis',
    'calendar_manager', 'reminder_tool', 'date_calculator', 'email_sender',
    'slack_integration', 'notification_service', 'social_media', 
    'google_sheets_integration', 'payment_processor', 'webhook_handler', 'zapier_webhook'
  ]
  
  // Check if the display name matches any technical name when converted
  const convertedName = displayName.toLowerCase().replace(/\s+/g, '_')
  if (technicalNames.includes(convertedName)) {
    return convertedName
  }
  
  // Otherwise convert to snake_case but remove "_tool" suffix if present
  let technicalName = displayName.toLowerCase().replace(/\s+/g, '_')
  if (technicalName.endsWith('_tool')) {
    technicalName = technicalName.slice(0, -5) // Remove "_tool"
  }
  
  return technicalName
}

export default function AgentToolsPage() {
  const params = useParams()
  const router = useRouter()
  const agentId = params.id as string
  const { showToast } = useToast()
  
  const [agent, setAgent] = useState<Agent | null>(null)
  const [agentTools, setAgentTools] = useState<AgentTool[]>([])
  const [availableTools, setAvailableTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedType, setSelectedType] = useState('All')
  const [showAddToolModal, setShowAddToolModal] = useState(false)
  const [showConfigureModal, setShowConfigureModal] = useState(false)
  const [selectedTool, setSelectedTool] = useState<AgentTool | null>(null)
  const [configuringTool, setConfiguringTool] = useState<AgentTool | null>(null)
  const [toolConfig, setToolConfig] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [configSchema, setConfigSchema] = useState<any>(null)
  const [loadingSchema, setLoadingSchema] = useState(false)
  const [isToolConfigured, setIsToolConfigured] = useState(false)

  // Simple icon mapping function that returns JSX using centralized metadata with brand colors
  const getToolIconJSX = (toolName: string, className: string) => {
    return getStyledToolIcon(toolName, className)
  }

  const categories = [
    'All',
    'Search',
    'Scheduling',
    'Communication',
    'Data',
    'Analytics',
    'Integration',
    'Custom'
  ]

  const toolTypes = [
    'All',
    'API',
    'Function',
    'Webhook',
    'Database'
  ]

  useEffect(() => {
    if (agentId) {
      loadAgent()
      loadAgentTools()
      loadAvailableTools()
    }
  }, [agentId])

  const loadAgent = async () => {
    try {
      const agentData = await apiClient.getAgent(parseInt(agentId))
      setAgent(agentData)
    } catch (error) {
      console.error('Error loading agent:', error)
    }
  }

  //log Agent tools
  const loadAgentTools = async () => {
    try {
      const agentToolsData = await apiClient.getAgentTools(parseInt(agentId))
      console.log('🔍 Agent tools:', agentToolsData.tools)
      setAgentTools(agentToolsData.tools.map((tool: any) => ({
        ...tool,
        is_configured: Object.keys(tool.custom_config || {}).length > 0

      })))
    } catch (error) {
      console.error('Error loading agent tools:', error)
    }
  }

  const loadAvailableTools = async () => {
    try {
      // Load both marketplace tools and user tools
      const [marketplaceTools, userTools] = await Promise.all([
        apiClient.getMarketplaceTools(),
        apiClient.getTools()
      ])
      
      console.log('🔍 Marketplace tools:', marketplaceTools.map(t => ({ id: t.id, name: t.name })))
      console.log('🔍 User tools:', userTools.map(t => ({ id: t.id, name: t.name })))
      
      // Combine marketplace and user tools, ensuring unique IDs
      const allTools = [...marketplaceTools, ...userTools]
      
      // Remove duplicates based on ID, keeping user tools over marketplace tools
      const uniqueTools = allTools.reduce((acc, tool) => {
        const existingIndex = acc.findIndex(t => t.id === tool.id)
        if (existingIndex === -1) {
          acc.push(tool)
        } else {
          // If it's a user tool, replace the marketplace tool
          if (tool.user_id && acc[existingIndex].user_id) {
            acc[existingIndex] = tool
          }
        }
        return acc
      }, [] as Tool[])
      
      console.log('🔍 Final unique tools:', uniqueTools.map(t => ({ id: t.id, name: t.name })))
      
      setAvailableTools(uniqueTools)
    } catch (error) {
      console.error('Error loading available tools:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTool = (tool: Tool) => {
    setSelectedTool({
      ...tool,
      is_configured: false,
      custom_config: {}
    })
    setShowAddToolModal(true)
  }

  const confirmAddTool = async () => {
    if (!selectedTool) return
    
    setSaving(true)
    try {
      console.log('🔧 Attempting to add tool:', {
        agentId: parseInt(agentId),
        toolId: selectedTool.id,
        toolName: selectedTool.name,
        customConfig: selectedTool.custom_config
      })
      
      const result = await apiClient.addToolToAgent(parseInt(agentId), selectedTool.id, selectedTool.custom_config)
      console.log('✅ Tool added successfully:', result)
      
      // Reload agent tools to get updated data
      await loadAgentTools()
      
      // Also reload available tools to update the filtered list
      await loadAvailableTools()
      
      setShowAddToolModal(false)
      setSelectedTool(null)
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'Tool Added Successfully',
        message: `${selectedTool.name} has been added to your agent.`
      })
    } catch (error) {
      console.error('❌ Error adding tool:', error)
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        response: error.response
      })
      showToast({
        type: 'error',
        title: 'Failed to Add Tool',
        message: `Failed to add tool: ${error.message || 'Unknown error'}`
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveTool = async (tool: AgentTool) => {
    try {
      await apiClient.removeToolFromAgent(parseInt(agentId), tool.name)
      
      // Reload agent tools to get updated data
      await loadAgentTools()
    } catch (error) {
      console.error('Error removing tool:', error)
    }
  }

  const handleConfigureTool = async (tool: AgentTool) => {
    console.log('🔧 Configuring tool:', { id: tool.id, name: tool.name, description: tool.description })
    setConfiguringTool(tool)
    setShowConfigureModal(true)
    
    setLoadingSchema(true)
    try {
      // Get agent config data (includes base config, current config, and is_configured flag)
      const agentConfigData = await apiClient.getToolAgentConfig(tool.id, parseInt(agentId))
      console.log('🔧 Agent config data:', agentConfigData)
      
      // Get tool configuration schema
      const schema = await apiClient.getToolConfigSchema(tool.name)
      setConfigSchema(schema)
      
      // Initialize config with current config, then base config defaults
      let initialConfig: Record<string, any> = {}
      
      // First, add base config defaults
      if (agentConfigData.base_config) {
        initialConfig = { ...agentConfigData.base_config }
      }
      
      // Then, override with current config (user's saved configuration)
      if (agentConfigData.current_config) {
        initialConfig = { ...initialConfig, ...agentConfigData.current_config }
      }
      
      // Finally, add any schema defaults that aren't already set
      schema.config_fields.forEach((field: any) => {
        if (field.default !== undefined && !(field.name in initialConfig)) {
          initialConfig[field.name] = field.default
        }
      })
      
      // Don't overwrite if we already have a File object in the current config
      const currentConfig = toolConfig
      if (currentConfig && Object.keys(currentConfig).length > 0) {
        // Preserve any File objects that are already in the form
        for (const [key, value] of Object.entries(currentConfig)) {
          if (value instanceof File) {
            initialConfig[key] = value
          }
        }
      }
      
      setToolConfig(initialConfig)
      
      // Log configuration status
      if (agentConfigData.is_configured) {
        console.log('✅ Tool is already configured with custom settings')
        setIsToolConfigured(true)
      } else {
        console.log('ℹ️ Tool is not configured yet, using default settings')
        setIsToolConfigured(false)
      }
      
    } catch (error) {
      console.error('Error loading tool configuration:', error)
      setConfigSchema(null)
    } finally {
      setLoadingSchema(false)
    }
  }

  const saveToolConfiguration = async (configToSave?: Record<string, any>) => {
    if (!configuringTool) return
    
    setSaving(true)
    try {
      // Use provided config or fall back to toolConfig state
      const configData = configToSave || toolConfig
      
      // Handle file uploads first
      const processedConfig = { ...configData }
      
                      console.log('🔧 Processing tool config:', configData)
        
        // Special logging for Email Sender
        if (configuringTool && configuringTool.name === 'email_sender') {
          console.log('📧 Email Sender - Processing configuration...')
          console.log('📧 Email Sender - Username field:', configData.username ? 'FOUND' : 'MISSING')
          console.log('📧 Email Sender - Password field:', configData.password ? 'FOUND' : 'MISSING')
        }
        
        for (const [key, value] of Object.entries(configData)) {
          console.log(`🔧 Processing field ${key}:`, value, typeof value)
        if (value instanceof File) {
          console.log(`📁 Found file to upload: ${value.name} (${value.size} bytes)`)
          // Upload the file
          const formData = new FormData()
          formData.append('file', value)
          formData.append('tool_name', configuringTool.name || 'calendar_manager')
          
          console.log('📤 Uploading file to:', '/api/tools/upload-credentials')
          const uploadResponse = await fetch('/api/tools/upload-credentials', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: formData
          })
          
          console.log('📡 Upload response status:', uploadResponse.status)
          
          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text()
            console.error('❌ Upload failed:', errorText)
            throw new Error(`Failed to upload credentials file: ${errorText}`)
          }
          
          const uploadResult = await uploadResponse.json()
          console.log('✅ Upload successful:', uploadResult)
          processedConfig[key] = uploadResult.file_path
        }
      }
      
      // Update the tool configuration in the agent using tool name
      await apiClient.updateToolConfig(parseInt(agentId), configuringTool.name, processedConfig)
      
      // Reload agent tools to get updated data
      await loadAgentTools()
      
      setShowConfigureModal(false)
      setConfiguringTool(null)
      setToolConfig({})
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'Configuration Saved',
        message: 'Tool configuration has been saved successfully.'
      })
    } catch (error) {
      console.error('Error saving tool configuration:', error)
      showToast({
        type: 'error',
        title: 'Configuration Error',
        message: 'Failed to save tool configuration. Please try again.'
      })
    } finally {
      setSaving(false)
    }
  }

  const getFilteredAvailableTools = () => {
    return availableTools.filter(tool => {
      const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           tool.description?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory
      const matchesType = selectedType === 'All' || tool.tool_type === selectedType
      const notAlreadyAdded = !agentTools.some(agentTool => agentTool.id === tool.id)
      
      return matchesSearch && matchesCategory && matchesType && notAlreadyAdded
    })
  }

  const getToolIcon = (toolType: string) => {
    switch (toolType) {
      case 'API':
        return <Cog6ToothIcon className="w-5 h-5" />
      case 'Function':
        return <WrenchScrewdriverIcon className="w-5 h-5" />
      case 'Webhook':
        return <StarIcon className="w-5 h-5" />
      default:
        return <WrenchScrewdriverIcon className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href={`/dashboard/agents/${agentId}`}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Back to Agent
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Agent Tools</h1>
                <p className="text-sm text-gray-600">
                  Manage tools for {agent?.name || 'Agent'}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowAddToolModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Tool
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Agent Tools */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Current Tools</h2>
              
              {agentTools.length === 0 ? (
                <div className="text-center py-12">
                  <WrenchScrewdriverIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tools configured</h3>
                  <p className="text-gray-600 mb-6">Add tools to enhance your agent's capabilities</p>
                  <button
                    onClick={() => setShowAddToolModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Your First Tool
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {agentTools.map((tool, index) => (
                    <motion.div
                      key={tool.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                        index === 0 ? 'rounded-t-lg' : ''
                      } ${
                        index === agentTools.length - 1 ? 'rounded-b-lg' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          {getToolIconJSX(tool.name, "w-5 h-5 text-blue-600")}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{tool.display_name || getToolDisplayName(tool.name)}</h3> 
                          <p className="text-sm text-gray-600">{tool.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {tool.category}
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {tool.tool_type}
                            </span>
                            {tool.is_configured ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Configured
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Needs Config
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleConfigureTool(tool)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
                          title="Configure Tool"
                        >
                          <Cog6ToothIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveTool(tool)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                          title="Remove Tool"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Available Tools */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Available Tools</h3>
                <div className="flex items-center space-x-2">
                  {(searchTerm || selectedCategory !== 'All' || selectedType !== 'All') && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {getFilteredAvailableTools().length} of {availableTools.filter(tool => !agentTools.some(agentTool => agentTool.id === tool.id)).length} shown
                    </span>
                  )}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {availableTools.filter(tool => !agentTools.some(agentTool => agentTool.id === tool.id)).length} available
                  </span>
                </div>
              </div>
              
              {/* Search and Filters */}
              <div className="space-y-4 mb-6">
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search tools..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {toolTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tools List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {getFilteredAvailableTools().map((tool) => (
                  <div
                    key={tool.id}
                    className="p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleAddTool(tool)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        {getToolIconJSX(tool.name, "w-4 h-4 text-blue-600")}
                      </div>
                      <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">{tool.display_name || getToolDisplayName(tool.name)}</h4>
                        <p className="text-xs text-gray-600 truncate">{tool.description}</p>
                      </div>
                      <PlusIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
                
                {getFilteredAvailableTools().length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No tools available</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Add Tool Modal */}
      {showAddToolModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Tool to Agent</h3>
            
            {selectedTool ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    {getToolIconJSX(selectedTool.name, "w-5 h-5 text-blue-600")}
                  </div>
                  <div>
                            <h4 className="font-medium text-gray-900">{selectedTool.display_name || getToolDisplayName(selectedTool.name)}</h4>
                    <p className="text-sm text-gray-600">{selectedTool.description}</p>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600">
                  This tool will be added to your agent and can be configured after adding.
                </p>
                
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowAddToolModal(false)
                      setSelectedTool(null)
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAddTool}
                    disabled={saving}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Adding...' : 'Add Tool'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Select a tool to add to your agent:</p>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableTools.filter(tool => !agentTools.some(agentTool => agentTool.id === tool.id)).map((tool) => (
                    <div
                      key={tool.id}
                      className="p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedTool(tool)}
                    >
                      <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        {getToolIconJSX(tool.name, "w-4 h-4 text-blue-600")}
                      </div>
                        <div>
                            <h4 className="text-sm font-medium text-gray-900">{tool.display_name || getToolDisplayName(tool.name)}</h4>
                          <p className="text-xs text-gray-600">{tool.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowAddToolModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Configure Tool Modal */}
      {showConfigureModal && configuringTool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isToolConfigured ? 'Update Configuration' : 'Configure'} {configuringTool.display_name || getToolDisplayName(configuringTool.name)}
                </h3>
                <Link
                  href={`/dashboard/tools/learn/${getToolTechnicalName(configuringTool.name)}`}
                  target="_blank"
                  className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-sm font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <BookOpenIcon className="w-4 h-4 mr-1" />
                  Learn More
                </Link>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  {getToolIconJSX(configuringTool.name, "w-5 h-5 text-blue-600")}
                </div>
                <div>
                            <h4 className="font-medium text-gray-900">{configuringTool.display_name || getToolDisplayName(configuringTool.name)}</h4>
                  <p className="text-sm text-gray-600">{configuringTool.description}</p>
                </div>
              </div>
              
              {/* Configuration Fields */}
              <div className="space-y-4">
                {loadingSchema ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-sm text-gray-600">Loading configuration options...</p>
                  </div>
                ) : configSchema ? (
                  <ToolConfigForm
                    toolId={configuringTool.id}
                    initialConfig={toolConfig}
                    configSchema={configSchema}
                    onSave={(updatedConfig) => {
                      setToolConfig(updatedConfig);
                      saveToolConfiguration(updatedConfig);
                    }}
                    onCancel={() => {
                      setShowConfigureModal(false);
                      setConfiguringTool(null);
                      setToolConfig({});
                      setIsToolConfigured(false);
                    }}
                    saving={saving}
                    isConfigured={isToolConfigured}
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-600">Failed to load configuration options</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
} 