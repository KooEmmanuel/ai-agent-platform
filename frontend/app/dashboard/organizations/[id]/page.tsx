'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ArrowLeftIcon,
  PlusIcon,
  ChatBubbleLeftRightIcon,
  GlobeAltIcon,
  FolderIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import { apiClient } from '../../../../lib/api'

interface Organization {
  id: number
  name: string
  description?: string
  slug?: string
  owner_id: number
  settings?: any
  is_active: boolean
  created_at: string
  updated_at: string
  member_count: number
}

interface OrganizationIntegration {
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

export default function OrganizationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const organizationId = parseInt(params.id as string)
  
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateDropdown, setShowCreateDropdown] = useState(false)
  const [integrations, setIntegrations] = useState<OrganizationIntegration[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    if (organizationId) {
      fetchOrganizationData()
    }
  }, [organizationId])

  const fetchOrganizationData = async () => {
    try {
      setLoading(true)
      const [orgData, integrationsData] = await Promise.all([
        apiClient.getOrganization(organizationId),
        apiClient.getOrganizationIntegrations(organizationId)
      ])
      setOrganization(orgData as Organization)
      setIntegrations(integrationsData as OrganizationIntegration[])

      // Fetch organization projects
      try {
        const organizationProjects = await apiClient.getOrganizationProjects(organizationId)
        setProjects(organizationProjects)
      } catch (error) {
        console.log('No projects found or project management not set up')
        setProjects([])
      }
    } catch (err: any) {
      console.error('Error fetching organization data:', err)
      setError(err.response?.data?.detail || 'Failed to load organization')
    } finally {
      setLoading(false)
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
          onClick={() => router.push('/dashboard/organizations')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Organizations
        </button>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 mb-4">Organization not found</div>
        <button 
          onClick={() => router.push('/dashboard/organizations')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Organizations
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
            <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
            {organization.description && (
              <p className="text-gray-600 mt-1">{organization.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCreateDropdown(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create
          </button>
          <Link
            href={`/dashboard/organizations/${organizationId}/settings`}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Organization Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-sm shadow-blue-200/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Members</p>
              <p className="text-3xl font-bold text-gray-900">{organization.member_count}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-sm shadow-blue-200/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className="text-lg font-semibold text-green-600">Active</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BuildingOfficeIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Organization Hub */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Organization Hub</h3>
            <p className="text-sm text-gray-600 mt-1">Manage your organization's resources and integrations</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Integrations */}
          {integrations.length > 0 ? (
            integrations.map((integration) => (
              <Link
                key={integration.id}
                href={`/dashboard/organizations/${organizationId}/integrations`}
                className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  {integration.platform === 'project_management' ? (
                    <FolderIcon className="w-5 h-5 text-green-600" />
                  ) : (
                    <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {integration.platform === 'project_management' ? 'Project Management' : integration.platform}
                  </h4>
                  <p className="text-xs text-gray-500">Integration • {integration.is_active ? 'Active' : 'Inactive'}</p>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="text-sm font-medium text-gray-900 mb-1">No integrations yet</h4>
              <p className="text-xs text-gray-500 mb-4">Create your first integration to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                <PlusIcon className="w-3 h-3 mr-1" />
                Create Integration
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Create Modal */}
      {showCreateDropdown && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Resource</h3>
              
              <div className="space-y-3">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  Available Now
                </div>
                
                <button
                  onClick={() => {
                    setShowCreateDropdown(false)
                    router.push(`/dashboard/organizations/${organizationId}/integrations`)
                  }}
                  className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200"
                >
                  <ChatBubbleLeftRightIcon className="w-5 h-5 mr-3 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium">Integration</div>
                    <div className="text-xs text-gray-500">Connect to external platforms</div>
                  </div>
                </button>

                
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-t border-gray-100 mt-3">
                  Coming Soon
                </div>
                
                <div className="w-full flex items-center px-4 py-3 text-sm text-gray-400 bg-gray-50 rounded-lg border border-gray-200 cursor-not-allowed">
                  <UserGroupIcon className="w-5 h-5 mr-3 text-gray-400" />
                  <div className="text-left">
                    <div className="font-medium">Agent</div>
                    <div className="text-xs text-gray-400">AI assistant for your organization</div>
                  </div>
                  <span className="ml-auto text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded">Soon</span>
                </div>
                
                <div className="w-full flex items-center px-4 py-3 text-sm text-gray-400 bg-gray-50 rounded-lg border border-gray-200 cursor-not-allowed">
                  <GlobeAltIcon className="w-5 h-5 mr-3 text-gray-400" />
                  <div className="text-left">
                    <div className="font-medium">Workflow</div>
                    <div className="text-xs text-gray-400">Automate business processes</div>
                  </div>
                  <span className="ml-auto text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded">Soon</span>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowCreateDropdown(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
