'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  WrenchScrewdriverIcon,
  ArrowLeftIcon,
  PlusIcon,
  CodeBracketIcon,
  GlobeAltIcon,
  CircleStackIcon,
  BoltIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { apiClient } from '../../../../lib/api'

interface ToolForm {
  name: string
  description: string
  category: string
  tool_type: string
  is_public: boolean
  config: Record<string, any>
}

interface ToolTemplate {
  name: string
  description: string
  category: string
  tool_type: string
  config: Record<string, any>
  icon: any
}

const categories = [
  'Search',
  'Scheduling',
  'Communication',
  'Data',
  'Analytics',
  'Integration',
  'Custom'
]

const toolTypes = [
  'API',
  'Function',
  'Webhook',
  'Database'
]

const toolTemplates: ToolTemplate[] = [
  {
    name: 'Web Search Tool',
    description: 'Search the web for current information',
    category: 'Search',
    tool_type: 'API',
    config: {
      endpoint: 'https://api.search.com/search',
      method: 'GET',
      parameters: {
        query: 'string',
        max_results: 'number'
      },
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY'
      }
    },
    icon: GlobeAltIcon
  },
  {
    name: 'Database Query Tool',
    description: 'Execute database queries',
    category: 'Data',
    tool_type: 'Database',
    config: {
      connection_string: 'postgresql://user:pass@localhost/db',
      query_template: 'SELECT * FROM table WHERE condition = ?',
      parameters: ['condition_value']
    },
    icon: CircleStackIcon
  },
  {
    name: 'Custom Function Tool',
    description: 'Execute custom JavaScript functions',
    category: 'Custom',
    tool_type: 'Function',
    config: {
      function_code: `function processData(input) {
  // Your custom logic here
  return input.toUpperCase();
}`,
      parameters: ['input'],
      return_type: 'string'
    },
    icon: CodeBracketIcon
  },
  {
    name: 'Webhook Tool',
    description: 'Send data to external webhooks',
    category: 'Integration',
    tool_type: 'Webhook',
    config: {
      webhook_url: 'https://api.example.com/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_WEBHOOK_KEY'
      },
      payload_template: {
        message: '{{input}}',
        timestamp: '{{timestamp}}'
      }
    },
    icon: BoltIcon
  }
]

export default function CreateToolPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<ToolForm>({
    name: '',
    description: '',
    category: '',
    tool_type: '',
    is_public: false,
    config: {}
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ToolTemplate | null>(null)

  const handleTemplateSelect = (template: ToolTemplate) => {
    setFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      tool_type: template.tool_type,
      is_public: false,
      config: { ...template.config }
    })
    setSelectedTemplate(template)
    setShowTemplates(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setError('No authentication token found')
        return
      }

      apiClient.setToken(token)
      
      const createdTool = await apiClient.createTool({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        tool_type: formData.tool_type,
        config: formData.config,
        is_public: formData.is_public
      })

      console.log('Tool created successfully:', createdTool)
      router.push('/dashboard/tools')
    } catch (error: any) {
      console.error('Error creating tool:', error)
      setError(error?.message || 'Failed to create tool')
    } finally {
      setIsLoading(false)
    }
  }

  const updateConfig = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value
      }
    }))
  }

  const renderConfigFields = () => {
    switch (formData.tool_type) {
      case 'API':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">API Endpoint</label>
              <input
                type="url"
                value={formData.config.endpoint || ''}
                onChange={(e) => updateConfig('endpoint', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://api.example.com/endpoint"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">HTTP Method</label>
                <select
                  value={formData.config.method || 'GET'}
                  onChange={(e) => updateConfig('method', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">API Key</label>
                <input
                  type="password"
                  value={formData.config.api_key || ''}
                  onChange={(e) => updateConfig('api_key', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your API key"
                />
              </div>
            </div>
          </div>
        )

      case 'Function':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700">Function Code</label>
            <textarea
              value={formData.config.function_code || ''}
              onChange={(e) => updateConfig('function_code', e.target.value)}
              rows={8}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={`function processData(input) {
  // Your custom logic here
  return input.toUpperCase();
}`}
            />
          </div>
        )

      case 'Webhook':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Webhook URL</label>
              <input
                type="url"
                value={formData.config.webhook_url || ''}
                onChange={(e) => updateConfig('webhook_url', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://api.example.com/webhook"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Payload Template (JSON)</label>
              <textarea
                value={formData.config.payload_template ? JSON.stringify(formData.config.payload_template, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    updateConfig('payload_template', parsed)
                  } catch (err) {
                    // Invalid JSON, but don't show error yet
                  }
                }}
                rows={4}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`{
  "message": "{{input}}",
  "timestamp": "{{timestamp}}"
}`}
              />
            </div>
          </div>
        )

      case 'Database':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Connection String</label>
              <input
                type="text"
                value={formData.config.connection_string || ''}
                onChange={(e) => updateConfig('connection_string', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="postgresql://user:pass@localhost/db"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Query Template</label>
              <textarea
                value={formData.config.query_template || ''}
                onChange={(e) => updateConfig('query_template', e.target.value)}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="SELECT * FROM table WHERE condition = ?"
              />
            </div>
          </div>
        )

      default:
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700">Configuration (JSON)</label>
            <textarea
              value={JSON.stringify(formData.config, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  setFormData(prev => ({ ...prev, config: parsed }))
                } catch (err) {
                  // Invalid JSON, but don't show error yet
                }
              }}
              rows={6}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={`{
  "key": "value",
  "nested": {
    "property": "value"
  }
}`}
            />
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/tools"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Tool</h1>
            <p className="text-gray-600">Build a new tool for your agents</p>
          </div>
        </div>
      </div>

      {/* Templates Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-sm rounded-lg border border-gray-200"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Quick Start Templates</h3>
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showTemplates ? 'Hide Templates' : 'Show Templates'}
            </button>
          </div>
        </div>
        
        {showTemplates && (
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {toolTemplates.map((template, index) => {
                const Icon = template.icon
                return (
                  <button
                    key={index}
                    onClick={() => handleTemplateSelect(template)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-6 h-6 text-blue-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-sm rounded-lg border border-gray-200"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Tool Information</h3>
        </div>
        
        {error && (
          <div className="px-6 py-4 bg-red-50 border-b border-red-200">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Tool Name *
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Web Search Tool"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category *
              </label>
              <select
                id="category"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description *
            </label>
            <textarea
              id="description"
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe what this tool does..."
            />
          </div>

          <div>
            <label htmlFor="tool_type" className="block text-sm font-medium text-gray-700">
              Tool Type *
            </label>
            <select
              id="tool_type"
              required
              value={formData.tool_type}
              onChange={(e) => setFormData({ ...formData, tool_type: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a tool type</option>
              {toolTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Configuration Section */}
          {formData.tool_type && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Cog6ToothIcon className="w-5 h-5 text-gray-600" />
                <h4 className="text-lg font-medium text-gray-900">Configuration</h4>
              </div>
              {renderConfigFields()}
            </div>
          )}

          <div className="flex items-center">
            <input
              id="is_public"
              type="checkbox"
              checked={formData.is_public}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_public" className="ml-2 block text-sm text-gray-900">
              Make this tool public in the marketplace
            </label>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <Link
              href="/dashboard/tools"
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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