'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Cog6ToothIcon,
  CircleStackIcon,
  UsersIcon,
  CpuChipIcon,
  LinkIcon
} from '@heroicons/react/24/outline'
import { useToast } from '../../../components/ui/Toast'

interface SystemInfo {
  database: {
    status: string
    healthy: boolean
    type: string
  }
  platform: {
    total_users: number
    total_agents: number
    total_integrations: number
  }
}

export default function AdminSettingsPage() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    fetchSystemInfo()
  }, [])

  const fetchSystemInfo = async () => {
    try {
      setLoading(true)
      
      const adminToken = localStorage.getItem('admin_token')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/system-info`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSystemInfo(data)
      } else {
        showToast({
          type: 'error',
          title: 'Failed to load system info',
          message: 'Could not fetch system information. Please try again.',
          duration: 4000
        })
      }
    } catch (error) {
      console.error('Error fetching system info:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load system information. Please check your connection.',
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
          <p className="mt-4 text-gray-600">Loading system information...</p>
        </div>
      </div>
    )
  }
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">System Information</h1>
        <p className="mt-2 text-gray-600">Real-time platform and database status</p>
      </div>

      {/* Real Data Sections */}
      {systemInfo && (
        <div className="space-y-6">
          {/* Database Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <CircleStackIcon className="h-6 w-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Database Status</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Connection Status</p>
                  <p className="text-sm text-gray-500">{systemInfo.database.type} - {systemInfo.database.status}</p>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  systemInfo.database.healthy 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {systemInfo.database.healthy ? 'Healthy' : 'Unhealthy'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Platform Statistics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Cog6ToothIcon className="h-6 w-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Platform Statistics</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <UsersIcon className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{systemInfo.platform.total_users.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <CpuChipIcon className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Total Agents</p>
                  <p className="text-2xl font-bold text-gray-900">{systemInfo.platform.total_agents.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <LinkIcon className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Total Integrations</p>
                  <p className="text-2xl font-bold text-gray-900">{systemInfo.platform.total_integrations.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
