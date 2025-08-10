'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  HomeIcon,
  CpuChipIcon,
  WrenchScrewdriverIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  SparklesIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
  CreditCardIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { LogOut } from 'lucide-react'
import { signOut, auth } from '../../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import KwickbuildLogo from '../../components/ui/kwickbuild-logo'

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: HomeIcon },
  { name: 'Agents', href: '/dashboard/agents', icon: CpuChipIcon },
  { name: 'Tools', href: '/dashboard/tools', icon: WrenchScrewdriverIcon },
  { name: 'Integrations', href: '/dashboard/integrations', icon: ChatBubbleLeftRightIcon },
  { name: 'Playground', href: '/dashboard/playground', icon: SparklesIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCardIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const pathname = usePathname()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [sidebarOpen])

  const handleLogout = async () => {
    try {
      await signOut()
      // Redirect to login page
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('Logout error:', error)
      alert('Logout failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <motion.div 
          initial={{ x: '-100%' }}
          animate={{ x: sidebarOpen ? 0 : '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white m-4 rounded-2xl shadow-[0_2px_8px_rgba(59,130,246,0.08)]"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragEnd={(e, info) => {
            if (info.offset.x < -50) {
              setSidebarOpen(false)
            }
          }}
        >
          <div className="flex h-20 items-center justify-between px-4 overflow-visible">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity w-full">
              <KwickbuildLogo width={160} height={50} />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4 ml-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                  <span className="font-medium">{item.name}</span>

                </Link>
              )
            })}
          </nav>
          <div className="border-t border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {user?.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="Profile" 
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <UserCircleIcon className="w-7 h-7 text-gray-400" />
                )}
                <span className="text-xs font-medium text-gray-700">
                  {user?.displayName || 'User'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 rounded-full transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white m-4 rounded-2xl shadow-[0_2px_8px_rgba(59,130,246,0.08)]">
          <div className="flex h-20 items-center px-4 overflow-visible">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity w-full">
              <KwickbuildLogo width={160} height={50} />
            </Link>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4 ml-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                  <span className="font-medium">{item.name}</span>

                </Link>
              )
            })}
          </nav>
          <div className="border-t border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {user?.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="Profile" 
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <UserCircleIcon className="w-7 h-7 text-gray-400" />
                )}
                <span className="text-xs font-medium text-gray-700">
                  {user?.displayName || 'User'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 rounded-full transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Mobile header with hamburger menu */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-lg font-semibold text-gray-900">
                {navigation.find(item => item.href === pathname)?.name || 'Dashboard'}
              </span>
            </div>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 lg:pt-0 pt-16">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
} 