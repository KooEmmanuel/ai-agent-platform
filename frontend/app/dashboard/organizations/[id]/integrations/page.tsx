'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  EyeIcon,
  InformationCircleIcon,
  EllipsisVerticalIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { useToast } from '../../../../../components/ui/Toast'
import { apiClient } from '../../../../../lib/api'

interface Integration {
  id: number
  organization_id: number
  agent_id: number
  platform: string
  config: Record<string, any>
  webhook_url?: string
  is_active: boolean
  created_by_id: number
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
    id: 'web_widget',
    name: 'Web Widget',
    icon: '🌐',
    description: 'Embed a chat widget on your website',
    status: 'available',
    color: 'bg-purple-100 text-purple-800'
  },
  {
    id: 'project_management',
    name: 'Project Management',
    icon: '📁',
    description: 'Create and manage organization projects',
    status: 'available',
    color: 'bg-orange-100 text-orange-800'
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: '🎮',
    description: 'Create a Discord bot for your server',
    status: 'coming_soon',
    color: 'bg-indigo-100 text-indigo-800'
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: '💼',
    description: 'Integrate with Slack workspace',
    status: 'coming_soon',
    color: 'bg-yellow-100 text-yellow-800'
  }
]

export default function OrganizationIntegrationsPage() {
  const router = useRouter()
  const params = useParams()
  const organizationId = parseInt(params.id as string)
  const { showToast } = useToast()

  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    if (organizationId) {
      fetchIntegrations()
      
      // Check if there's a platform parameter for quick creation
      const urlParams = new URLSearchParams(window.location.search)
      const platform = urlParams.get('platform')
      if (platform) {
        setSelectedPlatform(platform)
        handleCreateIntegration(platform)
      }
    }
  }, [organizationId])

  const fetchIntegrations = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getOrganizationIntegrations(organizationId)
      setIntegrations(data as Integration[])
    } catch (err: any) {
      console.error('Error fetching integrations:', err)
      setError(err.message || 'Failed to load integrations')
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to load integrations'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateIntegration = async (platform: string) => {
    try {
      // For now, we'll create a simple integration
      // In a real implementation, you'd have a form to configure the integration
      const integrationData = {
        agent_id: 1, // This should come from a form or agent selection
        platform: platform,
        config: {
          // Platform-specific configuration would go here
          enabled: true
        }
      }

      await apiClient.createOrganizationIntegration(organizationId, integrationData)
      
      showToast({
        type: 'success',
        title: 'Integration Created',
        message: `${platform} integration has been created successfully`
      })
      
      setShowCreateModal(false)
      fetchIntegrations()
    } catch (err: any) {
      console.error('Error creating integration:', err)
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to create integration'
      })
    }
  }

  const handleDeleteIntegration = async (integrationId: number) => {
    if (!confirm('Are you sure you want to delete this integration?')) return

    try {
      await apiClient.deleteOrganizationIntegration(organizationId, integrationId)
      
      showToast({
        type: 'success',
        title: 'Integration Deleted',
        message: 'Integration has been deleted successfully'
      })
      
      fetchIntegrations()
    } catch (err: any) {
      console.error('Error deleting integration:', err)
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to delete integration'
      })
    }
  }

  const handleToggleIntegration = async (integration: Integration) => {
    try {
      await apiClient.updateOrganizationIntegration(organizationId, integration.id, {
        is_active: !integration.is_active
      })
      
      showToast({
        type: 'success',
        title: 'Integration Updated',
        message: `Integration has been ${!integration.is_active ? 'activated' : 'deactivated'}`
      })
      
      fetchIntegrations()
    } catch (err: any) {
      console.error('Error updating integration:', err)
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to update integration'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button 
          onClick={() => router.back()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Organization Integrations</h1>
            <p className="text-gray-600 mt-1">Connect your organization's agents to external platforms</p>
          </div>
        </div>
      </div>

      {/* Active Integrations */}
      {integrations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm shadow-blue-200/20">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Active Integrations</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {integrations.map((integration) => {
              const platform = platforms.find(p => p.id === integration.platform)
              return (
                <div 
                  key={integration.id} 
                  className={`px-6 py-4 flex items-center justify-between ${
                    integration.platform === 'project_management' 
                      ? 'cursor-pointer hover:bg-gray-50' 
                      : ''
                  }`}
                  onClick={() => {
                    if (integration.platform === 'project_management') {
                      router.push(`/dashboard/organizations/${organizationId}/project-management`)
                    }
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">{platform?.icon || '🔗'}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {platform?.name || integration.platform}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Agent ID: {integration.agent_id} • Created {new Date(integration.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {integration.platform === 'project_management' && (
                      <div className="flex items-center text-blue-600">
                        <EyeIcon className="w-4 h-4" />
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleIntegration(integration)
                      }}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        integration.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {integration.is_active ? (
                        <>
                          <CheckCircleIcon className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="w-3 h-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteIntegration(integration.id)
                      }}
                      className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Available Platforms */}
      <div className="bg-white rounded-xl shadow-sm shadow-blue-200/20">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Available Platforms</h3>
          <p className="text-sm text-gray-600 mt-1">Choose a platform to integrate with your organization's agents</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platforms.map((platform) => (
              <motion.div
                key={platform.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  platform.status === 'available'
                    ? 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                    : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (platform.status === 'available') {
                    setSelectedPlatform(platform.id)
                    handleCreateIntegration(platform.id)
                  }
                }}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <span className="text-2xl">{platform.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">{platform.name}</h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${platform.color}`}>
                      {platform.status === 'available' ? 'Available' : 'Coming Soon'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{platform.description}</p>
                {platform.status === 'available' && (
                  <div className="mt-3 flex items-center text-blue-600 text-sm font-medium">
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Add Integration
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {integrations.length === 0 && (
        <div className="text-center py-12">
          <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No integrations yet</h3>
          <p className="text-gray-600 mb-6">
            Connect your organization's agents to external platforms to reach more users
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Your First Integration
          </button>
        </div>
      )}
    </div>
  )
}
