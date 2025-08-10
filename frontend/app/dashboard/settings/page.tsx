'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Cog6ToothIcon,
  UserCircleIcon,
  KeyIcon,
  BellIcon,
  ShieldCheckIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { useToast } from '../../../components/ui/Toast'

interface User {
  id: number
  name: string
  email: string
  picture?: string
  is_verified: boolean
  created_at: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  const [notifications, setNotifications] = useState({
    email_notifications: true,
    push_notifications: false,
    weekly_reports: true,
    marketing_emails: false,
    agent_alerts: true,
    integration_alerts: true,
    credit_alerts: true
  })

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
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/v1/users/me`)
      
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        throw new Error('Failed to fetch user profile')
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setError('Failed to load user profile')
    } finally {
      setLoading(false)
    }
  }

  const fetchNotificationPreferences = async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/v1/notifications/preferences`)
      
      if (response.ok) {
        const prefs = await response.json()
        setNotifications({
          email_notifications: prefs.email_notifications,
          push_notifications: prefs.push_notifications,
          weekly_reports: prefs.weekly_reports,
          marketing_emails: prefs.marketing_emails,
          agent_alerts: prefs.agent_alerts,
          integration_alerts: prefs.integration_alerts,
          credit_alerts: prefs.credit_alerts
        })
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error)
    }
  }

  useEffect(() => {
    fetchUserProfile()
    fetchNotificationPreferences()
  }, [])

  const handleSaveProfile = async (updatedUser: Partial<User>) => {
    if (!user) return
    
    setSaving(true)
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/v1/users/me`, {
        method: 'PUT',
        body: JSON.stringify({
          name: updatedUser.name,
          picture: updatedUser.picture
        })
      })
      
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        
        showToast({
          type: 'success',
          title: 'Profile updated!',
          message: 'Your profile has been updated successfully.',
          duration: 3000
        })
      } else {
        throw new Error('Failed to update profile')
      }
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

  const handleNotificationChange = async (key: string, value: boolean) => {
    // Update local state immediately
    setNotifications(prev => ({ ...prev, [key]: value }))
    
    try {
      // Update on backend
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/api/v1/notifications/preferences`, {
        method: 'PUT',
        body: JSON.stringify({ [key]: value })
      })
      
      if (response.ok) {
        showToast({
          type: 'success',
          title: 'Notification settings updated!',
          message: 'Your notification preferences have been saved.',
          duration: 3000
        })
      } else {
        throw new Error('Failed to update preferences')
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      
      // Revert local state on error
      setNotifications(prev => ({ ...prev, [key]: !value }))
      
      showToast({
        type: 'error',
        title: 'Update failed',
        message: 'Failed to save notification preferences. Please try again.',
        duration: 5000
      })
    }
  }

  const testNotification = async (type: string) => {
    try {
      let endpoint = ''
      let message = ''
      
      if (type === 'email') {
        endpoint = '/api/v1/notifications/test'
        message = 'Test email notification sent! Check your inbox.'
      } else if (type === 'weekly_report') {
        endpoint = '/api/v1/notifications/weekly-report'
        message = 'Test weekly report sent! Check your email.'
      }
      
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        body: JSON.stringify({
          type: type,
          message: 'This is a test notification from your KooAgent dashboard.'
        })
      })
      
      if (response.ok) {
        showToast({
          type: 'success',
          title: 'Test notification sent!',
          message: message,
          duration: 4000
        })
      } else {
        throw new Error('Failed to send test notification')
      }
    } catch (error) {
      console.error('Error sending test notification:', error)
      showToast({
        type: 'error',
        title: 'Test failed',
        message: 'Failed to send test notification. Please check your settings.',
        duration: 5000
      })
    }
  }

  const settingsSections = [
    {
      title: 'Account',
      icon: UserCircleIcon,
      items: [
        { label: 'Profile Information', description: 'Update your personal information' },
        { label: 'Email Preferences', description: 'Manage your email settings' },
        { label: 'Password', description: 'Change your password' }
      ]
    },
    {
      title: 'Security',
      icon: ShieldCheckIcon,
      items: [
        { label: 'Two-Factor Authentication', description: 'Add an extra layer of security' },
        { label: 'Login History', description: 'View recent login activity' },
        { label: 'API Keys', description: 'Manage your API access keys' }
      ]
    },
    {
      title: 'Notifications',
      icon: BellIcon,
      items: [
        { label: 'Email Notifications', description: 'Control email alerts' },
        { label: 'Push Notifications', description: 'Manage browser notifications' },
        { label: 'Weekly Reports', description: 'Get weekly usage summaries' }
      ]
    }
  ]

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

      {/* Notification Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-600">Receive email alerts for important updates</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.email_notifications}
                  onChange={(e) => handleNotificationChange('email_notifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Push Notifications</p>
                <p className="text-sm text-gray-600">Get browser notifications for real-time updates</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.push_notifications}
                  onChange={(e) => handleNotificationChange('push_notifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Weekly Reports</p>
                <p className="text-sm text-gray-600">Receive weekly usage and performance summaries</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.weekly_reports}
                  onChange={(e) => handleNotificationChange('weekly_reports', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Agent Alerts</p>
                <p className="text-sm text-gray-600">Get notified about agent activity and issues</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.agent_alerts}
                  onChange={(e) => handleNotificationChange('agent_alerts', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Credit Alerts</p>
                <p className="text-sm text-gray-600">Get warned when credits are running low</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.credit_alerts}
                  onChange={(e) => handleNotificationChange('credit_alerts', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Test Notifications</h4>
              <p className="text-sm text-blue-700 mb-3">
                Send yourself a test notification to verify your settings are working.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => testNotification('email')}
                  className="px-3 py-1.5 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
                >
                  Test Email
                </button>
                <button
                  onClick={() => testNotification('weekly_report')}
                  className="px-3 py-1.5 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
                >
                  Test Weekly Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Settings Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {settingsSections.map((section, index) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <section.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">{section.title}</h3>
              </div>
              <div className="space-y-3">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Coming Soon Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
      >
        <div className="p-6 text-center">
          <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">More Settings Coming Soon</h3>
          <p className="text-gray-600">
            Additional settings and configuration options will be available in future updates.
          </p>
        </div>
      </motion.div>
    </div>
  )
}