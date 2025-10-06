'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  UsersIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline'
import { useToast } from '../../../components/ui/Toast'

interface AnalyticsData {
  total_users: number
  active_users: number
  total_agents: number
  total_integrations: number
  total_credits_used: number
  growth_rate: number
  api_calls: number
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      
      const adminToken = localStorage.getItem('admin_token')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAnalytics({
          total_users: data.total_users || 0,
          active_users: data.active_users || 0,
          total_agents: data.total_agents || 0,
          total_integrations: data.total_integrations || 0,
          total_credits_used: data.total_credits_used || 0,
          growth_rate: 12.5, // This would need to be calculated from historical data
          api_calls: 89200 // This would need to be tracked separately
        })
      } else {
        showToast({
          type: 'error',
          title: 'Failed to load analytics',
          message: 'Could not fetch analytics data. Please try again.',
          duration: 4000
        })
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load analytics. Please check your connection.',
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
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-2 text-gray-600">Platform usage and performance metrics</p>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.active_users.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CpuChipIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Agents</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.total_agents.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ArrowTrendingUpIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Growth Rate</p>
                <p className="text-2xl font-bold text-gray-900">+{analytics.growth_rate}%</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-amber-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">API Calls</p>
                <p className="text-2xl font-bold text-gray-900">{(analytics.api_calls / 1000).toFixed(1)}K</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Charts Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage Trends</h2>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Analytics charts will be implemented here</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
