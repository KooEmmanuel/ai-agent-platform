'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ChatBubbleLeftRightIcon, 
  PlusIcon, 
  GlobeAltIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  InformationCircleIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Integration {
  id: number
  agent_id: number
  agent_name: string
  platform: string
  platform_name: string
  platform_icon: string
  is_active: boolean
  webhook_url?: string
  config: Record<string, any>
  created_at: string
  last_used?: string
  message_count: number
}

const platforms = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '💬',
    description: 'Connect your agent to WhatsApp Business',
    status: 'available',
    color: 'bg-green-100 text-green-800'
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '📱',
    description: 'Create a Telegram bot for your agent',
    status: 'available',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: '🎮',
    description: 'Integrate with Discord servers',
    status: 'coming-soon',
    color: 'bg-purple-100 text-purple-800'
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: '💼',
    description: 'Connect to Slack workspaces',
    status: 'coming-soon',
    color: 'bg-yellow-100 text-yellow-800'
  },
  {
    id: 'email',
    name: 'Email',
    icon: '📧',
    description: 'Handle email communications',
    status: 'available',
    color: 'bg-gray-100 text-gray-800'
  },
  {
    id: 'web',
    name: 'Web Widget',
    icon: '🌐',
    description: 'Embed agent in your website',
    status: 'available',
    color: 'bg-indigo-100 text-indigo-800'
  }
]

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    fetchIntegrations()
  }, [])

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

  const fetchIntegrations = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setError('No authentication token found')
        setLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/integrations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch integrations')
      }

      const integrationsData = await response.json()
      setIntegrations(integrationsData)
    } catch (error) {
      console.error('Error fetching integrations:', error)
      setError('Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteIntegration = async (integrationId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/v1/integrations/${integrationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setIntegrations(integrations.filter(integration => integration.id !== parseInt(integrationId)))
      } else {
        throw new Error('Failed to delete integration')
      }
    } catch (error) {
      console.error('Error deleting integration:', error)
      setError('Failed to delete integration')
    }
  }

  const handleToggleIntegration = async (integrationId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const integration = integrations.find(i => i.id === parseInt(integrationId))
      if (!integration) return

      const response = await fetch(`${API_BASE_URL}/api/v1/integrations/${integrationId}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_active: !integration.is_active
        })
      })

      if (response.ok) {
        setIntegrations(integrations.map(i => 
          i.id === parseInt(integrationId) 
            ? { ...i, is_active: !i.is_active }
            : i
        ))
      } else {
        throw new Error('Failed to toggle integration')
      }
    } catch (error) {
      console.error('Error toggling integration:', error)
      setError('Failed to toggle integration')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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
      <div className="text-center py-12">
        <p>Loading integrations...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        <p>{error}</p>
      </div>
    )
  }

  if (integrations.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-8 lg:py-12"
      >
        <ChatBubbleLeftRightIcon className="mx-auto h-10 w-10 lg:h-12 lg:w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No integrations</h3>
        <p className="mt-1 text-xs lg:text-sm text-gray-500">
          Get started by connecting your agents to external platforms.
        </p>
        <div className="mt-4 lg:mt-6">
          <Link
            href="/dashboard/integrations/create"
            className="inline-flex items-center px-3 lg:px-4 py-2 border border-transparent shadow-sm text-xs lg:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
            Add Integration
          </Link>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-sm lg:text-base text-gray-600">Connect your agents to external platforms</p>
        </div>
        <div className="flex space-x-2 lg:space-x-3">
          {/* Desktop Buttons */}
          <div className="hidden lg:flex space-x-3">
            <Link
              href="/dashboard/integrations/guide"
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-[0_2px_10px_rgba(59,130,246,0.1)] hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)] transition-all"
            >
              <InformationCircleIcon className="w-5 h-5 mr-2" />
              Setup Guide
            </Link>
            <Link
              href="/dashboard/integrations/create"
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-[0_4px_20px_rgba(59,130,246,0.2)] hover:shadow-[0_6px_25px_rgba(59,130,246,0.3)] transition-all"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Integration
            </Link>
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
              <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-200 z-50">
                <div className="py-1">
                  <Link
                    href="/dashboard/integrations/guide"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <InformationCircleIcon className="w-3 h-3 mr-2" />
                    Setup Guide
                  </Link>
                  <Link
                    href="/dashboard/integrations/create"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <PlusIcon className="w-3 h-3 mr-2" />
                    Add Integration
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 lg:p-6 rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChatBubbleLeftRightIcon className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">Total Integrations</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-900">{integrations.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-4 lg:p-6 rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">Active</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-900">
                {integrations.filter(i => i.is_active).length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-4 lg:p-6 rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        >
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <GlobeAltIcon className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">Platforms</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-900">
                {new Set(integrations.map(i => i.platform)).size}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Active Integrations */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] overflow-hidden">
        <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200">
          <h3 className="text-base lg:text-lg font-medium text-gray-900">Active Integrations</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {integrations.map((integration, index) => (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 lg:p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 lg:space-x-4 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm lg:text-lg font-medium text-gray-900 truncate">
                        {integration.platform_name} {integration.agent_name}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-0.5 lg:px-2.5 lg:py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                        integration.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {integration.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs lg:text-sm text-gray-600 mb-2 line-clamp-2">
                      {getPlatformInfo(integration.platform).description}
                    </p>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-1 lg:space-y-0 text-xs lg:text-sm text-gray-500">
                      <span>{integration.message_count} messages</span>
                      <span className="hidden lg:inline">•</span>
                      <span>Created: {formatDate(integration.created_at)}</span>
                      {integration.last_used && (
                        <>
                          <span className="hidden lg:inline">•</span>
                          <span>Last used: {formatDate(integration.last_used)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1 lg:space-x-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleIntegration(integration.id.toString())}
                    className={`p-1.5 lg:p-2 rounded-lg transition-colors ${
                      integration.is_active
                        ? 'text-green-600 hover:bg-green-100'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={integration.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {integration.is_active ? (
                      <CheckCircleIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                    ) : (
                      <XCircleIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                    )}
                  </button>
                  <Link
                    href={`/dashboard/integrations/${integration.id}`}
                    className="p-1.5 lg:p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="View Details"
                  >
                    <ArrowTopRightOnSquareIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                  </Link>
                  <Link
                    href={`/dashboard/integrations/${integration.id}/edit`}
                    className="p-1.5 lg:p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit Integration"
                  >
                    <PencilIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                  </Link>
                  <button
                    onClick={() => handleDeleteIntegration(integration.id.toString())}
                    className="p-1.5 lg:p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete Integration"
                  >
                    <TrashIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>



      {/* Documentation & Help */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] rounded-xl p-4 lg:p-6">
        <div className="flex items-start space-x-3 lg:space-x-4">
          <div className="flex-shrink-0">
            <InformationCircleIcon className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-1 lg:mb-2">Need Help Setting Up Integrations?</h3>
            <p className="text-xs lg:text-sm text-gray-600 mb-3 lg:mb-4">
              Our comprehensive guide walks you through setting up integrations with WhatsApp, Telegram, Email, and more. 
              Learn about requirements, step-by-step setup instructions, and troubleshooting tips.
            </p>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Link
                href="/dashboard/integrations/guide"
                className="inline-flex items-center justify-center px-3 lg:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-[0_4px_20px_rgba(59,130,246,0.2)] hover:shadow-[0_6px_25px_rgba(59,130,246,0.3)] transition-all text-xs lg:text-sm"
              >
                <InformationCircleIcon className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                View Setup Guide
              </Link>
              <Link
                href="/dashboard/integrations/create"
                className="inline-flex items-center justify-center px-3 lg:px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 shadow-[0_2px_10px_rgba(59,130,246,0.1)] hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)] transition-all text-xs lg:text-sm"
              >
                <PlusIcon className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                Create
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 