'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  SparklesIcon,
  CpuChipIcon,
  PlayIcon,
  PlusIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { apiClient } from '../../../lib/api'

interface Agent {
  id: number
  name: string
  description?: string
  is_active: boolean
  created_at: string
  last_used?: string
}

export default function PlaygroundPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const agentsData = await apiClient.getAgents()
      setAgents(agentsData)
    } catch (error) {
      console.error('Error fetching agents:', error)
      setError('Failed to load agents')
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
            <h1 className="text-2xl font-bold text-gray-900">AI Assistant Testing</h1>
            <p className="text-gray-600">Select an assistant to test</p>
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
            <h1 className="text-2xl font-bold text-gray-900">AI Assistant Testing</h1>
            <p className="text-gray-600">Select an assistant to test</p>
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">AI Assistant Testing</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Select an assistant to test and interact with</p>
        </div>
        {/* Desktop Create Button */}
        <Link
          href="/dashboard/agents/create"
          className="hidden sm:inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Create
        </Link>
      </div>

      {/* Mobile-First Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
              <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600" />
            </div>
            <div className="ml-2 sm:ml-3 lg:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Ready</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                {agents.filter(agent => agent.is_active).length}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Agent Selection */}
      {agents.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-12 text-center"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CpuChipIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assistants found</h3>
          <p className="text-gray-600 mb-6">Create your first AI assistant to start testing.</p>
          <Link
            href="/dashboard/agents/create"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] overflow-hidden hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)] transition-all duration-300"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      agent.is_active 
                        ? 'bg-green-100' 
                        : 'bg-gray-100'
                    }`}>
                      <CpuChipIcon className={`w-6 h-6 ${
                        agent.is_active 
                          ? 'text-green-600' 
                          : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          agent.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {agent.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {agent.description || 'No description provided'}
                </p>
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-1">
                    <ClockIcon className="w-4 h-4" />
                    <span>Created {formatDate(agent.created_at)}</span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <Link
                    href={`/dashboard/playground/${agent.id}`}
                    className={`flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-full text-white transition-colors ${
                      agent.is_active
                        ? 'text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                        : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    }`}
                    {...(!agent.is_active && { 
                      onClick: (e) => e.preventDefault(),
                      'aria-disabled': true 
                    })}
                  >
                    <PlayIcon className="w-4 h-4 mr-2" />
                    {agent.is_active ? 'Run Assistant' : 'Inactive'}
                  </Link>
                  <Link
                    href={`/dashboard/agents/${agent.id}`}
                    className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Configure
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-blue-50 rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-blue-900 mb-2">How to use the playground</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Select an active assistant from the list above</li>
          <li>• Click "Run Assistant" to start a conversation</li>
          <li>• Your assistant will use its configured capabilities and knowledge</li>
          <li>• Test different queries to see how your assistant responds</li>
          <li>• Use this to refine your assistant's behavior and capabilities</li>
        </ul>
      </motion.div>

      {/* Mobile Floating Action Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0 }}
        className="fixed bottom-6 right-6 z-50 sm:hidden"
      >
        <Link
          href="/dashboard/agents/create"
          className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
        >
          <PlusIcon className="w-6 h-6 transition-transform group-hover:scale-110" />
        </Link>
      </motion.div>
    </div>
  )
} 