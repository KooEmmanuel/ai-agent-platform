'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  SparklesIcon,
  CpuChipIcon,
  PlayIcon,
  PlusIcon,
  ClockIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { apiClient } from '../../../../../lib/api'

interface OrganizationAgent {
  id: number
  organization_id: number
  name: string
  description?: string
  instructions: string
  model: string
  is_active: boolean
  tools: any[]
  context_config?: Record<string, any>
  created_by_id: number
  created_at: string
  updated_at?: string
}

export default function OrganizationPlaygroundPage() {
  const params = useParams()
  const organizationId = parseInt(params.id as string)
  
  const [agents, setAgents] = useState<OrganizationAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (organizationId) {
      fetchAgents()
    }
  }, [organizationId])

  const fetchAgents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const agentsData = await apiClient.getOrganizationAgents(organizationId)
      setAgents(agentsData.filter(agent => agent.is_active))
    } catch (error) {
      console.error('Error fetching organization agents:', error)
      setError('Failed to load organization agents')
    } finally {
      setLoading(false)
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

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Organization AI Assistant</h1>
            <p className="text-gray-600">Select an organization assistant to test</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Organization AI Assistant</h1>
            <p className="text-gray-600">Select an organization assistant to test</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile-First Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
            Organization AI Assistant
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Select an organization assistant to test
          </p>
        </div>
        
        {/* Desktop Stats */}
        <div className="hidden sm:flex items-center space-x-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{agents.length}</div>
            <div className="text-xs text-gray-500">Active Agents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {agents.filter(agent => agent.tools && agent.tools.length > 0).length}
            </div>
            <div className="text-xs text-gray-500">With Tools</div>
          </div>
        </div>
      </div>

      {/* Mobile Stats */}
      <div className="sm:hidden grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-lg font-bold text-blue-600">{agents.length}</div>
          <div className="text-xs text-gray-500">Active Agents</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-lg font-bold text-green-600">
            {agents.filter(agent => agent.tools && agent.tools.length > 0).length}
          </div>
          <div className="text-xs text-gray-500">With Tools</div>
        </div>
      </div>

      {/* Agents Grid */}
      {agents.length === 0 ? (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No organization agents</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating an organization agent.
          </p>
          <div className="mt-6">
            <Link
              href={`/dashboard/organizations/${organizationId}/agents/create`}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Organization Agent
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)] transition-all duration-300 border border-gray-100"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <CpuChipIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {agent.description || 'Organization AI Assistant'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-gray-600">
                  <SparklesIcon className="w-4 h-4 mr-2 text-blue-500" />
                  <span className="truncate">{agent.model}</span>
                </div>
                
                {agent.tools && agent.tools.length > 0 && (
                  <div className="flex items-center text-sm text-gray-600">
                    <PlayIcon className="w-4 h-4 mr-2 text-green-500" />
                    <span>{agent.tools.length} tool{agent.tools.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                
                <div className="flex items-center text-sm text-gray-600">
                  <ClockIcon className="w-4 h-4 mr-2 text-gray-400" />
                  <span>Created {formatDate(agent.created_at)}</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <Link
                  href={`/dashboard/organizations/${organizationId}/playground/${agent.id}`}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <PlayIcon className="w-4 h-4" />
                  <span>Start Chat</span>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
