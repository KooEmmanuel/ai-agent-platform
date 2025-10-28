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
import type { Agent } from '../../../../../lib/api'

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
  const [agents, setAgents] = useState<Agent[]>([])
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null)
  const [editingIntegrationId, setEditingIntegrationId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<{
    agent_id: number
    webhook_url: string
    is_active: boolean
    config: Record<string, any>
  }>({
    agent_id: 0,
    webhook_url: '',
    is_active: true,
    config: {}
  })

  useEffect(() => {
    if (organizationId) {
      fetchIntegrations()
      fetchAgents()
      
      // Check if there's a platform parameter for quick creation
      const urlParams = new URLSearchParams(window.location.search)
      const platform = urlParams.get('platform')
      if (platform) {
        setSelectedPlatform(platform)
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

  const fetchAgents = async () => {
    try {
      setLoadingAgents(true)
      const agentsData = await apiClient.getAgents()
      setAgents(agentsData.filter((agent: Agent) => agent.is_active))
    } catch (error) {
      console.error('Error fetching agents:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load agents'
      })
    } finally {
      setLoadingAgents(false)
    }
  }

  const handleCreateIntegration = async (platform: string) => {
    if (!selectedAgent) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Please select an agent first'
      })
      return
    }

    try {
      const config: Record<string, any> = {
        enabled: true
      }
      
      // Add workspace_name for project management
      if (platform === 'project_management' && editForm.config.workspace_name) {
        config.workspace_name = editForm.config.workspace_name
      }
      
      const integrationData = {
        agent_id: selectedAgent,
        platform: platform,
        config: config
      }

      await apiClient.createOrganizationIntegration(organizationId, integrationData)
      
      showToast({
        type: 'success',
        title: 'Integration Created',
        message: `${platform} integration has been created successfully`
      })
      
      setSelectedAgent(null)
      setSelectedPlatform(null)
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

  // Inline edit functions
  const startInlineEdit = (integration: Integration) => {
    setEditingIntegrationId(integration.id)
    setEditForm({
      agent_id: integration.agent_id,
      webhook_url: integration.webhook_url || '',
      is_active: integration.is_active,
      config: integration.config || {}
    })
  }

  const cancelInlineEdit = () => {
    setEditingIntegrationId(null)
    setEditForm({
      agent_id: 0,
      webhook_url: '',
      is_active: true,
      config: {}
    })
  }

  const saveInlineEdit = async () => {
    if (!editingIntegrationId) return

    try {
      await apiClient.updateOrganizationIntegration(organizationId, editingIntegrationId, {
        agent_id: editForm.agent_id,
        webhook_url: editForm.webhook_url,
        is_active: editForm.is_active,
        config: editForm.config
      })
      
      showToast({
        type: 'success',
        title: 'Integration Updated',
        message: 'Integration has been updated successfully'
      })
      
      cancelInlineEdit()
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

  const updateConfigField = (key: string, value: any) => {
    setEditForm(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value
      }
    }))
  }

  const removeConfigField = (key: string) => {
    setEditForm(prev => {
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
        <button
          onClick={() => setSelectedPlatform(selectedPlatform === 'show_platforms' ? null : 'show_platforms')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          {selectedPlatform === 'show_platforms' ? 'Cancel' : 'Create Integration'}
        </button>
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
              const isEditing = editingIntegrationId === integration.id
              
              return (
                <div key={integration.id} className="px-6 py-4">
                  {isEditing ? (
                    // Inline Edit View
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">{platform?.icon || '🔗'}</span>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              {platform?.name || integration.platform}
                            </h4>
                            <p className="text-sm text-gray-500">Editing integration</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={saveInlineEdit}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelInlineEdit}
                            className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      
                      {/* Agent Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Agent
                        </label>
                        <select
                          value={editForm.agent_id}
                          onChange={(e) => setEditForm(prev => ({ ...prev, agent_id: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {agents.map(agent => (
                            <option key={agent.id} value={agent.id.toString()}>
                              {agent.name} - {agent.description}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Webhook URL */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Webhook URL
                        </label>
                        <input
                          type="url"
                          value={editForm.webhook_url}
                          onChange={(e) => setEditForm(prev => ({ ...prev, webhook_url: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://your-domain.com/webhook"
                        />
                      </div>

                      {/* Active Status */}
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editForm.is_active}
                            onChange={(e) => setEditForm(prev => ({ ...prev, is_active: e.target.checked }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700">
                            Integration is active
                          </span>
                        </label>
                      </div>

                      {/* Config Fields */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Configuration
                          </label>
                          <button
                            onClick={addConfigField}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            + Add Field
                          </button>
                        </div>
                        <div className="space-y-2">
                          {Object.entries(editForm.config).map(([key, value]) => (
                            <div key={key} className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={key}
                                readOnly
                                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                              />
                              <input
                                type="text"
                                value={value}
                                onChange={(e) => updateConfigField(key, e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                              <button
                                onClick={() => removeConfigField(key)}
                                className="px-2 py-1 text-red-600 hover:text-red-800 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Normal View
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center space-x-4 flex-1 cursor-pointer"
                        onClick={() => {
                          if (integration.platform === 'project_management') {
                            router.push(`/dashboard/organizations/${organizationId}/project-management`)
                          }
                        }}
                      >
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">{platform?.icon || '🔗'}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            {integration.platform === 'project_management' && integration.config?.workspace_name
                              ? integration.config.workspace_name
                              : platform?.name || integration.platform}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Agent ID: {integration.agent_id} • Created {new Date(integration.created_at).toLocaleDateString()}
                          </p>
                          {integration.webhook_url && (
                            <p className="text-xs text-gray-400 mt-1">
                              Webhook: {integration.webhook_url}
                            </p>
                          )}
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
                            startInlineEdit(integration)
                          }}
                          className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50"
                        >
                          <PencilIcon className="w-4 h-4" />
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
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Available Platforms */}
      {selectedPlatform === 'show_platforms' && (
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
      )}

      {/* Empty State */}
      {integrations.length === 0 && (
        <div className="text-center py-12">
          <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No integrations yet</h3>
          <p className="text-gray-600 mb-6">
            Connect your organization's agents to external platforms to reach more users
          </p>
          <button
            onClick={() => setSelectedPlatform('project_management')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Project Management Integration
          </button>
        </div>
      )}
      {/* Inline Create Integration Panel */}
      {selectedPlatform && selectedPlatform !== 'show_platforms' && (
        <div className="bg-white rounded-xl shadow-sm shadow-blue-200/20">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Create {platforms.find(p => p.id === selectedPlatform)?.name} Integration
            </h3>
            <p className="text-sm text-gray-600 mt-1">Select an agent and configure settings</p>
          </div>
          <div className="p-6 space-y-6">
            {/* Agent Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Agent</label>
              {loadingAgents ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading agents...</span>
                </div>
              ) : agents.length === 0 ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">No active agents found. Please create an agent first.</p>
                </div>
              ) : (
                <select
                  value={selectedAgent || ''}
                  onChange={(e) => setSelectedAgent(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

            {/* Workspace Name for Project Management */}
            {selectedPlatform === 'project_management' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Workspace Name</label>
                <input
                  type="text"
                  value={editForm.config.workspace_name || ''}
                  onChange={(e) => setEditForm(prev => ({
                    ...prev,
                    config: { ...prev.config, workspace_name: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="My Organization Workspace"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">This will be displayed as the integration name</p>
              </div>
            )}

            {/* Platform Info */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{platforms.find(p => p.id === selectedPlatform)?.icon}</span>
                <div>
                  <h4 className="font-medium text-gray-900">{platforms.find(p => p.id === selectedPlatform)?.name}</h4>
                  <p className="text-sm text-gray-600">{platforms.find(p => p.id === selectedPlatform)?.description}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
            <button
              onClick={() => {
                setSelectedAgent(null)
                setSelectedPlatform(null)
                setEditForm({ agent_id: 0, webhook_url: '', is_active: true, config: {} })
              }}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => selectedPlatform && handleCreateIntegration(selectedPlatform)}
              disabled={!selectedAgent || !selectedPlatform}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create Integration
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
