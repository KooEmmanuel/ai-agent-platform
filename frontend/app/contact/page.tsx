'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  EnvelopeIcon, 
  PhoneIcon, 
  MapPinIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useToast } from '../../components/ui/Toast'
import DrixaiLogo from '../../components/ui/drixai-logo'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiBaseUrl}/api/v1/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: formData.email,
          user_name: formData.name,
          subject: formData.subject,
          description: formData.message,
          category: formData.category,
          priority: 'medium'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setIsSubmitted(true)
        showToast({
          type: 'success',
          title: 'Support ticket created!',
          message: `Your ticket #${data.ticket_id} has been submitted. We'll get back to you soon.`,
          duration: 5000
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        showToast({
          type: 'error',
          title: 'Failed to submit ticket',
          message: errorData.detail || 'Could not submit your support request. Please try again.',
          duration: 4000
        })
      }
    } catch (error) {
      console.error('Contact form error:', error)
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Please check your connection and try again.',
        duration: 4000
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <DrixaiLogo width={200} height={60} />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Thank you for contacting us!
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white py-8 px-4 shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] sm:rounded-lg sm:px-10"
          >
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Support ticket submitted successfully!
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                We've received your message and will get back to you within 24 hours. 
                You'll receive a confirmation email shortly.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Submit another request
                </button>
                
                <a
                  href="/"
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Back to Home
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-center">
            <DrixaiLogo width={200} height={60} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Get in Touch
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Have a question or need help? We're here to assist you. Send us a message and we'll get back to you as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Contact Information
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <EnvelopeIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Email Support</h3>
                  <p className="text-gray-600">support@drixai.com</p>
                  <p className="text-sm text-gray-500">We typically respond within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <PhoneIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Phone Support</h3>
                  <p className="text-gray-600">+1 (555) 123-4567</p>
                  <p className="text-sm text-gray-500">Monday - Friday, 9 AM - 6 PM EST</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <MapPinIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Office</h3>
                  <p className="text-gray-600">123 Tech Street<br />San Francisco, CA 94105</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Need immediate help?</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    For urgent issues, please call our support line or use the live chat feature in your dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Send us a Message
            </h2>
            
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your full name"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  required
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="general">General Inquiry</option>
                  <option value="auth">Authentication Issues</option>
                  <option value="billing">Billing & Payments</option>
                  <option value="technical">Technical Support</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  value={formData.message}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Please provide as much detail as possible about your issue or question..."
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending message...
                  </div>
                ) : (
                  'Send Message'
                )}
              </button>
            </motion.form>
          </div>
        </div>
      </div>
    </div>
  )
}