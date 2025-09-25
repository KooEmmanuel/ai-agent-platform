'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  CpuChipIcon, 
  WrenchScrewdriverIcon, 
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  PlusIcon,
  StarIcon,
  BoltIcon,
  ArrowRightIcon,
  PlayIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { apiClient } from '../../lib/api'

interface DashboardStats {
  activeAgents: number
  totalTools: number
  integrations: number
  conversations: number
  creditsUsed: number
  totalCredits: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch all dashboard data using apiClient
      const [agents, tools, integrations, conversations, credits] = await Promise.all([
        apiClient.getAgents().catch(() => []),
        apiClient.getTools().catch(() => []),
        apiClient.getIntegrations().catch(() => []),
        apiClient.getConversations().catch(() => []),
        apiClient.getCreditsBalance().catch(() => ({ available_credits: 0, total_credits: 1000, used_credits: 0 }))
      ])

      // Calculate stats
      const dashboardStats: DashboardStats = {
        activeAgents: agents.filter((agent: any) => agent.is_active).length,
        totalTools: tools.length,
        integrations: integrations.length,
        conversations: conversations.length,
        creditsUsed: credits.used_credits || 0,
        totalCredits: credits.total_credits || 1000
      }

      setStats(dashboardStats)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    {
      name: 'Create',
      description: 'Build a custom AI agent',
      href: '/dashboard/agents/new',
      icon: CpuChipIcon,
    },
    {
      name: 'Test Playground',
      description: 'Try out your agents',
      href: '/dashboard/playground',
      icon: SparklesIcon,
    },
    {
      name: 'Manage Tools',
      description: 'Configure agent tools',
      href: '/dashboard/tools',
      icon: WrenchScrewdriverIcon,
    },
    {
      name: 'Setup Integrations',
      description: 'Connect to platforms',
      href: '/dashboard/integrations',
      icon: ChatBubbleLeftRightIcon,
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6 lg:space-y-8">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl shadow-lg p-6 lg:p-8 text-white">
          <div className="animate-pulse">
            <div className="h-6 lg:h-8 bg-white/20 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              <div className="bg-white/10 rounded-lg p-4 h-20 lg:h-24"></div>
              <div className="bg-white/10 rounded-lg p-4 h-20 lg:h-24"></div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6">
              <div className="animate-pulse">
                <div className="h-3 lg:h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-6 lg:h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 lg:space-y-8">
        <div className="bg-red-50 rounded-lg p-4 lg:p-6">
          <p className="text-red-600 text-sm lg:text-base">Error: {error}</p>
          <button 
            onClick={fetchDashboardData}
            className="mt-2 bg-red-600 text-white px-3 lg:px-4 py-2 rounded-lg hover:bg-red-700 text-xs lg:text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="space-y-6 lg:space-y-8">
        <div className="bg-gray-50 rounded-lg p-4 lg:p-6">
          <p className="text-gray-600 text-sm lg:text-base">No data available</p>
        </div>
      </div>
    )
  }

  const statsData = [
    {
      name: 'Active Agents',
      value: stats.activeAgents.toString(),
      icon: CpuChipIcon,
    },
    {
      name: 'Total Tools',
      value: stats.totalTools.toString(),
      icon: WrenchScrewdriverIcon,
    },
    {
      name: 'Integrations',
      value: stats.integrations.toString(),
      icon: ChatBubbleLeftRightIcon,
    },
    {
      name: 'Conversations',
      value: stats.conversations.toString(),
      icon: ChatBubbleLeftRightIcon,
    },
  ]

  return (
    <div className="space-y-4 lg:space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-xl shadow-lg p-6 lg:p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-3xl font-bold mb-2">Welcome back!</h1>
            <p className="text-sm lg:text-lg opacity-90">Here's what's happening with your AI agents today.</p>
          </div>
          <div className="hidden lg:block">
            <div className="flex items-center space-x-2">
              <StarIcon className="w-6 h-6 text-yellow-300" />
              <span className="text-sm font-medium">Pro Plan</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mt-6">
          <div className="bg-white/10 rounded-lg p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm lg:text-base opacity-90">Credits Used</p>
                <p className="text-lg lg:text-2xl font-bold">{stats.creditsUsed.toFixed(1)}</p>
              </div>
              <BoltIcon className="w-6 h-6 lg:w-8 lg:h-8 text-yellow-300" />
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm lg:text-base opacity-90">Total Credits</p>
                <p className="text-lg lg:text-2xl font-bold">{stats.totalCredits.toFixed(1)}</p>
              </div>
              <SparklesIcon className="w-6 h-6 lg:w-8 lg:h-8 text-blue-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {statsData.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <stat.icon className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
              </div>
              <div className="ml-3 lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-4 lg:p-6">
        <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 lg:mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={action.href}
                className="block p-4 lg:p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-[0_4px_16px_rgba(59,130,246,0.12)] transition-all duration-200 group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <action.icon className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
                  </div>
                  <ArrowRightIcon className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <h3 className="text-sm lg:text-base font-semibold text-gray-900 mb-1">{action.name}</h3>
                <p className="text-xs lg:text-sm text-gray-600">{action.description}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
} 