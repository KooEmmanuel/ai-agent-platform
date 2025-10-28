'use client'

import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeftIcon, PaperAirplaneIcon, XMarkIcon, Bars3Icon, EyeSlashIcon, ClipboardIcon, PencilIcon, CheckIcon, PlusIcon, Cog6ToothIcon, MagnifyingGlassIcon, CpuChipIcon, TrashIcon } from '@heroicons/react/24/outline'
import { PanelRightClose } from 'lucide-react'
import { PanelLeftClose } from 'lucide-react'
import { HiOutlinePencilAlt } from "react-icons/hi"
import { HiDocument } from "react-icons/hi2"
import { FaHeadSideVirus } from "react-icons/fa"
import * as Humanize from 'humanize-plus'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import Link from 'next/link'
import { apiClient } from '../../../../../../lib/api'
import { getUser, type User } from '../../../../../../lib/auth'
import MarkdownRenderer from '../../../../../../components/ui/MarkdownRenderer'
import DownloadableContent from '../../../../../../components/ui/DownloadableContent'
import AudioInput from '../../../../../../components/AudioInput'

type OrganizationAgent = {
  id: number
  organization_id: number
  name: string
  description?: string
  instructions: string
  model: string
  is_active: boolean
  tools: any[]
  context_config?: Record<string, any>
  created_by_id: number
  created_at: string
  updated_at?: string
}

type OrganizationConversation = {
  id: number
  organization_id: number
  agent_id: number
  title: string
  title_status: 'provisional' | 'final' | 'custom'
  title_generated_at?: string
  title_generation_method: string
  created_by_id: number
  created_at: string
  updated_at?: string
  last_message_at?: string
  message_count: number
  meta_data?: Record<string, any>
}

type OrganizationMessage = {
  id: number
  conversation_id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  created_by_id?: number
  created_at: string
  meta_data?: Record<string, any>
  tool_calls?: any
  parent_message_id?: number
  token_count?: number
  cost_cents?: number
  attachments?: any[]
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  downloadable?: {
    filename: string
    fileType: string
    fileSize?: number
    showPreview?: boolean
    downloadUrl?: string
  }
}

