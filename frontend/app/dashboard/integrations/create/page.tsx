'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowLeftIcon,
  PlusIcon,
  GlobeAltIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { FaWhatsapp, FaTelegramPlane } from 'react-icons/fa'
import { MdMarkEmailUnread } from 'react-icons/md'
import { FaProjectDiagram } from 'react-icons/fa'
import Link from 'next/link'
import { apiClient } from '../../../../lib/api'
import { useToast } from '../../../../components/ui/Toast'

interface IntegrationForm {
  agent_id: number
  platform: string
  config: Record<string, any>
  webhook_url?: string
}

import type { Agent } from '../../../../lib/api'  

const platforms = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: <FaWhatsapp className="w-8 h-8 text-green-500" />,
    description: 'Connect your agent to WhatsApp Business',
    status: 'available',
    config_fields: [
      { name: 'phone_number', label: 'Phone Number', type: 'text', required: true },
      { name: 'webhook_url', label: 'Webhook URL', type: 'text', required: false }
    ]
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: <FaTelegramPlane className="w-8 h-8 text-blue-500" />,
    description: 'Create a Telegram bot for your agent',
    status: 'available',
    config_fields: [
      { name: 'bot_token', label: 'Bot Token', type: 'text', required: true },
      { name: 'webhook_url', label: 'Webhook URL', type: 'text', required: false }
    ]
  },
  {
    id: 'email',
    name: 'Email',
    icon: <MdMarkEmailUnread className="w-8 h-8 text-red-500" />,
    description: 'Handle email communications',
    status: 'available',
    config_fields: [
      { name: 'email', label: 'Email Address', type: 'email', required: true },
      { name: 'smtp_server', label: 'SMTP Server', type: 'text', required: true },
      { name: 'smtp_port', label: 'SMTP Port', type: 'number', required: true },
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
      { name: 'imap_server', label: 'IMAP Server (for receiving)', type: 'text', required: false },
      { name: 'imap_port', label: 'IMAP Port', type: 'number', required: false }
    ]
  },
  {
    id: 'web',
    name: 'Web Widget',
    icon: <GlobeAltIcon className="w-8 h-8 text-purple-500" />,
    description: 'Embed agent in your website',
    status: 'available',
    config_fields: [
      { name: 'domain', label: 'Domain', type: 'text', required: true },
      { name: 'widget_id', label: 'Widget ID', type: 'text', required: false },
      { name: 'widget_name', label: 'Widget Name', type: 'text', required: false, placeholder: 'AI Assistant' },
      { name: 'avatar_url', label: 'Avatar URL', type: 'url', required: false, placeholder: 'https://example.com/avatar.jpg' },
      { name: 'theme_color', label: 'Theme Color', type: 'color', required: false },
      { name: 'position', label: 'Position', type: 'select', required: false, options: ['bottom-right', 'bottom-left', 'top-right', 'top-left'] },
      { name: 'greeting_message', label: 'Greeting Message', type: 'text', required: false },
      { name: 'button_icon_color', label: 'Button Icon Color', type: 'color', required: false, placeholder: '#000000' },
      { name: 'button_stroke_color', label: 'Button Stroke Color', type: 'color', required: false, placeholder: '#000000' },
      { name: 'button_fill_color', label: 'Button Fill Color', type: 'color', required: false, placeholder: '#3B82F6' }
    ]
  },
  {
    id: 'project_management',
    name: 'Project Management',
    icon: <FaProjectDiagram className="w-8 h-8 text-orange-500" />,
    description: 'AI-powered project management platform',
    status: 'available',
    config_fields: [
      { name: 'workspace_name', label: 'Workspace Name', type: 'text', required: true, placeholder: 'My Project Workspace' },
      { name: 'logo_url', label: 'Logo URL', type: 'url', required: false, placeholder: 'https://example.com/logo.png' },
      { name: 'default_project_template', label: 'Default Project Template', type: 'select', required: false, options: ['software_development', 'marketing_campaign', 'event_planning', 'research_project', 'custom'], placeholder: 'Choose a template' },
      { name: 'auto_assign_tasks', label: 'Auto-assign tasks based on skills', type: 'checkbox', required: false },
      { name: 'enable_time_tracking', label: 'Enable time tracking', type: 'checkbox', required: false },
      { name: 'enable_budget_tracking', label: 'Enable budget tracking', type: 'checkbox', required: false },
      { name: 'notification_preferences', label: 'Notification Preferences', type: 'select', required: false, options: ['email', 'in_app', 'both', 'none'], placeholder: 'Choose notification method' }
    ]
  }
]

