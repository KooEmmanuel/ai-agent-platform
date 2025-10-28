'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  BuildingOfficeIcon,
  PlusIcon,
  UserGroupIcon,
  FolderIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'
import { apiClient } from '../../../lib/api'

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

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getOrganizations()
      setOrganizations(data as Organization[])
    } catch (err) {
      console.error('Error fetching organizations:', err)
      setError('Failed to load organizations')
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
          onClick={fetchOrganizations}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-gray-600 mt-1">
            Manage your organizations and collaborate with teams
          </p>
        </div>
        <Link
          href="/dashboard/organizations/create"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Create Organization
        </Link>
      </div>

      {/* Organizations Grid */}
      {organizations.length === 0 ? (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No organizations yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first organization to start collaborating with your team
          </p>
          <Link
            href="/dashboard/organizations/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Organization
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => (
            <motion.div
              key={org.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl hover:shadow-md hover:shadow-blue-200/30 transition-all duration-200 shadow-sm shadow-blue-200/20"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                      {org.description && (
                        <p className="text-sm text-gray-600 mt-1">{org.description}</p>
                      )}
                    </div>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                    <EllipsisVerticalIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 text-gray-600">
                      <UserGroupIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">{org.member_count}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Members</p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Link
                    href={`/dashboard/organizations/${org.id}`}
                    className="flex-1 text-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    View Details
                  </Link>
                  <Link
                    href={`/dashboard/organizations/${org.id}/settings`}
                    className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Settings"
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
