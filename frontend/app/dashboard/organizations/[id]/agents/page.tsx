'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  CpuChipIcon, 
  PlusIcon, 
  PlayIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  WrenchScrewdriverIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { apiClient } from '../../../../../lib/api'  
import { useToast } from '../../../../../components/ui/Toast'

// Use the OrganizationAgent interface from the API client
import type { OrganizationAgent } from '../../../../../lib/api'

export default function OrganizationAgentsPage() {
  const params = useParams()
  const router = useRouter()
  const organizationId = parseInt(params.id as string)
  const { showToast } = useToast()
  
  const [agents, setAgents] = useState<OrganizationAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    if (organizationId) {
      fetchAgents()
    }
  }, [organizationId])

  const fetchAgents = async () => {
    try {
      setLoading(true)
      const agentsData = await apiClient.getOrganizationAgents(organizationId)
      setAgents(agentsData)
    } catch (error) {
      console.error('Error fetching organization agents:', error)
      setError('Failed to load organization agents')
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load organization agents'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAgent = async (agentId: number) => {
    if (!confirm('Are you sure you want to delete this organization agent?')) return

    try {
      await apiClient.deleteOrganizationAgent(organizationId, agentId)
      showToast({
        type: 'success',
        title: 'Success',
        message: 'Organization agent deleted successfully'
      })
      fetchAgents()
    } catch (error) {
      console.error('Error deleting organization agent:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete organization agent'
      })
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

  // Filter agents based on search and status
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (agent.description && agent.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && agent.is_active) ||
                         (filterStatus === 'inactive' && !agent.is_active)
    
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile-First Header */}
      <div className="space-y-4">
        {/* Title Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Organization Agents</h1>
              <p className="text-sm sm:text-base text-gray-600">Create and manage AI agents for your organization</p>
            </div>
          </div>
          {/* Desktop Create Button */}
          <Link
            href={`/dashboard/organizations/${organizationId}/agents/create`}
            className="hidden sm:inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create
          </Link>
        </div>

        {/* Mobile-First Search and Filters */}
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search organization agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm text-sm sm:text-base"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setFilterStatus('all')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                filterStatus === 'all'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({agents.length})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                filterStatus === 'active'
                  ? 'bg-green-100 text-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active ({agents.filter(a => a.is_active).length})
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                filterStatus === 'inactive'
                  ? 'bg-gray-100 text-gray-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Inactive ({agents.filter(a => !a.is_active).length})
            </button>
          </div>
        </div>
      </div>

      {/* Mobile-First Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        >
          <div className="flex items-center">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
              <CpuChipIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
            </div>
            <div className="ml-2 sm:ml-3 lg:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{agents.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        >
          <div className="flex items-center">
            <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
              <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
            </div>
            <div className="ml-2 sm:ml-3 lg:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Active</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                {agents.filter(agent => agent.is_active).length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        >
          <div className="flex items-center">
            <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
              <WrenchScrewdriverIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600" />
            </div>
            <div className="ml-2 sm:ml-3 lg:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Tools</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                {agents.reduce((sum, agent) => sum + (agent.tools?.length || 0), 0)}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-3 sm:p-4 lg:p-6 rounded-lg sm:rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        >
          <div className="flex items-center">
            <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg">
              <ChatBubbleLeftRightIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-orange-600" />
            </div>
            <div className="ml-2 sm:ml-3 lg:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Conversations</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Agents Section */}
      <div className="bg-transparent lg:bg-white rounded-xl lg:shadow-[0_2px_8px_rgba(59,130,246,0.08)] overflow-hidden">
        <div className="px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900">Organization Agents</h3>
        </div>
        
        {loading && (
          <div className="p-6 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2">Loading organization agents...</p>
          </div>
        )}
        
        {error && (
          <div className="p-6 text-center text-red-600">
            <div className="bg-red-50 rounded-lg p-4">
              <p className="font-medium">Error loading organization agents</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}
        
        {!loading && !error && filteredAgents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <CpuChipIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No organization agents found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first organization AI agent.
            </p>
            <div className="mt-6">
              <Link
                href={`/dashboard/organizations/${organizationId}/agents/create`}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Create
              </Link>
            </div>
          </motion.div>
        )}
        
        {!loading && !error && filteredAgents.length > 0 && (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Agent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Model
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tools
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Used
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {filteredAgents.map((agent, index) => (
                      <motion.tr
                        key={agent.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-lg mr-3 ${
                              agent.is_active ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                              <CpuChipIcon className={`w-5 h-5 ${
                                agent.is_active ? 'text-green-600' : 'text-gray-400'
                              }`} />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {agent.description || 'No description'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            agent.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            <span className={`w-2 h-2 rounded-full mr-1.5 ${
                              agent.is_active ? 'bg-green-400' : 'bg-gray-400'
                            }`}></span>
                            {agent.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {agent.model || 'GPT-4'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-sm text-gray-900 font-medium">{agent.tools?.length || 0}</span>
                            <span className="text-sm text-gray-500 ml-1">tools</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(agent.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          Never
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-1">
                            <Link
                              href={`/dashboard/organizations/${organizationId}/agents/${agent.id}`}
                              className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
                              title="View Details"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDeleteAgent(agent.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                              title="Delete Agent"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-6">
                {filteredAgents.map((agent, index) => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] p-4 sm:p-6 hover:shadow-[0_4px_16px_rgba(59,130,246,0.12)] transition-all duration-200 border border-gray-100"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          agent.is_active ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <CpuChipIcon className={`w-5 h-5 ${
                            agent.is_active ? 'text-green-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">{agent.name}</h3>
                          <p className="text-xs text-gray-500">
                            {agent.description || 'No description'}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        agent.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                          agent.is_active ? 'bg-green-400' : 'bg-gray-400'
                        }`}></span>
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Model</p>
                        <p className="text-sm font-medium text-gray-900">{agent.model || 'GPT-4'}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Tools</p>
                        <p className="text-sm font-medium text-gray-900">{agent.tools?.length || 0}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/dashboard/playground/${agent.id}`}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          <PlayIcon className="w-3 h-3 mr-1" />
                          Test
                        </Link>
                        <Link
                          href={`/dashboard/organizations/${organizationId}/agents/${agent.id}`}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                        >
                          <EyeIcon className="w-3 h-3 mr-1" />
                          View
                        </Link>
                      </div>
                      <button
                        onClick={() => handleDeleteAgent(agent.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                        title="Delete Agent"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}