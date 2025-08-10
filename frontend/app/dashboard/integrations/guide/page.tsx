'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClipboardDocumentIcon,
  CogIcon,
  LinkIcon,
  PlayIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

const steps = [
  {
    id: 1,
    title: 'Choose Your Platform',
    description: 'Select the platform you want to integrate with your AI agent',
    details: [
      'WhatsApp Business API for messaging',
      'Telegram Bot API for Telegram integration',
      'Email SMTP for email communications',
      'Web Widget for website embedding'
    ],
    icon: <CogIcon className="w-6 h-6" />
  },
  {
    id: 2,
    title: 'Select Your Agent',
    description: 'Choose which AI agent will handle the integration',
    details: [
      'Only active agents are available for integration',
      'Each agent can have multiple integrations',
      'Agents must be properly configured with tools',
      'Consider the agent\'s purpose and capabilities'
    ],
    icon: <CheckCircleIcon className="w-6 h-6" />
  },
  {
    id: 3,
    title: 'Configure Platform Settings',
    description: 'Enter the required credentials and configuration',
    details: [
      'API tokens and access keys',
      'Webhook URLs for real-time communication',
      'Platform-specific identifiers',
      'Optional configuration parameters'
    ],
    icon: <LinkIcon className="w-6 h-6" />
  },
  {
    id: 4,
    title: 'Test & Deploy',
    description: 'Verify the integration works and activate it',
    details: [
      'Test the connection with a sample message',
      'Verify webhook delivery',
      'Monitor integration health',
      'Activate for production use'
    ],
    icon: <PlayIcon className="w-6 h-6" />
  }
]

const platformGuides = [
  {
    platform: 'WhatsApp',
    requirements: [
      'WhatsApp Business Account',
      'Meta Developer Account',
      'Verified Business Profile',
      'SSL Certificate for webhooks'
    ],
    steps: [
      'Create a Meta Developer App',
      'Add WhatsApp Business API product',
      'Get Access Token and Phone Number ID',
      'Configure webhook URL in Meta dashboard',
      'Test with WhatsApp Business API'
    ],
    tips: [
      'Use permanent tokens for production',
      'Verify your business for higher limits',
      'Test with sandbox numbers first',
      'Monitor message delivery status'
    ]
  },
  {
    platform: 'Telegram',
    requirements: [
      'Telegram account',
      'BotFather access',
      'Bot token from BotFather',
      'Optional: Domain for webhook'
    ],
    steps: [
      'Message @BotFather on Telegram',
      'Create new bot with /newbot command',
      'Get bot token from BotFather',
      'Set webhook URL (optional)',
      'Test bot functionality'
    ],
    tips: [
      'Choose a memorable bot username',
      'Set bot description and commands',
      'Use webhook for better performance',
      'Handle different message types'
    ]
  },
  {
    platform: 'Email',
    requirements: [
      'Email service provider',
      'SMTP server access',
      'Email credentials',
      'Proper DNS configuration'
    ],
    steps: [
      'Set up email account or service',
      'Get SMTP server details',
      'Configure authentication',
      'Test email sending',
      'Set up email parsing (optional)'
    ],
    tips: [
      'Use dedicated email for bot',
      'Configure SPF and DKIM records',
      'Monitor email delivery rates',
      'Handle bounce and spam reports'
    ]
  }
]

export default function IntegrationGuidePage() {
  const [activeGuide, setActiveGuide] = useState('WhatsApp')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard/integrations"
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integration Guide</h1>
          <p className="text-gray-600">Learn how to connect your AI agents to external platforms</p>
        </div>
      </div>

      {/* Quick Start */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-[0_4px_20px_rgba(59,130,246,0.1)] rounded-xl p-6"
      >
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="w-6 h-6 text-blue-500 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Start</h3>
            <p className="text-gray-600 mb-4">
              Integrations allow your AI agents to communicate through external platforms like WhatsApp, 
              Telegram, Email, and Web Widgets. Follow the steps below to set up your first integration.
            </p>
            <Link
              href="/dashboard/integrations/create"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-[0_4px_20px_rgba(59,130,246,0.2)] transition-all"
            >
              <PlayIcon className="w-4 h-4 mr-2" />
              Create
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Step-by-Step Process */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white shadow-[0_4px_20px_rgba(59,130,246,0.1)] rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Integration Process</h3>
        
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  {step.icon}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-blue-600">Step {step.id}</span>
                  <h4 className="text-lg font-semibold text-gray-900">{step.title}</h4>
                </div>
                <p className="text-gray-600 mb-3">{step.description}</p>
                <ul className="space-y-1">
                  {step.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start space-x-2 text-sm text-gray-500">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-shrink-0 w-px bg-gray-200 ml-5"></div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Platform-Specific Guides */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white shadow-[0_4px_20px_rgba(59,130,246,0.1)] rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Platform-Specific Setup</h3>
        
        {/* Platform Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          {platformGuides.map((guide) => (
            <button
              key={guide.platform}
              onClick={() => setActiveGuide(guide.platform)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeGuide === guide.platform
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {guide.platform}
            </button>
          ))}
        </div>

        {/* Active Guide Content */}
        {platformGuides
          .filter(guide => guide.platform === activeGuide)
          .map((guide) => (
            <div key={guide.platform} className="space-y-6">
              {/* Requirements */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Requirements</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {guide.requirements.map((req, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <CheckCircleIcon className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-600">{req}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Setup Steps */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Setup Steps</h4>
                <ol className="space-y-2">
                  {guide.steps.map((step, idx) => (
                    <li key={idx} className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-gray-600">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Tips */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Pro Tips</h4>
                <div className="space-y-2">
                  {guide.tips.map((tip, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
      </motion.div>

      {/* Troubleshooting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white shadow-[0_4px_20px_rgba(59,130,246,0.1)] rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Issues</h3>
        
        <div className="space-y-4">
          <div className="bg-red-50 rounded-lg p-4">
            <h4 className="font-medium text-red-900 mb-2">Webhook not receiving messages</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Verify webhook URL is publicly accessible</li>
              <li>• Check SSL certificate is valid</li>
              <li>• Ensure webhook verification token matches</li>
              <li>• Check firewall and port settings</li>
            </ul>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">Authentication errors</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Double-check API tokens and credentials</li>
              <li>• Verify token hasn't expired</li>
              <li>• Ensure proper permissions are granted</li>
              <li>• Check rate limiting and quotas</li>
            </ul>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Message delivery issues</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Check recipient has opted in to receive messages</li>
              <li>• Verify message format and content</li>
              <li>• Monitor delivery status and error logs</li>
              <li>• Test with different message types</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Next Steps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6"
      >
        <div className="flex items-center space-x-3 mb-4">
          <ClipboardDocumentIcon className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Ready to Start?</h3>
        </div>
        
        <p className="text-gray-600 mb-4">
          Now that you understand how integrations work, you can create your first integration 
          and start connecting your AI agents to external platforms.
        </p>
        
        <div className="flex space-x-4">
          <Link
            href="/dashboard/integrations/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-[0_4px_20px_rgba(59,130,246,0.2)] transition-all"
          >
            Create
          </Link>
          <Link
            href="/dashboard/integrations"
            className="inline-flex items-center px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 shadow-[0_2px_10px_rgba(59,130,246,0.1)] transition-all"
          >
            View Integrations
          </Link>
        </div>
      </motion.div>
    </div>
  )
}