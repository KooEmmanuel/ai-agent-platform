'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { SparklesIcon } from '@heroicons/react/24/outline'

interface NavbarProps {
  currentPage?: string
}

export default function Navbar({ currentPage }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const renderAuthButtons = () => {
    if (loading) {
      return (
        <div className="flex items-center space-x-3">
          <div className="w-16 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="w-20 h-8 bg-gray-200 rounded-full animate-pulse"></div>
        </div>
      )
    }

    if (user) {
      return (
        <div className="flex items-center space-x-3">
          <Link href="/dashboard" className="border-r-2 border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white px-4 py-2 rounded-full bg-transparent transition-colors shadow-[0_4px_14px_rgba(59,130,246,0.3)] font-medium">
            Dashboard
          </Link>
        </div>
      )
    }

    return (
      <div className="flex items-center space-x-3">
        <Link href="/auth/login" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">
          Log In
        </Link>
        <Link href="/auth/register" className="border-r-2 border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white px-4 py-2 rounded-full bg-transparent transition-colors shadow-[0_4px_14px_rgba(59,130,246,0.3)] font-medium">
          Sign Up
        </Link>
      </div>
    )
  }

  const renderMobileAuthButtons = () => {
    if (loading) {
      return (
        <div className="space-y-2">
          <div className="w-full h-10 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="w-full h-10 bg-gray-200 rounded-full animate-pulse"></div>
        </div>
      )
    }

    if (user) {
      return (
        <div className="space-y-3">
          <Link href="/dashboard" className="block px-4 py-2 border-r-2 border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white rounded-full text-center bg-transparent transition-colors shadow-[0_4px_14px_rgba(59,130,246,0.3)] font-medium">
            Dashboard
          </Link>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <Link href="/auth/login" className="block px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg font-medium transition-colors">
          Log In
        </Link>
        <Link href="/auth/register" className="block px-4 py-2 border-r-2 border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white rounded-full text-center bg-transparent transition-colors shadow-[0_4px_14px_rgba(59,130,246,0.3)] font-medium">
          Sign Up
        </Link>
      </div>
    )
  }

  return (
    <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-6xl mx-auto px-4">
      <div className="relative">
        {/* Gradient border wrapper */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full p-[1px]">
          <div className="bg-white/95 backdrop-blur-xl rounded-full h-full w-full"></div>
        </div>
        
        {/* Navigation content */}
        <div className="relative bg-white/95 backdrop-blur-xl rounded-full px-6 py-3 shadow-[0_4px_20px_rgba(59,130,246,0.15)] border border-white/20">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <Link href="/" className="text-xl font-bold text-gray-900">AgentFlow</Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link 
                href="/#features" 
                className={`transition-colors ${currentPage === 'features' ? 'text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Features
              </Link>
              <Link 
                href="/#pricing" 
                className={`transition-colors ${currentPage === 'pricing' ? 'text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Pricing
              </Link>
              <Link 
                href="/docs" 
                className={`transition-colors ${currentPage === 'docs' ? 'text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Docs
              </Link>
              {renderAuthButtons()}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-4">
              <div className="space-y-4">
                <Link 
                  href="/#features" 
                  className={`block transition-colors ${currentPage === 'features' ? 'text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Features
                </Link>
                <Link 
                  href="/#pricing" 
                  className={`block transition-colors ${currentPage === 'pricing' ? 'text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Pricing
                </Link>
                <Link 
                  href="/docs" 
                  className={`block transition-colors ${currentPage === 'docs' ? 'text-gray-900 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Docs
                </Link>
                {renderMobileAuthButtons()}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
} 