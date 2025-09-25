'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  CogIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { apiClient } from '../../../lib/api'

interface AnalyticsData {
  total_agents: number
  total_conversations: number
  total_messages: number
  active_integrations: number
  recent_activity: Array<{
    type: string
    description: string
    timestamp: string
  }>
}

// Use Next.js API routes instead of direct backend calls


export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('auth_token')
    return fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
  }

  const fetchAnalytics = async () => {
    try {
      const analyticsData = await apiClient.getAnalyticsOverview()
      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        </div>
        <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6 text-center">
          <p className="text-gray-500">{error || 'No analytics data available'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Monitor your AI agents' performance and usage</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
        >
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <UserGroupIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Agents</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.total_agents || 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
        >
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Agents</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.active_integrations || 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
        >
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <CogIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tools</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.total_messages || 0}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
        >
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Conversations</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.total_conversations || 0}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Usage Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {!analytics?.recent_activity || analytics.recent_activity.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              ) : (
                analytics.recent_activity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-600">{activity.description}</span>
                    <span className="text-sm text-gray-400">{new Date(activity.timestamp).toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Messages</span>
                <span className="font-semibold">{analytics?.total_messages || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Integrations</span>
                <span className="font-semibold">{analytics?.active_integrations || 0}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Empty State for Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Agents</h3>
            <div className="text-center py-8">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Agent performance data coming soon</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Used Tools</h3>
            <div className="text-center py-8">
              <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Tool usage data coming soon</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}