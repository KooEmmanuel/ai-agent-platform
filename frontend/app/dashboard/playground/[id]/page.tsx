'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeftIcon, PaperAirplaneIcon, XMarkIcon, Bars3Icon, EyeSlashIcon, ClipboardIcon, PencilIcon, CheckIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { apiClient, type Agent } from '../../../../lib/api'
import MarkdownRenderer from '../../../../components/ui/MarkdownRenderer'
import DownloadableContent from '../../../../components/ui/DownloadableContent'

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
  }
}

export default function AgentPlaygroundPage() {
  const params = useParams()
  const router = useRouter()
  const agentId = useMemo(() => {
    const p = params?.id as string
    return p ? parseInt(p, 10) : NaN
  }, [params])

  const [agent, setAgent] = useState<Agent | null>(null)
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini')
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editInput, setEditInput] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [streamingMode, setStreamingMode] = useState(true) // Enable streaming by default
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null)
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [conversations, setConversations] = useState<any[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [isNewConversation, setIsNewConversation] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null)
  const [loadingConversation, setLoadingConversation] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Load conversations for this agent
  const loadConversations = async (agentToUse?: any) => {
    const targetAgent = agentToUse || agent
    if (!targetAgent) return
    
    try {
      setLoadingConversations(true)
      console.log('📂 Loading conversations for agent:', targetAgent.id)
      const conversationsData = await apiClient.getPlaygroundConversations(targetAgent.id)
      setConversations(conversationsData)
      console.log('✅ Loaded conversations:', conversationsData.length)
      console.log('📂 Conversation details:', conversationsData.map(c => ({ 
        id: c.id, 
        messageCount: c.messages?.length || 0 
      })))
    } catch (error) {
      console.error('❌ Failed to load conversations:', error)
    } finally {
      setLoadingConversations(false)
    }
  }

  // Load current session messages if session exists
  const loadCurrentSession = async () => {
    if (!agent || !sessionId) return
    
    try {
      console.log('📂 Loading current session messages:', sessionId)
      console.log('📂 Available conversations:', conversations.map(c => ({ id: c.id })))
      
      // Find the conversation that matches the current session
      let currentConversation = null
      
      // Try to find by conversation ID (if sessionId is in format "conversation_123")
      if (sessionId.startsWith('conversation_')) {
        const conversationId = sessionId.replace('conversation_', '')
        currentConversation = conversations.find(conv => conv.id.toString() === conversationId)
      }
      
      // If still not found, try to find by currentConversationId
      if (!currentConversation && currentConversationId) {
        currentConversation = conversations.find(conv => conv.id.toString() === currentConversationId.toString())
      }
      
      if (currentConversation) {
        console.log('✅ Found current session conversation:', currentConversation.id)
        await loadConversation(currentConversation.id.toString())
      } else {
        console.log('📂 No matching conversation found for session:', sessionId)
        console.log('📂 Clearing session state...')
        // Clear messages if no matching conversation
        setMessages([])
        setSessionId(undefined)
        setCurrentConversationId(null)
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`playground_session_${agent.id}`)
          localStorage.removeItem(`playground_conversation_${agent.id}`)
        }
      }
    } catch (error) {
      console.error('❌ Failed to load current session:', error)
      setMessages([])
      setSessionId(undefined)
      setCurrentConversationId(null)
      if (typeof window !== 'undefined' && agent) {
        localStorage.removeItem(`playground_session_${agent.id}`)
        localStorage.removeItem(`playground_conversation_${agent.id}`)
      }
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
      setSessionId(`conversation_${conversationId}`)
      setCurrentConversationId(parseInt(conversationId))
      setIsNewConversation(false) // Loading an existing conversation
      
      console.log('✅ Loaded conversation:', {
        conversationId,
        messageCount: chatMessages.length,
        sessionId: `conversation_${conversationId}`,
        currentConversationId: parseInt(conversationId),
        isNewConversation: false
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
    
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return
    }
    
    try {
      console.log('🗑️ Deleting conversation:', conversationId)
      await apiClient.deleteConversation(agent.id, parseInt(conversationId))
      
      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id.toString() !== conversationId))
      
      // If this was the current conversation, clear messages
      if (sessionId === `conversation_${conversationId}` || currentConversationId === parseInt(conversationId)) {
        setMessages([])
        setSessionId(undefined)
        setCurrentConversationId(null)
        setIsNewConversation(false) // Don't show "New Conversation" indicator
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`playground_session_${agent.id}`)
          localStorage.removeItem(`playground_conversation_${agent.id}`)
        }
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



  useEffect(() => {
    // Scroll to bottom when messages change, but only within the messages container
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
  }, [messages])

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

    const storedSession = typeof window !== 'undefined' ? localStorage.getItem(`playground_session_${agentId}`) : null
    const storedConversation = typeof window !== 'undefined' ? localStorage.getItem(`playground_conversation_${agentId}`) : null
    
    if (storedSession && storedConversation) {
      console.log('📂 Found stored session and conversation:', { session: storedSession, conversation: storedConversation })
      setSessionId(storedSession)
      setCurrentConversationId(parseInt(storedConversation))
      setIsNewConversation(false)
    } else {
      console.log('📂 No stored session/conversation found, starting fresh')
      setIsNewConversation(false) // Don't show "New Conversation" indicator
    }

    ;(async () => {
      try {
        setLoading(true)
        const data = await apiClient.getAgent(agentId)
        setAgent(data)
        setSelectedModel(data.model || 'gpt-4o-mini')
        
        // Load conversations for this agent (now that we have the agent data)
        await loadConversations(data)
        
        // Load current session if it exists
        if (storedSession && storedConversation) {
          await loadCurrentSession()
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load agent')
      } finally {
        setLoading(false)
      }
    })()
  }, [agentId])

  // Load current session when conversations are loaded and session exists
  useEffect(() => {
    if (conversations.length > 0 && sessionId && agent) {
      loadCurrentSession()
    }
  }, [conversations, sessionId, agent])

  const sendMessage = async () => {
    if (!input.trim() || !agent || sending) return
    
    console.log('📤 Sending message...')
    console.log('📋 Message details:', {
      content: input.trim(),
      sessionId: sessionId,
      isNewConversation: isNewConversation,
      currentConversationId: currentConversationId,
      agentId: agent.id,
      agentName: agent.name
    })
    
    setError(null)
    setSending(true)
    setStreamingStatus(null)

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
          sessionId,
          (chunk) => {
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
            }
          },
          (error) => {
            setError(error || 'Streaming error occurred')
            setSending(false)
          },
          (data) => {
            // Handle completion
            if (data.session_id && typeof window !== 'undefined') {
              localStorage.setItem(`playground_session_${agent.id}`, data.session_id)
              setSessionId(data.session_id)
              setIsNewConversation(false) // No longer a new conversation
              
              // If this was a new conversation, store the conversation ID
              if (currentConversationId === null && data.conversation_id) {
                setCurrentConversationId(data.conversation_id)
                localStorage.setItem(`playground_conversation_${agent.id}`, data.conversation_id.toString())
                console.log('💾 Stored new conversation ID:', data.conversation_id)
              }
            }
            
            // Check for downloadable content
            let downloadable = undefined
            let content = data.content
            
            try {
              const responseData = JSON.parse(data.content)
              if (responseData.success && responseData.pdf_base64) {
                downloadable = {
                  filename: responseData.filename || 'document.pdf',
                  fileType: 'application/pdf',
                  fileSize: responseData.file_size,
                  showPreview: true
                }
                content = responseData.pdf_base64
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
          }
        )
      } else {
        // Use regular mode
        const resp = await apiClient.chatWithAgent(agent.id, userMsg.content, sessionId)
        if (resp.session_id && typeof window !== 'undefined') {
          localStorage.setItem(`playground_session_${agent.id}`, resp.session_id)
          setSessionId(resp.session_id)
          setIsNewConversation(false) // No longer a new conversation
          
          // If this was a new conversation, store the conversation ID
          if (currentConversationId === null && resp.conversation_id) {
            setCurrentConversationId(resp.conversation_id)
            localStorage.setItem(`playground_conversation_${agent.id}`, resp.conversation_id.toString())
            console.log('💾 Stored new conversation ID:', resp.conversation_id)
          }
        }
        
        // Check if response contains downloadable content
        let downloadable = undefined
        let content = resp.response
        
        try {
          const responseData = JSON.parse(resp.response)
          if (responseData.success && responseData.pdf_base64) {
            downloadable = {
              filename: responseData.filename || 'document.pdf',
              fileType: 'application/pdf',
              fileSize: responseData.file_size,
              showPreview: true
            }
            content = responseData.pdf_base64
          }
        } catch (e) {
          // Not JSON, treat as regular text response
        }
        
        // Add the assistant message to the list
        setMessages((prev) => [...prev, { ...assistantMsg, content: content, downloadable: downloadable }])
        setSending(false)
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to send message')
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
      const resp = await apiClient.chatWithAgent(agent.id, updatedUserMsg.content, sessionId)
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
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 text-center" style={{ boxShadow: '0 20px 60px rgba(99, 179, 237, 0.08)' }}>
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/dashboard" className="inline-flex items-center px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <ArrowLeftIcon className="w-4 h-4 mr-2" /> Back to Dashboard
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
    <div className="h-screen bg-gradient-to-b from-white to-slate-50 flex overflow-hidden">
      
      {/* Left Column - Controls */}
      {sidebarVisible && (
        <motion.aside 
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-80 p-4 lg:p-6 hidden lg:block flex-shrink-0"
        >
          <div className="rounded-2xl p-4 h-full bg-white" style={{ boxShadow: '0 10px 30px rgba(99, 179, 237, 0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Link 
                  href="/dashboard/agents" 
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
                </Link>
                <h3 className="text-base lg:text-lg font-semibold">Conversations</h3>
              </div>
              <button
                onClick={loadConversations}
                disabled={loadingConversations}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                title="Refresh conversations"
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setSidebarVisible(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Hide sidebar"
              >
                <EyeSlashIcon className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Current Session - Only show if there are messages */}
              {messages.length > 0 && (
                <div className="p-3 rounded-xl cursor-pointer hover:translate-x-1 transition-transform duration-150 relative group border-2 border-blue-300 bg-blue-50 shadow-sm" 
                     style={{ background: 'linear-gradient(180deg, rgba(239,246,255,0.8), rgba(219,234,254,0.8))', boxShadow: '0 6px 18px rgba(59,130,246,0.1)' }}>
                  {/* Active indicator */}
                  <div className="absolute top-2 left-2 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  
                  <div className="text-sm font-medium pl-6">
                    Current Session
                  </div>
                  <div className="text-xs text-slate-600 mt-1 pl-6">
                    {messages.length} messages • {currentConversationId ? `ID: ${currentConversationId}` : 'Active'}
                  </div>
                  
                  {/* Clear session button */}
                  <button
                    onClick={() => {
                      if (confirm('Clear current session? This will remove all messages from the current conversation.')) {
                        setMessages([])
                        setSessionId(undefined)
                        setCurrentConversationId(null)
                        setIsNewConversation(false) // Don't show "New Conversation" indicator
                        if (typeof window !== 'undefined' && agent) {
                          localStorage.removeItem(`playground_session_${agent.id}`)
                          localStorage.removeItem(`playground_conversation_${agent.id}`)
                        }
                      }
                    }}
                    className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-100 text-red-500"
                    title={isNewConversation ? "Cancel new conversation" : "Clear current session"}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* New Conversation Button */}
              <button 
                onClick={async () => {
                  try {
                    console.log('🔄 Starting new conversation creation...')
                    console.log('📊 Agent details:', { id: agent.id, name: agent.name })
                    
                    setCreatingConversation(true)
                    setError(null)
                    
                    // Create a new conversation in the database
                    console.log('📡 Calling API to create conversation...')
                    const newConversation = await apiClient.createConversation(
                      agent.id, 
                      `Playground Session - ${agent.name}`
                    )
                    
                    console.log('✅ API response received:', newConversation)
                    
                    // Clear local state for fresh start
                    console.log('🧹 Clearing local state...')
                    setMessages([])
                    setSessionId(undefined)
                    setCurrentConversationId(null)
                    setIsNewConversation(false) // Don't show "New Conversation" indicator
                    
                    // Clear any stored session and conversation
                    if (typeof window !== 'undefined') {
                      console.log('🗑️ Clearing stored session from localStorage')
                      localStorage.removeItem(`playground_session_${agent.id}`)
                      localStorage.removeItem(`playground_conversation_${agent.id}`)
                    }
                    
                    console.log('🎉 New conversation created successfully!')
                    console.log('📋 Final state:', {
                      sessionId: newConversation.session_id,
                      conversationId: newConversation.id,
                      title: newConversation.title
                    })
                    
                    // Refresh conversation list
                    await loadConversations()
                  } catch (error) {
                    console.error('❌ Failed to create new conversation:', error)
                    console.error('🔍 Error details:', {
                      message: error.message,
                      status: error.status,
                      response: error.response
                    })
                    setError('Failed to create new conversation')
                  } finally {
                    console.log('🏁 Conversation creation process completed')
                    setCreatingConversation(false)
                  }
                }}
                disabled={creatingConversation}
                className="w-full rounded-xl py-2 px-3 text-sm lg:text-base font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                style={{ background: 'linear-gradient(90deg,#E6F6FF,#F6FBFF)' }}
              >
                {creatingConversation ? 'Creating...' : '+ New Conversation'}
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
                        className={`p-3 rounded-xl cursor-pointer hover:translate-x-1 transition-transform duration-150 border relative group ${
                          isActive 
                            ? 'border-blue-300 bg-blue-50 shadow-sm' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => loadConversation(conversation.id)}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <div className="absolute top-2 left-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        )}
                        
                        <div className={`text-sm font-medium truncate ${isActive ? 'pr-12' : 'pr-8'}`}>
                          {loadingConversation && currentConversationId === parseInt(conversation.id) ? (
                            <span className="text-blue-600">Loading...</span>
                          ) : (
                            conversation.messages?.length > 0 
                              ? conversation.messages[0].content.substring(0, 30) + '...' 
                              : 'Empty conversation'
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {conversation.messages?.length || 0} messages • {new Date(conversation.created_at).toLocaleDateString()}
                          {isActive && (
                            <span className="ml-2 text-blue-600 font-medium">• Active</span>
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-col flex-1 rounded-2xl lg:rounded-3xl overflow-hidden bg-white" style={{ boxShadow: '0 20px 60px rgba(99, 179, 237, 0.08)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 bg-white/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 lg:gap-3">
              {!sidebarVisible && (
                <button
                  onClick={() => setSidebarVisible(true)}
                  className="p-1.5 lg:p-2 rounded-lg hover:bg-gray-100 transition-colors mr-2"
                  title="Show sidebar"
                >
                  <Bars3Icon className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
                </button>
              )}
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center font-bold text-sky-700 bg-white text-sm lg:text-base" 
                   style={{ boxShadow: '0 6px 20px rgba(99, 179, 237, 0.08)' }}>
                {agent.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm lg:text-base font-semibold truncate">{agent.name}</div>
                <div className="text-xs text-slate-400 line-clamp-1">
                  {agent.description || 'AI Assistant'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
              <div className="text-xs text-slate-500 hidden sm:block">Model: {selectedModel}</div>
              <button 
                onClick={() => setShowSettings(true)}
                className="px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg text-xs lg:text-sm" 
                style={{ background: 'rgba(230,246,255,0.9)' }}
              >
                Settings
              </button>
            </div>
          </div>

          {/* Messages */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden px-4 lg:px-6 py-4 lg:py-6 bg-gradient-to-b from-white to-slate-50 min-h-0" 
            aria-live="polite"
          >
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8 lg:mt-10">
                <div className="text-base lg:text-lg font-medium mb-2">Welcome to {agent.name}!</div>
                <div className="text-xs lg:text-sm">Start a conversation to see how I can help you.</div>
              </div>
            )}
            
            {messages.map((m) => (
              <motion.div 
                key={m.id} 
                initial={{ opacity: 0, y: 6 }} 
                animate={{ opacity: 1, y: 0 }} 
                className={`group max-w-[85%] lg:max-w-[78%] mb-4 ${m.role === 'user' ? 'ml-auto text-right' : 'mr-auto text-left'}`}
              >
                <div 
                  className={`inline-block rounded-2xl px-3 lg:px-4 py-2 lg:py-3 leading-relaxed text-sm lg:text-base`} 
                  style={{ 
                    background: m.role === 'user' ? 'linear-gradient(180deg,#E6F6FF,#F6FBFF)' : 'white', 
                    boxShadow: '0 8px 28px rgba(99, 179, 237, 0.06)' 
                  }}
                >
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
              </motion.div>
            ))}
            
            {sending && (
              <motion.div 
                initial={{ opacity: 0, y: 6 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="mr-auto text-left max-w-[85%] lg:max-w-[78%] mb-4"
              >
                <div 
                  className="inline-block rounded-2xl px-3 lg:px-4 py-2 lg:py-3 bg-white" 
                  style={{ boxShadow: '0 8px 28px rgba(99, 179, 237, 0.06)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm lg:text-base text-gray-600">
                      {streamingMode && streamingStatus ? streamingStatus : 'Thinking...'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 lg:p-6 bg-white/60 backdrop-blur-sm">
            <div className="flex gap-3">
              <div className="flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Type your message here. Press Enter to send, Shift+Enter for new line."
                  className="w-full resize-none min-h-[48px] lg:min-h-[56px] max-h-32 lg:max-h-36 rounded-xl p-3 lg:p-4 text-sm focus:outline-none" 
                  style={{ boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.02)', background: 'linear-gradient(180deg,#ffffff,#fbfdff)' }}
                  disabled={sending}
                />
              </div>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={sendMessage} 
                  disabled={!input.trim() || sending}
                  className="rounded-lg p-2 lg:p-3 font-semibold shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center" 
                  style={{ background: '#E6F6FF' }}
                >
                  <PaperAirplaneIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                </button>

                <button 
                  onClick={() => setInput('')}
                  className="rounded-lg px-2 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm" 
                  style={{ background: 'rgba(250,250,255,0.9)' }}
                  disabled={sending}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Helper row */}
            <div className="mt-3 text-xs text-slate-400 flex items-center justify-between">
              <div className="hidden sm:block">Press <span className="font-medium">Enter</span> to send • <span className="font-medium">Shift+Enter</span> for new line</div>
              <div className="sm:hidden">Press <span className="font-medium">Enter</span> to send</div>
              <div>Words: <span className="font-semibold">{input.trim().split(/\s+/).filter(Boolean).length}</span></div>
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
    </div>
  )
}

