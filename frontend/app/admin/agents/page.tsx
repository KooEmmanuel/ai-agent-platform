'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CpuChipIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { useToast } from '../../../components/ui/Toast'

interface AgentData {
  id: number
  name: string
  description: string
  is_active: boolean
  user_id: number
  user_name: string
  user_email: string
  conversations_count: number
  credits_used: number
  last_active: string
  created_at: string
}

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<AgentData[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      setLoading(true)
      
      const adminToken = localStorage.getItem('admin_token')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/agents`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAgents(data.agents || [])
      } else {
        showToast({
          type: 'error',
          title: 'Failed to load agents',
          message: 'Could not fetch agent data. Please try again.',
          duration: 4000
        })
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load agents. Please check your connection.',
        duration: 4000
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading agents...</p>
        </div>
      </div>
    )
  }
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Agent Management</h1>
        <p className="mt-2 text-gray-600">Monitor and manage all platform agents</p>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent, index) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CpuChipIcon className="h-6 w-6 text-blue-600" />
                </div>
                       <div>
                         <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                         <p className="text-sm text-gray-500">Created by {agent.user_name}</p>
                         <p className="text-xs text-gray-400">{agent.user_email}</p>
                       </div>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                agent.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {agent.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            
                   <div className="space-y-2 mb-4">
                     <div className="text-sm text-gray-600 mb-2">
                       <p className="line-clamp-2">{agent.description}</p>
                     </div>
                     <div className="flex justify-between text-sm">
                       <span className="text-gray-500">Conversations:</span>
                       <span className="font-medium">{agent.conversations_count}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                       <span className="text-gray-500">Credits Used:</span>
                       <span className="font-medium">{agent.credits_used.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                       <span className="text-gray-500">Last Active:</span>
                       <span className="font-medium">
                         {new Date(agent.last_active).toLocaleDateString()}
                       </span>
                     </div>
                   </div>
            
            <div className="flex justify-end">
              <button className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
