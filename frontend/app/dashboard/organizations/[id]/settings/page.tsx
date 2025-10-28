'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  UserGroupIcon,
  EnvelopeIcon,
  Cog6ToothIcon,
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { apiClient } from '../../../../../lib/api'
import { useToast } from '../../../../../components/ui/Toast'
import LoadingSpinner from '../../../../../components/ui/LoadingSpinner'

interface OrganizationMember {
  id: number
  user_id: number 
  role: string
  status: string
  joined_at: string
  user_name: string
  user_email: string
}

interface OrganizationInvitation {
  id: number
  organization_id: number
  email: string
  role: string
  invited_by: number
  token: string
  expires_at: string
  status: string
  created_at: string
  organization_name: string
  inviter_name: string
}

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

export default function OrganizationSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const organizationId = params.id ? parseInt(params.id as string) : null
  const { showToast } = useToast()

  const [organization, setOrganization] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'permissions'>('members')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteLoading, setInviteLoading] = useState(false)

  useEffect(() => {
    if (!organizationId) {
      setError('Organization ID is missing.')
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        const [orgData, membersData, invitationsData] = await Promise.all([
          apiClient.getOrganization(organizationId),
          apiClient.getOrganizationMembers(organizationId),
          apiClient.getOrganizationInvitations(organizationId)
        ])
        
        setOrganization(orgData as Organization)
        setMembers(membersData as OrganizationMember[])
        setInvitations(invitationsData as OrganizationInvitation[])
      } catch (err: any) {
        console.error('Failed to fetch organization data:', err)
        setError(err.message || 'Failed to load organization data.')
        showToast({
          type: 'error',
          title: 'Error',
          message: err.message || 'Failed to load organization data.'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [organizationId])

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId) return

    setInviteLoading(true)
    try {
      await apiClient.createOrganizationInvitation(organizationId, {
        email: inviteEmail,
        role: inviteRole
      })
      
      showToast({
        type: 'success',
        title: 'Invitation Sent',
        message: `Invitation sent to ${inviteEmail}`
      })
      
      setShowInviteModal(false)
      setInviteEmail('')
      setInviteRole('member')
      
      // Refresh invitations list
      const invitationsData = await apiClient.getOrganizationInvitations(organizationId)
      setInvitations(invitationsData as OrganizationInvitation[])
    } catch (err: any) {
      console.error('Failed to send invitation:', err)
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to send invitation.'
      })
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRemoveMember = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from this organization?`)) {
      return
    }

    try {
      await apiClient.removeOrganizationMember(organizationId!, userId)
      
      showToast({
        type: 'success',
        title: 'Success',
        message: `${userName} has been removed from the organization`
      })
      
      // Refresh members list
      const membersData = await apiClient.getOrganizationMembers(organizationId!)
      setMembers(membersData as OrganizationMember[])
    } catch (error: any) {
      console.error('Error removing member:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to remove member'
      })
    }
  }

  const handleCancelInvitation = async (invitationId: number) => {
    try {
      await apiClient.cancelOrganizationInvitation(invitationId)
      showToast({
        type: 'success',
        title: 'Invitation Cancelled',
        message: 'Invitation has been cancelled.'
      })
      
      // Refresh invitations list
      const invitationsData = await apiClient.getOrganizationInvitations(organizationId!)
      setInvitations(invitationsData as OrganizationInvitation[])
    } catch (err: any) {
      console.error('Failed to cancel invitation:', err)
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to cancel invitation.'
      })
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800'
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      case 'member':
        return 'bg-green-100 text-green-800'
      case 'guest':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />
      case 'accepted':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'declined':
        return <XCircleIcon className="w-5 h-5 text-red-500" />
      case 'expired':
        return <XCircleIcon className="w-5 h-5 text-gray-500" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />
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

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8 bg-white rounded-xl shadow-sm shadow-red-200/20 max-w-md mx-auto mt-10">
        <h2 className="text-xl font-semibold text-red-600 mb-4">Error Loading Settings</h2>
        <p className="text-gray-700">{error}</p>
        <button
          onClick={() => router.push('/dashboard/organizations')}
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeftIcon className="-ml-1 mr-2 h-5 w-5" />
          Back to Organizations
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organization Settings</h1>
            <p className="text-gray-600 mt-1">{organization?.name}</p>
          </div>
        </div>
      </div>

      {/* Settings Navigation */}
      <div className="bg-white rounded-xl shadow-sm shadow-blue-200/20">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('members')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <UserGroupIcon className="w-5 h-5" />
                <span>Members ({members.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invitations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <EnvelopeIcon className="w-5 h-5" />
                <span>Invitations ({invitations.filter(inv => inv.status === 'pending').length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'permissions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <ShieldCheckIcon className="w-5 h-5" />
                <span>Permissions</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Organization Members</h3>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Invite Member
                </button>
              </div>

              <div className="bg-white rounded-lg border border-gray-200">
                <div className="divide-y divide-gray-200">
                  {members.map((member) => (
                    <div key={member.id} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserGroupIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{member.user_name || 'Unknown User'}</p>
                          <p className="text-sm text-gray-500">{member.user_email || 'No email'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                          {member.role}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                          {member.status}
                        </span>
                        {member.role !== 'owner' && (
                          <button 
                            onClick={() => handleRemoveMember(member.user_id, member.user_name || member.user_email)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="Remove member"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Invitations Tab */}
          {activeTab === 'invitations' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Pending Invitations</h3>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Invite User
                </button>
              </div>

              {invitations.filter(inv => inv.status === 'pending').length === 0 ? (
                <div className="text-center py-12">
                  <EnvelopeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No pending invitations</h3>
                  <p className="text-gray-600 mb-6">
                    Invite users to join your organization
                  </p>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Invite User
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invited By
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Expires
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {invitations.filter(inv => inv.status === 'pending').map((invitation) => (
                          <motion.tr
                            key={invitation.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                  <EnvelopeIcon className="w-4 h-4 text-gray-600" />
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {invitation.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(invitation.role)}`}>
                                {invitation.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {getStatusIcon(invitation.status)}
                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                                  {invitation.status}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {invitation.inviter_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className={isExpired(invitation.expires_at) ? 'text-red-600' : ''}>
                                {formatDate(invitation.expires_at)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {invitation.status === 'pending' && (
                                <button
                                  onClick={() => handleCancelInvitation(invitation.id)}
                                  className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                  title="Cancel invitation"
                                >
                                  <XMarkIcon className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Permissions Tab */}
          {activeTab === 'permissions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Role Permissions</h3>
                <p className="text-sm text-gray-600">Manage what each role can do in your organization</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Owner Role */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <ShieldCheckIcon className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Owner</h4>
                        <p className="text-sm text-gray-600">Full control over organization</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Highest Level
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                      Create, edit, and delete integrations
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                      Create, edit, and delete projects
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                      Manage organization settings
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                      Invite and manage members
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                      Delete organization
                    </div>
                  </div>
                </div>

                {/* Admin Role */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Admin</h4>
                        <p className="text-sm text-gray-600">Manage organization resources</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      High Level
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                      Create, edit, and delete integrations
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                      Create, edit, and delete projects
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                      Invite and manage members
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                      View organization settings
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <XCircleIcon className="w-4 h-4 text-gray-400 mr-2" />
                      Cannot delete organization
                    </div>
                  </div>
                </div>

                {/* Member Role */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <UserGroupIcon className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Member</h4>
                        <p className="text-sm text-gray-600">Create and manage resources</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Standard Level
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                      Create and edit integrations
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                      Create and edit projects
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                      View organization settings
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <XCircleIcon className="w-4 h-4 text-gray-400 mr-2" />
                      Cannot delete integrations/projects
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <XCircleIcon className="w-4 h-4 text-gray-400 mr-2" />
                      Cannot manage members
                    </div>
                  </div>
                </div>

                {/* Guest Role */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <UserGroupIcon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Guest</h4>
                        <p className="text-sm text-gray-600">View-only access</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Limited Level
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                      View integrations
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                      View projects
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <XCircleIcon className="w-4 h-4 text-gray-400 mr-2" />
                      Cannot create or edit anything
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <XCircleIcon className="w-4 h-4 text-gray-400 mr-2" />
                      Cannot manage members
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <XCircleIcon className="w-4 h-4 text-gray-400 mr-2" />
                      Cannot view organization settings
                    </div>
                  </div>
                </div>
              </div>

              {/* Current User Role */}
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <UserGroupIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-blue-900">Your Current Role</h4>
                    <p className="text-sm text-blue-700">
                      You have <span className="font-semibold">Member</span> permissions in this organization
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invite New Member</h3>
              <form onSubmit={handleInviteMember} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {inviteLoading ? <LoadingSpinner size="sm" color="white" /> : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
