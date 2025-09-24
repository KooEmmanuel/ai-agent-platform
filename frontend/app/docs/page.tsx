'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Navbar from '../../components/ui/Navbar'
import {
  BookOpenIcon,
  CodeBracketIcon,
  CommandLineIcon,
  CpuChipIcon,
  WrenchScrewdriverIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  LightBulbIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { auth } from '../../lib/firebase'

const sections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: SparklesIcon,
    items: [
      { title: 'Quick Start Guide', href: '#quick-start', description: 'Get up and running in 5 minutes' },
      { title: 'Creating Your First Agent', href: '#first-agent', description: 'Step-by-step guide to creating an AI agent' },
      { title: 'Adding Tools to Agents', href: '#adding-tools', description: 'Learn how to enhance your agents with tools' },
      { title: 'Testing in Playground', href: '#playground', description: 'Test and debug your agents before deployment' }
    ]
  },
  {
    id: 'agents',
    title: 'Agents',
    icon: CpuChipIcon,
    items: [
      { title: 'Agent Configuration', href: '#agent-config', description: 'Configure agent behavior and capabilities' },
      { title: 'Model Selection', href: '#models', description: 'Choose the right AI model for your use case' },
      { title: 'Instructions & Context', href: '#instructions', description: 'Write effective agent instructions' },
      { title: 'Tool Integration', href: '#tool-integration', description: 'Integrate tools with your agents' }
    ]
  },
  {
    id: 'tools',
    title: 'Tools',
    icon: WrenchScrewdriverIcon,
    items: [
      { title: 'Available Tools', href: '#available-tools', description: 'Browse the marketplace of available tools' },
      { title: 'Tool Configuration', href: '#tool-config', description: 'Configure tool parameters and settings' },
      { title: 'Creating Custom Tools', href: '#custom-tools', description: 'Build your own custom tools' },
      { title: 'Tool Categories', href: '#tool-categories', description: 'Understanding different tool types' }
    ]
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: ChatBubbleLeftRightIcon,
    items: [
      { title: 'Platform Integrations', href: '#platforms', description: 'Connect to external platforms and services' },
      { title: 'Webhook Setup', href: '#webhooks', description: 'Set up webhooks for real-time communication' },
      { title: 'API Configuration', href: '#api-config', description: 'Configure API keys and authentication' }
    ]
  },
  {
    id: 'api',
    title: 'API Reference',
    icon: CodeBracketIcon,
    items: [
      { title: 'Authentication', href: '#auth', description: 'API authentication and authorization' },
      { title: 'Agents API', href: '#agents-api', description: 'Manage agents programmatically' },
      { title: 'Tools API', href: '#tools-api', description: 'Access and manage tools via API' },
      { title: 'Playground API', href: '#playground-api', description: 'Execute agents via API' }
    ]
  },
  {
    id: 'examples',
    title: 'Examples & Tutorials',
    icon: LightBulbIcon,
    items: [
      { title: 'Customer Support Agent', href: '#support-agent', description: 'Build a customer support chatbot' },
      { title: 'Data Analysis Agent', href: '#data-agent', description: 'Create an agent for data analysis' },
      { title: 'Content Creation Agent', href: '#content-agent', description: 'Build a content generation agent' },
      { title: 'Integration Examples', href: '#integration-examples', description: 'Real-world integration examples' }
    ]
  }
]