export default function CreateIntegrationPage() {
  const [selectedPlatform, setSelectedPlatform] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null)
  const [config, setConfig] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { showToast } = useToast()

  const fetchAgents = async () => {
    try {
      const agentsData = await apiClient.getAgents()
      setAgents(agentsData.filter((agent: Agent) => agent.is_active))
    } catch (error) {
      console.error('Error fetching agents:', error)
    } finally {
      setLoadingAgents(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  // Set default values when platform is selected
  useEffect(() => {
    if (selectedPlatform === 'project_management') {
      setConfig({
        workspace_name: 'My Project Workspace',
        logo_url: '',
        auto_assign_tasks: false,
        enable_time_tracking: true,
        enable_budget_tracking: true,
        notification_preferences: 'email'
      })
    } else {
      setConfig({})
    }
  }, [selectedPlatform])

  const selectedPlatformData = platforms.find(p => p.id === selectedPlatform)

  const handleConfigChange = (fieldName: string, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [fieldName]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedAgent === null || !selectedPlatform) return

    setIsLoading(true)
    
    try {
      // Auto-generate widget_id for web widgets if not provided
      const finalConfig = { ...config }
      if (selectedPlatform === 'web' && !finalConfig.widget_id) {
        finalConfig.widget_id = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
      
      const integrationData: IntegrationForm = {
        agent_id: selectedAgent,
        platform: selectedPlatform,
        config: finalConfig,
        webhook_url: finalConfig.webhook_url
      }
      
      console.log('Creating integration:', integrationData)
      
      const result = await apiClient.createIntegration(integrationData)
      console.log('Integration created:', result)
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'Integration created successfully!',
        message: `Your ${selectedPlatformData?.name} integration has been set up.`,
        duration: 3000
      })
      
      // Redirect based on platform type
      setTimeout(() => {
        if (selectedPlatform === 'project_management') {
          window.location.href = '/dashboard/integrations/project-management'
        } else {
          window.location.href = '/dashboard/integrations'
        }
      }, 1500)
    } catch (error: any) {
      console.error('Error creating integration:', error)
      console.error('Error message:', error?.message)
      console.error('Error details:', error)
      
      // Check if it's a duplicate integration error
      if (error?.message?.includes('already exists')) {
        const platformName = selectedPlatformData?.name || selectedPlatform
        const agentName = agents.find(a => a.id === selectedAgent)?.name || 'selected agent'
        
        showToast({
          type: 'error',
          title: 'Integration already exists',
          message: `A ${platformName} integration already exists for ${agentName}. Please choose a different agent or platform.`,
          duration: 6000
        })
      } else if (error?.message?.includes('Agent not found')) {
        showToast({
          type: 'error',
          title: 'Agent not found',
          message: 'The selected agent could not be found. Please refresh the page and try again.',
          duration: 5000
        })
      } else if (error?.message?.includes('HTTP 400')) {
        // Generic 400 error - likely a validation error
        showToast({
          type: 'error',
          title: 'Invalid configuration',
          message: 'Please check your integration configuration and try again. Make sure all required fields are filled correctly.',
          duration: 5000
        })
      } else {
        showToast({
          type: 'error',
          title: 'Failed to create integration',
          message: error?.message || 'An unexpected error occurred. Please check your configuration and try again.',
          duration: 5000
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/integrations"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Integration</h1>
            <p className="text-gray-600">Connect your agent to external platforms</p>
          </div>
        </div>
        <Link
          href="/dashboard/integrations/guide"
          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-[0_2px_10px_rgba(59,130,246,0.1)] hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)] transition-all"
        >
          <InformationCircleIcon className="w-5 h-5 mr-2" />
          Setup Guide
        </Link>
      </div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-[0_4px_20px_rgba(59,130,246,0.1)] rounded-xl"
      >
        <div className="px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900">Integration Setup</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Agent Selection */}
          <div>
            <label htmlFor="agent" className="block text-sm font-medium text-gray-700">
              Select Agent *
            </label>
            {loadingAgents ? (
              <div className="mt-1 block w-full shadow-[0_2px_10px_rgba(59,130,246,0.1)] rounded-lg px-3 py-2 bg-gray-50">
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading your agents...
                </div>
              </div>
            ) : agents.length === 0 ? (
              <div className="mt-1 block w-full shadow-[0_2px_10px_rgba(59,130,246,0.1)] rounded-lg px-3 py-2 bg-yellow-50 text-yellow-700">
                No active agents found. Please create an agent first.
              </div>
            ) : (
              <select
                id="agent"
                required
                value={selectedAgent || ''}
                onChange={(e) => setSelectedAgent(e.target.value ? parseInt(e.target.value) : null)}
                className="mt-1 block w-full shadow-[0_2px_10px_rgba(59,130,246,0.1)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:shadow-[0_4px_20px_rgba(59,130,246,0.2)]"
              >
                <option value="">Choose an agent</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id.toString()}>
                    {agent.name} - {agent.description}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Platform *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {platforms.map((platform) => (
                <div
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all ${
                    selectedPlatform === platform.id
                      ? 'bg-blue-50 shadow-[0_4px_20px_rgba(59,130,246,0.2)]'
                      : 'bg-white shadow-[0_2px_10px_rgba(59,130,246,0.1)] hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">{platform.icon}</div>
                    <div>
                      <h4 className="font-medium text-gray-900">{platform.name}</h4>
                      <p className="text-sm text-gray-600">{platform.description}</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                        platform.status === 'available' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {platform.status === 'available' ? 'Available' : 'Coming Soon'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Configuration */}
          {selectedPlatformData && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-6"
            >
              {/* Platform Help Section */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <InformationCircleIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">
                      Setting up {selectedPlatformData.name}
                    </h4>
                    <p className="text-sm text-blue-700 mb-2">
                      {selectedPlatformData.id === 'whatsapp' && 
                        'You\'ll need a WhatsApp Business Account and Meta Developer access. '}
                      {selectedPlatformData.id === 'telegram' && 
                        'You\'ll need to create a bot using @BotFather on Telegram. '}
                      {selectedPlatformData.id === 'email' && 
                        'You\'ll need SMTP server credentials from your email provider. '}
                      {selectedPlatformData.id === 'web' && 
                        'You\'ll need a domain where you want to embed the widget. '}
                      Need detailed setup instructions?
                    </p>
                    <Link
                      href="/dashboard/integrations/guide"
                      target="_blank"
                      className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      View {selectedPlatformData.name} Setup Guide
                      <ArrowLeftIcon className="w-4 h-4 ml-1 rotate-180" />
                    </Link>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Configure {selectedPlatformData.name}
                </h4>
                <div className="space-y-4">
                  {selectedPlatformData.config_fields.map((field) => (
                    <div key={field.name}>
                      {field.type !== 'checkbox' && (
                        <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                          {field.label} {field.required && '*'}
                        </label>
                      )}
                      {field.type === 'select' ? (
                        <select
                          id={field.name}
                          required={field.required}
                          value={config[field.name] || ''}
                          onChange={(e) => handleConfigChange(field.name, e.target.value)}
                          className="mt-1 block w-full shadow-[0_2px_10px_rgba(59,130,246,0.1)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:shadow-[0_4px_20px_rgba(59,130,246,0.2)]"
                        >
                          <option value="">{field.placeholder || `Select ${field.label.toLowerCase()}`}</option>
                          {field.options?.map((option) => (
                            <option key={option} value={option}>
                              {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'checkbox' ? (
                        <div className={`mt-1 flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
                          config[field.name] 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-2">
                                {field.name === 'auto_assign_tasks' && <span className="text-blue-500">🎯</span>}
                                {field.name === 'enable_time_tracking' && <span className="text-blue-500">⏱️</span>}
                                {field.name === 'enable_budget_tracking' && <span className="text-blue-500">💰</span>}
                                <label htmlFor={field.name} className="text-sm font-medium text-gray-700 cursor-pointer">
                                  {field.label}
                                </label>
                              </div>
                              {config[field.name] && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  ✓ Enabled
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {field.name === 'auto_assign_tasks' && 'Automatically assign tasks to team members based on their skills and availability'}
                              {field.name === 'enable_time_tracking' && 'Track time spent on tasks and projects for better productivity insights'}
                              {field.name === 'enable_budget_tracking' && 'Monitor project budgets and expenses in real-time'}
                            </p>
                          </div>
                          <div className="ml-4">
                            <button
                              type="button"
                              onClick={() => handleConfigChange(field.name, !config[field.name])}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                config[field.name] ? 'bg-blue-600' : 'bg-gray-200'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                                  config[field.name] ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <input
                            type={field.type}
                            id={field.name}
                            required={field.required}
                            value={config[field.name] || (field.type === 'color' ? '#3B82F6' : '')}
                            onChange={(e) => handleConfigChange(field.name, e.target.value)}
                            className="mt-1 block w-full shadow-[0_2px_10px_rgba(59,130,246,0.1)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:shadow-[0_4px_20px_rgba(59,130,246,0.2)]"
                            placeholder={field.placeholder || (field.type === 'color' ? '#3B82F6' : `Enter ${field.label.toLowerCase()}`)}
                          />
                          {field.name === 'logo_url' && config[field.name] && (
                            <div className="mt-2 flex items-center space-x-3">
                              <img 
                                src={config[field.name]} 
                                alt="Logo Preview"
                                className="w-8 h-8 rounded-lg object-cover border border-gray-200"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                              <span className="text-xs text-gray-500">Logo preview</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Advanced Options for Web Widget */}
              {selectedPlatform === 'web' && (
                <div className="border-t border-gray-200 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Advanced Options</h4>
                      <p className="text-xs text-gray-500">Customize widget appearance and colors</p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showAdvanced && (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Button Icon Color */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Button Icon Color
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="color"
                              value={config.button_icon_color || '#000000'}
                              onChange={(e) => handleConfigChange('button_icon_color', e.target.value)}
                              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                            />
                            <input
                              type="text"
                              value={config.button_icon_color || '#000000'}
                              onChange={(e) => handleConfigChange('button_icon_color', e.target.value)}
                              className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="#000000"
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">Eyes and main elements</p>
                        </div>

                        {/* Button Stroke Color */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Button Stroke Color
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="color"
                              value={config.button_stroke_color || '#000000'}
                              onChange={(e) => handleConfigChange('button_stroke_color', e.target.value)}
                              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                            />
                            <input
                              type="text"
                              value={config.button_stroke_color || '#000000'}
                              onChange={(e) => handleConfigChange('button_stroke_color', e.target.value)}
                              className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="#000000"
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">Outlines and strokes</p>
                        </div>

                        {/* Button Fill Color */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Button Fill Color
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="color"
                              value={config.button_fill_color || '#3B82F6'}
                              onChange={(e) => handleConfigChange('button_fill_color', e.target.value)}
                              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                            />
                            <input
                              type="text"
                              value={config.button_fill_color || '#3B82F6'}
                              onChange={(e) => handleConfigChange('button_fill_color', e.target.value)}
                              className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="#3B82F6"
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">Microphone and headset</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          <div className="flex items-center justify-end space-x-4 pt-6">
            <Link
              href="/dashboard/integrations"
              className="px-4 py-2 shadow-[0_2px_10px_rgba(59,130,246,0.1)] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading || selectedAgent === null || !selectedPlatform}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-[0_4px_20px_rgba(59,130,246,0.2)] hover:shadow-[0_6px_25px_rgba(59,130,246,0.3)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Create
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
} 