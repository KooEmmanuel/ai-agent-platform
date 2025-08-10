'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  InformationCircleIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'
import { useToast } from '../../../../../components/ui/Toast'

// Use Railway URL in production, localhost in development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://kwickbuild.up.railway.app'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')

interface Integration {
  id: number
  agent_id: number
  platform: string
  config: Record<string, any>
  webhook_url?: string
  is_active: boolean
  created_at: string
  updated_at?: string
  agent_name?: string
  platform_name?: string
  platform_icon?: string
}

interface IntegrationForm {
  config: Record<string, any>
  webhook_url?: string
  is_active: boolean
}

const platforms = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '💬',
    description: 'Connect your agent to WhatsApp Business',
    color: 'bg-green-100 text-green-800'
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '📱',
    description: 'Create a Telegram bot for your agent',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'email',
    name: 'Email',
    icon: '📧',
    description: 'Handle email communications',
    color: 'bg-red-100 text-red-800'
  },
  {
    id: 'web',
    name: 'Web Widget',
    icon: '🌐',
    description: 'Embed agent in your website',
    color: 'bg-purple-100 text-purple-800'
  }
]

export default function EditIntegrationPage() {
  const params = useParams()
  const router = useRouter()
  const integrationId = params.id as string
  const { showToast } = useToast()
  
  const [integration, setIntegration] = useState<Integration | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [form, setForm] = useState<IntegrationForm>({
    config: {},
    webhook_url: '',
    is_active: true
  })

  useEffect(() => {
    fetchIntegration()
  }, [integrationId])

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('auth_token')
    return fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
  }

  const fetchIntegration = async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/v1/integrations/${integrationId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Integration not found')
        } else {
          setError('Failed to load integration')
        }
        setLoading(false)
        return
      }

      const integrationData = await response.json()
      setIntegration(integrationData)
      setForm({
        config: integrationData.config || {},
        webhook_url: integrationData.webhook_url || '',
        is_active: integrationData.is_active
      })
    } catch (error) {
      console.error('Error fetching integration:', error)
      setError('Failed to load integration')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/v1/integrations/${integrationId}`, {
        method: 'PUT',
        body: JSON.stringify(form)
      })

      if (!response.ok) {
        throw new Error('Failed to update integration')
      }

      const updatedIntegration = await response.json()
      setIntegration(updatedIntegration)
      
      showToast({
        type: 'success',
        title: 'Integration updated successfully'
      })
      router.push(`/dashboard/integrations/${integrationId}`)
    } catch (error) {
      console.error('Error updating integration:', error)
      setError('Failed to update integration')
      showToast({
        type: 'error',
        title: 'Failed to update integration'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setShowMobileMenu(false)
    router.push(`/dashboard/integrations/${integrationId}`)
  }

  const getPlatformInfo = (platformId: string) => {
    return platforms.find(p => p.id === platformId) || platforms[0]
  }

  const updateConfigField = (key: string, value: any) => {
    setForm(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value
      }
    }))
  }

  const removeConfigField = (key: string) => {
    setForm(prev => {
      const newConfig = { ...prev.config }
      delete newConfig[key]
      return {
        ...prev,
        config: newConfig
      }
    })
  }

  const addConfigField = () => {
    const key = prompt('Enter configuration key:')
    if (key && key.trim()) {
      const value = prompt('Enter configuration value:')
      if (value !== null) {
        updateConfigField(key.trim(), value)
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-6 p-4 lg:p-6">
        <div className="flex items-center space-x-2 lg:space-x-4">
          <Link
            href={`/dashboard/integrations/${integrationId}`}
            className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 lg:w-5 lg:h-5" />
          </Link>
          <div>
            <h1 className="text-lg lg:text-xl xl:text-2xl font-bold text-gray-900">Loading...</h1>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !integration) {
    return (
      <div className="space-y-4 lg:space-y-6 p-4 lg:p-6">
        <div className="flex items-center space-x-2 lg:space-x-4">
          <Link
            href="/dashboard/integrations"
            className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 lg:w-5 lg:h-5" />
          </Link>
          <div>
            <h1 className="text-lg lg:text-xl xl:text-2xl font-bold text-gray-900">Integration Not Found</h1>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6">
          <div className="text-center py-8">
            <XMarkIcon className="mx-auto h-10 w-10 lg:h-12 lg:w-12 text-red-400" />
            <h3 className="mt-2 text-sm lg:text-base font-medium text-gray-900">Error</h3>
            <p className="mt-1 text-xs lg:text-sm text-gray-500">{error}</p>
            <div className="mt-4 lg:mt-6">
              <Link
                href="/dashboard/integrations"
                className="inline-flex items-center px-3 lg:px-4 py-2 text-xs lg:text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-[0_4px_20px_rgba(59,130,246,0.2)] transition-all"
              >
                Back to Integrations
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const platformInfo = getPlatformInfo(integration.platform)

  return (
    <div className="space-y-4 lg:space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 lg:space-x-4">
          <Link
            href={`/dashboard/integrations/${integrationId}`}
            className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 lg:w-5 lg:h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 truncate">
              Edit {platformInfo.name} Integration
            </h1>
            <p className="text-xs lg:text-sm text-gray-600">Update integration configuration and settings</p>
          </div>
        </div>
        
        {/* Desktop Buttons */}
        <div className="hidden lg:flex items-center space-x-3">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 mr-2" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="w-5 h-5 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>

        {/* Mobile Dropdown */}
        <div className="lg:hidden relative">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <EllipsisVerticalIcon className="w-6 h-6" />
          </button>
          
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
            >
              <button
                onClick={handleCancel}
                disabled={saving}
                className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <XMarkIcon className="w-5 h-5 mr-3" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-5 h-5 mr-3" />
                    Save Changes
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Click outside to close mobile menu */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Integration Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6"
      >
        <div className="flex items-start space-x-4 lg:space-x-6">
          <div className={`p-3 lg:p-4 rounded-xl flex-shrink-0 ${
            integration.is_active ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            <span className="text-2xl lg:text-3xl">{platformInfo.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 lg:space-x-3 mb-2">
              <h2 className="text-base lg:text-xl font-semibold text-gray-900 truncate">
                {platformInfo.name}
              </h2>
              <span className={`inline-flex items-center px-2 py-0.5 lg:px-2.5 lg:py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                integration.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {integration.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs lg:text-sm text-gray-600 mb-3 lg:mb-4">{platformInfo.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Integration ID</p>
                <p className="text-xs lg:text-sm text-gray-900">{integration.id}</p>
              </div>
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600">Agent ID</p>
                <p className="text-xs lg:text-sm text-gray-900">{integration.agent_id}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Configuration Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6"
      >
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <h3 className="text-base lg:text-lg font-semibold text-gray-900">Configuration</h3>
          <button
            onClick={addConfigField}
            className="inline-flex items-center px-3 lg:px-4 py-2 text-xs lg:text-sm font-medium rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <CodeBracketIcon className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
            Add Field
          </button>
        </div>

        <div className="space-y-4">
          {/* Webhook URL */}
          <div>
            <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1 lg:mb-2">
              Webhook URL
            </label>
            <input
              type="url"
              value={form.webhook_url || ''}
              onChange={(e) => setForm(prev => ({ ...prev, webhook_url: e.target.value }))}
              className="w-full px-3 lg:px-4 py-2 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://your-domain.com/webhook"
            />
            <p className="mt-1 text-xs text-gray-500">
              The webhook URL where integration events will be sent
            </p>
          </div>

          {/* Active Status */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-xs lg:text-sm font-medium text-gray-700">
                Integration is active
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              When active, the integration will process incoming messages
            </p>
          </div>

          {/* Configuration Fields */}
          <div>
            <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">
              Configuration Fields
            </label>
            {Object.keys(form.config).length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                <InformationCircleIcon className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-xs lg:text-sm text-gray-500">No configuration fields</p>
                <button
                  onClick={addConfigField}
                  className="mt-2 text-xs lg:text-sm text-blue-600 hover:text-blue-700"
                >
                  Add your first field
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(form.config).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={key}
                        onChange={(e) => {
                          const newConfig = { ...form.config }
                          delete newConfig[key]
                          newConfig[e.target.value] = value
                          setForm(prev => ({ ...prev, config: newConfig }))
                        }}
                        className="w-full px-3 lg:px-4 py-2 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Configuration key"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={String(value)}
                        onChange={(e) => updateConfigField(key, e.target.value)}
                        className="w-full px-3 lg:px-4 py-2 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Configuration value"
                      />
                    </div>
                    <button
                      onClick={() => removeConfigField(key)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-xs lg:text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
} 