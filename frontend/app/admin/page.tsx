'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  UsersIcon, 
  UserGroupIcon, 
  CreditCardIcon, 
  ChartBarIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { useToast } from '../../components/ui/Toast'

interface AdminUser {
  id: number
  email: string
  name: string
  is_verified: boolean
  created_at: string
  total_credits: number
  used_credits: number
  total_agents: number
  total_integrations: number
}

interface AdminStats {
  total_users: number
  total_agents: number
  total_integrations: number
  total_credits_used: number
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const { showToast } = useToast()

  // Fetch data on component mount
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const adminToken = localStorage.getItem('admin_token')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      // Fetch users and stats in parallel
      const [usersResponse, statsResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/v1/admin/users`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${apiBaseUrl}/api/v1/admin/stats`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        })
      ])
      
      if (usersResponse.ok && statsResponse.ok) {
        const usersData = await usersResponse.json()
        const statsData = await statsResponse.json()
        
        setUsers(usersData.users || [])
        setStats(statsData)
      } else {
        if (usersResponse.status === 401 || statsResponse.status === 401) {
          // Token expired or invalid - redirect handled by layout
          return
        }
        
        showToast({
          type: 'error',
          title: 'Failed to load data',
          message: 'Could not fetch admin data. Please try again.',
          duration: 4000
        })
      }
    } catch (error) {
      console.error('Error fetching admin data:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load admin data. Please check your connection.',
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

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
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
        showToast({
          type: 'success',
          title: 'User deleted',
          message: 'User has been successfully deleted.',
          duration: 3000
        })
        fetchData() // Refresh the data
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
            >
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UsersIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_users}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
            >
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserGroupIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Agents</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_agents}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
            >
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Integrations</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_integrations}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
            >
              <div className="flex items-center">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <CreditCardIcon className="h-6 w-6 text-amber-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Credits Used</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_credits_used.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
            <p className="text-sm text-gray-600">Manage user accounts and permissions</p>
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
                      {(user.used_credits || 0).toLocaleString()} / {(user.total_credits || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.total_agents || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={isLoading}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
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
          <div className="relative top-20 mx-auto p-5 w-96 shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">User Details</h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.name || 'No name'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedUser.is_verified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedUser.is_verified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Credits</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {(selectedUser.used_credits || 0).toLocaleString()} / {(selectedUser.total_credits || 0).toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Agents</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.total_agents || 0}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Integrations</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.total_integrations || 0}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedUser.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50 shadow-[0_2px_8px_rgba(59,130,246,0.08)]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}