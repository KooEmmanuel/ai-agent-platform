'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeftIcon,
  Cog6ToothIcon,
  BookOpenIcon,
  CodeBracketIcon,
  KeyIcon,
  CloudIcon,
  CommandLineIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { TOOL_DOCS, getCategoryIcon, type ToolDoc } from '../../../../../lib/toolDocs' 

// Same mapping function as in the agent tools page
const getToolTechnicalName = (displayName: string): string => {
  const nameMap: Record<string, string> = {
    // Search Tools
    'Web Search': 'web_search',
    'News Search': 'news_search',
    'Reddit Content Discovery': 'reddit_tool',
    'RSS Feed Reader': 'rss_feed_tool',
    'Telegram Content Discovery': 'telegram_tool',
    
    // Data Tools  
    'Weather API': 'weather_api',
    'CSV Processor': 'csv_processor',
    'Database Query': 'database_query', 
    'Data Scraper': 'data_scraper',
    'File Processor': 'file_processor',
    'Image Processor': 'image_processor',
    'PDF Processor': 'pdf_processor',
    'Text Analyzer': 'text_analyzer',
    'Translation Service': 'translation_service',
    'Data Visualization': 'data_visualization',
    'Statistical Analysis': 'statistical_analysis',
    
    // Scheduling Tools
    'Calendar Manager': 'calendar_manager',
    'Reminder Tool': 'reminder_tool',
    'Date Calculator': 'date_calculator',
    
    // Communication Tools
    'Email Sender': 'email_sender',
    'Email': 'email_sender',
    'Slack Integration': 'slack_integration',
    'Slack': 'slack_integration',
    'Notification Service': 'notification_service',
    'Social Media': 'social_media',
    
    // Common variations/shortened names
    'Weather': 'weather_api',
    'weather': 'weather_api',
    
    // Integration Tools
    'Google Sheets Integration': 'google_sheets_integration',
    'Payment Processor': 'payment_processor',
    'Webhook Handler': 'webhook_handler',
    'Zapier Webhook': 'zapier_webhook'
  }
  
  if (nameMap[displayName]) {
    return nameMap[displayName]
  }
  
  if (displayName.includes('_') && !displayName.includes(' ')) {
    return displayName
  }
  
  const technicalNames = [
    'web_search', 'news_search', 'weather_api', 'csv_processor', 'database_query',
    'data_scraper', 'file_processor', 'image_processor', 'pdf_processor', 
    'text_analyzer', 'translation_service', 'data_visualization', 'statistical_analysis',
    'calendar_manager', 'reminder_tool', 'date_calculator', 'email_sender',
    'slack_integration', 'notification_service', 'social_media', 
    'google_sheets_integration', 'payment_processor', 'webhook_handler', 'zapier_webhook'
  ]
  
  const convertedName = displayName.toLowerCase().replace(/\s+/g, '_')
  if (technicalNames.includes(convertedName)) {
    return convertedName
  }
  
  let technicalName = displayName.toLowerCase().replace(/\s+/g, '_')
  if (technicalName.endsWith('_tool')) {
    technicalName = technicalName.slice(0, -5)
  }
  
  return technicalName
}

export default function ToolDocumentationPage() {
  const params = useParams()
  const router = useRouter()
  const toolName = params.toolName as string
  const [tool, setTool] = useState<ToolDoc | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (toolName) {
      // Convert the URL parameter to the correct technical name
      const technicalName = getToolTechnicalName(toolName)
      if (TOOL_DOCS[technicalName as keyof typeof TOOL_DOCS]) {
        setTool(TOOL_DOCS[technicalName as keyof typeof TOOL_DOCS])
      }
      setLoading(false)
    }
  }, [toolName])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Loading Tool Documentation</h1>
          <p className="text-gray-600">Please wait while we load the documentation...</p>
        </div>
      </div>
    )
  }

  if (!tool) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tool Not Found</h1>
          <p className="text-gray-600 mb-2">The requested tool documentation could not be found.</p>
          <p className="text-sm text-gray-500 mb-6">Tool name: {toolName}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }



  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'API': return <CloudIcon className="w-5 h-5" />
      case 'Function': return <CommandLineIcon className="w-5 h-5" />
      case 'Webhook': return <CodeBracketIcon className="w-5 h-5" />
      default: return <WrenchScrewdriverIcon className="w-5 h-5" />
    }
  }

  const getConfigIcon = (type: string) => {
    switch (type) {
      case 'API Key': return <KeyIcon className="w-4 h-4 text-blue-500" />
      case 'Password': return <KeyIcon className="w-4 h-4 text-red-500" />
      case 'File Path': return <DocumentTextIcon className="w-4 h-4 text-green-500" />
      case 'URL': return <CloudIcon className="w-4 h-4 text-purple-500" />
      default: return <Cog6ToothIcon className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Back
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{tool.icon}</div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{tool.name}</h1>
                  <p className="text-sm text-gray-600">{tool.description}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {getCategoryIcon(tool.category)} {tool.category}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {getTypeIcon(tool.toolType)}
                <span className="ml-1">{tool.toolType}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <div className="flex items-center space-x-2 mb-4">
              <BookOpenIcon className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">{tool.overview}</p>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Key Features</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tool.features.map((feature: string, index: number) => (
                <div key={index} className="flex items-start space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Use Cases */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <div className="flex items-center space-x-2 mb-4">
              <WrenchScrewdriverIcon className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">Use Cases</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tool.useCases.map((useCase: string, index: number) => (
                <div key={index} className="bg-purple-50 rounded-lg p-3">
                  <p className="text-purple-900 font-medium">{useCase}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Configuration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <div className="flex items-center space-x-2 mb-4">
              <Cog6ToothIcon className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Configuration Fields</h2>
            </div>
            <div className="space-y-4">
              {tool.configuration.map((config: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getConfigIcon(config.type)}
                      <h3 className="font-medium text-gray-900">{config.field}</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      {config.required ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          Optional
                        </span>
                      )}
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {config.type}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">{config.description}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Setup Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <div className="flex items-center space-x-2 mb-4">
              <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">Setup Steps</h2>
            </div>
            <div className="space-y-3">
              {tool.setupSteps.map((step: string, index: number) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-sm font-medium">{index + 1}</span>
                  </div>
                  <p className="text-gray-700">{step}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}