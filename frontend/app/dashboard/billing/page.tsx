'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CreditCardIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface Credits {
  total_credits: number
  used_credits: number
  available_credits: number
  usage_percentage: number
}

interface Plan {
  id: number
  name: string
  display_name: string
  description: string
  price: number
  currency: string
  monthly_credits: number
  max_agents: number
  max_custom_tools: number
  features: string[]
  support_level: string
  custom_branding: boolean
  api_access: boolean
  is_current: boolean
}

interface SubscriptionStatus {
  plan_name: string
  display_name: string
  status: string
  current_period_end: string
  credits_remaining: number
  credits_total: number
  can_create_agents: boolean
  can_create_custom_tools: boolean
  agents_count: number
  agents_limit: number
  custom_tools_count: number
  custom_tools_limit: number
}

// Use Railway URL in production, localhost in development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://kwickbuild.up.railway.app'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')

export default function BillingPage() {
  const [credits, setCredits] = useState<Credits | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const fetchBillingData = async () => {
    try {
      // Fetch credits
      const creditsResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/v1/credits/balance`)
      if (creditsResponse.ok) {
        const creditsData = await creditsResponse.json()
        setCredits(creditsData)
      }

      // Fetch subscription plans
      const plansResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/v1/billing/plans`)
      if (plansResponse.ok) {
        const plansData = await plansResponse.json()
        setPlans(plansData)
      }

      // Fetch subscription status
      const subscriptionResponse = await makeAuthenticatedRequest(`${API_BASE_URL}/api/v1/billing/subscription`)
      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json()
        setSubscription(subscriptionData)
      }

    } catch (error) {
      console.error('Error fetching billing data:', error)
      setError('Failed to load billing information')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBillingData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Billing & Credits</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !credits) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Billing & Credits</h1>
        </div>
        <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-400 mb-4" />
          <p className="text-gray-500">{error || 'No billing information available'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Credits</h1>
          <p className="text-gray-600">Manage your credits and billing information</p>
        </div>
      </div>

      {/* Credits Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
        >
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <CreditCardIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Credits</p>
              <p className="text-2xl font-bold text-gray-900">{credits.total_credits.toFixed(1)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
        >
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Available Credits</p>
              <p className="text-2xl font-bold text-gray-900">{credits.available_credits.toFixed(1)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
        >
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Used Credits</p>
              <p className="text-2xl font-bold text-gray-900">{credits.used_credits.toFixed(1)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Usage Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit Usage</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Usage Progress</span>
              <span className="text-sm font-medium">{credits.usage_percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(credits.usage_percentage, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{credits.used_credits.toFixed(1)} used</span>
              <span>{credits.available_credits.toFixed(1)} remaining</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Current Plan Status */}
      {subscription && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h3>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold text-blue-600">{subscription.display_name}</h4>
                <p className="text-gray-600">Status: {subscription.status}</p>
                {subscription.current_period_end && (
                  <p className="text-sm text-gray-500">
                    {subscription.plan_name === 'free' ? 'Free Plan - No expiration' : `Renews: ${new Date(subscription.current_period_end).toLocaleDateString()}`}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Plan Limits</div>
                <div className="text-sm">
                  <span className="font-medium">{subscription.agents_count}</span>
                  <span className="text-gray-500">/{subscription.agents_limit === -1 ? '∞' : subscription.agents_limit} agents</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">{subscription.custom_tools_count}</span>
                  <span className="text-gray-500">/{subscription.custom_tools_limit === -1 ? '∞' : subscription.custom_tools_limit} custom tools</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Subscription Plans */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Available Plans</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <div
                key={plan.id}
                className={`relative border rounded-xl p-6 transition-all ${
                  plan.is_current
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                {plan.is_current && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Current Plan
                    </span>
                  </div>
                )}
                
                <div className="text-center">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">{plan.display_name}</h4>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    ${plan.price}
                    <span className="text-lg font-normal text-gray-600">/month</span>
                  </div>
                  <p className="text-gray-600 mb-6">{plan.description}</p>
                  
                  <ul className="space-y-3 mb-8 text-left">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {plan.is_current ? (
                    <button
                      disabled
                      className="w-full bg-gray-100 text-gray-500 py-2 px-4 rounded-lg font-medium cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                        plan.name === 'free'
                          ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-[0_4px_12px_rgba(59,130,246,0.3)]'
                      }`}
                      disabled={plan.name === 'free'}
                      onClick={() => {
                        // TODO: Implement upgrade functionality
                        alert('Upgrade functionality coming soon!')
                      }}
                    >
                      {plan.name === 'free' ? 'Free Plan' : 'Upgrade Now'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}