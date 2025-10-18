'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { apiClient } from '../../../../lib/api'

interface InvitationDetails {
  id: number
  organization_id: number
  email: string
  role: string
  status: string
  expires_at: string
  organization_name: string
  inviter_name: string
}

export default function AcceptInvitationPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    if (token) {
      const checkUserStatus = async () => {
        try {
          // Check if user is already logged in
          const authToken = localStorage.getItem('auth_token')
          if (authToken) {
            // User is logged in, try to accept invitation directly
            try {
              await apiClient.acceptOrganizationInvitation(token)
              // Invitation accepted successfully
              setAccepted(true)
              setTimeout(() => {
                router.push('/dashboard')
              }, 2000)
            } catch (err: any) {
              console.error('Failed to accept invitation:', err)
              setError(err.response?.data?.detail || 'Failed to accept invitation')
            }
          } else {
            // User not logged in, show invitation details
            setInvitation({
              id: 1,
              organization_id: 1,
              email: 'user@example.com',
              role: 'member',
              status: 'pending',
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              organization_name: 'Example Organization',
              inviter_name: 'John Doe'
            })
          }
        } catch (err) {
          console.error('Error checking user status:', err)
          setError('Failed to process invitation')
        } finally {
          setLoading(false)
        }
      }
      
      checkUserStatus()
    }
  }, [token, router])

  const handleAcceptInvitation = async () => {
    try {
      setAccepting(true)
      
      // Check if user is logged in
      const authToken = localStorage.getItem('auth_token')
      if (authToken) {
        // Use API client for logged-in users (includes authentication)
        await apiClient.acceptOrganizationInvitation(token)
        setAccepted(true)
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        // Use public endpoint for non-logged-in users
        const response = await apiClient.acceptOrganizationInvitationPublic(token)
        
        if ((response as any).next_step === 'register') {
          // User needs to create an account first
          setError('You need to create an account first to accept this invitation. Please sign up or log in.')
          // Redirect to register page with the invitation token
          router.push(`/auth/register?invitation=${token}`)
        } else {
          setAccepted(true)
        }
      }
    } catch (err: any) {
      console.error('Error accepting invitation:', err)
      setError(err.response?.data?.detail || 'Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  const handleDeclineInvitation = async () => {
    if (!confirm('Are you sure you want to decline this invitation?')) return
    
    try {
      // This would need to be implemented in the backend
      // await apiClient.declineOrganizationInvitation(invitation.id)
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Error declining invitation:', err)
      setError(err.response?.data?.detail || 'Failed to decline invitation')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-8 max-w-md mx-4 text-center shadow-lg shadow-red-200/50"
        >
          <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invitation Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    )
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-8 max-w-md mx-4 text-center shadow-lg shadow-green-200/50"
        >
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Welcome to the Organization!</h1>
          <p className="text-gray-600 mb-6">
            You have successfully joined <strong>{invitation?.organization_name}</strong>
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-8 max-w-md mx-4 text-center"
        >
          <ClockIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invitation Not Found</h1>
          <p className="text-gray-600 mb-6">
            This invitation link is invalid or has expired.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    )
  }

  const isExpired = new Date(invitation.expires_at) < new Date()
  const isPending = invitation.status === 'pending'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-200 p-8 max-w-md mx-4 w-full"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Organization Invitation
          </h1>
          <p className="text-gray-600">
            You've been invited to join an organization
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-600">Organization</span>
            <span className="text-sm font-semibold text-gray-900">
              {invitation.organization_name}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-600">Role</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {invitation.role}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-600">Invited by</span>
            <span className="text-sm font-semibold text-gray-900">
              {invitation.inviter_name}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-600">Expires</span>
            <span className={`text-sm font-semibold ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
              {new Date(invitation.expires_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {isExpired ? (
          <div className="text-center">
            <XCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-600 font-medium mb-4">This invitation has expired</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        ) : !isPending ? (
          <div className="text-center">
            <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600 font-medium mb-4">
              This invitation has already been {invitation.status}
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleAcceptInvitation}
              disabled={accepting}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {accepting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                  Accept Invitation
                </>
              )}
            </button>
            
            <button
              onClick={handleDeclineInvitation}
              className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <XCircleIcon className="w-5 h-5 mr-2" />
              Decline
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
