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
import Link from 'next/link'

// Use Next.js API routes instead of direct backend calls
const API_BASE_URL = '/api'

interface IntegrationForm {
  agent_id: number
  platform: string
  config: Record<string, any>
  webhook_url?: string
}

interface Agent {
  id: number
  name: string
  description: string
  is_active: boolean
}

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
      { name: 'greeting_message', label: 'Greeting Message', type: 'text', required: false }
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

  const refreshToken = async (): Promise<string | null> => {
    try {
      // Import Firebase auth dynamically to avoid SSR issues
      const { auth } = await import('../../../../lib/firebase')
      const currentUser = auth.currentUser
      
      if (currentUser) {
        // Get a fresh ID token
        const idToken = await currentUser.getIdToken(true) // force refresh
        
        // Send to backend to get new access token
        const response = await fetch(`/api/v1/auth/firebase/`, {
          method: 'POST',
          redirect: 'follow', // Explicitly follow redirects
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id_token: idToken })
        })
        
        if (response.ok) {
          const data = await response.json()
          localStorage.setItem('auth_token', data.access_token)
          return data.access_token
        }
      }
      
      return null
    } catch (error) {
      console.error('Token refresh failed:', error)
      return null
    }
  }

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    let token = localStorage.getItem('auth_token')
    
    // First attempt with existing token
    let response = await fetch(url, {
      ...options,
      redirect: 'follow', // Explicitly follow redirects
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    
    // If unauthorized, try to refresh token and retry
    if (response.status === 401) {
      console.log('Token expired, attempting refresh...')
      const newToken = await refreshToken()
      
      if (newToken) {
        // Retry with new token
        response = await fetch(url, {
          ...options,
          redirect: 'follow', // Explicitly follow redirects
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json',
            ...options.headers
          }
        })
      } else {
        // Redirect to login if refresh fails
        alert('Your session has expired. Please log in again.')
        window.location.href = '/login'
        return response
      }
    }
    
    return response
  }

  const fetchAgents = async () => {
    try {
      const response = await makeAuthenticatedRequest(`/api/v1/agents/`)
      
      if (response.ok) {
        const agentsData = await response.json()
        setAgents(agentsData.filter((agent: Agent) => agent.is_active))
      } else {
        console.error('Failed to fetch agents:', response.status)
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    } finally {
      setLoadingAgents(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  const selectedPlatformData = platforms.find(p => p.id === selectedPlatform)

  const handleConfigChange = (fieldName: string, value: string) => {
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
      
      const response = await makeAuthenticatedRequest(`/api/v1/integrations/`, {
        method: 'POST',
        body: JSON.stringify(integrationData)
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Integration created:', result)
        // Redirect to integrations page
        window.location.href = '/dashboard/integrations'
      } else {
        const error = await response.json()
        console.error('Failed to create integration:', error)
        throw new Error(error.detail || 'Failed to create integration')
      }
    } catch (error) {
      console.error('Error creating integration:', error)
      // Show error to user - you might want to add a proper error state
      alert('Failed to create integration. Please try again.')
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
                      <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                        {field.label} {field.required && '*'}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          id={field.name}
                          required={field.required}
                          value={config[field.name] || ''}
                          onChange={(e) => handleConfigChange(field.name, e.target.value)}
                          className="mt-1 block w-full shadow-[0_2px_10px_rgba(59,130,246,0.1)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:shadow-[0_4px_20px_rgba(59,130,246,0.2)]"
                        >
                          <option value="">Select {field.label.toLowerCase()}</option>
                          {field.options?.map((option) => (
                            <option key={option} value={option}>
                              {option.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          id={field.name}
                          required={field.required}
                          value={config[field.name] || (field.type === 'color' ? '#3B82F6' : '')}
                          onChange={(e) => handleConfigChange(field.name, e.target.value)}
                          className="mt-1 block w-full shadow-[0_2px_10px_rgba(59,130,246,0.1)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:shadow-[0_4px_20px_rgba(59,130,246,0.2)]"
                          placeholder={field.placeholder || (field.type === 'color' ? '#3B82F6' : `Enter ${field.label.toLowerCase()}`)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
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