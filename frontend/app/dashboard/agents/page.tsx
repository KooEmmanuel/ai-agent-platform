'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  CpuChipIcon, 
  PlusIcon, 
  PlayIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { apiClient } from '../../../lib/api'  

// Use the Agent interface from the API client
import type { Agent } from '../../../lib/api'

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const agentsData = await apiClient.getAgents()
      setAgents(agentsData)
    } catch (error) {
      console.error('Error fetching agents:', error)
      setError('Failed to load agents')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAgent = async (agentId: number) => {
    try {
      await apiClient.deleteAgent(agentId)
      setAgents(agents.filter(agent => agent.id !== agentId))
    } catch (error) {
      console.error('Error deleting agent:', error)
      setError('Failed to delete agent')
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-600">Create and manage your AI agents</p>
        </div>
        <Link
          href="/dashboard/agents/create"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Create
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CpuChipIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Agents</p>
              <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <PlayIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Agents</p>
              <p className="text-2xl font-bold text-gray-900">
                {agents.filter(agent => agent.is_active).length}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Agents Section */}
      <div className="bg-transparent lg:bg-white rounded-xl lg:shadow-[0_2px_8px_rgba(59,130,246,0.08)] overflow-hidden">
        <div className="px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900">Your Agents</h3>
        </div>
        
        {loading && (
          <div className="p-6 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2">Loading agents...</p>
          </div>
        )}
        
        {error && (
          <div className="p-6 text-center text-red-600">
            <div className="bg-red-50 rounded-lg p-4">
              <p className="font-medium">Error loading agents</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}
        
        {!loading && !error && agents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <CpuChipIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No agents found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first AI agent.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard/agents/create"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Create
              </Link>
            </div>
          </motion.div>
        )}
        
        {!loading && !error && agents.length > 0 && (
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
                    {agents.map((agent, index) => (
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
                            <span className="text-sm text-gray-900 font-medium">{agent.tool_count}</span>
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
                              href={`/dashboard/agents/${agent.id}`}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                {agents.map((agent, index) => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] p-4 hover:shadow-[0_4px_16px_rgba(59,130,246,0.12)] transition-all duration-200"
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
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{agent.name}</h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {agent.description || 'No description'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Link
                          href={`/dashboard/agents/${agent.id}`}
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
                    </div>

                    {/* Status Badge */}
                    <div className="mb-3">
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
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500">Model</span>
                        <p className="text-gray-900 font-medium mt-0.5">{agent.model || 'GPT-4'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Tools</span>
                        <p className="text-gray-900 font-medium mt-0.5">{agent.tool_count} tools</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Created</span>
                        <p className="text-gray-900 font-medium mt-0.5">{formatDate(agent.created_at)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Used</span>
                        <p className="text-gray-900 font-medium mt-0.5">
                          Never
                        </p>
                      </div>
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