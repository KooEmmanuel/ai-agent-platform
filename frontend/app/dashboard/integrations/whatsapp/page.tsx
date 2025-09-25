'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClipboardIcon,
  EyeIcon,
  EyeSlashIcon,
  PhoneIcon,
  KeyIcon,
  GlobeAltIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { apiClient } from '../../../../lib/api'

interface Agent {
  id: number
  name: string
  description?: string
  is_active: boolean
}

interface WhatsAppConfig {
  phone_number_id: string
  access_token: string
  verify_token: string
  business_account_id: string
  webhook_url: string
}

export default function WhatsAppIntegrationPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null)
  const [config, setConfig] = useState<WhatsAppConfig>({
    phone_number_id: '',
    access_token: '',
    verify_token: '',
    business_account_id: '',
    webhook_url: ''
  })
  const [showTokens, setShowTokens] = useState({
    access_token: false,
    verify_token: false
  })
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [webhookUrl, setWebhookUrl] = useState('')

  useEffect(() => {
    fetchAgents()
    generateWebhookUrl()
  }, [])

  const fetchAgents = async () => {
    try {
      const agentsData = await apiClient.getAgents()
      setAgents(agentsData.filter((agent: Agent) => agent.is_active))
    } catch (error) {
      console.error('Error fetching agents:', error)
    }
  }

  const generateWebhookUrl = () => {
    const baseUrl = window.location.origin.replace('localhost:3000', 'localhost:8000')
    const url = `${baseUrl}/api/v1/whatsapp/webhook`
    setWebhookUrl(url)
    setConfig(prev => ({ ...prev, webhook_url: url }))
  }

  const generateVerifyToken = () => {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    setConfig(prev => ({ ...prev, verify_token: token }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAgent) return

    setLoading(true)
    try {
      await apiClient.createIntegration({
        agent_id: selectedAgent,
        platform: 'whatsapp',
        config: config
      })
      
      router.push('/dashboard/integrations?success=whatsapp')
    } catch (error) {
      console.error('Error creating integration:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Integration</h1>
          <p className="text-gray-600">Connect your AI agent to WhatsApp Business</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6">
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= stepNum 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step > stepNum ? <CheckCircleIcon className="w-5 h-5" /> : stepNum}
              </div>
              {stepNum < 4 && (
                <div className={`w-16 h-1 mx-2 ${
                  step > stepNum ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {step === 1 && "Select Agent"}
            {step === 2 && "WhatsApp Business Setup"}
            {step === 3 && "Configure Webhook"}
            {step === 4 && "Test Connection"}
          </h3>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Agent */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose an Agent</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedAgent === agent.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedAgent(agent.id)}
                >
                  <div className="flex items-center space-x-3">
                    <CpuChipIcon className="w-8 h-8 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">{agent.name}</h4>
                      <p className="text-sm text-gray-600">{agent.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!selectedAgent}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: WhatsApp Business Configuration */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">WhatsApp Business API Credentials</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <PhoneIcon className="w-4 h-4 inline mr-1" />
                  Phone Number ID
                </label>
                <input
                  type="text"
                  value={config.phone_number_id}
                  onChange={(e) => setConfig(prev => ({ ...prev, phone_number_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your WhatsApp Phone Number ID"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <KeyIcon className="w-4 h-4 inline mr-1" />
                  Access Token
                </label>
                <div className="relative">
                  <input
                    type={showTokens.access_token ? "text" : "password"}
                    value={config.access_token}
                    onChange={(e) => setConfig(prev => ({ ...prev, access_token: e.target.value }))}
                    className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your WhatsApp Access Token"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
                    <button
                      type="button"
                      onClick={() => setShowTokens(prev => ({ ...prev, access_token: !prev.access_token }))}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {showTokens.access_token ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(config.access_token)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ClipboardIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Account ID
                </label>
                <input
                  type="text"
                  value={config.business_account_id}
                  onChange={(e) => setConfig(prev => ({ ...prev, business_account_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your WhatsApp Business Account ID"
                  required
                />
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!config.phone_number_id || !config.access_token || !config.business_account_id}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Webhook Configuration */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Webhook Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <GlobeAltIcon className="w-4 h-4 inline mr-1" />
                  Webhook URL
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={webhookUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(webhookUrl)}
                    className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 transition-colors"
                  >
                    <ClipboardIcon className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Copy this URL to your WhatsApp Business API webhook configuration</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <KeyIcon className="w-4 h-4 inline mr-1" />
                  Verify Token
                </label>
                <div className="flex">
                  <input
                    type={showTokens.verify_token ? "text" : "password"}
                    value={config.verify_token}
                    onChange={(e) => setConfig(prev => ({ ...prev, verify_token: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Generate or enter verify token"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowTokens(prev => ({ ...prev, verify_token: !prev.verify_token }))}
                    className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 hover:bg-gray-200 transition-colors"
                  >
                    {showTokens.verify_token ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={generateVerifyToken}
                    className="px-3 py-2 bg-blue-100 border border-l-0 border-gray-300 rounded-r-lg text-blue-600 hover:bg-blue-200 transition-colors text-sm"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
              <div className="flex">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Setup Instructions</h4>
                  <div className="text-sm text-yellow-700 mt-1">
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Go to your WhatsApp Business API configuration</li>
                      <li>Add the webhook URL above</li>
                      <li>Use the verify token for webhook verification</li>
                      <li>Subscribe to message events</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                disabled={!config.verify_token}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Test & Complete */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Integration</h3>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-green-800">Ready to Connect</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Your WhatsApp integration is configured and ready to be created.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Agent:</span>
                <span className="font-medium">{agents.find(a => a.id === selectedAgent)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone Number ID:</span>
                <span className="font-mono text-xs">{config.phone_number_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Webhook URL:</span>
                <span className="font-mono text-xs">{webhookUrl}</span>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </motion.div>
        )}
      </form>
    </div>
  )
}