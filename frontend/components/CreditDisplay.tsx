'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CreditCardIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import { apiClient } from '../lib/api'

interface CreditBalance {
  total_credits: number
  used_credits: number
  available_credits: number
  usage_percentage: number
}

interface CreditTransaction {
  id: number
  type: string
  amount: number
  description: string
  timestamp: string
  status: string
}

export default function CreditDisplay() {
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCreditData()
  }, [])

  const fetchCreditData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch credit balance and transactions using apiClient
      const [balance, transactions] = await Promise.all([
        apiClient.getCreditsBalance().catch(() => ({
          total_credits: 1000,
          used_credits: 0,
          available_credits: 1000,
          usage_percentage: 0
        })),
        apiClient.getCreditTransactions(5).catch(() => [])
      ])
      
      setCreditBalance(balance)
      setTransactions(transactions)
    } catch (error) {
      console.error('Error fetching credit data:', error)
      setError('Failed to load credit information')
      // Set default values on error
      setCreditBalance({
        total_credits: 1000,
        used_credits: 0,
        available_credits: 1000,
        usage_percentage: 0
      })
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'usage':
        return <ArrowDownIcon className="w-4 h-4 text-red-500" />
      case 'purchase':
      case 'bonus':
        return <ArrowUpIcon className="w-4 h-4 text-green-500" />
      default:
        return <CreditCardIcon className="w-4 h-4 text-gray-500" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'usage':
        return 'text-red-600'
      case 'purchase':
      case 'bonus':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (!creditBalance) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-500">Unable to load credit information</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Credit Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Credit Balance</h3>
          <CreditCardIcon className="w-6 h-6 text-blue-500" />
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{creditBalance.available_credits.toFixed(1)}</p>
            <p className="text-sm text-gray-500">Available</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">{creditBalance.used_credits.toFixed(1)}</p>
            <p className="text-sm text-gray-500">Used</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{creditBalance.total_credits.toFixed(1)}</p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
        </div>
        
        {/* Usage Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Usage</span>
            <span>{creditBalance.usage_percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${creditBalance.usage_percentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
        
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No transactions yet</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  {getTransactionIcon(transaction.type)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${getTransactionColor(transaction.type)}`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(1)} credits
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(transaction.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
} 