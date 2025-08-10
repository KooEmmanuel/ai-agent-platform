'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Pacifico } from 'next/font/google'
import Image from 'next/image'
import { cn } from '../lib/utils' 
import { auth } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import HeroSection from '../components/ui/hero-section'
import MobileHeroSection from '../components/ui/mobile-hero-section'
import FeaturesSection from '../components/ui/features-section'
import StatsSection from '../components/ui/stats-section'
import TestimonialsSection from '../components/ui/testimonials-section'
import { 
  SparklesIcon,
  CpuChipIcon,
  WrenchScrewdriverIcon,
  ChatBubbleLeftRightIcon,
  GlobeAltIcon,
  ArrowRightIcon,
  PlayIcon,
  CheckIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'
import KwickbuildLogo from '../components/ui/kwickbuild-logo'

interface Plan {
  id: number
  name: string
  display_name: string
  description: string
  price: number
  currency: string
  monthly_credits: number
  max_agents: number
  max_custom_tools: number
  features: string[]
  support_level: string
  custom_branding: boolean
  api_access: boolean
  is_current: boolean
}

const pacifico = Pacifico({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-pacifico',
})

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = 'from-white/[0.08]',
}: {
  className?: string
  delay?: number
  width?: number
  height?: number
  rotate?: number
  gradient?: string
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: rotate,
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn('absolute', className)}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeInOut',
        }}
        style={{
          width,
          height,
        }}
        className="relative"
      >
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            'bg-gradient-to-r to-transparent',
            gradient,
            'backdrop-blur-[2px] border-2 border-white/[0.15]',
            'shadow-[0_8px_32px_0_rgba(0,0,0,0.04)]',
            'after:absolute after:inset-0 after:rounded-full',
            'after:bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.04),transparent_70%)]',
          )}
        />
      </motion.div>
    </motion.div>
  )
}

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pricingPlans, setPricingPlans] = useState<Plan[]>([])
  const [pricingLoading, setPricingLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    fetchPricingPlans()
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

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.5 + i * 0.2,
        ease: [0.25, 0.4, 0.25, 1],
      },
    }),
  }

  const features = [
    {
      icon: CpuChipIcon,
      title: 'AI Agent Builder',
      description: 'Create intelligent agents with our intuitive drag-and-drop interface. No coding required.',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: WrenchScrewdriverIcon,
      title: 'Tool Marketplace',
      description: 'Access 50+ pre-built tools or create custom ones. From web search to database queries.',
      color: 'bg-green-100 text-green-600'
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: 'Multi-Platform Integration',
      description: 'Deploy your agents to WhatsApp, Telegram, Discord, Slack, and more with one click.',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      icon: GlobeAltIcon,
      title: 'Real-time Playground',
      description: 'Test your agents instantly in our interactive playground before deployment.',
      color: 'bg-orange-100 text-orange-600'
    }
  ]

  // Use Railway URL in production, localhost in development
  const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://kwickbuild.up.railway.app'
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')

  const fetchPricingPlans = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/billing/plans`)
      if (response.ok) {
        const plans = await response.json()
        setPricingPlans(plans)
      } else {
        // Fallback to static plans if API fails
        setPricingPlans([
          {
            id: 1,
            name: 'free',
            display_name: 'Starter',
            description: 'Perfect for getting started',
            price: 0,
            currency: 'USD',
            monthly_credits: 1000,
            max_agents: 3,
            max_custom_tools: 10,
            features: [
              '3 AI Agents',
              '10 Tools',
              '1,000 API calls/month',
              'Basic Integrations',
              'Community Support'
            ],
            support_level: 'community',
            custom_branding: false,
            api_access: false,
            is_current: false
          },
          {
            id: 2,
            name: 'pro',
            display_name: 'Pro',
            description: 'For growing teams',
            price: 29,
            currency: 'USD',
            monthly_credits: 50000,
            max_agents: -1,
            max_custom_tools: -1,
            features: [
              'Unlimited AI Agents',
              'Unlimited Tools',
              '50,000 API calls/month',
              'All Integrations',
              'Priority Support',
              'Advanced Analytics'
            ],
            support_level: 'priority',
            custom_branding: true,
            api_access: true,
            is_current: false
          },
          {
            id: 3,
            name: 'enterprise',
            display_name: 'Enterprise',
            description: 'For large organizations',
            price: -1,
            currency: 'USD',
            monthly_credits: -1,
            max_agents: -1,
            max_custom_tools: -1,
            features: [
              'Everything in Pro',
              'Custom Rate Limits',
              'Dedicated Support',
              'SLA Guarantee',
              'Custom Integrations',
              'On-premise Deployment'
            ],
            support_level: 'dedicated',
            custom_branding: true,
            api_access: true,
            is_current: false
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching pricing plans:', error)
      // Use fallback plans
      setPricingPlans([
        {
          id: 1,
          name: 'free',
          display_name: 'Starter',
          description: 'Perfect for getting started',
          price: 0,
          currency: 'USD',
          monthly_credits: 1000,
          max_agents: 3,
          max_custom_tools: 10,
          features: [
            '3 AI Agents',
            '10 Tools',
            '1,000 API calls/month',
            'Basic Integrations',
            'Community Support'
          ],
          support_level: 'community',
          custom_branding: false,
          api_access: false,
          is_current: false
        },
        {
          id: 2,
          name: 'pro',
          display_name: 'Pro',
          description: 'For growing teams',
          price: 29,
          currency: 'USD',
          monthly_credits: 50000,
          max_agents: -1,
          max_custom_tools: -1,
          features: [
            'Unlimited AI Agents',
            'Unlimited Tools',
            '50,000 API calls/month',
            'All Integrations',
            'Priority Support',
            'Advanced Analytics'
          ],
          support_level: 'priority',
          custom_branding: true,
          api_access: true,
          is_current: false
        },
        {
          id: 3,
          name: 'enterprise',
          display_name: 'Enterprise',
          description: 'For large organizations',
          price: -1,
          currency: 'USD',
          monthly_credits: -1,
          max_agents: -1,
          max_custom_tools: -1,
          features: [
            'Everything in Pro',
            'Custom Rate Limits',
            'Dedicated Support',
            'SLA Guarantee',
            'Custom Integrations',
            'On-premise Deployment'
          ],
          support_level: 'dedicated',
          custom_branding: true,
          api_access: true,
          is_current: false
        }
      ])
    } finally {
      setPricingLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Floating Navigation */}
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
                <KwickbuildLogo width={120} height={40} />
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-8">
                <Link href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</Link>
                <Link href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</Link>
                <Link href="/docs" className="text-gray-600 hover:text-gray-900 transition-colors">Docs</Link>
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
                  <Link href="#features" className="block text-gray-600 hover:text-gray-900 transition-colors">Features</Link>
                  <Link href="#pricing" className="block text-gray-600 hover:text-gray-900 transition-colors">Pricing</Link>
                  <Link href="/docs" className="block text-gray-600 hover:text-gray-900 transition-colors">Docs</Link>
                  {renderMobileAuthButtons()}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Hero Section */}
      <MobileHeroSection />

      {/* Desktop Hero Section */}
      <div className="hidden lg:block">
        <HeroSection />
      </div>

      {/* Features Section */}
      <FeaturesSection />

      {/* Stats Section */}
      <StatsSection />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-600 max-w-2xl mx-auto px-4">
              Start free and scale as you grow. No hidden fees, no surprises.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-white p-8 rounded-xl shadow-sm border-2 border-gray-200 animate-pulse">
                  <div className="text-center mb-6">
                    <div className="h-8 bg-gray-200 rounded mb-2"></div>
                    <div className="h-12 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                  <div className="space-y-3 mb-8">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center">
                        <div className="w-5 h-5 bg-gray-200 rounded mr-3"></div>
                        <div className="h-4 bg-gray-200 rounded flex-1"></div>
                      </div>
                    ))}
                  </div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                </div>
              ))
            ) : (
              pricingPlans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className={`bg-white p-8 rounded-xl shadow-sm border-2 ${
                    plan.name === 'pro' ? 'border-blue-500 relative' : 'border-gray-200'
                  }`}
                >
                  {plan.name === 'pro' && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.display_name}</h3>
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-gray-900">
                        {plan.price === 0 ? 'Free' : plan.price === -1 ? 'Custom' : `$${plan.price}`}
                      </span>
                      <span className="text-gray-600 ml-1">
                        {plan.price === -1 ? '' : '/month'}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-2">{plan.description}</p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center">
                        <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.name === 'enterprise' ? '/contact' : '/auth/register'}
                    className={`block w-full text-center py-3 px-4 rounded-lg font-semibold transition-colors ${
                      plan.name === 'pro'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {plan.name === 'enterprise' ? 'Contact Sales' : plan.name === 'free' ? 'Get Started' : 'Start Free Trial'}
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to build your first AI agent?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of developers who are already building intelligent agents with Kwickbuild.
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-colors text-lg font-semibold"
            >
              Get Started Free
              <ArrowRightIcon className="ml-2 w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Mobile Footer - Collapsible Sections */}
          <div className="block md:hidden">
            <div className="space-y-6">
              {/* Brand Section */}
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start space-x-2 mb-4">
                  <KwickbuildLogo width={120} height={40} />
                </div>
                <p className="text-gray-600 text-sm sm:text-base">
                  Building the future of AI agents, one tool at a time.
                </p>
              </div>

              {/* Mobile Navigation */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">Product</h3>
                                <ul className="space-y-2">
                <li><Link href="#features" className="text-gray-600 hover:text-gray-900 text-sm">Features</Link></li>
                <li><Link href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm">Pricing</Link></li>
                <li><Link href="/docs" className="text-gray-600 hover:text-gray-900 text-sm">Documentation</Link></li>
              </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">Company</h3>
                  <ul className="space-y-2">
                    <li><Link href="/about" className="text-gray-600 hover:text-gray-900 text-sm">About</Link></li>
                    <li><Link href="/contact" className="text-gray-600 hover:text-gray-900 text-sm">Contact</Link></li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Support</h3>
                <ul className="space-y-2">
                  <li><Link href="/privacy" className="text-gray-600 hover:text-gray-900 text-sm">Privacy</Link></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Desktop Footer */}
          <div className="hidden md:grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <KwickbuildLogo width={120} height={40} />
              </div>
              <p className="text-gray-600">
                Building the future of AI agents, one tool at a time.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-gray-600 hover:text-gray-900">Features</Link></li>
                <li><Link href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link></li>
                <li><Link href="/docs" className="text-gray-600 hover:text-gray-900">Documentation</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-gray-600 hover:text-gray-900">About</Link></li>
                <li><Link href="/contact" className="text-gray-600 hover:text-gray-900">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-gray-600 hover:text-gray-900">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center">
            <p className="text-gray-600 text-sm sm:text-base">
              © 2025 Kwickbuild. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
} 