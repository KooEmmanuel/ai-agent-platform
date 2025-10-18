'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  UserGroupIcon,
  PlusIcon,
  ArrowLeftIcon,
  EnvelopeIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
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
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
  inviter_name: string
}

export default function OrganizationMembersPage() {
  const router = useRouter()
  const params = useParams()
  const organizationId = params.id ? parseInt(params.id as string) : null
  const { showToast } = useToast()

  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

    const fetchMembersData = async () => {
      try {
        setLoading(true)
        const [membersData, invitationsData] = await Promise.all([
          apiClient.getOrganizationMembers(organizationId),
          apiClient.getOrganizationInvitations(organizationId)
        ])
        console.log("membersData", membersData)
        console.log("invitationsData", invitationsData)
        setMembers(membersData as OrganizationMember[])
        setInvitations(invitationsData as OrganizationInvitation[])
      } catch (err: any) {
        console.error('Failed to fetch members data:', err)
        setError(err.message || 'Failed to load members data.')
        showToast({
          type: 'error',
          title: 'Error',
          message: err.message || 'Failed to load members data.'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchMembersData()
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
        <h2 className="text-xl font-semibold text-red-600 mb-4">Error Loading Members</h2>
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
          <h1 className="text-3xl font-bold text-gray-900">Organization Members</h1>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Invite Member
        </button>
      </div>

      {/* Members List */}
      <div className="bg-white rounded-xl shadow-sm shadow-blue-200/20">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active Members</h2>
        </div>
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
                  <button className="text-gray-400 hover:text-red-600">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.filter(inv => inv.status === 'pending').length > 0 && (
        <div className="bg-white rounded-xl shadow-sm shadow-blue-200/20">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pending Invitations</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {invitations.filter(inv => inv.status === 'pending').map((invitation) => (
              <div key={invitation.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <EnvelopeIcon className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                    <p className="text-sm text-gray-500">Invited by {invitation.inviter_name || 'Unknown User'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(invitation.role)}`}>
                    {invitation.role}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                    {invitation.status}
                  </span>
                  <button 
                    onClick={() => handleCancelInvitation(invitation.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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