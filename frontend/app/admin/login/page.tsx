'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { EyeIcon, EyeSlashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { useToast } from '../../../components/ui/Toast'
import DrixaiLogo from '../../../components/ui/drixai-logo'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const { showToast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      console.log('Admin login attempt:', formData)
      
      // Call the admin login API
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiBaseUrl}/api/v1/admin-auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Store the admin token and data
        localStorage.setItem('admin_token', data.access_token)
        localStorage.setItem('admin_user', JSON.stringify(data.admin))
        
        showToast({
          type: 'success',
          title: 'Admin login successful!',
          message: 'Welcome to the admin dashboard!',
          duration: 2000
        })
        
        setTimeout(() => {
          router.push('/admin')
        }, 2000)
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.detail || 'Login failed'
        
        showToast({
          type: 'error',
          title: 'Login failed',
          message: errorMessage,
          duration: 4000
        })
      }
    } catch (error) {
      console.error('Admin login error:', error)
      showToast({
        type: 'error',
        title: 'Login failed',
        message: 'Please check your connection and try again.',
        duration: 4000
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="flex justify-center mb-6">
            <DrixaiLogo width={120} height={40} />
          </div>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-gray-900">Admin Access</h2>
          </div>
          <p className="text-gray-600">
            Enter your admin credentials to access the dashboard
          </p>
        </motion.div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Admin Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="admin@drixai.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <ShieldCheckIcon className="h-4 w-4 mr-2" />
                    Sign in to Admin Dashboard
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-amber-50 rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)]">
            <div className="flex">
              <div className="flex-shrink-0">
                <ShieldCheckIcon className="h-5 w-5 text-amber-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Security Notice
                </h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p>
                    This is a restricted admin area. Only authorized administrators can access this dashboard.
                    All login attempts are logged and monitored.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <p className="text-sm text-gray-500">
            © 2024 Drixai. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
