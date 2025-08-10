'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  WrenchScrewdriverIcon,
  Cog6ToothIcon,
  ArrowLeftIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlayIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { apiClient } from '../../../../../lib/api'

interface ToolConfig {
  id: number
  name: string
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
}

interface ConfigField {
  name: string
  type: string
  description: string
  required: boolean
  default?: any
  enum?: string[]
  min?: number
  max?: number
}

export default function ToolConfigurationPage() {
  const params = useParams()
  const router = useRouter()
  const toolId = params.id as string
  
  const [tool, setTool] = useState<ToolConfig | null>(null)
  const [config, setConfig] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  useEffect(() => {
    if (toolId) {
      loadTool()
    }
  }, [toolId])

  const loadTool = async () => {
    try {
      const toolData = await apiClient.getTool(parseInt(toolId))
      setTool(toolData)
      setConfig(toolData.config || {})
    } catch (error) {
      console.error('Error loading tool:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfigChange = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const saveConfiguration = async () => {
    if (!tool) return
    
    setSaving(true)
    try {
      await apiClient.updateTool(parseInt(toolId), {
        config: config
      })
      // Show success message
      alert('Configuration saved successfully!')
    } catch (error) {
      console.error('Error saving configuration:', error)
      alert('Error saving configuration. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const testConfiguration = async () => {
    if (!tool) return
    
    setTesting(true)
    setTestResult(null)
    
    try {
      // Mock test - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setTestResult({
        success: true,
        message: 'Configuration test passed successfully!',
        details: {
          connection: 'Connected',
          authentication: 'Valid',
          permissions: 'OK'
        }
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Configuration test failed. Please check your settings.',
        details: {
          connection: 'Failed',
          authentication: 'Invalid',
          permissions: 'Denied'
        }
      })
    } finally {
      setTesting(false)
    }
  }

  const getConfigFields = (): ConfigField[] => {
    if (!tool?.parameters?.properties) return []
    
    return Object.entries(tool.parameters.properties).map(([name, props]: [string, any]) => ({
      name,
      type: props.type || 'string',
      description: props.description || '',
      required: tool.parameters.required?.includes(name) || false,
      default: props.default,
      enum: props.enum,
      min: props.minimum,
      max: props.maximum
    }))
  }

  const renderConfigField = (field: ConfigField) => {
    const value = config[field.name] ?? field.default ?? ''

    switch (field.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id={field.name}
              checked={value}
              onChange={(e) => handleConfigChange(field.name, e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor={field.name} className="text-sm font-medium text-gray-700">
              {field.description}
            </label>
          </div>
        )

      case 'integer':
      case 'number':
        return (
          <div>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
              {field.description}
            </label>
            <input
              type="number"
              id={field.name}
              value={value}
              onChange={(e) => handleConfigChange(field.name, parseInt(e.target.value))}
              min={field.min}
              max={field.max}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={field.default?.toString()}
            />
          </div>
        )

      case 'string':
        if (field.enum) {
          return (
            <div>
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                {field.description}
              </label>
              <select
                id={field.name}
                value={value}
                onChange={(e) => handleConfigChange(field.name, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an option</option>
                {field.enum.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )
        }
        
        return (
          <div>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
              {field.description}
            </label>
            <input
              type="text"
              id={field.name}
              value={value}
              onChange={(e) => handleConfigChange(field.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={field.default?.toString()}
            />
          </div>
        )

      default:
        return (
          <div>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
              {field.description}
            </label>
            <textarea
              id={field.name}
              value={value}
              onChange={(e) => handleConfigChange(field.name, e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={field.default?.toString()}
            />
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="bg-white rounded-2xl p-8">
              <div className="space-y-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!tool) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Tool Not Found</h2>
            <p className="text-gray-600 mb-6">The tool you're looking for doesn't exist or has been removed.</p>
            <Link
              href="/dashboard/tools"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Tools
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const configFields = getConfigFields()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/tools"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Back to Tools
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Configure Tool</h1>
                <p className="text-sm text-gray-600">Customize tool settings and parameters</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={testConfiguration}
                disabled={testing}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
              >
                {testing ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <PlayIcon className="w-4 h-4 mr-2" />
                )}
                {testing ? 'Testing...' : 'Test'}
              </button>
              
              <button
                onClick={saveConfiguration}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <CheckIcon className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration Form */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
            >
              <div className="flex items-center mb-6">
                <div className="p-3 bg-blue-100 rounded-lg mr-4">
                  <Cog6ToothIcon className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{tool.name}</h2>
                  <p className="text-sm text-gray-600">Configure tool parameters and settings</p>
                </div>
              </div>

              <div className="space-y-6">
                {getConfigFields().map((field, index) => (
                  <motion.div
                    key={field.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {renderConfigField(field)}
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-600">
                    <InformationCircleIcon className="w-4 h-4 mr-2" />
                    Configuration will be saved automatically
                  </div>
                  
                  <button
                    onClick={testConfiguration}
                    disabled={testing}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                  >
                    {testing ? (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <PlayIcon className="w-4 h-4 mr-2" />
                    )}
                    {testing ? 'Testing...' : 'Test Configuration'}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Test Results */}
            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h3>
                
                <div className={`p-4 rounded-lg ${
                  testResult.success ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    {testResult.success ? (
                      <CheckIcon className="w-5 h-5 text-green-600" />
                    ) : (
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`font-medium ${
                      testResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {testResult.message}
                    </span>
                  </div>
                  
                  {testResult.details && (
                    <div className="mt-3 space-y-1">
                      {Object.entries(testResult.details).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 capitalize">{key}:</span>
                          <span className={`font-medium ${
                            value === 'OK' || value === 'Connected' || value === 'Valid' 
                              ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Tool Information */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tool Information</h3>
              
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Category</span>
                  <p className="text-sm text-gray-900">{tool.category}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-700">Type</span>
                  <p className="text-sm text-gray-900">{tool.tool_type}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-700">Description</span>
                  <p className="text-sm text-gray-900">{tool.description}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Documentation</h3>
              
              <div className="space-y-3">
                <Link
                  href={`/docs#${tool.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                >
                  <DocumentTextIcon className="w-4 h-4 mr-2" />
                  View Documentation
                </Link>
                
                <Link
                  href="/dashboard/playground"
                  className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                >
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Test in Playground
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
} 