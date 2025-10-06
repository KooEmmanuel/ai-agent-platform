'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  HomeIcon,
  UsersIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import { LuPanelLeftClose, LuPanelRightClose } from "react-icons/lu"
import DrixaiLogo from '../../components/ui/drixai-logo'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
  { name: 'Agents', href: '/admin/agents', icon: UserGroupIcon },
  { name: 'Support', href: '/admin/support', icon: ChatBubbleLeftRightIcon },
  { name: 'Analytics', href: '/admin/analytics', icon: ChartBarIcon },
  { name: 'Billing', href: '/admin/billing', icon: CreditCardIcon },
  { name: 'Settings', href: '/admin/settings', icon: Cog6ToothIcon },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarVisible, setDesktopSidebarVisible] = useState(true)
  const [adminUser, setAdminUser] = useState<any>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Skip authentication check for login page
    if (pathname === '/admin/login') {
      return
    }
    
    // Check if admin is logged in
    const adminToken = localStorage.getItem('admin_token')
    const adminUserData = localStorage.getItem('admin_user')
    
    if (!adminToken || !adminUserData) {
      router.push('/admin/login')
      return
    }
    
    try {
      const userData = JSON.parse(adminUserData)
      
      // Check if token is expired (basic JWT decode without verification)
      try {
        const tokenPayload = JSON.parse(atob(adminToken.split('.')[1]))
        const currentTime = Math.floor(Date.now() / 1000)
        
        if (tokenPayload.exp && tokenPayload.exp < currentTime) {
          console.log('Admin token expired, redirecting to login')
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_user')
          router.push('/admin/login')
          return
        }
      } catch (tokenError) {
        console.error('Error decoding admin token:', tokenError)
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        router.push('/admin/login')
        return
      }
      
      setAdminUser(userData)
    } catch (error) {
      console.error('Error parsing admin user data:', error)
      // Clear invalid data and redirect
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      router.push('/admin/login')
    }
  }, [router, pathname])

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Close mobile sidebar with Escape
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false)
      }
      
      // Toggle desktop sidebar with Ctrl/Cmd + B
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        setDesktopSidebarVisible(!desktopSidebarVisible)
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [sidebarOpen, desktopSidebarVisible])

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    router.push('/admin/login')
  }

  const handleNavClick = (href: string) => {
    setSidebarOpen(false)
    
    // Smooth scroll to top if on same page
    if (pathname === href) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Don't show loading state for login page
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  if (!adminUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: sidebarOpen ? 0 : -300 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white m-4 rounded-2xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] z-50 lg:hidden"
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
          <Link href="/admin" className="flex items-center space-x-2 hover:opacity-80 transition-opacity w-full">
            <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
            <span className="text-lg font-bold text-gray-900">Admin Panel</span>
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
                    ? 'bg-blue-50 text-blue-700 shadow-sm border-l-4 border-blue-500'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onClick={() => handleNavClick(item.href)}
              >
                <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                <span className="font-medium">{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                )}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-gray-700">
                {adminUser.name || 'Admin'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ease-in-out ${
        desktopSidebarVisible ? 'lg:w-72' : 'lg:w-20'
      }`}>
        <div className={`flex flex-col flex-grow bg-white m-4 rounded-2xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] transition-all duration-300 ease-in-out overflow-hidden`}>
          <div className={`flex items-center px-4 overflow-visible ${desktopSidebarVisible ? 'h-20' : 'h-16'}`}>
            {desktopSidebarVisible ? (
              <>
                <Link href="/admin" className="flex items-center space-x-2 hover:opacity-80 transition-opacity flex-1">
                  <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
                  <span className="text-lg font-bold text-gray-900">Admin Panel</span>
                </Link>
                <button
                  onClick={() => setDesktopSidebarVisible(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Collapse sidebar (Ctrl+B)"
                >
                  <LuPanelLeftClose className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center space-y-4 w-full">
                <button
                  onClick={() => setDesktopSidebarVisible(true)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Expand sidebar (Ctrl+B)"
                >
                  <LuPanelRightClose className="w-4 h-4" />
                </button>
                <Link href="/admin" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Admin Dashboard">
                  <ShieldCheckIcon className="w-6 h-6" />
                </Link>
              </div>
            )}
          </div>
          
          {desktopSidebarVisible && (
            <>
              <nav className="flex-1 space-y-1 px-2 py-4 ml-2">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 shadow-sm border-l-4 border-blue-500'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      onClick={() => handleNavClick(item.href)}
                    >
                      <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">{item.name}</span>
                      {isActive && (
                        <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      )}
                    </Link>
                  )
                })}
              </nav>
              
              <div className="border-t border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                      <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-gray-700 block truncate">
                        {adminUser.name || 'Admin'}
                      </span>
                      <span className="text-xs text-gray-500 block truncate">
                        {adminUser.email}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Logout"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
          
          {!desktopSidebarVisible && (
            <nav className="flex-1 space-y-1 px-2 py-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center justify-center p-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    title={item.name}
                    onClick={() => handleNavClick(item.href)}
                  >
                    <item.icon className="h-5 w-5" />
                    {isActive && (
                      <div className="absolute right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </Link>
                )
              })}
            </nav>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ease-in-out ${
        desktopSidebarVisible ? 'lg:ml-80' : 'lg:ml-24'
      }`}>
        {/* Mobile header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className="w-6 h-6 text-blue-600" />
              <span className="text-lg font-semibold text-gray-900">Admin Panel</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
