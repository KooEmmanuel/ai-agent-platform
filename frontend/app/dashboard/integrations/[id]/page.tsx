'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CodeBracketIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'
import { useToast } from '../../../../components/ui/Toast'  

// Use Next.js API routes instead of direct backend calls
const API_BASE_URL = '/api'

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

export default function IntegrationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const integrationId = params.id as string
  const { showToast } = useToast()
  
  const [integration, setIntegration] = useState<Integration | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isToggling, setIsToggling] = useState(false)
  const [embedCode, setEmbedCode] = useState<string>('')
  const [loadingEmbedCode, setLoadingEmbedCode] = useState(false)
  const [showEmbedCode, setShowEmbedCode] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

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
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/v1/integrations/${integrationId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Integration not found')
        } else {
          throw new Error('Failed to fetch integration')
        }
        return
      }

      const integrationData = await response.json()
      setIntegration(integrationData)
    } catch (error) {
      console.error('Error fetching integration:', error)
      setError('Failed to load integration')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIntegration()
  }, [integrationId])

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.dropdown-container')) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchEmbedCode = async () => {
    if (!integration || integration.platform !== 'web') return
    
    setLoadingEmbedCode(true)
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/v1/web-widget/script/${integrationId}`)
      
      if (response.ok) {
        const data = await response.json()
        setEmbedCode(data.script)
      } else {
        console.error('Failed to fetch embed code')
      }
    } catch (error) {
      console.error('Error fetching embed code:', error)
    } finally {
      setLoadingEmbedCode(false)
    }
  }

  const copyEmbedCode = async () => {
    try {
      await navigator.clipboard.writeText(embedCode)
      showToast({
        type: 'success',
        title: 'Embed code copied!',
        message: 'The embed code has been copied to your clipboard.',
        duration: 3000
      })
    } catch (error) {
      console.error('Failed to copy embed code:', error)
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea')
        textArea.value = embedCode
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        showToast({
          type: 'success',
          title: 'Embed code copied!',
          message: 'The embed code has been copied to your clipboard.',
          duration: 3000
        })
      } catch (fallbackError) {
        showToast({
          type: 'error',
          title: 'Copy failed',
          message: 'Failed to copy embed code. Please copy it manually.',
          duration: 5000
        })
      }
    }
  }

  const handleToggleIntegration = async () => {
    if (!integration) return
    
    setIsToggling(true)
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/v1/integrations/${integrationId}`, {
        method: 'PUT',
        body: JSON.stringify({
          is_active: !integration.is_active
        })
      })

      if (response.ok) {
        setIntegration({ ...integration, is_active: !integration.is_active })
      } else {
        throw new Error('Failed to toggle integration')
      }
    } catch (error) {
      console.error('Error toggling integration:', error)
      setError('Failed to toggle integration')
    } finally {
      setIsToggling(false)
    }
  }

  const handleDeleteIntegration = async () => {
    if (!integration) return
    
    if (!confirm('Are you sure you want to delete this integration? This action cannot be undone.')) {
      return
    }

    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/v1/integrations/${integrationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/dashboard/integrations')
      } else {
        throw new Error('Failed to delete integration')
      }
    } catch (error) {
      console.error('Error deleting integration:', error)
      setError('Failed to delete integration')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPlatformInfo = (platformId: string) => {
    return platforms.find(p => p.id === platformId) || platforms[0]
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/integrations"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6">
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
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/integrations"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Integration Not Found</h1>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6">
          <div className="text-center py-8">
            <XCircleIcon className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <Link
                href="/dashboard/integrations"
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-[0_4px_20px_rgba(59,130,246,0.2)] transition-all"
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
            href="/dashboard/integrations"
            className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 lg:w-5 lg:h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 truncate">
              {platformInfo.name} Integration
            </h1>
            <p className="text-xs lg:text-sm text-gray-600">Integration details and configuration</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 lg:space-x-3">
          {/* Desktop Buttons */}
          <div className="hidden lg:flex items-center space-x-3">
            {integration && integration.platform === 'web' && (
              <button
                onClick={() => {
                  if (!embedCode) {
                    fetchEmbedCode()
                  }
                  setShowEmbedCode(!showEmbedCode)
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 shadow-[0_2px_10px_rgba(59,130,246,0.1)] transition-all"
              >
                <CodeBracketIcon className="w-5 h-5 mr-2" />
                {showEmbedCode ? 'Hide' : 'Show'} Embed Code
              </button>
            )}
            <button
              onClick={handleToggleIntegration}
              disabled={isToggling}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                integration.is_active
                  ? 'text-red-700 bg-red-50 hover:bg-red-100 shadow-[0_2px_10px_rgba(239,68,68,0.1)]'
                  : 'text-green-700 bg-green-50 hover:bg-green-100 shadow-[0_2px_10px_rgba(34,197,94,0.1)]'
              }`}
            >
              {isToggling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  {integration.is_active ? 'Deactivating...' : 'Activating...'}
                </>
              ) : (
                <>
                  {integration.is_active ? (
                    <>
                      <XCircleIcon className="w-5 h-5 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5 mr-2" />
                      Activate
                    </>
                  )}
                </>
              )}
            </button>
            <button
              onClick={handleDeleteIntegration}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 shadow-[0_2px_10px_rgba(239,68,68,0.1)] transition-all"
            >
              <TrashIcon className="w-5 h-5 mr-2" />
              Delete
            </button>
          </div>

          {/* Mobile/Tablet Dropdown */}
          <div className="lg:hidden relative dropdown-container">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
            >
              <EllipsisVerticalIcon className="w-5 h-5" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-200 z-50">
                <div className="py-1">
                  {integration && integration.platform === 'web' && (
                    <button
                      onClick={() => {
                        if (!embedCode) {
                          fetchEmbedCode()
                        }
                        setShowEmbedCode(!showEmbedCode)
                        setDropdownOpen(false)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                      <CodeBracketIcon className="w-4 h-4 mr-3" />
                      {showEmbedCode ? 'Hide' : 'Show'} Embed Code
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleToggleIntegration()
                      setDropdownOpen(false)
                    }}
                    disabled={isToggling}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center disabled:opacity-50"
                  >
                    {isToggling ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-3"></div>
                        {integration.is_active ? 'Deactivating...' : 'Activating...'}
                      </>
                    ) : (
                      <>
                        {integration.is_active ? (
                          <>
                            <XCircleIcon className="w-4 h-4 mr-3" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon className="w-4 h-4 mr-3" />
                            Activate
                          </>
                        )}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteIntegration()
                      setDropdownOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <TrashIcon className="w-4 h-4 mr-3" />
                    Delete
                  </button>
                  <Link
                    href={`/dashboard/integrations/${integration.id}/edit`}
                    onClick={() => setDropdownOpen(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <PencilIcon className="w-4 h-4 mr-3" />
                    Edit
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Integration Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
      >
        <div className="p-4 lg:p-6">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4 mb-4 lg:mb-6">
                <div>
                  <p className="text-xs lg:text-sm font-medium text-gray-600">Integration ID</p>
                  <p className="text-xs lg:text-sm text-gray-900">{integration.id}</p>
                </div>
                <div>
                  <p className="text-xs lg:text-sm font-medium text-gray-600">Agent ID</p>
                  <p className="text-xs lg:text-sm text-gray-900">{integration.agent_id}</p>
                </div>
                <div>
                  <p className="text-xs lg:text-sm font-medium text-gray-600">Created</p>
                  <p className="text-xs lg:text-sm text-gray-900">{formatDate(integration.created_at)}</p>
                </div>
                {integration.updated_at && (
                  <div>
                    <p className="text-xs lg:text-sm font-medium text-gray-600">Last Updated</p>
                    <p className="text-xs lg:text-sm text-gray-900">{formatDate(integration.updated_at)}</p>
                  </div>
                )}
              </div>

              {integration.webhook_url && (
                <div className="mb-4 lg:mb-6">
                  <p className="text-xs lg:text-sm font-medium text-gray-600 mb-1">Webhook URL</p>
                  <p className="text-xs lg:text-sm text-gray-900 bg-gray-50 p-2 rounded border break-all">
                    {integration.webhook_url}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
      >
        <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200">
          <h3 className="text-base lg:text-lg font-medium text-gray-900">Configuration</h3>
        </div>
        <div className="p-4 lg:p-6">
          {Object.keys(integration.config).length > 0 ? (
            <div className="space-y-3 lg:space-y-4">
              {Object.entries(integration.config).map(([key, value]) => (
                <div key={key} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-xs lg:text-sm font-medium text-gray-600">{key}</p>
                    <p className="text-xs lg:text-sm text-gray-900 mt-1 break-all">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs lg:text-sm text-gray-500">No configuration data available.</p>
          )}
        </div>
      </motion.div>

      {/* Embed Code Section - Only for Web Widgets */}
      {integration && integration.platform === 'web' && showEmbedCode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Embed Code</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={copyEmbedCode}
                  disabled={!embedCode}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ClipboardDocumentIcon className="w-4 h-4 mr-1" />
                  Copy
                </button>
                <a
                  href={`${API_BASE_URL}/api/v1/web-widget/test/${integrationId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-green-700 bg-green-50 hover:bg-green-100 transition-all"
                >
                  <EyeIcon className="w-4 h-4 mr-1" />
                  Preview
                </a>
              </div>
            </div>
          </div>
          <div className="p-6">
            {loadingEmbedCode ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading embed code...</span>
              </div>
            ) : embedCode ? (
              <div>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Copy and paste this code into your website's HTML where you want the chat widget to appear:
                  </p>
                </div>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{embedCode}</code>
                  </pre>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">How to use:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Copy the code above</li>
                    <li>Paste it into your website's HTML (before the closing &lt;/body&gt; tag)</li>
                    <li>The chat widget will appear on your website</li>
                    <li>Visitors can click the chat button to talk to your AI agent</li>
                  </ol>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Failed to load embed code</p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}