export default function OrganizationAgentPlaygroundPage() {
  const params = useParams()
  const router = useRouter()
  const organizationId = parseInt(params.id as string)
  const agentId = useMemo(() => {
    const p = params?.agentId as string
    return p ? parseInt(p, 10) : NaN
  }, [params])

  // Core state
  const [agent, setAgent] = useState<OrganizationAgent | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Chat state
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [streamingMode, setStreamingMode] = useState(true)
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null)
  
  // Conversation state
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null)
  const [conversations, setConversations] = useState<OrganizationConversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [loadingConversation, setLoadingConversation] = useState(false)
  
  // UI state
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editInput, setEditInput] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [showPlusDropdown, setShowPlusDropdown] = useState(false)
  const [renamingConversationId, setRenamingConversationId] = useState<number | null>(null)
  const [renameInput, setRenameInput] = useState('')
  const [showRenameDropdown, setShowRenameDropdown] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingConversationId, setDeletingConversationId] = useState<number | null>(null)

  // Spinner component
  const Spinner = () => (
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
  )

  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Load initial data
  useEffect(() => {
    if (agentId && organizationId) {
      loadInitialData()
    }
  }, [agentId, organizationId])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🚀 Loading initial data for agent:', agentId, 'organization:', organizationId)
      
      const [agentData, userData] = await Promise.all([
        apiClient.getOrganizationAgent(organizationId, agentId),
        getUser()
      ])
      
      console.log('✅ Loaded agent data:', agentData)
      setAgent(agentData)
      setUser(userData)
      setSelectedModel(agentData.model || 'gpt-4o-mini')
      
      // Load conversations for this agent
      await loadConversations(agentData)
      
    } catch (error) {
      console.error('Error loading initial data:', error)
      setError('Failed to load agent data')
    } finally {
      setLoading(false)
    }
  }

  // Load conversations for this agent
  const loadConversations = async (agentData?: any) => {
    const currentAgent = agentData || agent
    if (!currentAgent) return
    
    try {
      setLoadingConversations(true)
      console.log('🔄 Loading conversations for agent:', agentId, 'organization:', organizationId)
      const conversationsData = await apiClient.getOrganizationPlaygroundConversations(organizationId, agentId)
      console.log('📋 Loaded conversations:', conversationsData)
      setConversations(conversationsData)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setLoadingConversations(false)
    }
  }

  const createNewConversation = async () => {
    if (!agent || !input.trim()) return
    
    try {
      setCreatingConversation(true)
      
      const conversation = await apiClient.createOrganizationConversation(organizationId, {
        agent_id: agent.id,
        first_user_message: input.trim()
      })
      
      setCurrentConversationId(conversation.id)
      setMessages([])
      
      // Add the first message
      const firstMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: input.trim(),
        created_at: new Date().toISOString()
      }
      
      setMessages([firstMessage])
      setInput('')
      
      // Refresh conversations list
      await loadConversations()
      
      // Send the message to get assistant response (don't add user message again)
      await sendMessage(input.trim(), conversation.id, true)
      
    } catch (error) {
      console.error('Error creating conversation:', error)
    } finally {
      setCreatingConversation(false)
    }
  }

  const sendMessage = async (messageContent: string, conversationId?: number, skipUserMessage: boolean = false) => {
    if (!agent || !messageContent.trim()) return
    
    const targetConversationId = conversationId || currentConversationId
    if (!targetConversationId) return
    
    try {
      setSending(true)
      setStreamingStatus('Sending message...')
      
      // Add user message to UI immediately (unless we're skipping it)
      if (!skipUserMessage) {
        const userMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: messageContent,
          created_at: new Date().toISOString()
        }
        
        setMessages(prev => [...prev, userMessage])
      }
      
      // Create assistant message placeholder for streaming (but don't add to messages yet)
      const assistantMessageId = `assistant-${Date.now()}`
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString()
      }
      
      setStreamingStatus('Assistant is thinking...')
      
      console.log('🚀 Starting organization streaming at:', new Date().toISOString())
      const streamStartTime = performance.now()
      
      // Use streaming for organization messages
      await apiClient.streamOrganizationMessage(
        organizationId,
        targetConversationId,
        messageContent,
        (chunk) => {
          const chunkTime = performance.now()
          console.log(`📦 Received organization chunk at ${chunkTime.toFixed(2)}ms:`, chunk)
          console.log('📦 Chunk type:', chunk.type, 'Content length:', chunk.content?.length || 0)
          
          if (chunk.type === 'content') {
            console.log(`📝 Streaming content at ${chunkTime.toFixed(2)}ms (${(chunkTime - streamStartTime).toFixed(2)}ms from start):`, chunk.content)
            // Add message on first content chunk, then update
            setMessages(prev => {
              const existingMessage = prev.find(msg => msg.id === assistantMessageId)
              if (!existingMessage) {
                // First content chunk - add the message
                return [...prev, { ...assistantMessage, content: chunk.content }]
              } else {
                // Update existing message
                return prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, content: msg.content + chunk.content }
                    : msg
                )
              }
            })
          } else if (chunk.type === 'status') {
            console.log('📊 Status update:', chunk.content)
            setStreamingStatus(chunk.content)
          } else if (chunk.type === 'complete') {
            console.log('✅ Organization streaming completed:', chunk)
            setStreamingStatus(null)
            setSending(false)
          } else if (chunk.type === 'metadata') {
            console.log('📊 Received organization metadata:', chunk)
            // Handle metadata if needed
          }
        },
        (error) => {
          console.error('❌ Organization streaming error:', error)
          const errorMessage = error instanceof Error ? error.message : (error || 'Streaming error occurred')
          setError(errorMessage)
          setSending(false)
          setStreamingStatus(null)
        },
        async (data) => {
          const completionTime = performance.now()
          console.log(`📨 Organization streaming completed at ${completionTime.toFixed(2)}ms (${(completionTime - streamStartTime).toFixed(2)}ms total):`, data)
          setStreamingStatus(null)
          setSending(false)
          
          // Generate title after first assistant response
          if (messages.length === 1) { // This is the first exchange (user + assistant)
            try {
              await apiClient.generateOrganizationConversationTitle(organizationId, targetConversationId)
              // Refresh conversations to show updated title
              await loadConversations()
            } catch (error) {
              console.error('Error generating conversation title:', error)
            }
          }
        }
      )
      
    } catch (error) {
      console.error('Error sending message:', error)
      setStreamingStatus(null)
      setSending(false)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || sending) return
    
    if (!currentConversationId) {
      await createNewConversation()
    } else {
      await sendMessage(input.trim())
      setInput('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  console.log('📊 Conversations state:', conversations)
  console.log('🔍 Filtered conversations:', filteredConversations)

  // Load conversation messages when a conversation is selected
  const loadConversationMessages = async (conversationId: number) => {
    try {
      setLoadingConversation(true)
      const messagesData = await apiClient.getOrganizationConversationMessages(organizationId, conversationId)
      
      // Convert to ChatMessage format
      const chatMessages: ChatMessage[] = messagesData.map(msg => ({
        id: `msg-${msg.id}`,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        created_at: msg.created_at
      }))
      
      setMessages(chatMessages)
      setCurrentConversationId(conversationId)
    } catch (error) {
      console.error('Error loading conversation messages:', error)
      setError('Failed to load conversation messages')
    } finally {
      setLoadingConversation(false)
    }
  }

  // Delete conversation
  const deleteConversation = async (conversationId: number) => {
    try {
      setDeletingConversationId(conversationId)
      await apiClient.deleteOrganizationPlaygroundConversation(organizationId, conversationId)
      
      // Remove from conversations list
      setConversations(prev => prev.filter(conv => conv.id !== conversationId))
      
      // If this was the current conversation, clear it
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null)
        setMessages([])
      }
      
      console.log('✅ Conversation deleted successfully')
    } catch (error) {
      console.error('Error deleting conversation:', error)
    } finally {
      setDeletingConversationId(null)
    }
  }

  // Rename conversation functions
  const startRenameConversation = (conversationId: number, currentTitle: string) => {
    setRenamingConversationId(conversationId)
    setRenameInput(currentTitle)
    setShowRenameDropdown(conversationId)
  }

  const cancelRenameConversation = () => {
    setRenamingConversationId(null)
    setRenameInput('')
    setShowRenameDropdown(null)
  }

  const confirmRenameConversation = async () => {
    if (!renamingConversationId || !renameInput.trim()) return
    
    try {
      await apiClient.renameOrganizationConversation(organizationId, renamingConversationId, renameInput.trim())
      await loadConversations()
      cancelRenameConversation()
    } catch (error) {
      console.error('Error renaming conversation:', error)
      setError('Failed to rename conversation')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading playground...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 text-center" style={{ boxShadow: '0 20px 60px rgba(99, 179, 237, 0.08)' }}>
          <p className="text-red-600 mb-4">{error}</p>
          <Link 
            href={`/dashboard/organizations/${organizationId}/playground`}
            className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" /> Back to Playground
          </Link>
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 flex items-center justify-center text-gray-600">
        Agent not found
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8" style={{ marginBottom: '0' }}>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full lg:w-auto">
        <div className="flex flex-col flex-1 w-full" style={{ marginBottom: '0' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 lg:px-6 py-4 lg:py-5 bg-white border-b border-gray-100">
            <div className="flex items-center gap-3 lg:gap-4">
              {!sidebarVisible && (
                <button
                  onClick={() => setSidebarVisible(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Show sidebar"
                >
                  <Bars3Icon className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white bg-gradient-to-br from-blue-500 to-blue-600 text-lg" 
                   style={{ boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
                {agent.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold text-gray-900 truncate">{agent.name}</div>
                <div className="text-sm text-gray-500 line-clamp-1">
                  {agent.description || 'Organization AI Assistant'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">{selectedModel}</span>
              </div>
              <button 
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-2" 
                title="Settings"
              >
                <Cog6ToothIcon className="w-4 h-4 sm:hidden" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 pb-4" 
            aria-live="polite"
            style={{ 
              height: 'calc(100vh - 300px)',
              maxHeight: 'calc(100vh - 300px)',
              position: 'relative'
            }}
          >
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-16 lg:mt-20">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-blue-500"></div>
                </div>
                <div className="text-xl lg:text-2xl font-semibold mb-2 text-gray-700">Welcome to {agent.name}!</div>
                <div className="text-sm lg:text-base text-gray-500 max-w-md mx-auto">I'm here to help you. Start a conversation to see how I can assist you with your tasks.</div>
              </div>
            )}

            {/* Creating Conversation Loading Overlay */}
            {creatingConversation && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-gray-600">
                  <Spinner />
                  <span className="text-sm">Creating new conversation...</span>
                </div>
              </div>
            )}
            
            {messages.map((m) => (
              <motion.div 
                key={m.id} 
                initial={{ opacity: 0, y: 6 }} 
                animate={{ opacity: 1, y: 0 }} 
                className={`group ${m.role === 'user' ? 'bg-white' : 'bg-gray-50'}`}
              >
                <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
                  <div className="flex gap-4">
                    {/* Avatar - Hidden on mobile */}
                    <div className="hidden lg:block flex-shrink-0">
                      {m.role === 'user' ? (
                        user?.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt="User" 
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-sm font-medium">
                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {m.role === 'user' ? (user?.email || 'You') : agent.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(m.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <div className="prose prose-sm max-w-none">
                        <MarkdownRenderer content={m.content} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Loading Conversation */}
            {loadingConversation && (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-gray-600">
                  <Spinner />
                  <span className="text-sm">Loading conversation...</span>
                </div>
              </div>
            )}

            {/* Streaming Status */}
            {streamingStatus && (
              <motion.div 
                initial={{ opacity: 0, y: 6 }} 
                animate={{ opacity: 1, y: 0 }}
                className="group bg-gray-50"
              >
                <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="hidden lg:block flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
                        AI
                      </div>
                    </div>
                    
                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      <div className="hidden lg:block text-sm text-gray-500 mb-2">
                        {agent.name}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {streamingStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <div className="bg-white border-t border-gray-100 px-4 lg:px-6 py-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`Message ${agent.name}...`}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                    rows={1}
                    disabled={sending}
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || sending}
                  className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  style={{ minHeight: '48px', minWidth: '48px' }}
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Conversations */}
      {sidebarVisible && (
        <motion.aside 
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-64 flex-shrink-0 mr-4 lg:mr-4"
        >
          <div className="p-6 h-full bg-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarVisible(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Hide sidebar"
                >
                  <PanelRightClose className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
                </button>
                <h3 className="text-base lg:text-lg font-semibold">Conversations</h3>
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-1.5 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* New Conversation Button */}
            <div className="mb-4">
              <button
                onClick={() => {
                  setCurrentConversationId(null)
                  setMessages([])
                  setInput('')
                }}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                New Conversation
              </button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {loadingConversations ? (
                <div className="text-center py-4">
                  <Spinner />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => loadConversationMessages(conversation.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        currentConversationId === conversation.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {renamingConversationId === conversation.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={renameInput}
                                onChange={(e) => setRenameInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    confirmRenameConversation()
                                  } else if (e.key === 'Escape') {
                                    cancelRenameConversation()
                                  }
                                }}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    confirmRenameConversation()
                                  }}
                                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    cancelRenameConversation()
                                  }}
                                  className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {conversation.title}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                {conversation.message_count} messages
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          {conversation.title_status === 'provisional' && (
                            <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                          )}
                          {conversation.title_status === 'final' && (
                            <div className="w-2 h-2 bg-green-400 rounded-full" />
                          )}
                          {conversation.title_status === 'custom' && (
                            <div className="w-2 h-2 bg-blue-400 rounded-full" />
                          )}
                          {renamingConversationId !== conversation.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                startRenameConversation(conversation.id, conversation.title)
                              }}
                              className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                              title="Rename conversation"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteConversation(conversation.id)
                            }}
                            disabled={deletingConversationId === conversation.id}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Delete conversation"
                          >
                            {deletingConversationId === conversation.id ? (
                              <Spinner />
                            ) : (
                              <TrashIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </div>
  )
}