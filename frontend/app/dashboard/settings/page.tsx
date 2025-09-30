'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  UserCircleIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { useToast } from '../../../components/ui/Toast'
import { apiClient } from '../../../lib/api'

interface User {
  id: number
  name: string
  email: string
  picture?: string
  is_verified: boolean
  created_at: string
}

// Use Next.js API routes instead of direct backend calls


export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()


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

  const fetchUserProfile = async () => {
    try {
      const userData = await apiClient.getCurrentUser()
      setUser(userData)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setError('Failed to load user profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const handleSaveProfile = async (updatedUser: Partial<User>) => {
    if (!user) return
    
    setSaving(true)
    try {
      const userData = await apiClient.updateUserProfile({
        name: updatedUser.name,
        email: updatedUser.email
      })
      setUser(userData)
        
      showToast({
        type: 'success',
        title: 'Profile updated!',
        message: 'Your profile has been updated successfully.',
        duration: 3000
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      showToast({
        type: 'error',
        title: 'Update failed',
        message: 'Failed to update profile. Please try again.',
        duration: 5000
      })
    } finally {
      setSaving(false)
    }
  }



  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>
        <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6 text-center">
          <p className="text-gray-500">{error || 'Failed to load settings'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account and application preferences</p>
        </div>
      </div>

      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
      >
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
              {user.picture ? (
                <img 
                  src={user.picture} 
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserCircleIcon className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
              <p className="text-gray-600">{user.email}</p>
              <div className="flex items-center mt-1">
                {user.is_verified ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckIcon className="w-3 h-3 mr-1" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Unverified
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={user.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture URL</label>
            <input
              type="url"
              value={user.picture || ''}
              onChange={(e) => setUser({ ...user, picture: e.target.value })}
              placeholder="https://example.com/your-avatar.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="mt-6">
            <button
              onClick={() => handleSaveProfile({ name: user.name, picture: user.picture })}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </motion.div>


    </div>
  )
}