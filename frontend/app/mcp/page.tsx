'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  GlobeAltIcon,
  CodeBracketIcon,
  CommandLineIcon,
  CpuChipIcon,
  WrenchScrewdriverIcon,
  SparklesIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  PlayIcon,
  ArrowDownTrayIcon,  
  ServerIcon,
  KeyIcon
} from '@heroicons/react/24/outline'

const features = [
  {
    title: 'Seamless Integration',
    description: 'Connect Drixai to any MCP-compatible client or application',
    icon: GlobeAltIcon,
    color: 'text-blue-600'
  },
  {
    title: 'Real-time Communication',
    description: 'Enable real-time communication between your applications and AI agents',
    icon: ServerIcon,
    color: 'text-green-600'
  },
  {
    title: 'Tool Access',
    description: 'Access all Drixai tools and capabilities through MCP',
    icon: WrenchScrewdriverIcon,
    color: 'text-purple-600'
  },
  {
    title: 'Secure Authentication',
    description: 'Secure API key-based authentication for all MCP connections',
    icon: KeyIcon,
    color: 'text-orange-600'
  }
]

const setupSteps = [
  {
    step: 1,
    title: 'Install MCP Client',
    description: 'Install an MCP-compatible client like Claude Desktop or your preferred application',
    code: 'npm install -g @modelcontextprotocol/client',
    icon: ArrowDownTrayIcon
  },
  {
    step: 2,
    title: 'Configure Drixai MCP',
    description: 'Set up the Drixai MCP server with your API credentials',
    code: 'drixai-mcp --api-key YOUR_API_KEY --server-port 3001',
    icon: ServerIcon
  },
  {
    step: 3,
    title: 'Connect Your Client',
    description: 'Configure your MCP client to connect to the Drixai server',
    code: 'mcp://localhost:3001',
    icon: GlobeAltIcon
  },
  {
    step: 4,
    title: 'Start Using Agents',
    description: 'Access your Drixai agents and tools directly from your MCP client',
    code: '/agents list',
    icon: PlayIcon
  }
]

const commands = [
  {
    command: '/agents list',
    description: 'List all available agents',
    example: 'Show me all my agents'
  },
  {
    command: '/agents create',
    description: 'Create a new agent',
    example: 'Create a customer support agent'
  },
  {
    command: '/tools list',
    description: 'List available tools',
    example: 'What tools do I have access to?'
  },
  {
    command: '/playground chat',
    description: 'Chat with an agent',
    example: 'Chat with my data analysis agent'
  },
  {
    command: '/integrations list',
    description: 'List integrations',
    example: 'Show my platform integrations'
  }
]

export default function MCPPage() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <GlobeAltIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Drixai MCP</h1>
                <p className="text-gray-600 mt-1">Model Context Protocol integration for seamless AI agent access</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'setup', name: 'Setup Guide' },
              { id: 'commands', name: 'Commands' },
              { id: 'examples', name: 'Examples' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
              <div className="max-w-3xl">
                <h2 className="text-3xl font-bold mb-4">
                  Connect Drixai to Any MCP-Compatible Application
                </h2>
                <p className="text-xl text-blue-100 mb-6">
                  Access your AI agents, tools, and integrations directly from Claude Desktop, 
                  ChatGPT, or any other MCP-compatible client.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="#setup"
                    onClick={() => setActiveTab('setup')}
                    className="inline-flex items-center px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Get Started <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </Link>
                  <Link
                    href="/docs"
                    className="inline-flex items-center px-6 py-3 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors"
                  >
                    View Documentation
                  </Link>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => (
                <div key={feature.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <feature.icon className={`w-8 h-8 ${feature.color} mb-4`} />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* How it Works */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">How It Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CpuChipIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">1. MCP Client</h3>
                  <p className="text-gray-600 text-sm">
                    Use any MCP-compatible client like Claude Desktop or ChatGPT
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ServerIcon className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Drixai MCP</h3>
                  <p className="text-gray-600 text-sm">
                    Drixai MCP server bridges your client and AI agents
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <SparklesIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">3. AI Agents</h3>
                  <p className="text-gray-600 text-sm">
                    Access your agents, tools, and integrations seamlessly
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Setup Tab */}
        {activeTab === 'setup' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Setup Guide</h2>
              
              <div className="space-y-8">
                {setupSteps.map((step) => (
                  <div key={step.step} className="flex space-x-6">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <step.icon className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-sm font-medium text-blue-600">Step {step.step}</span>
                        <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                      </div>
                      <p className="text-gray-600 mb-4">{step.description}</p>
                      <div className="bg-gray-900 rounded-lg p-4">
                        <code className="text-green-400 font-mono text-sm">{step.code}</code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-6 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Prerequisites</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Drixai account with API access</li>
                  <li>• MCP-compatible client (Claude Desktop, etc.)</li>
                  <li>• Node.js 18+ installed</li>
                  <li>• API key from your Drixai dashboard</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Commands Tab */}
        {activeTab === 'commands' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Commands</h2>
              
              <div className="space-y-6">
                {commands.map((cmd) => (
                  <div key={cmd.command} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{cmd.command}</h3>
                        <p className="text-gray-600 mb-3">{cmd.description}</p>
                        <div className="bg-gray-50 rounded p-3">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Example:</span> {cmd.example}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Examples Tab */}
        {activeTab === 'examples' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Usage Examples</h2>
              
              <div className="space-y-8">
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Support Agent</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">User:</span> "I need help with my order #12345"
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded p-3">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Agent:</span> "Let me check your order status using our database tools..."
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Analysis</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">User:</span> "Analyze the sales data from last quarter"
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded p-3">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Agent:</span> "I'll process the CSV data and create visualizations..."
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Creation</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">User:</span> "Create a blog post about AI trends"
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded p-3">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Agent:</span> "I'll research current trends and draft a comprehensive post..."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 