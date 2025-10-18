'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  FolderIcon,
  PlusIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  EnvelopeIcon,
  ArrowLeftIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'
import { apiClient } from '../../../../lib/api'

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
  project_count: number
}

interface OrganizationProject {
  id: number
  organization_id: number
  name: string
  description?: string
  status: string
  settings?: any
  created_by: number
  created_at: string
  updated_at: string
  member_count: number
}

export default function OrganizationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const organizationId = parseInt(params.id as string)
  
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [projects, setProjects] = useState<OrganizationProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (organizationId) {
      fetchOrganizationData()
    }
  }, [organizationId])

  const fetchOrganizationData = async () => {
    try {
      setLoading(true)
      const [orgData, projectsData] = await Promise.all([
        apiClient.getOrganization(organizationId),
        apiClient.getOrganizationProjects(organizationId)
      ])
      setOrganization(orgData)
      setProjects(projectsData)
    } catch (err: any) {
      console.error('Error fetching organization data:', err)
      setError(err.response?.data?.detail || 'Failed to load organization')
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
          onClick={() => router.push('/dashboard/organizations')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Organizations
        </button>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 mb-4">Organization not found</div>
        <button 
          onClick={() => router.push('/dashboard/organizations')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Organizations
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
            {organization.description && (
              <p className="text-gray-600 mt-1">{organization.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href={`/dashboard/organizations/${organizationId}/invitations`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <EnvelopeIcon className="w-5 h-5 mr-2" />
            Manage Invitations
          </Link>
          <Link
            href={`/dashboard/organizations/${organizationId}/settings`}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Organization Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-xl p-6 shadow-sm shadow-blue-200/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Members</p>
              <p className="text-3xl font-bold text-gray-900">{organization.member_count}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-xl p-6 shadow-sm shadow-blue-200/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Projects</p>
              <p className="text-3xl font-bold text-gray-900">{organization.project_count}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FolderIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-sm shadow-blue-200/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className="text-lg font-semibold text-green-600">Active</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Projects Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm shadow-blue-200/20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
          <Link
            href={`/dashboard/organizations/${organizationId}/projects/create`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Project
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first project to start collaborating
            </p>
            <Link
              href={`/dashboard/organizations/${organizationId}/projects/create`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                    {project.description && (
                      <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                    )}
                  </div>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <EllipsisVerticalIcon className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{project.member_count} members</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    project.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status}
                  </span>
                </div>

                <div className="mt-4 flex space-x-2">
                  <Link
                    href={`/dashboard/organizations/${organizationId}/projects/${project.id}`}
                    className="flex-1 text-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    View Details
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm shadow-blue-200/20">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href={`/dashboard/organizations/${organizationId}/projects/create`}
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FolderIcon className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium">Create Project</span>
          </Link>
          <Link
            href={`/dashboard/organizations/${organizationId}/invitations`}
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <EnvelopeIcon className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium">Invite Members</span>
          </Link>
          <Link
            href={`/dashboard/organizations/${organizationId}/members`}
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UserGroupIcon className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium">Manage Members</span>
          </Link>
          <Link
            href={`/dashboard/organizations/${organizationId}/analytics`}
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChartBarIcon className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium">View Analytics</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
