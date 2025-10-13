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
import { useToast } from '../../../components/ui/Toast'
import { apiClient } from '../../../lib/api'


interface Integration {
  id: number
  agent_id: number
  platform: string
  config: Record<string, any>
  webhook_url?: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

const platforms = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '💬',
    description: 'Connect your assistant to WhatsApp Business',
    status: 'available',
    color: 'bg-green-100 text-green-800'
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '📱',
    description: 'Create a Telegram bot for your assistant',
    status: 'available',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'project_management',
    name: 'Project Management',
    icon: '📋',
    description: 'AI-powered project management platform',
    status: 'available',
    color: 'bg-orange-100 text-orange-800'
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
    description: 'Embed assistant in your website',
    status: 'available',
    color: 'bg-indigo-100 text-indigo-800'
  },
  {
    id: 'project_management',
    name: 'Project Management',
    icon: '📋',
    description: 'AI-powered project management platform',
    status: 'available',
    color: 'bg-orange-100 text-orange-800'
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

      const integrationsData = await apiClient.getIntegrations()
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
      await apiClient.deleteIntegration(parseInt(integrationId))
      setIntegrations(integrations.filter(integration => integration.id !== parseInt(integrationId)))
    } catch (error) {
      console.error('Error deleting integration:', error)
      setError('Failed to delete integration')
    }
  }

  const handleToggleIntegration = async (integrationId: string) => {
    try {
      const integration = integrations.find(i => i.id === parseInt(integrationId))
      if (!integration) return

      const updatedIntegration = await apiClient.updateIntegration(parseInt(integrationId), {
        is_active: !integration.is_active
      })

      setIntegrations(integrations.map(i => 
        i.id === parseInt(integrationId) 
          ? updatedIntegration
          : i
      ))
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
          Get started by connecting your assistants to external platforms.
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-sm lg:text-base text-gray-600 mt-1">Connect your assistants to external platforms</p>
        </div>
        <div className="flex items-center space-x-2 lg:space-x-3">
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
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                <div className="flex items-start space-x-3 lg:space-x-4 flex-1 min-w-0">
                  {/* Logo or Platform Icon */}
                  <div className="flex-shrink-0">
                    {integration.platform === 'project_management' && integration.config?.logo_url ? (
                      <img 
                        src={integration.config.logo_url} 
                        alt="Integration Logo"
                        className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg object-cover border border-gray-200"
                        onError={(e) => {
                          // Fallback to platform icon if logo fails to load
                          e.currentTarget.style.display = 'none'
                          const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                          if (nextElement) {
                            nextElement.style.display = 'block'
                          }
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center text-lg ${
                        integration.platform === 'project_management' && integration.config?.logo_url 
                          ? 'hidden' 
                          : 'block'
                      } ${getPlatformInfo(integration.platform).color || 'bg-gray-100 text-gray-600'}`}
                    >
                      {getPlatformInfo(integration.platform).icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-1 sm:space-y-0 mb-1">
                      <h4 className="text-sm lg:text-lg font-medium text-gray-900 truncate">
                        {integration.platform === 'project_management' && integration.config?.workspace_name
                          ? integration.config.workspace_name
                          : integration.platform === 'web' && integration.config?.widget_name
                          ? integration.config.widget_name
                          : `${getPlatformInfo(integration.platform).name} Integration`}
                      </h4>
                      <div className="flex items-center space-x-2">
                        {integration.platform === 'project_management' && integration.config?.logo_url && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            🖼️ Logo
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 lg:px-2.5 lg:py-0.5 rounded-full text-xs font-medium flex-shrink-0 w-fit ${
                          integration.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {integration.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs lg:text-sm text-gray-600 mb-2 line-clamp-2">
                      {getPlatformInfo(integration.platform).description}
                    </p>
                    <div className="flex flex-col space-y-1 text-xs lg:text-sm text-gray-500">
                      <span>Assistant ID: {integration.agent_id}</span>
                      <span>Created: {formatDate(integration.created_at)}</span>
                      {integration.updated_at && (
                        <span>Updated: {formatDate(integration.updated_at)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-1 lg:space-x-2 flex-shrink-0">
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
                    href={integration.platform === 'project_management' 
                      ? '/dashboard/integrations/project-management'
                      : `/dashboard/integrations/${integration.id}`}
                    className="p-1.5 lg:p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title={integration.platform === 'project_management' ? 'Open Dashboard' : 'View Details'}
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