export default function DocumentationPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('getting-started')

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage="docs" />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="flex items-center space-x-3">
    
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Documentation</h1>
                <p className="text-gray-600 mt-1">Learn how to build and deploy AI agents with Drixai</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <nav className="space-y-2">
                {sections.map((section) => (
                  <div key={section.id} className="space-y-1">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="flex items-center justify-between w-full px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <section.icon className="w-4 h-4" />
                        <span>{section.title}</span>
                      </div>
                      {expandedSection === section.id ? (
                        <ChevronDownIcon className="w-4 h-4" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4" />
                      )}
                    </button>
                    {expandedSection === section.id && (
                      <div className="ml-6 space-y-1">
                        {section.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            {item.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              {/* Quick Start Section */}
              <section id="quick-start" className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Start Guide</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-600 mb-6">
                    Get started with Drixai in just a few minutes. This guide will walk you through creating your first AI agent.
                  </p>
                  
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Prerequisites</h3>
                    <ul className="space-y-2 text-gray-600">
                      <li>• A Drixai account (sign up for free)</li>
                      <li>• Basic understanding of AI and automation concepts</li>
                      <li>• API keys for any external services you want to integrate</li>
                    </ul>
                  </div>

                  <div className="space-y-6">
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 1: Create Your First Agent</h3>
                      <p className="text-gray-600 mb-3">
                        Navigate to the Agents page and click "Create Agent". Give your agent a name and description.
                      </p>
                      <Link
                        href="/dashboard/agents/create"
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Create Agent <ArrowRightIcon className="w-4 h-4 ml-1" />
                      </Link>
                    </div>

                    <div className="border-l-4 border-green-500 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 2: Add Tools</h3>
                      <p className="text-gray-600 mb-3">
                        Browse the marketplace and add tools to enhance your agent's capabilities.
                      </p>
                      <Link
                        href="/dashboard/tools"
                        className="inline-flex items-center text-green-600 hover:text-green-700 font-medium"
                      >
                        Browse Tools <ArrowRightIcon className="w-4 h-4 ml-1" />
                      </Link>
                    </div>

                    <div className="border-l-4 border-purple-500 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 3: Test in Playground</h3>
                      <p className="text-gray-600 mb-3">
                        Use the playground to test your agent and see how it responds to different inputs.
                      </p>
                      <Link
                        href="/dashboard/playground"
                        className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium"
                      >
                        Open Playground <ArrowRightIcon className="w-4 h-4 ml-1" />
                      </Link>
                    </div>

                    <div className="border-l-4 border-orange-500 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 4: Deploy & Integrate</h3>
                      <p className="text-gray-600 mb-3">
                        Set up integrations to connect your agent to external platforms and services.
                      </p>
                      <Link
                        href="/dashboard/integrations"
                        className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium"
                      >
                        Set Up Integrations <ArrowRightIcon className="w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                </div>
              </section>

              {/* Agent Configuration Section */}
              <section id="agent-config" className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Agent Configuration</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-600 mb-6">
                    Learn how to configure your agents for optimal performance and behavior.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Model Selection</h3>
                      <p className="text-gray-600 mb-3">
                        Choose from various AI models based on your use case and requirements.
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• GPT-4: Best for complex reasoning</li>
                        <li>• GPT-3.5: Good balance of speed and capability</li>
                        <li>• Claude: Excellent for analysis and writing</li>
                      </ul>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Instructions</h3>
                      <p className="text-gray-600 mb-3">
                        Write clear, specific instructions to guide your agent's behavior.
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Be specific about the agent's role</li>
                        <li>• Define expected outputs and formats</li>
                        <li>• Include examples when possible</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Tools Section */}
              <section id="available-tools" className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Tools</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-600 mb-6">
                    Drixai provides a comprehensive marketplace of tools to enhance your agents' capabilities.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { name: 'Search Tools', count: 2, description: 'Web search and news search capabilities' },
                      { name: 'Data Tools', count: 5, description: 'CSV processing, visualization, and analysis' },
                      { name: 'Communication', count: 3, description: 'Email, Slack, and notification services' },
                      { name: 'File Processing', count: 3, description: 'PDF, image, and file processing tools' },
                      { name: 'Integrations', count: 4, description: 'Google Sheets, Zapier, and webhook tools' },
                      { name: 'Analysis', count: 2, description: 'Text analysis and statistical analysis tools' }
                    ].map((category) => (
                      <div key={category.name} className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">{category.count} tools</span>
                          <Link
                            href="/dashboard/tools"
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Browse →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* API Reference Section */}
              <section id="auth" className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">API Reference</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-600 mb-6">
                    Integrate Drixai into your applications using our REST API.
                  </p>

                  <div className="bg-gray-900 rounded-lg p-6 text-white">
                    <h3 className="text-lg font-semibold mb-4">Authentication</h3>
                    <p className="text-gray-300 mb-4">
                      All API requests require authentication using Bearer tokens.
                    </p>
                    <div className="bg-gray-800 rounded p-4 font-mono text-sm">
                      <div className="text-green-400">Authorization: Bearer YOUR_TOKEN</div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Base URL</h4>
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">https://api.drixai.com/api/v1</code>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Rate Limits</h4>
                      <p className="text-gray-600 text-sm">
                        API requests are limited based on your plan. Check your usage in the dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Help Section */}
              <section className="mb-12">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
                  <div className="text-center">
                    <QuestionMarkCircleIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Need Help?</h2>
                    <p className="text-gray-600 mb-6">
                      Can't find what you're looking for? Our support team is here to help.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link
                        href="/dashboard/settings"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Contact Support
                      </Link>
                      <Link
                        href="/dashboard/playground"
                        className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Try Playground
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 