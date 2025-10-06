'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ChatBubbleLeftIcon,
  UserIcon,
  EnvelopeIcon,
  CalendarIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import { useToast } from '../../../components/ui/Toast'

interface SupportTicket {
  id: number
  user_id: number | null
  user_email: string
  user_name: string | null
  subject: string
  description: string
  category: string
  priority: string
  status: string
  assigned_to: number | null
  admin_notes: string | null
  resolution: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  assigned_admin_name: string | null
  message_count: number
}

interface SupportMessage {
  id: number
  ticket_id: number
  sender_type: string
  sender_name: string
  sender_email: string
  message: string
  is_internal: boolean
  created_at: string
}

interface SupportStats {
  total_tickets: number
  open_tickets: number
  in_progress_tickets: number
  resolved_tickets: number
  high_priority_tickets: number
  urgent_tickets: number
  tickets_by_category: { [key: string]: number }
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [stats, setStats] = useState<SupportStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const { showToast } = useToast()

  useEffect(() => {
    fetchTickets()
    fetchStats()
  }, [statusFilter, priorityFilter, categoryFilter])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const adminToken = localStorage.getItem('admin_token')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      let url = `${apiBaseUrl}/api/v1/support/tickets`
      const params = new URLSearchParams()
      if (statusFilter) params.append('status_filter', statusFilter)
      if (priorityFilter) params.append('priority_filter', priorityFilter)
      if (categoryFilter) params.append('category_filter', categoryFilter)
      if (params.toString()) url += `?${params.toString()}`

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
      } else {
        showToast({
          type: 'error',
          title: 'Failed to load tickets',
          message: 'Could not fetch support tickets. Please try again.',
          duration: 4000
        })
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load support tickets. Please check your connection.',
        duration: 4000
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const adminToken = localStorage.getItem('admin_token')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      const response = await fetch(`${apiBaseUrl}/api/v1/support/tickets/stats`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchTicketDetails = async (ticketId: number) => {
    try {
      const adminToken = localStorage.getItem('admin_token')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      const response = await fetch(`${apiBaseUrl}/api/v1/support/tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSelectedTicket(data.ticket)
        setMessages(data.messages || [])
        setShowTicketModal(true)
      } else {
        showToast({
          type: 'error',
          title: 'Failed to load ticket',
          message: 'Could not fetch ticket details. Please try again.',
          duration: 4000
        })
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load ticket details. Please try again.',
        duration: 4000
      })
    }
  }

  const updateTicketStatus = async (ticketId: number, status: string) => {
    try {
      const adminToken = localStorage.getItem('admin_token')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      const response = await fetch(`${apiBaseUrl}/api/v1/support/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        showToast({
          type: 'success',
          title: 'Ticket updated',
          message: 'Ticket status updated successfully.',
          duration: 3000
        })
        fetchTickets()
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status })
        }
      } else {
        showToast({
          type: 'error',
          title: 'Failed to update ticket',
          message: 'Could not update ticket status. Please try again.',
          duration: 4000
        })
      }
    } catch (error) {
      console.error('Error updating ticket:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update ticket. Please try again.',
        duration: 4000
      })
    }
  }

  const addMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return

    try {
      const adminToken = localStorage.getItem('admin_token')
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      const response = await fetch(`${apiBaseUrl}/api/v1/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: newMessage,
          is_internal: isInternal
        })
      })

      if (response.ok) {
        showToast({
          type: 'success',
          title: 'Message sent',
          message: 'Your message has been added to the ticket.',
          duration: 3000
        })
        setNewMessage('')
        setIsInternal(false)
        fetchTicketDetails(selectedTicket.id)
      } else {
        showToast({
          type: 'error',
          title: 'Failed to send message',
          message: 'Could not add message to ticket. Please try again.',
          duration: 4000
        })
      }
    } catch (error) {
      console.error('Error adding message:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to send message. Please try again.',
        duration: 4000
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'auth': return 'bg-blue-100 text-blue-800'
      case 'billing': return 'bg-purple-100 text-purple-800'
      case 'technical': return 'bg-green-100 text-green-800'
      case 'general': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading support tickets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
        <p className="mt-2 text-gray-600">Manage user support requests and inquiries</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Tickets</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_tickets}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Open Tickets</p>
                <p className="text-2xl font-bold text-gray-900">{stats.open_tickets}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ClockIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{stats.in_progress_tickets}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Resolved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.resolved_tickets}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="auth">Authentication</option>
              <option value="billing">Billing</option>
              <option value="technical">Technical</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Support Tickets</h2>
          <p className="text-sm text-gray-600">{tickets.length} tickets found</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{ticket.subject}</div>
                      <div className="text-sm text-gray-500">#{ticket.id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{ticket.user_name || 'Unknown User'}</div>
                      <div className="text-sm text-gray-500">{ticket.user_email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(ticket.category)}`}>
                      {ticket.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => fetchTicketDetails(ticket.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {ticket.status === 'open' && (
                        <button
                          onClick={() => updateTicketStatus(ticket.id, 'in_progress')}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Start working"
                        >
                          <ClockIcon className="h-4 w-4" />
                        </button>
                      )}
                      {ticket.status === 'in_progress' && (
                        <button
                          onClick={() => updateTicketStatus(ticket.id, 'resolved')}
                          className="text-green-600 hover:text-green-900"
                          title="Mark resolved"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Ticket Details Modal */}
      {showTicketModal && selectedTicket && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 w-full max-w-4xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] rounded-xl bg-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedTicket.subject}</h3>
                <p className="text-sm text-gray-500">#{selectedTicket.id}</p>
              </div>
              <button
                onClick={() => setShowTicketModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Ticket Info */}
              <div className="lg:col-span-1">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">User</label>
                    <p className="text-sm text-gray-900">{selectedTicket.user_name || 'Unknown User'}</p>
                    <p className="text-xs text-gray-500">{selectedTicket.user_email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedTicket.status)}`}>
                      {selectedTicket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Priority</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Category</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(selectedTicket.category)}`}>
                      {selectedTicket.category}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Created</label>
                    <p className="text-sm text-gray-900">{new Date(selectedTicket.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="lg:col-span-2">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{selectedTicket.description}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Messages ({messages.length})</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {messages.map((message) => (
                        <div key={message.id} className={`p-3 rounded-lg ${message.sender_type === 'admin' ? 'bg-blue-50' : 'bg-gray-50'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">{message.sender_name}</span>
                            <span className="text-xs text-gray-500">{new Date(message.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-gray-700">{message.message}</p>
                          {message.is_internal && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full mt-1">
                              Internal Note
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add Message */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Add Message</h4>
                    <div className="space-y-3">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message here..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isInternal}
                            onChange={(e) => setIsInternal(e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Internal note (not visible to user)</span>
                        </label>
                        <button
                          onClick={addMessage}
                          disabled={!newMessage.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Send Message
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
