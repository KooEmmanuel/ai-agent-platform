'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeftIcon, PaperAirplaneIcon, XMarkIcon, Bars3Icon, EyeSlashIcon, ClipboardIcon, PencilIcon, CheckIcon } from '@heroicons/react/24/outline'
import { PanelRightClose } from 'lucide-react'
import { PanelLeftClose } from 'lucide-react'
import { HiOutlinePencilAlt } from "react-icons/hi"
import Link from 'next/link'
import { apiClient, type Agent, type Workspace } from '../../../../lib/api'
import { getUser, type User } from '../../../../lib/auth'
import MarkdownRenderer from '../../../../components/ui/MarkdownRenderer'
import DownloadableContent from '../../../../components/ui/DownloadableContent'
import AudioInput from '../../../../components/AudioInput'
import WorkspaceManager from '../../../../components/WorkspaceManager'

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

export default function AgentPlaygroundPage() {
  const params = useParams()
  const router = useRouter()
  const agentId = useMemo(() => {
    const p = params?.id as string
    return p ? parseInt(p, 10) : NaN
  }, [params])

  // Core state
  const [agent, setAgent] = useState<Agent | null>(null)
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
  const [conversations, setConversations] = useState<any[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [loadingConversation, setLoadingConversation] = useState(false)
  
  // Workspace state
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | undefined>(undefined)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [showWorkspaceManager, setShowWorkspaceManager] = useState(false)
  
  // UI state
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editInput, setEditInput] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [creatingConversation, setCreatingConversation] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Workspace management functions
  const loadWorkspaces = async () => {
    if (!agent) return
    
    try {
      const workspacesData = await apiClient.getWorkspaces(agent.id)
      setWorkspaces(workspacesData)
    } catch (error) {
      console.error('Failed to load workspaces:', error)
    }
  }

  const handleWorkspaceSelect = (workspaceId: number | undefined) => {
    console.log('🎯 Workspace selected:', workspaceId)
    setSelectedWorkspaceId(workspaceId)
    loadConversations(agent, workspaceId)
    
    // Clear current conversation when switching workspaces
    console.log('🧹 Clearing current conversation for workspace switch')
    setMessages([])
    setCurrentConversationId(null)
    
    console.log('✅ Workspace context set - ready for new conversation in workspace:', workspaceId)
  }

  const handleWorkspaceCreate = (workspace: Workspace) => {
    setWorkspaces(prev => [workspace, ...prev])
    setSelectedWorkspaceId(workspace.id)
    loadConversations(agent, workspace.id)
  }

  // Load conversations for this agent
  const loadConversations = async (agentToUse?: any, workspaceId?: number | undefined) => {
    const targetAgent = agentToUse || agent
    if (!targetAgent) return
    
    try {
      setLoadingConversations(true)
      console.log('📂 Loading conversations for agent:', targetAgent.id, 'workspace:', workspaceId)
      
      // Use workspace-aware API call
      const conversationsData = await apiClient.getPlaygroundConversationsWithWorkspace(
        targetAgent.id, 
        workspaceId
      )
      setConversations(conversationsData)
      console.log('✅ Loaded conversations:', conversationsData.length)
      console.log('📂 Conversation details:', conversationsData.map(c => ({ 
        id: c.id, 
        messageCount: c.messages?.length || 0,
        workspaceId: c.workspace_id || 'null' 
      })))
      
      // Debug: Log the actual conversation objects
      if (conversationsData.length > 0) {
        console.log('🔍 Full conversation data:', conversationsData[0])
      }
    } catch (error) {
      console.error('❌ Failed to load conversations:', error)
    } finally {
      setLoadingConversations(false)
    }
  }

  // Load current conversation if it exists
  const loadCurrentConversation = async () => {
    if (!agent || !currentConversationId) return
    
    try {
      console.log('📂 Loading current conversation:', currentConversationId)
      await loadConversation(currentConversationId.toString())
    } catch (error) {
      console.error('❌ Failed to load current conversation:', error)
      
      // Clear state on error
      setMessages([])
      setCurrentConversationId(null)
    }
  }

  // Load a specific conversation
  const loadConversation = async (conversationId: string) => {
    if (!agent) return
    
    try {
      setLoadingConversation(true)
      console.log('📂 Loading conversation messages:', conversationId)
      const conversationData = await apiClient.getConversationMessages(agent.id, parseInt(conversationId))
      
      // Convert messages to the format expected by the chat
      const chatMessages: ChatMessage[] = conversationData.messages.map(msg => ({
        id: msg.id.toString(),
        role: msg.role,
        content: msg.content,
        created_at: msg.created_at
      }))
      
      setMessages(chatMessages)
      setCurrentConversationId(parseInt(conversationId))
      
      console.log('✅ Loaded conversation:', {
        conversationId,
        messageCount: chatMessages.length,
        currentConversationId: parseInt(conversationId)
      })
      
      // Close sidebar on mobile
      if (window.innerWidth < 1024) {
        setSidebarVisible(false)
      }
    } catch (error) {
      console.error('❌ Failed to load conversation:', error)
      setError('Failed to load conversation')
    } finally {
      setLoadingConversation(false)
    }
  }

  // Delete a conversation
  const deleteConversation = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent loading the conversation when clicking delete
    
    if (!agent) return
    
    try {
      console.log('🗑️ Deleting conversation:', conversationId)
      await apiClient.deleteConversation(agent.id, parseInt(conversationId))
      
      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id.toString() !== conversationId))
      
      // If this was the current conversation, clear messages
      if (currentConversationId === parseInt(conversationId)) {
        setMessages([])
        setCurrentConversationId(null)
      }
      
      console.log('✅ Conversation deleted successfully')
    } catch (error) {
      console.error('❌ Failed to delete conversation:', error)
      setError('Failed to delete conversation')
    }
  }

  // Available models
  const availableModels = [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient' },
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Good balance' },
    { id: 'claude-3-haiku', name: 'Claude 3 Haiku', description: 'Fast and accurate' },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', description: 'Powerful reasoning' }
  ]



  // Load user data
  useEffect(() => {
    const userData = getUser()
    if (userData) {
      setUser(userData)
    }
  }, [])

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messages.length > 0 && messagesContainerRef.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: 'smooth'
          })
        }
      }, 100)
    }
  }, [messages, sending])

  useEffect(() => {
    if (!Number.isFinite(agentId)) {
      setError('Invalid agent id')
      setLoading(false)
      return
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) {
      setError('You must be logged in to use the playground')
      setLoading(false)
      return
    }
    apiClient.setToken(token)

    ;(async () => {
      try {
        setLoading(true)
        const data = await apiClient.getAgent(agentId)
        setAgent(data)
        setSelectedModel(data.model || 'gpt-4o-mini')
        
        // Load workspaces for this agent
        await loadWorkspaces()
        
        // Load conversations for this agent (now that we have the agent data)
        await loadConversations(data)
      } catch (e: any) {
        setError(e?.message || 'Failed to load agent')
      } finally {
        setLoading(false)
      }
    })()
  }, [agentId])

  // Load current conversation when conversations are loaded and conversation exists
  useEffect(() => {
    if (conversations.length > 0 && currentConversationId && agent) {
      loadCurrentConversation()
    }
  }, [conversations, currentConversationId, agent])

  const sendMessage = async () => {
    if (!input.trim() || !agent || sending) return
    
    console.log('📤 Sending message...')
    console.log('📋 Message details:', {
      content: input.trim(),
      currentConversationId: currentConversationId,
      agentId: agent.id,
      agentName: agent.name,
      selectedWorkspaceId: selectedWorkspaceId
    })
    
    if (selectedWorkspaceId) {
      console.log('🏢 Creating conversation in workspace:', selectedWorkspaceId)
    } else {
      console.log('📁 Creating conversation in default workspace (All Conversations)')
    }
    
    setError(null)
    setSending(true)
    setStreamingStatus(null)
    
    // Note: Conversation will be created by the backend when we send the message
    // No need to create it upfront - let the backend handle it

    const userMsg: ChatMessage = {
      id: `${Date.now()}_user`,
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    // Create assistant message placeholder for streaming (but don't add it yet)
    const assistantMsgId = `${Date.now()}_assistant`
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    }

    try {
      if (streamingMode) {
        // Use streaming mode
        await apiClient.chatWithAgentStream(
          agent.id,
          userMsg.content,
          currentConversationId, // Send current conversation ID directly
          (chunk) => {
            console.log('📦 Received chunk:', chunk)
            // Handle streaming chunks
            if (chunk.type === 'content') {
              // Add the message to the list if it's the first content chunk
              setMessages((prev) => {
                const existingMessage = prev.find(msg => msg.id === assistantMsgId)
                if (!existingMessage) {
                  // First content chunk - add the message
                  return [...prev, { ...assistantMsg, content: chunk.content }]
                } else {
                  // Update existing message
                  return prev.map((msg) => 
                    msg.id === assistantMsgId 
                      ? { ...msg, content: msg.content + chunk.content }
                      : msg
                  )
                }
              })
            } else if (chunk.type === 'status') {
              setStreamingStatus(chunk.content)
            } else if (chunk.type === 'metadata') {
              console.log('📊 Received metadata:', chunk)
              // Handle metadata immediately
              if (chunk.conversation_id && !currentConversationId) {
                setCurrentConversationId(chunk.conversation_id)
                console.log('💾 Set conversation ID from metadata:', chunk.conversation_id)
              }
            }
          },
          (error) => {
            const errorMessage = error instanceof Error ? error.message : (error || 'Streaming error occurred')
            
            // Check if it's a credit-related error
            if (errorMessage.includes('Insufficient credits') || errorMessage.includes('Payment Required') || errorMessage.includes('HTTP 402')) {
              setError(`💳 Insufficient credits. Please purchase more credits to continue using the playground.`)
            } else {
              setError(errorMessage)
            }
            setSending(false)
          },
          async (data) => {
            console.log('📨 Received completion data:', data)
            
            // Handle completion - check for conversation_id in the complete message
            const conversationId = data.conversation_id
            
            if (conversationId && !currentConversationId) {
              setCurrentConversationId(conversationId)
              console.log('💾 Set conversation ID:', conversationId)
              
              if (selectedWorkspaceId) {
                console.log('🎉 New conversation created in workspace:', selectedWorkspaceId, 'with ID:', conversationId)
              } else {
                console.log('🎉 New conversation created in default workspace with ID:', conversationId)
              }
              
              // Refresh the conversation list to show the new conversation
              await loadConversations()
            }
            
            // Check for downloadable content
            let downloadable = undefined
            let content = data.content
            
            try {
              const responseData = JSON.parse(data.content)
              if (responseData.success && responseData.download_url) {
                // Use the download URL as-is (backend now provides full URL)
                const downloadUrl = responseData.download_url
                
                downloadable = {
                  filename: responseData.data?.filename || 'document.pdf',
                  fileType: 'application/pdf',
                  fileSize: responseData.data?.file_size,
                  showPreview: true,
                  downloadUrl: downloadUrl
                }
                // Keep the original content, don't replace with download_url
                content = data.content
              }
            } catch (e) {
              // Not JSON, treat as regular text response
            }
            
            // Update the final message if it exists, otherwise add it
            setMessages((prev) => {
              const existingMessage = prev.find(msg => msg.id === assistantMsgId)
              if (existingMessage) {
                return prev.map((msg) => 
                  msg.id === assistantMsgId 
                    ? { ...msg, content: content, downloadable: downloadable }
                    : msg
                )
              } else {
                return [...prev, { ...assistantMsg, content: content, downloadable: downloadable }]
              }
            })
            
            setStreamingStatus(null)
            setSending(false)
          },
          selectedWorkspaceId
        )
      } else {
        // Use regular mode
        const resp = await apiClient.chatWithAgent(agent.id, userMsg.content, currentConversationId)
        if (resp.conversation_id && !currentConversationId) {
          setCurrentConversationId(resp.conversation_id)
          console.log('💾 Set conversation ID:', resp.conversation_id)
          
          // Refresh the conversation list to show the new conversation
          await loadConversations()
        }
        
        // Check if response contains downloadable content
        let downloadable = undefined
        let content = resp.response
        
        try {
          const responseData = JSON.parse(resp.response)
          if (responseData.success && responseData.download_url) {
            // Use the download URL as-is (backend now provides full URL)
            const downloadUrl = responseData.download_url
            
            downloadable = {
              filename: responseData.data?.filename || 'document.pdf',
              fileType: 'application/pdf',
              fileSize: responseData.data?.file_size,
              showPreview: true,
              downloadUrl: downloadUrl
            }
            // Keep the original content, don't replace with download_url
            content = resp.response
          }
        } catch (e) {
          // Not JSON, treat as regular text response
        }
        
        // Add the assistant message to the list
        setMessages((prev) => [...prev, { ...assistantMsg, content: content, downloadable: downloadable }])
        setSending(false)
      }
    } catch (e: any) {
      const errorMessage = e?.message || 'Failed to send message'
      
      // Check if it's a credit-related error
      if (errorMessage.includes('Insufficient credits') || errorMessage.includes('Payment Required') || errorMessage.includes('HTTP 402')) {
        setError(`💳 Insufficient credits. Please purchase more credits to continue using the playground.`)
      } else {
        setError(errorMessage)
      }
      setSending(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Enter to send (unless Shift+Enter for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const updateAgentModel = async (newModel: string) => {
    if (!agent) return
    
    try {
      const updatedAgent = await apiClient.updateAgent(agent.id, {
        ...agent,
        model: newModel
      })
      setAgent(updatedAgent)
      setSelectedModel(newModel)
      setShowSettings(false)
    } catch (e: any) {
      setError(e?.message || 'Failed to update model')
    }
  }

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessageId(messageId)
      // Hide the copied indicator after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const regenerateFromEdit = async () => {
    if (!editInput.trim() || !agent || sending || !editingMessageId) return
    setError(null)
    setSending(true)

    // Find the index of the message to edit
    const index = messages.findIndex(m => m.id === editingMessageId)
    if (index === -1 || index === messages.length - 1) {
      setError('Cannot regenerate without a following assistant response')
      setSending(false)
      return
    }

    const updatedUserMsg: ChatMessage = {
      ...messages[index],
      content: editInput.trim(),
      created_at: new Date().toISOString()
    }

    // Remove the user + assistant messages for regeneration
    const updatedMessages = [...messages]
    updatedMessages.splice(index, 2, updatedUserMsg)
    setMessages(updatedMessages)
    setEditingMessageId(null)
    setEditInput('')

    try {
      const resp = await apiClient.chatWithAgent(agent.id, updatedUserMsg.content, currentConversationId)
      const aiMsg: ChatMessage = {
        id: `${Date.now()}_assistant`,
        role: 'assistant',
        content: resp.response,
        created_at: new Date().toISOString()
      }
      // Replace AI response
      setMessages(prev => {
        const msgs = [...prev]
        msgs[index + 1] = aiMsg
        return msgs
      })
    } catch (e: any) {
      setError(e?.message || 'Failed to regenerate message')
    } finally {
      setSending(false)
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
    const isCreditError = error.includes('Insufficient credits') || error.includes('Payment Required') || error.includes('HTTP 402')
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 text-center" style={{ boxShadow: '0 20px 60px rgba(99, 179, 237, 0.08)' }}>
          {isCreditError ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
                <span className="text-2xl">💳</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Insufficient Credits</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <div className="space-y-3">
                <Link 
                  href="/dashboard/billing" 
                  className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Purchase Credits
                </Link>
                <Link 
                  href="/dashboard" 
                  className="inline-flex items-center justify-center w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4 mr-2" /> Back to Dashboard
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-red-600 mb-4">{error}</p>
              <Link href="/dashboard" className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                <ArrowLeftIcon className="w-4 h-4 mr-2" /> Back to Dashboard
              </Link>
            </>
          )}
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
    <div className="h-screen  flex overflow-hidden">
      
      {/* Left Column - Controls */}
      

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full lg:w-auto">
        <div className="flex flex-col flex-1 bg-white w-full">

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
                  {agent.description || 'AI Assistant'}
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
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors" 
              >
                Settings
              </button>
            </div>
          </div>

          {/* Messages */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 pb-4" 
            aria-live="polite"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
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
            
            {messages.map((m) => (
              <motion.div 
                key={m.id} 
                initial={{ opacity: 0, y: 6 }} 
                animate={{ opacity: 1, y: 0 }} 
                className={`group ${m.role === 'user' ? 'bg-white' : 'bg-gray-50'}`}
              >
                <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {m.role === 'user' ? (
                        user?.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={user.name || 'User'} 
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
                            {(user?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                        )
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-sm font-semibold">
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    {/* Message content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-500 mb-2">
                        {m.role === 'user' ? (user?.name || 'You') : agent.name}
                      </div>
                                            <div className="prose prose-sm lg:prose-base max-w-none">
                        {editingMessageId === m.id ? (
                          <div>
                            <textarea
                              value={editInput}
                              onChange={(e) => setEditInput(e.target.value)}
                              className="w-full rounded-lg p-2 border text-sm"
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={regenerateFromEdit}
                                className="px-2 lg:px-3 py-1 lg:py-1.5 bg-blue-600 text-white rounded-lg text-xs"
                              >
                                Regenerate
                              </button>
                              <button
                                onClick={() => {
                                  setEditingMessageId(null)
                                  setEditInput('')
                                }}
                                className="px-2 lg:px-3 py-1 lg:py-1.5 border rounded-lg text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {m.downloadable ? (
                              <DownloadableContent
                                content={m.content}
                                downloadUrl={m.downloadable.downloadUrl}
                                filename={m.downloadable.filename}
                                fileType={m.downloadable.fileType}
                                fileSize={m.downloadable.fileSize}
                                showPreview={m.downloadable.showPreview}
                              />
                            ) : (
                              <MarkdownRenderer content={m.content} />
                            )}
                            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => copyToClipboard(m.content, m.id)}
                                className="p-1 rounded hover:bg-gray-100 transition-colors"
                                title="Copy message"
                              >
                                <ClipboardIcon className="w-3 h-3 lg:w-4 lg:h-4 text-gray-500" />
                              </button>
                              {m.role === 'user' && (
                                <button
                                  onClick={() => {
                                    setEditingMessageId(m.id)
                                    setEditInput(m.content)
                                  }}
                                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                                  title="Edit message"
                                >
                                  <PencilIcon className="w-3 h-3 lg:w-4 lg:h-4 text-gray-500" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {sending && (
              <motion.div 
                initial={{ opacity: 0, y: 6 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="bg-gray-50"
              >
                <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-sm font-semibold">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    
                    {/* Loading content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-500 mb-2">
                        {agent.name}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {streamingMode && streamingStatus ? streamingStatus : 'Thinking...'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <div className="sticky bottom-0 p-4 lg:p-6 bg-white/80 backdrop-blur-sm border-t border-gray-100 z-10">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Message..."
                  className="w-full resize-none min-h-[52px] lg:min-h-[60px] max-h-40 rounded-2xl px-4 lg:px-5 py-3 lg:py-4 text-sm lg:text-base focus:outline-none border border-gray-200 focus:border-blue-400 transition-all duration-200 pr-32" 
                  style={{ 
                    background: 'linear-gradient(180deg,#ffffff,#fafbfc)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)'
                  }}
                  disabled={sending}
                />
                
                {/* Send and Audio buttons positioned absolutely */}
                <div className="absolute right-2 lg:right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                  <AudioInput
                    onTranscript={(text) => setInput(text)}
                    disabled={sending}
                    className="p-2 lg:p-2.5 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
                  />
                  <button 
                    onClick={sendMessage} 
                    disabled={!input.trim() || sending}
                    className="rounded-xl p-2 lg:p-2.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200" 
                    style={{ 
                      background: input.trim() && !sending ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'linear-gradient(135deg, #e5e7eb, #d1d5db)',
                      boxShadow: input.trim() && !sending ? '0 4px 12px rgba(59, 130, 246, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    <PaperAirplaneIcon className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Helper row */}
              <div className="mt-3 text-xs text-gray-500 flex items-center justify-end px-1">
                {/* Audio input moved to beside send button */}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" 
            style={{ boxShadow: '0 20px 60px rgba(99, 179, 237, 0.08)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Agent Settings</h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="flex items-center justify-between">
                  <span className="block text-sm font-medium text-gray-700">
                    Streaming Mode
                  </span>
                  <button
                    type="button"
                    onClick={() => setStreamingMode(!streamingMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      streamingMode ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        streamingMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Enable real-time streaming for faster response display
                </p>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Agent Configuration</h4>
                <Link
                  href={`/dashboard/agents/${agentId}/tools`}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <span>Add More Tools</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => updateAgentModel(selectedModel)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}


{sidebarVisible && (
        <motion.aside 
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-64 flex-shrink-0 ml-4 lg:ml-4"
        >
          <div className="p-6 h-full bg-white">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setSidebarVisible(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Hide sidebar"
              >
                <PanelRightClose className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
              </button>
              <h3 className="text-base lg:text-lg font-semibold">Conversations</h3>
            </div>

            {/* Workspace Manager */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-gray-700">Workspaces</h4>
                <button
                  onClick={() => setShowWorkspaceManager(!showWorkspaceManager)}
                  className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {showWorkspaceManager ? 'Hide' : 'Manage'}
                </button>
              </div>
              
              {showWorkspaceManager ? (
                <div className="max-h-48 overflow-y-auto">
                  <WorkspaceManager
                    agentId={agentId}
                    selectedWorkspaceId={selectedWorkspaceId}
                    onWorkspaceSelect={handleWorkspaceSelect}
                    onWorkspaceCreate={handleWorkspaceCreate}
                  />
                </div>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {/* Quick workspace selector */}
                  <button
                    onClick={() => handleWorkspaceSelect(undefined)}
                    className={`w-full flex items-center gap-2 p-1.5 rounded-md text-left transition-colors ${
                      selectedWorkspaceId === undefined
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                    }`}
                  >
                    <span className="text-xs">📁</span>
                    <span className="text-xs font-medium truncate">All Conversations</span>
                  </button>
                  
                  {workspaces.slice(0, 4).map((workspace) => (
                    <button
                      key={workspace.id}
                      onClick={() => handleWorkspaceSelect(workspace.id)}
                      className={`w-full flex items-center gap-2 p-1.5 rounded-md text-left transition-colors ${
                        selectedWorkspaceId === workspace.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                      }`}
                    >
                      <span className="text-xs">{workspace.icon}</span>
                      <span className="text-xs font-medium truncate">{workspace.name}</span>
                    </button>
                  ))}
                  
                  {workspaces.length > 4 && (
                    <div className="text-xs text-gray-500 text-center py-1">
                      +{workspaces.length - 4} more
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              {/* New Chat Button */}
              <button 
                onClick={() => {
                  console.log('🔄 Starting new conversation...')
                  
                  // Clear current state - don't create conversation yet
                  setMessages([])
                  setCurrentConversationId(null)
                  setError(null)
                  
                  console.log('🎉 Ready for new conversation - user can start typing')
                }}
                disabled={creatingConversation}
                className="w-full rounded-xl py-3 px-4 text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="flex items-center gap-2">
                  {creatingConversation ? (
                    'Creating...'
                  ) : (
                    <>
                      <HiOutlinePencilAlt className="w-4 h-4" />
                      New Chat
                    </>
                  )}
                </span>
              </button>



              {/* Conversation History */}
              {loadingConversations ? (
                <div className="p-3 rounded-xl text-center">
                  <div className="text-sm text-slate-500">Loading conversations...</div>
                </div>
              ) : conversations.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-600 mb-2">Recent Conversations</div>
                  {conversations.slice(0, 5).map((conversation) => {
                    const isActive = currentConversationId === parseInt(conversation.id)
                    return (
                      <div 
                        key={conversation.id}
                        className={`p-2 rounded-lg cursor-pointer hover:translate-x-1 transition-transform duration-150 border relative group ${
                          isActive 
                            ? 'border-blue-300 bg-blue-50 shadow-sm' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => loadConversation(conversation.id)}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                        )}
                        
                        <div className={`text-xs font-medium truncate ${isActive ? 'pr-8' : 'pr-6'}`}>
                          {loadingConversation && currentConversationId === parseInt(conversation.id) ? (
                            <span className="text-blue-600">Loading...</span>
                          ) : (
                            conversation.messages?.length > 0 
                              ? conversation.messages[0].content.substring(0, 25) + '...' 
                              : 'Empty conversation'
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {conversation.messages?.length || 0} msgs • {new Date(conversation.created_at).toLocaleDateString()}
                          {isActive && (
                            <span className="ml-1 text-blue-600 font-medium">• Active</span>
                          )}
                        </div>
                        
                        {/* Delete button */}
                        <button
                          onClick={(e) => deleteConversation(conversation.id, e)}
                          className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-100 text-red-500"
                          title="Delete conversation"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-xl text-center">
                  <div className="text-sm text-slate-500">No conversations yet</div>
                </div>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </div>
  )
}

