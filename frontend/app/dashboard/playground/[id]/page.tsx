'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeftIcon, PaperAirplaneIcon, XMarkIcon, Bars3Icon, EyeSlashIcon, ClipboardIcon, PencilIcon, CheckIcon, PlusIcon } from '@heroicons/react/24/outline'
import { PanelRightClose } from 'lucide-react'
import { PanelLeftClose } from 'lucide-react'
import { HiOutlinePencilAlt } from "react-icons/hi"
import { HiDocument } from "react-icons/hi2"
import { FaHeadSideVirus } from "react-icons/fa"
import * as Humanize from 'humanize-plus'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
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
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [loadingConversation, setLoadingConversation] = useState(false)
  
  // Workspace state
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | undefined>(undefined)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  
  // UI state
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editInput, setEditInput] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [creatingConversationWorkspace, setCreatingConversationWorkspace] = useState<number | undefined>(undefined)
  const [showPlusDropdown, setShowPlusDropdown] = useState(false)
  const [renamingConversationId, setRenamingConversationId] = useState<number | null>(null)
  const [renameInput, setRenameInput] = useState('')
  const [showRenameDropdown, setShowRenameDropdown] = useState<number | null>(null)

  // Spinner component
  const Spinner = () => (
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
  )
  const [workspacesCollapsed, setWorkspacesCollapsed] = useState(false)
  const [triggerWorkspaceCreate, setTriggerWorkspaceCreate] = useState(false)
  const [showHumanizeModal, setShowHumanizeModal] = useState(false)
  const [humanizedText, setHumanizedText] = useState('')
  const [humanizingText, setHumanizingText] = useState(false)
  const [originalText, setOriginalText] = useState('')
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [showPlusModal, setShowPlusModal] = useState(false)
  const [collections, setCollections] = useState<any[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [loadingCollections, setLoadingCollections] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCollections, setSelectedCollections] = useState<string[]>([])
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
    setCurrentSessionId(null)
    
    console.log('✅ Workspace context set - ready for new conversation in workspace:', workspaceId)
  }

  const handleWorkspaceCreate = (workspace: Workspace) => {
    setWorkspaces(prev => [workspace, ...prev])
    setSelectedWorkspaceId(workspace.id)
    loadConversations(agent, workspace.id)
  }

  const createNewConversation = async (workspaceId: number | undefined) => {
    if (!agent) return
    
    try {
      setCreatingConversation(true)
      setCreatingConversationWorkspace(workspaceId)
      console.log('🆕 Creating new conversation immediately in workspace:', workspaceId)
      console.log('🔍 Current selectedWorkspaceId:', selectedWorkspaceId)
      console.log('🔍 WorkspaceId parameter:', workspaceId)
      
      // Create a new conversation by sending a message
      // The backend will create the conversation and return the conversation_id and session_id
      const resp = await apiClient.chatWithAgent(
        agent.id, 
        "New conversation", 
        null, // No session_id for new conversation
        undefined, // No collections
        workspaceId
      )
      
      if (resp.conversation_id) {
        setCurrentConversationId(resp.conversation_id)
        setCurrentSessionId(resp.session_id)
        setSelectedWorkspaceId(workspaceId)
        
        // Add the "New conversation" message and AI response to the chat
        const userMsg: ChatMessage = {
          id: `${Date.now()}_user`,
          role: 'user',
          content: 'New conversation',
          created_at: new Date().toISOString(),
        }
        
        const aiMsg: ChatMessage = {
          id: `${Date.now()}_assistant`,
          role: 'assistant',
          content: resp.response,
          created_at: new Date().toISOString(),
        }
        
        setMessages([userMsg, aiMsg])
        
        console.log('✅ New conversation created:', {
          conversationId: resp.conversation_id,
          sessionId: resp.session_id,
          workspaceId: workspaceId
        })
        
        // Refresh the conversation list to show the new conversation
        console.log('🔄 Refreshing conversation list for workspace:', workspaceId)
        await loadConversations(agent, workspaceId)
        console.log('✅ Conversation list refreshed')
      }
    } catch (error) {
      console.error('❌ Error creating new conversation:', error)
      setError('Failed to create new conversation')
    } finally {
      setCreatingConversation(false)
      setCreatingConversationWorkspace(undefined)
    }
  }

  const handleNewChat = (workspaceId: number) => {
    // Clear current conversation and set the workspace
    setCurrentConversationId(null)
    setCurrentSessionId(null)
    setMessages([])
    setSelectedWorkspaceId(workspaceId)
    setCreatingConversation(false) // Reset to false since we're ready for new chat
    
    // Load conversations for this workspace
    loadConversations(agent, workspaceId)
  }

  const startRenameConversation = (conversationId: number, currentTitle: string) => {
    setRenamingConversationId(conversationId)
    setRenameInput(currentTitle)
    setShowRenameDropdown(null)
  }

  const cancelRenameConversation = () => {
    setRenamingConversationId(null)
    setRenameInput('')
  }

  const saveRenameConversation = async () => {
    if (!renamingConversationId || !renameInput.trim()) return
    
    try {
      // Call API to rename conversation
      await apiClient.renameConversation(renamingConversationId, renameInput.trim())
      
      // Update the conversation in the local state
      setConversations(prev => prev.map(conv => 
        conv.id === renamingConversationId 
          ? { ...conv, title: renameInput.trim() }
          : conv
      ))
      
      console.log('✅ Conversation renamed:', renamingConversationId, 'to:', renameInput.trim())
      
      // Refresh the conversation list to get the updated title from the database
      if (agent) {
        console.log('🔄 Refreshing conversation list after rename...')
        console.log('🔍 Using workspace ID for refresh:', selectedWorkspaceId)
        await loadConversations(agent, selectedWorkspaceId)
        console.log('✅ Conversation list refreshed after rename')
      }
      
      // Clear rename state
      setRenamingConversationId(null)
      setRenameInput('')
    } catch (error) {
      console.error('❌ Error renaming conversation:', error)
      setError('Failed to rename conversation')
    }
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
        title: c.title, 
        messageCount: c.messages?.length || 0,
        workspaceId: c.workspace_id || 'null' 
      })))
      console.log('🔍 Current selectedWorkspaceId when loading:', selectedWorkspaceId)
      
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
    setCurrentSessionId(null)
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
      setCurrentSessionId(conversationData.session_id)
      
      console.log('✅ Loaded conversation:', {
        conversationId,
        messageCount: chatMessages.length,
        currentConversationId: parseInt(conversationId),
        sessionId: conversationData.session_id
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
    setCurrentSessionId(null)
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPlusDropdown) {
        const target = event.target as Element
        if (!target.closest('.relative')) {
          setShowPlusDropdown(false)
        }
      }
      if (showRenameDropdown !== null) {
        const target = event.target as Element
        if (!target.closest('.relative')) {
          setShowRenameDropdown(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPlusDropdown, showRenameDropdown])

  // Reset workspace create trigger after it's been used
  useEffect(() => {
    if (triggerWorkspaceCreate) {
      setTriggerWorkspaceCreate(false)
    }
  }, [triggerWorkspaceCreate])

  const sendMessage = async () => {
    if (!input.trim() || !agent || sending) return
    
    console.log('📤 Sending message...')
    console.log('📋 Message details:', {
      content: input.trim(),
      currentConversationId: currentConversationId,
      currentSessionId: currentSessionId,
      agentId: agent.id,
      agentName: agent.name,
      selectedWorkspaceId: selectedWorkspaceId,
      selectedCollections: selectedCollections
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
          currentSessionId, // Send current session ID for conversation continuation
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
          selectedWorkspaceId,
          selectedCollections.length > 0 ? selectedCollections : undefined
        )
      } else {
        // Use regular mode
        const resp = await apiClient.chatWithAgent(agent.id, userMsg.content, currentSessionId, selectedCollections.length > 0 ? selectedCollections : undefined, selectedWorkspaceId)
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

  const humanizeText = async (text: string) => {
    try {
      setHumanizingText(true)
      setOriginalText(text)
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Use humanize-plus library for text transformation
      let humanized = text
      
      // Apply various humanization techniques using the library
      // 1. Capitalize and format text naturally
      humanized = Humanize.capitalize(humanized, true)
      
      // 2. Replace formal phrases with more natural ones
      humanized = humanized
        .replace(/Furthermore/g, 'What\'s more')
        .replace(/Additionally/g, 'Plus')
        .replace(/Moreover/g, 'On top of that')
        .replace(/In conclusion/g, 'To wrap this up')
        .replace(/It is important to note/g, 'Here\'s the thing')
        .replace(/Furthermore, it should be noted/g, 'Another key point')
        .replace(/In order to/g, 'To')
        .replace(/Due to the fact that/g, 'Since')
        .replace(/At this point in time/g, 'Now')
        .replace(/In the event that/g, 'If')
        .replace(/It should be noted that/g, 'Keep in mind that')
        .replace(/It is worth noting/g, 'Worth mentioning')
        .replace(/In other words/g, 'Put simply')
        .replace(/As a result/g, 'So')
        .replace(/In addition/g, 'Also')
        .replace(/For instance/g, 'For example')
        .replace(/In particular/g, 'Especially')
        .replace(/It is clear that/g, 'Clearly')
        .replace(/It is evident that/g, 'Obviously')
        .replace(/It is apparent that/g, 'It\'s clear that')
        .replace(/It is obvious that/g, 'Obviously')
        .replace(/It is important to understand/g, 'It\'s key to understand')
        .replace(/It is crucial to note/g, 'It\'s crucial to note')
        .replace(/It is essential to remember/g, 'Remember')
        .replace(/It is necessary to consider/g, 'Consider')
        .replace(/It is vital to understand/g, 'It\'s vital to understand')
        .replace(/It is worth considering/g, 'Consider')
        .replace(/It is worth mentioning/g, 'Worth mentioning')
        .replace(/It is worth noting/g, 'Worth noting')
        .replace(/It is worth remembering/g, 'Remember')
        .replace(/It is worth understanding/g, 'Understand')
        .replace(/It is worth considering/g, 'Consider')
        .replace(/It is worth mentioning/g, 'Worth mentioning')
        .replace(/It is worth noting/g, 'Worth noting')
        .replace(/It is worth remembering/g, 'Remember')
        .replace(/It is worth understanding/g, 'Understand')
      
      // 3. Add some natural sentence variations
      const sentences = humanized.split('. ')
      const variedSentences = sentences.map((sentence, index) => {
        if (index === 0) return sentence
        // Occasionally start with a more casual connector
        const casualStarters = ['Plus,', 'Also,', 'And', 'But', 'However,', 'Meanwhile,', 'On the other hand,']
        if (Math.random() < 0.3 && sentence.length > 20) {
          const starter = casualStarters[Math.floor(Math.random() * casualStarters.length)]
          return `${starter} ${sentence.toLowerCase()}`
        }
        return sentence
      })
      
      humanized = variedSentences.join('. ')
      
      // 4. Apply title case for better readability
      humanized = Humanize.titleCase(humanized)
      
      setHumanizedText(humanized)
      setShowHumanizeModal(true)
    } catch (err) {
      console.error('Failed to humanize text: ', err)
      setError('Failed to humanize text')
    } finally {
      setHumanizingText(false)
    }
  }

  const generatePDF = async (content: string, messageId: string) => {
    try {
      setGeneratingPDF(true)
      
      // Create a temporary div with the content
      const tempDiv = document.createElement('div')
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '0'
      tempDiv.style.width = '800px'
      tempDiv.style.padding = '40px 40px 60px 40px' // Extra bottom padding
      tempDiv.style.backgroundColor = 'white'
      tempDiv.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      tempDiv.style.lineHeight = '1.6'
      tempDiv.style.color = '#333'
      tempDiv.style.pageBreakInside = 'auto'
      tempDiv.style.orphans = '3'
      tempDiv.style.widows = '3'
      tempDiv.style.marginBottom = '20px' // Extra margin at bottom
      // Enhanced markdown processing with proper list handling
      const processMarkdown = (text: string) => {
        let processed = text
        
        // Headers with page break handling
        processed = processed.replace(/^### (.*$)/gim, '<h3 style="color: #2563eb; font-size: 1.25em; margin: 1.5em 0 0.5em 0; font-weight: 600; page-break-after: avoid; page-break-inside: avoid;">$1</h3>')
        processed = processed.replace(/^## (.*$)/gim, '<h2 style="color: #2563eb; font-size: 1.5em; margin: 1.5em 0 0.5em 0; font-weight: 600; page-break-after: avoid; page-break-inside: avoid;">$1</h2>')
        processed = processed.replace(/^# (.*$)/gim, '<h1 style="color: #2563eb; font-size: 1.75em; margin: 1.5em 0 0.5em 0; font-weight: 600; page-break-after: avoid; page-break-inside: avoid;">$1</h1>')
        
        // Bold and italic
        processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>')
        processed = processed.replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>')
        
        // Code blocks (multi-line) with page break handling
        processed = processed.replace(/```([\s\S]*?)```/g, '<pre style="background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 1em 0; font-family: \'Monaco\', \'Menlo\', monospace; font-size: 0.9em; border-left: 4px solid #3b82f6; page-break-inside: avoid; break-inside: avoid;">$1</pre>')
        
        // Inline code
        processed = processed.replace(/`(.*?)`/g, '<code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: \'Monaco\', \'Menlo\', monospace; font-size: 0.9em;">$1</code>')
        
        // Blockquotes with page break handling
        processed = processed.replace(/^> (.*$)/gim, '<blockquote style="border-left: 4px solid #3b82f6; margin: 1em 0; padding-left: 1em; color: #6b7280; font-style: italic; page-break-inside: avoid; break-inside: avoid;">$1</blockquote>')
        
        // Process ordered lists first (numbered lists)
        const lines = processed.split('\n')
        let inOrderedList = false
        let orderedListItems = []
        let result = []
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/)
          
          if (orderedMatch) {
            if (!inOrderedList) {
              // Start new ordered list
              inOrderedList = true
              orderedListItems = []
            }
            orderedListItems.push(orderedMatch[2])
          } else {
            // End of ordered list, process it
            if (inOrderedList) {
              result.push(`<ol style="margin: 1em 0; padding-left: 2em; page-break-inside: avoid; break-inside: avoid;">`)
              orderedListItems.forEach(item => {
                result.push(`<li style="margin-bottom: 0.5em; page-break-inside: avoid; break-inside: avoid;">${item}</li>`)
              })
              result.push(`</ol>`)
              inOrderedList = false
              orderedListItems = []
            }
            
            // Process unordered lists
            if (line.match(/^[\*\-\+]\s+(.*)$/)) {
              const unorderedMatch = line.match(/^[\*\-\+]\s+(.*)$/)
              if (unorderedMatch) {
                result.push(`<ul style="margin: 1em 0; padding-left: 2em; page-break-inside: avoid; break-inside: avoid;">`)
                result.push(`<li style="margin-bottom: 0.5em; page-break-inside: avoid; break-inside: avoid;">${unorderedMatch[1]}</li>`)
                
                // Check for consecutive unordered list items
                let j = i + 1
                while (j < lines.length && lines[j].match(/^[\*\-\+]\s+(.*)$/)) {
                  const nextMatch = lines[j].match(/^[\*\-\+]\s+(.*)$/)
                  if (nextMatch) {
                    result.push(`<li style="margin-bottom: 0.5em; page-break-inside: avoid; break-inside: avoid;">${nextMatch[1]}</li>`)
                  }
                  j++
                }
                result.push(`</ul>`)
                i = j - 1 // Skip processed lines
                continue
              }
            } else {
              result.push(line)
            }
          }
        }
        
        // Handle any remaining ordered list
        if (inOrderedList) {
          result.push(`<ol style="margin: 1em 0; padding-left: 2em; page-break-inside: avoid; break-inside: avoid;">`)
          orderedListItems.forEach(item => {
            result.push(`<li style="margin-bottom: 0.5em; page-break-inside: avoid; break-inside: avoid;">${item}</li>`)
          })
          result.push(`</ol>`)
        }
        
        processed = result.join('\n')
        
        // Links
        processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #3b82f6; text-decoration: none;">$1</a>')
        
        // Tables (basic support) with page break handling
        const tableRegex = /^\|(.+)\|\s*\n\|[-\s|]+\|\s*\n((?:\|.+\|\s*\n?)*)/gm
        processed = processed.replace(tableRegex, (match, header, rows) => {
          const headerCells = header.split('|').map(cell => cell.trim()).filter(cell => cell)
          const rowLines = rows.trim().split('\n').filter(line => line.trim())
          
          let tableHtml = '<table style="border-collapse: collapse; width: 100%; margin: 1em 0; border: 1px solid #d1d5db; page-break-inside: avoid; break-inside: avoid;">'
          
          // Header
          tableHtml += '<thead><tr>'
          headerCells.forEach(cell => {
            tableHtml += `<th style="border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; background: #f9fafb; font-weight: 600; page-break-after: avoid;">${cell}</th>`
          })
          tableHtml += '</tr></thead>'
          
          // Rows
          tableHtml += '<tbody>'
          rowLines.forEach(line => {
            const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell)
            tableHtml += '<tr style="page-break-inside: avoid; break-inside: avoid;">'
            cells.forEach(cell => {
              tableHtml += `<td style="border: 1px solid #d1d5db; padding: 8px 12px; text-align: left;">${cell}</td>`
            })
            tableHtml += '</tr>'
          })
          tableHtml += '</tbody></table>'
          
          return tableHtml
        })
        
        // Horizontal rules with page break handling
        processed = processed.replace(/^---$/gim, '<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 2em 0; page-break-after: avoid; page-break-before: avoid;">')
        processed = processed.replace(/^\*\*\*$/gim, '<hr style="border: none; border-top: 2px solid #e5e7eb; margin: 2em 0; page-break-after: avoid; page-break-before: avoid;">')
        
        // Add page break classes for better control
        processed = processed.replace(/\n\n/g, '</p><p style="margin: 1em 0; page-break-inside: avoid; orphans: 2; widows: 2;">')
        processed = processed.replace(/^/, '<p style="margin: 1em 0; page-break-inside: avoid; orphans: 2; widows: 2;">')
        processed = processed.replace(/$/, '</p>')
        
        // Line breaks within paragraphs
        processed = processed.replace(/\n/g, '<br>')
        
        return processed
      }
      
      tempDiv.innerHTML = `
        <style>
          @media print {
            .page-break { page-break-before: always; }
            .no-break { page-break-inside: avoid; break-inside: avoid; }
            .avoid-break-after { page-break-after: avoid; }
            .avoid-break-before { page-break-before: avoid; }
            body { margin: 0; padding: 20px 0; }
            * { box-sizing: border-box; }
          }
          .page-content {
            margin-top: 20px;
            margin-bottom: 50px; /* Extra space for footer */
            padding-bottom: 20px;
          }
          .page-spacing {
            margin-top: 20px;
            margin-bottom: 20px;
          }
          .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 40px;
            background: white;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 20px;
            font-size: 0.8em;
            color: #6b7280;
            z-index: 1000;
          }
          .page-number {
            font-weight: 500;
          }
          .generated-date {
            font-style: italic;
          }
        </style>
        <div style="text-align: center; margin-bottom: 2em; padding-bottom: 1em; border-bottom: 2px solid #e5e7eb; page-break-after: avoid;">
          <h1 style="color: #2563eb; font-size: 2em; margin: 0 0 0.5em 0; font-weight: 600; page-break-after: avoid;">Chat Message Export</h1>
        </div>
        <div class="page-content" style="max-width: 100%; word-wrap: break-word; line-height: 1.6; orphans: 3; widows: 3; margin-top: 20px; margin-bottom: 50px; padding-bottom: 20px;">
          ${processMarkdown(content)}
        </div>
        <div class="footer">
          <div class="generated-date">Generated on ${new Date().toLocaleString()}</div>
          <div class="page-number">Page <span class="page-number"></span></div>
        </div>
      `
      
      document.body.appendChild(tempDiv)
      
      // Convert to canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })
      
      // Remove temporary div
      document.body.removeChild(tempDiv)
      
      // Create PDF with proper margins
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      // Set page margins (top, right, bottom, left)
      const marginTop = 20
      const marginBottom = 20
      const marginLeft = 15
      const marginRight = 15
      
      const imgWidth = 210 - marginLeft - marginRight // A4 width minus margins
      const pageHeight = 295 - marginTop - marginBottom // A4 height minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      
      let position = 0
      
      // Add first page with margins
      pdf.addImage(imgData, 'PNG', marginLeft, marginTop + position, imgWidth, imgHeight)
      
      // Add page number to first page
      pdf.setFontSize(10)
      pdf.setTextColor(100, 100, 100)
      pdf.text('Page 1', 210 - marginRight - 20, 295 - marginBottom + 15)
      pdf.text(`Generated on ${new Date().toLocaleString()}`, marginLeft, 295 - marginBottom + 15)
      
      heightLeft -= pageHeight
      let pageNumber = 2
      
      // Add additional pages if needed with proper spacing
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        
        // Add page number to each page
        pdf.setFontSize(10)
        pdf.setTextColor(100, 100, 100)
        pdf.text(`Page ${pageNumber}`, 210 - marginRight - 20, 295 - marginBottom + 15)
        pdf.text(`Generated on ${new Date().toLocaleString()}`, marginLeft, 295 - marginBottom + 15)
        
        // Add some spacing at the top of new pages
        pdf.addImage(imgData, 'PNG', marginLeft, marginTop + position + 10, imgWidth, imgHeight)
        heightLeft -= pageHeight
        pageNumber++
      }
      
      // Download the PDF
      const fileName = `chat-message-${messageId}-${Date.now()}.pdf`
      pdf.save(fileName)
      
    } catch (err) {
      console.error('Failed to generate PDF: ', err)
      setError('Failed to generate PDF')
    } finally {
      setGeneratingPDF(false)
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
      const resp = await apiClient.chatWithAgent(agent.id, updatedUserMsg.content, currentSessionId, undefined, selectedWorkspaceId)
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

  // Load collections for plus modal
  const loadCollections = async () => {
    try {
      setLoadingCollections(true)
      const collectionsData = await apiClient.getKnowledgeBaseCollections()
      setCollections(collectionsData)
    } catch (err) {
      console.error('Failed to load collections:', err)
    } finally {
      setLoadingCollections(false)
    }
  }

  // Load files for plus modal
  const loadFiles = async () => {
    try {
      setLoadingFiles(true)
      const filesData = await apiClient.getFiles()
      setFiles(filesData)
    } catch (err) {
      console.error('Failed to load files:', err)
    } finally {
      setLoadingFiles(false)
    }
  }

  // Handle plus modal open
  const handlePlusModalOpen = async () => {
    setShowPlusModal(true)
    setCurrentPage(1)
    setSearchTerm('')
    await Promise.all([loadCollections(), loadFiles()])
  }

  // Filter items based on search term
  const getFilteredItems = () => {
    const allItems = [...collections, ...files]
    if (!searchTerm.trim()) return allItems
    
    return allItems.filter(item => {
      const isCollection = 'document_count' in item
      const searchLower = searchTerm.toLowerCase()
      
      if (isCollection) {
        return item.name.toLowerCase().includes(searchLower) ||
               (item.description && item.description.toLowerCase().includes(searchLower))
      } else {
        return item.original_name.toLowerCase().includes(searchLower) ||
               (item.mime_type && item.mime_type.toLowerCase().includes(searchLower))
      }
    })
  }

  // Get paginated items
  const getPaginatedItems = () => {
    const filteredItems = getFilteredItems()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredItems.slice(startIndex, endIndex)
  }

  const filteredItems = getFilteredItems()
  const totalItems = filteredItems.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const paginatedItems = getPaginatedItems()

  // Update pagination when collections or files change
  useEffect(() => {
    const newTotalPages = Math.ceil(totalItems / itemsPerPage)
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages)
    }
  }, [collections.length, files.length, currentPage, itemsPerPage, totalItems])

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Handle collection selection
  const handleCollectionToggle = (collectionName: string) => {
    setSelectedCollections(prev => {
      if (prev.includes(collectionName)) {
        return prev.filter(name => name !== collectionName)
      } else {
        return [...prev, collectionName]
      }
    })
  }

  // Clear all selected collections
  const clearSelectedCollections = () => {
    setSelectedCollections([])
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

              {/* Creating Conversation Loading Overlay */}
              {creatingConversation && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3 text-gray-600">
                    <Spinner />
                    <span className="text-sm">
                      {creatingConversationWorkspace 
                        ? `Creating new conversation in workspace...` 
                        : 'Creating new conversation...'
                      }
                    </span>
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
                                title={copiedMessageId === m.id ? "Copied!" : "Copy message"}
                              >
                                {copiedMessageId === m.id ? (
                                  <CheckIcon className="w-3 h-3 lg:w-4 lg:h-4 text-green-500" />
                                ) : (
                                  <ClipboardIcon className="w-3 h-3 lg:w-4 lg:h-4 text-gray-500" />
                                )}
                              </button>
                              <button
                                onClick={() => humanizeText(m.content)}
                                className="p-1 rounded hover:bg-gray-100 transition-colors"
                                title="Humanize text"
                                disabled={humanizingText}
                              >
                                <FaHeadSideVirus className={`w-3 h-3 lg:w-4 lg:h-4 ${humanizingText ? 'text-blue-500 animate-pulse' : 'text-gray-500'}`} />
                              </button>
                              <button
                                onClick={() => generatePDF(m.content, m.id)}
                                className="p-1 rounded hover:bg-gray-100 transition-colors"
                                title="Download as PDF"
                                disabled={generatingPDF}
                              >
                                <HiDocument className={`w-3 h-3 lg:w-4 lg:h-4 ${generatingPDF ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
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
                {/* Plus icon on the left */}
                <div className="absolute left-3 lg:left-4 top-1/2 transform -translate-y-1/2 z-10">
                  <button
                    onClick={handlePlusModalOpen}
                    className="p-1.5 lg:p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Add attachment or tool"
                  >
                    <PlusIcon className="w-4 h-4 lg:w-5 lg:h-5 text-gray-500" />
                  </button>
                </div>
                
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={selectedCollections.length > 0 ? `Message... (${selectedCollections.length} collection${selectedCollections.length > 1 ? 's' : ''} selected)` : "Message..."}
                  className="w-full resize-none min-h-[52px] lg:min-h-[60px] max-h-40 rounded-2xl pl-12 lg:pl-14 pr-32 py-3 lg:py-4 text-sm lg:text-base focus:outline-none border border-gray-200 focus:border-blue-400 transition-all duration-200" 
                  style={{ 
                    background: selectedCollections.length > 0 
                      ? 'linear-gradient(180deg,#f0f9ff,#e0f2fe)' 
                      : 'linear-gradient(180deg,#ffffff,#fafbfc)',
                    boxShadow: selectedCollections.length > 0
                      ? '0 2px 8px rgba(59, 130, 246, 0.1), 0 1px 2px rgba(59, 130, 246, 0.06)'
                      : '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)'
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

              {/* Plus Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowPlusDropdown(!showPlusDropdown)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="New"
                >
                  <svg className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                
                {showPlusDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="py-1">
                        <button
                          onClick={() => {
                            setShowPlusDropdown(false)
                            createNewConversation(selectedWorkspaceId || undefined)
                          }}
                          disabled={creatingConversation}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {creatingConversation ? (
                            <Spinner />
                          ) : (
                            <HiOutlinePencilAlt className="w-4 h-4" />
                          )}
                          {creatingConversation ? 'Creating...' : 'New Chat'}
                        </button>
                      <button
                        onClick={() => {
                          setShowPlusDropdown(false)
                          setTriggerWorkspaceCreate(true)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        New Workspace
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
              
            {/* Workspaces Section */}
            <div className="mb-4">
              {/* Workspaces Header with Toggle */}
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setWorkspacesCollapsed(!workspacesCollapsed)}
                  className="flex items-center gap-2 text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <svg 
                    className={`w-3 h-3 transition-transform ${workspacesCollapsed ? 'rotate-0' : 'rotate-90'}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Workspaces
                </button>
              </div>

              {/* Workspace Manager - Collapsible */}
              {!workspacesCollapsed && (
                <div className="max-h-48 overflow-y-auto mb-3">
                   <WorkspaceManager
                     agentId={agentId}
                     selectedWorkspaceId={selectedWorkspaceId}
                     onWorkspaceSelect={handleWorkspaceSelect}
                     onWorkspaceCreate={handleWorkspaceCreate}
                     onNewChat={createNewConversation}
                     triggerCreate={triggerWorkspaceCreate}
                     creatingConversation={creatingConversation}
                   />
                </div>
              )}

            </div>

            {/* My Chats Section */}
                <div className="space-y-2">
              <div className="text-xs font-medium text-slate-600 mb-2">My Chats</div>
              {loadingConversations ? (
                <div className="text-xs text-gray-500 p-2">Loading conversations...</div>
              ) : conversations.filter(c => !c.workspace_id).length > 0 ? (
                <div className="space-y-1">
                  {conversations.filter(c => !c.workspace_id).slice(0, 5).map((conversation) => {
                    const isActive = currentConversationId === parseInt(conversation.id)
                    const isRenaming = renamingConversationId === parseInt(conversation.id)
                    return (
                      <div key={conversation.id} className="relative group">
                        {isRenaming ? (
                          <div className="flex items-center gap-2 p-2 rounded-md bg-white border border-blue-200">
                            <input
                              type="text"
                              value={renameInput}
                              onChange={(e) => setRenameInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveRenameConversation()
                                if (e.key === 'Escape') cancelRenameConversation()
                              }}
                              className="flex-1 text-xs font-medium text-gray-700 bg-transparent border-none outline-none"
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={saveRenameConversation}
                                className="p-1 text-green-600 hover:bg-green-100 rounded"
                                title="Save"
                              >
                                ✓
                              </button>
                              <button
                                onClick={cancelRenameConversation}
                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => loadConversation(conversation.id)}
                            className={`w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors ${
                              isActive 
                                ? 'bg-blue-100 border border-blue-200'
                                : 'hover:bg-gray-100 border border-transparent'
                            }`}
                          >
                            <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-700 truncate">
                                {loadingConversation && isActive ? (
                                <span className="text-blue-600">Loading...</span>
                              ) : (
                                conversation.title || (conversation.messages?.length > 0 
                                    ? conversation.messages[0].content.substring(0, 20) + '...' 
                                  : 'Empty conversation')
                              )}
                            </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowRenameDropdown(showRenameDropdown === parseInt(conversation.id) ? null : parseInt(conversation.id))
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
                              title="Rename conversation"
                            >
                              <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                          </button>
                        )}
                        
                        {/* Rename dropdown */}
                        {showRenameDropdown === parseInt(conversation.id) && (
                          <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <button
                              onClick={() => {
                                startRenameConversation(parseInt(conversation.id), conversation.title || (conversation.messages?.length > 0 ? conversation.messages[0].content.substring(0, 20) + '...' : 'Empty conversation'))
                              }}
                              className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => {
                                setShowRenameDropdown(null)
                                deleteConversation(conversation.id, new MouseEvent('click'))
                              }}
                              className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-xs text-gray-500 p-2">No chats yet</div>
              )}
            </div>
          </div>
        </motion.aside>
      )}

      {/* Humanize Modal */}
      {showHumanizeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden flex flex-col" 
            style={{ boxShadow: '0 20px 60px rgba(99, 179, 237, 0.08)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FaHeadSideVirus className="w-5 h-5 text-blue-500" />
                Humanized Text
              </h3>
              <button 
                onClick={() => setShowHumanizeModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-4">
              <div className="prose prose-sm lg:prose-base max-w-none">
                <MarkdownRenderer content={humanizedText} />
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Original length: {originalText.length} chars</span>
                <span>•</span>
                <span>Humanized length: {humanizedText.length} chars</span>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const blob = new Blob([humanizedText], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'humanized-text.txt'
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download
                </button>
                
                <button
                  onClick={() => copyToClipboard(humanizedText, 'humanized')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <ClipboardIcon className="w-4 h-4" />
                  Copy Text
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Plus Modal */}
      {showPlusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden"
            style={{ boxShadow: '0 20px 60px rgba(99, 179, 237, 0.08)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <PlusIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Add to Chat</h3>
                  <p className="text-sm text-gray-600">Select collections or files to include</p>
                </div>
              </div>
              <button
                onClick={() => setShowPlusModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search collections and files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-full text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Selected Collections */}
            {selectedCollections.length > 0 && (
              <div className="px-6 py-3 border-b border-gray-200 bg-blue-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="text-sm font-medium text-blue-900">
                      {selectedCollections.length} collection{selectedCollections.length > 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <button
                    onClick={clearSelectedCollections}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCollections.map((collectionName) => (
                    <span
                      key={collectionName}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {collectionName}
                      <button
                        onClick={() => handleCollectionToggle(collectionName)}
                        className="hover:text-blue-600"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Items List */}
              {paginatedItems.length > 0 && (
                <div className="space-y-4">
                  {paginatedItems.map((item, index) => {
                    const isCollection = 'document_count' in item
                    return (
                      <div
                        key={isCollection ? item.id : item.id}
                        className={`p-4 border rounded-xl transition-all cursor-pointer ${
                          isCollection 
                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50' 
                            : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              isCollection ? 'bg-blue-100' : 'bg-green-100'
                            }`}>
                              <svg className={`w-4 h-4 ${
                                isCollection ? 'text-blue-600' : 'text-green-600'
                              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isCollection ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                )}
                              </svg>
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900">
                                {isCollection ? item.name : item.original_name}
                              </h5>
                              <p className="text-sm text-gray-600">
                                {isCollection 
                                  ? `${item.document_count} documents` 
                                  : `${(item.file_size / 1024).toFixed(1)} KB`
                                }
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              if (isCollection) {
                                handleCollectionToggle(item.name)
                              }
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              isCollection 
                                ? selectedCollections.includes(item.name)
                                  ? 'bg-blue-100 text-blue-600'
                                  : 'hover:bg-blue-100 text-blue-600'
                                : 'hover:bg-green-100 text-green-600'
                            }`}
                          >
                            {isCollection && selectedCollections.includes(item.name) ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <PlusIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Empty State */}
              {paginatedItems.length === 0 && !loadingCollections && !loadingFiles && (
                <div className="text-center py-12">
                  {searchTerm ? (
                    <>
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
                      <p className="text-gray-600 mb-6">Try adjusting your search terms or browse all items</p>
                      <button
                        onClick={() => setSearchTerm('')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Clear Search
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <PlusIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No items available</h3>
                      <p className="text-gray-600 mb-6">Create collections or upload files to get started</p>
                      <div className="flex gap-3 justify-center">
                        <Link
                          href="/dashboard/knowledge-base"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Knowledge Base
                        </Link>
                        <Link
                          href="/dashboard/knowledge-base"
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          File Library
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Loading State */}
              {(loadingCollections || loadingFiles) && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading items...</p>
                </div>
              )}
            </div>

            {/* Footer with Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {searchTerm ? (
                      <>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results for "{searchTerm}"</>
                    ) : (
                      <>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items</>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  )
}

