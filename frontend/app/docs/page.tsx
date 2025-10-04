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
      { title: 'Creating Your First Agent', href: '#first-agent', description: 'Step-by-step guide to creating an AI assistant' },
      { title: 'Adding Capabilities', href: '#adding-tools', description: 'Learn how to enhance your assistants with capabilities' },
      { title: 'Testing Your Assistant', href: '#playground', description: 'Test your assistant before going live' }
    ]
  },
  {
    id: 'agents',
    title: 'Agents',
    icon: CpuChipIcon,
    items: [
      { title: 'Assistant Configuration', href: '#agent-config', description: 'Configure your assistant behavior and capabilities' },
      { title: 'AI Model Selection', href: '#models', description: 'Choose the right AI model for your needs' },
      { title: 'Instructions & Context', href: '#instructions', description: 'Write clear instructions for your assistant' },
      { title: 'Adding Capabilities', href: '#tool-integration', description: 'Add capabilities to your assistants' }
    ]
  },
  {
    id: 'tools',
    title: 'Tools',
    icon: WrenchScrewdriverIcon,
    items: [
      { title: 'Available Capabilities', href: '#available-tools', description: 'Explore the marketplace of available capabilities' },
      { title: 'Capability Configuration', href: '#tool-config', description: 'Configure capability parameters and settings' },
      { title: 'Creating Custom Capabilities', href: '#custom-tools', description: 'Build your own custom capabilities' },
      { title: 'Capability Categories', href: '#tool-categories', description: 'Understanding different capability types' }
    ]
  },
  {
    id: 'integrations',
    title: 'Integrations',
    icon: ChatBubbleLeftRightIcon,
    items: [
      { title: 'Platform Connections', href: '#platforms', description: 'Connect to external platforms and services' },
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
      { title: 'Customer Support Assistant', href: '#support-agent', description: 'Build a customer support assistant' },
      { title: 'Data Analysis Assistant', href: '#data-agent', description: 'Create an assistant for data analysis' },
      { title: 'Content Creation Assistant', href: '#content-agent', description: 'Build a content generation assistant' },
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
      <div className="bg-white pt-20">
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
                      className="flex items-center justify-between w-full px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
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
                            className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
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
            <div className="bg-white p-8">
              {/* Quick Start Section */}
              <section id="quick-start" className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Start Guide</h2>
                <div className="prose prose-gray max-w-none">
                    <p className="text-gray-600 mb-6">
                    Get started with Drixai in just a few minutes. This guide will walk you through creating your first AI assistant.
                  </p>
                  
                  <div className="bg-gray-50 p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Prerequisites</h3>
                    <ul className="space-y-2 text-gray-600">
                      <li>• A Drixai account (sign up for free)</li>
                      <li>• Basic understanding of AI assistants and automation</li>
                      <li>• Account access to any external services you want to connect</li>
                    </ul>
                  </div>

                  <div className="space-y-6">
                    <div className="border-l-4 border-blue-500 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 1: Create Your First Assistant</h3>
                      <p className="text-gray-600 mb-3">
                        Sign up for Drixai and create your first AI assistant. Give it a name and describe what you want it to help you with.
                      </p>
                      <Link
                        href="/auth/register"
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Get Started Free <ArrowRightIcon className="w-4 h-4 ml-1" />
                      </Link>
                    </div>

                    <div className="border-l-4 border-green-500 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 2: Add Capabilities</h3>
                      <p className="text-gray-600 mb-3">
                        Choose from our marketplace of capabilities to enhance your assistant's functionality.
                      </p>
                      <p className="text-sm text-gray-500">
                        Available after signing up - includes web search, email, file processing, and more.
                      </p>
                    </div>

                    <div className="border-l-4 border-purple-500 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 3: Test Your Assistant</h3>
                      <p className="text-gray-600 mb-3">
                        Use our testing environment to see how your assistant responds to different questions and tasks.
                      </p>
                      <p className="text-sm text-gray-500">
                        Available after signing up - test your assistant before going live.
                      </p>
                    </div>

                    <div className="border-l-4 border-orange-500 pl-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 4: Deploy & Connect</h3>
                      <p className="text-gray-600 mb-3">
                        Connect your assistant to websites, WhatsApp, Telegram, and other platforms.
                      </p>
                      <p className="text-sm text-gray-500">
                        Available after signing up - deploy your assistant to help your customers.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Agent Configuration Section */}
              <section id="agent-config" className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Assistant Configuration</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-600 mb-6">
                    Learn how to configure your assistants for optimal performance and behavior.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50  p-6">
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

                    <div className="bg-gray-50  p-6">
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
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Capabilities</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-600 mb-6">
                    Drixai provides a comprehensive marketplace of capabilities to enhance your assistants' functionality.
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
                      <div key={category.name} className="bg-gray-50  p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">{category.count} capabilities</span>
                          <span className="text-sm text-gray-400">
                            Available after signup
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* API Reference Section */}
              <section id="auth" className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">API Access</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-600 mb-6">
                    Connect Drixai to your applications using our REST API.
                  </p>

                  <div className="bg-gray-900  p-6 text-white">
                    <h3 className="text-lg font-semibold mb-4">Authentication</h3>
                    <p className="text-gray-300 mb-4">
                      All API requests require authentication using your API key.
                    </p>
                    <div className="bg-gray-800 p-4 font-mono text-sm">
                      <div className="text-green-400">Authorization: Bearer YOUR_API_KEY</div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="border border-gray-200  p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Base URL</h4>
                      <code className="bg-gray-100 px-2 py-1 text-sm">https://api.drixai.com/api/v1</code>
                    </div>

                    <div className="border border-gray-200  p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Usage Limits</h4>
                      <p className="text-gray-600 text-sm">
                        API requests are limited based on your plan. Check your usage in your account dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Help Section */}
              <section className="mb-12">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-8">
                  <div className="text-center">
                    <QuestionMarkCircleIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Need Help?</h2>
                    <p className="text-gray-600 mb-6">
                      Can't find what you're looking for? Our support team is here to help.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link
                        href="/contact"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white  hover:bg-blue-700 transition-colors"
                      >
                        Contact Support
                      </Link>
                      <Link
                        href="/auth/register"
                        className="inline-flex items-center px-4 py-2 bg-gray-600 text-white  hover:bg-gray-700 transition-colors"
                      >
                        Get Started Free
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