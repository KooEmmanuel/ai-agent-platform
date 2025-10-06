'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  UsersIcon, 
  UserGroupIcon, 
  EyeIcon,
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { useToast } from '../../../components/ui/Toast'

interface AdminUser {
  id: number
  email: string
  name: string
  is_verified: boolean
  created_at: string
  firebase_uid?: string
  credits: {
    total_credits: number
    used_credits: number
    available_credits: number
  }
  agents_count: number
  integrations_count: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    is_verified: true
  })
  
  const { showToast } = useToast()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      const adminToken = localStorage.getItem('admin_token')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/users`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      } else {
        showToast({
          type: 'error',
          title: 'Failed to load users',
          message: 'Could not fetch user data. Please try again.',
          duration: 4000
        })
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load users. Please check your connection.',
        duration: 4000
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewUser = (user: AdminUser) => {
    setSelectedUser(user)
    setShowUserModal(true)
  }

  const handleToggleUserStatus = async (userId: number) => {
    try {
      setIsLoading(true)
      const adminToken = localStorage.getItem('admin_token')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/users/${userId}/toggle-status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        showToast({
          type: 'success',
          title: 'Status updated',
          message: data.message,
          duration: 3000
        })
        fetchUsers() // Refresh the data
      } else {
        const errorData = await response.json().catch(() => ({}))
        showToast({
          type: 'error',
          title: 'Failed to update status',
          message: errorData.detail || 'Could not update user status. Please try again.',
          duration: 4000
        })
      }
    } catch (error) {
      console.error('Error updating user status:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update user status. Please try again.',
        duration: 4000
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone and will also remove their Google Auth access.')) {
      return
    }

    try {
      setIsLoading(true)
      const adminToken = localStorage.getItem('admin_token')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      const response = await fetch(`${apiBaseUrl}/api/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        showToast({
          type: 'success',
          title: 'User deleted',
          message: data.message,
          duration: 3000
        })
        fetchUsers() // Refresh the data
      } else {
        const errorData = await response.json().catch(() => ({}))
        showToast({
          type: 'error',
          title: 'Failed to delete user',
          message: errorData.detail || 'Could not delete user. Please try again.',
          duration: 4000
        })
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete user. Please try again.',
        duration: 4000
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      showToast({
        type: 'error',
        title: 'Missing information',
        message: 'Please fill in all required fields.',
        duration: 4000
      })
      return
    }

    try {
      setIsLoading(true)
      const adminToken = localStorage.getItem('admin_token')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      const response = await fetch(`${apiBaseUrl}/api/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      })

      if (response.ok) {
        const data = await response.json()
        showToast({
          type: 'success',
          title: 'User created',
          message: data.message,
          duration: 3000
        })
        setShowAddUserModal(false)
        setNewUser({ name: '', email: '', password: '', is_verified: true })
        fetchUsers() // Refresh the data
      } else {
        const errorData = await response.json().catch(() => ({}))
        showToast({
          type: 'error',
          title: 'Failed to create user',
          message: errorData.detail || 'Could not create user. Please try again.',
          duration: 4000
        })
      }
    } catch (error) {
      console.error('Error creating user:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to create user. Please try again.',
        duration: 4000
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-2 text-gray-600">Manage user accounts and permissions</p>
      </div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">All Users</h2>
              <p className="text-sm text-gray-600">{users.length} total users</p>
            </div>
            <button 
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add User</span>
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name || 'No name'}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.is_verified 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.is_verified ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(user.credits.used_credits || 0).toLocaleString()} / {(user.credits.total_credits || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.agents_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewUser(user)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(user.id)}
                        disabled={isLoading}
                        className={`${
                          user.is_verified 
                            ? 'text-yellow-600 hover:text-yellow-900' 
                            : 'text-green-600 hover:text-green-900'
                        } disabled:opacity-50`}
                        title={user.is_verified ? 'Deactivate user' : 'Activate user'}
                      >
                        {user.is_verified ? (
                          <XCircleIcon className="h-4 w-4" />
                        ) : (
                          <CheckCircleIcon className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={isLoading}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="Delete user"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 w-full max-w-md shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] rounded-xl bg-white">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-lg font-medium text-blue-700">
                    {selectedUser.name?.charAt(0) || selectedUser.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedUser.name || 'No name'}</h3>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Status</span>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    selectedUser.is_verified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedUser.is_verified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Credits</span>
                    <span className="text-sm text-gray-500">
                      {(selectedUser.credits.used_credits || 0).toLocaleString()} / {(selectedUser.credits.total_credits || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${Math.min(100, ((selectedUser.credits.used_credits || 0) / (selectedUser.credits.total_credits || 1)) * 100)}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {(selectedUser.credits.available_credits || 0).toLocaleString()}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Agents</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedUser.agents_count || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Integrations</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedUser.integrations_count || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Created</span>
                  <span className="text-sm text-gray-900">
                    {new Date(selectedUser.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                {selectedUser.firebase_uid && (
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-800">Google Auth Connected</p>
                        <p className="text-xs text-green-600">
                          UID: {selectedUser.firebase_uid.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 w-full max-w-md shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] rounded-xl bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="new-user-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  id="new-user-name"
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label htmlFor="new-user-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  id="new-user-email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label htmlFor="new-user-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  id="new-user-password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter password (min 8 characters)"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="new-user-verified"
                  type="checkbox"
                  checked={newUser.is_verified}
                  onChange={(e) => setNewUser({ ...newUser, is_verified: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="new-user-verified" className="ml-2 block text-sm text-gray-700">
                  User is verified (can login immediately)
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  
  )
}
