'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  QuestionMarkCircleIcon, 
  EnvelopeIcon, 
  KeyIcon, 
  UserIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { useToast } from '../../../components/ui/Toast'
import DrixaiLogo from '../../../components/ui/drixai-logo'

export default function AuthHelpPage() {
  const [selectedIssue, setSelectedIssue] = useState('')
  const [showSolutions, setShowSolutions] = useState(false)
  const { showToast } = useToast()

  const commonIssues = [
    {
      id: 'forgot-password',
      title: 'I forgot my password',
      description: 'Can\'t remember your password?',
      icon: KeyIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      id: 'wrong-email',
      title: 'Wrong email address',
      description: 'Typed the wrong email?',
      icon: EnvelopeIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      id: 'google-account',
      title: 'Google account issues',
      description: 'Problems with Google sign-in?',
      icon: UserIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      id: 'account-locked',
      title: 'Account locked/disabled',
      description: 'Can\'t access your account?',
      icon: ExclamationTriangleIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      id: 'email-not-verified',
      title: 'Email not verified',
      description: 'Haven\'t received verification email?',
      icon: CheckCircleIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      id: 'other',
      title: 'Something else',
      description: 'Other authentication issues?',
      icon: QuestionMarkCircleIcon,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    }
  ]

  const getSolutions = (issueId: string) => {
    const solutions: { [key: string]: any[] } = {
      'forgot-password': [
        {
          title: 'Reset your password',
          description: 'Use our secure password reset process',
          action: 'Go to password reset',
          href: '/auth/forgot-password',
          primary: true
        },
        {
          title: 'Check your email',
          description: 'Look for password reset emails in your spam folder',
          action: 'Check email',
          href: '#',
          primary: false
        }
      ],
      'wrong-email': [
        {
          title: 'Try the correct email',
          description: 'Make sure you\'re using the email you registered with',
          action: 'Try again',
          href: '/auth/login',
          primary: true
        },
        {
          title: 'Create a new account',
          description: 'If you don\'t have an account, create one',
          action: 'Sign up',
          href: '/auth/register',
          primary: false
        }
      ],
      'google-account': [
        {
          title: 'Check Google account',
          description: 'Make sure you\'re signed into the correct Google account',
          action: 'Try Google sign-in',
          href: '/auth/login',
          primary: true
        },
        {
          title: 'Clear browser data',
          description: 'Clear cookies and cache, then try again',
          action: 'Clear data',
          href: '#',
          primary: false
        }
      ],
      'account-locked': [
        {
          title: 'Contact support',
          description: 'Your account may have been temporarily disabled',
          action: 'Contact us',
          href: 'mailto:support@drixai.com',
          primary: true
        },
        {
          title: 'Check email notifications',
          description: 'Look for emails about account status',
          action: 'Check email',
          href: '#',
          primary: false
        }
      ],
      'email-not-verified': [
        {
          title: 'Resend verification email',
          description: 'We can send you a new verification email',
          action: 'Resend email',
          href: '/auth/verify-email',
          primary: true
        },
        {
          title: 'Check spam folder',
          description: 'Verification emails sometimes go to spam',
          action: 'Check spam',
          href: '#',
          primary: false
        }
      ],
      'other': [
        {
          title: 'Contact support',
          description: 'Our support team can help with any other issues',
          action: 'Get help',
          href: 'mailto:support@drixai.com',
          primary: true
        },
        {
          title: 'Check our documentation',
          description: 'Browse our help center for more information',
          action: 'View docs',
          href: '/docs',
          primary: false
        }
      ]
    }
    return solutions[issueId] || []
  }

  const handleIssueSelect = (issueId: string) => {
    setSelectedIssue(issueId)
    setShowSolutions(true)
  }

  const handleBack = () => {
    setShowSolutions(false)
    setSelectedIssue('')
  }

  if (showSolutions) {
    const solutions = getSolutions(selectedIssue)
    const selectedIssueData = commonIssues.find(issue => issue.id === selectedIssue)
    
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
          <div className="flex justify-center">
            <DrixaiLogo width={200} height={60} />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Here's how to fix it
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Choose the solution that works best for you
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white py-8 px-4 shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] sm:rounded-lg sm:px-10"
          >
            <div className="mb-6">
              <button
                onClick={handleBack}
                className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-1" />
                Back to issues
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${selectedIssueData?.bgColor}`}>
                  {selectedIssueData?.icon && <selectedIssueData.icon className={`h-6 w-6 ${selectedIssueData?.color}`} />}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedIssueData?.title}</h3>
                  <p className="text-sm text-gray-600">{selectedIssueData?.description}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {solutions.map((solution, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border-2 ${
                    solution.primary 
                      ? 'border-blue-200 bg-blue-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">
                        {solution.title}
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        {solution.description}
                      </p>
                      {solution.href.startsWith('mailto:') ? (
                        <a
                          href={solution.href}
                          className={`inline-flex items-center text-sm font-medium ${
                            solution.primary 
                              ? 'text-blue-600 hover:text-blue-700' 
                              : 'text-gray-600 hover:text-gray-700'
                          } transition-colors`}
                        >
                          {solution.action}
                          <ArrowRightIcon className="w-4 h-4 ml-1" />
                        </a>
                      ) : (
                        <Link
                          href={solution.href}
                          className={`inline-flex items-center text-sm font-medium ${
                            solution.primary 
                              ? 'text-blue-600 hover:text-blue-700' 
                              : 'text-gray-600 hover:text-gray-700'
                          } transition-colors`}
                        >
                          {solution.action}
                          <ArrowRightIcon className="w-4 h-4 ml-1" />
                        </Link>
                      )}
                    </div>
                    {solution.primary && (
                      <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Recommended
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Still having trouble? We're here to help!
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <EnvelopeIcon className="w-4 h-4 mr-2" />
                  Contact Support
                </Link>
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Back to Login
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="flex justify-center">
          <DrixaiLogo width={200} height={60} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Having trouble signing in?
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          We're here to help! Select the issue you're experiencing and we'll guide you through the solution.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white py-8 px-4 shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)] sm:rounded-lg sm:px-10"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {commonIssues.map((issue, index) => (
              <motion.button
                key={issue.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleIssueSelect(issue.id)}
                className="p-4 text-left rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${issue.bgColor}`}>
                    <issue.icon className={`h-5 w-5 ${issue.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                      {issue.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {issue.description}
                    </p>
                  </div>
                  <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                </div>
              </motion.button>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Can't find your issue? Contact our support team directly.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <EnvelopeIcon className="w-4 h-4 mr-2" />
                  Contact Support
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
