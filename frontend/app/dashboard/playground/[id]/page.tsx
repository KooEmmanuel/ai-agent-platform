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
  const endRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

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
    if (storedSession) setSessionId(storedSession)

    ;(async () => {
      try {
        setLoading(true)
        const data = await apiClient.getAgent(agentId)
        setAgent(data)
        setSelectedModel(data.model || 'gpt-4o-mini')
      } catch (e: any) {
        setError(e?.message || 'Failed to load agent')
      } finally {
        setLoading(false)
      }
    })()
  }, [agentId])

  const sendMessage = async () => {
    if (!input.trim() || !agent || sending) return
    setError(null)
    setSending(true)

    const userMsg: ChatMessage = {
      id: `${Date.now()}_user`,
      role: 'user',
      content: input.trim(),
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    try {
      const resp = await apiClient.chatWithAgent(agent.id, userMsg.content, sessionId)
      if (resp.session_id && typeof window !== 'undefined') {
        localStorage.setItem(`playground_session_${agent.id}`, resp.session_id)
        setSessionId(resp.session_id)
      }
      // Check if response contains downloadable content
      let downloadable = undefined
      let content = resp.response
      
      // Check if response is a JSON object with downloadable content
      try {
        const responseData = JSON.parse(resp.response)
        if (responseData.success && responseData.pdf_base64) {
          // This is a PDF response
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
      
      const aiMsg: ChatMessage = {
        id: `${Date.now()}_assistant`,
        role: 'assistant',
        content: content,
        created_at: new Date().toISOString(),
        downloadable: downloadable
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (e: any) {
      setError(e?.message || 'Failed to send message')
    } finally {
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
                onClick={() => setSidebarVisible(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Hide sidebar"
              >
                <EyeSlashIcon className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Real conversation history would go here */}
              {messages.length > 0 && (
                <div className="p-3 rounded-xl cursor-pointer hover:translate-x-1 transition-transform duration-150" 
                     style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.6), rgba(250,250,255,0.6))', boxShadow: '0 6px 18px rgba(99, 179, 237, 0.06)' }}>
                  <div className="text-sm font-medium">Current Session</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {messages.length} messages • {sessionId ? 'Active' : 'New'}
                  </div>
                </div>
              )}

              <button 
                onClick={() => {
                  setMessages([])
                  setSessionId(undefined)
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem(`playground_session_${agent.id}`)
                  }
                }}
                className="w-full mt-2 rounded-xl py-2 px-3 text-sm lg:text-base font-medium shadow-sm" 
                style={{ background: 'linear-gradient(90deg,#E6F6FF,#F6FBFF)' }}
              >
                + New Conversation
              </button>
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
                    <span className="text-sm lg:text-base text-gray-600">Thinking...</span>
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

