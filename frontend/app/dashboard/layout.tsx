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
  ArrowRightOnRectangleIcon,
  DocumentTextIcon,
  BeakerIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  PlusIcon,
  FolderIcon,
  UserGroupIcon,
  LinkIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { LuPanelLeftClose, LuPanelRightClose } from "react-icons/lu"
import { LogOut } from 'lucide-react'
import { signOut, auth } from '../../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import DrixaiLogo from '../../components/ui/drixai-logo'
import { initializeApiClient } from '../../lib/api'

const personalNavigation = [
  { name: 'Overview', href: '/dashboard', icon: HomeIcon },
  { name: 'My Agents', href: '/dashboard/agents', icon: CpuChipIcon },
  { name: 'Agent Tools', href: '/dashboard/tools', icon: WrenchScrewdriverIcon },
  { name: 'My Knowledge Base', href: '/dashboard/knowledge-base', icon: DocumentTextIcon },
  { name: 'Integrations', href: '/dashboard/integrations', icon: LinkIcon },
  { name: 'Playground', href: '/dashboard/playground', icon: SparklesIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCardIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
]

const organizationNavigation = [
  { name: 'Overview', href: '/dashboard', icon: HomeIcon },
  { name: 'My Organizations', href: '/dashboard/organizations', icon: BuildingOfficeIcon },
  { name: 'Create Organization', href: '/dashboard/organizations/create', icon: PlusIcon },
  { name: 'Playground', href: '/dashboard/playground', icon: SparklesIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCardIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
]

// Organization-specific navigation (when inside an organization)
const getOrganizationSpecificNavigation = (orgId: string) => [
  { name: 'Overview', href: `/dashboard/organizations/${orgId}`, icon: HomeIcon },
  { name: 'Agents', href: `/dashboard/organizations/${orgId}/agents`, icon: CpuChipIcon },
  { name: 'Integrations', href: `/dashboard/organizations/${orgId}/integrations`, icon: LinkIcon },
  { name: 'Project Management', href: `/dashboard/organizations/${orgId}/project-management`, icon: ChartBarIcon },
  { name: 'Playground', href: `/dashboard/organizations/${orgId}/playground`, icon: SparklesIcon },
  { name: 'Settings', href: `/dashboard/organizations/${orgId}/settings`, icon: Cog6ToothIcon },
]

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: HomeIcon },
  { 
    name: 'Organizations', 
    href: '/dashboard/organizations', 
    icon: BuildingOfficeIcon,
    children: [
      { name: 'My Organizations', href: '/dashboard/organizations', icon: BuildingOfficeIcon },
      { name: 'Create Organization', href: '/dashboard/organizations/create', icon: PlusIcon }
    ]
  },
  { 
    name: 'Personal', 
    href: '/dashboard/personal', 
    icon: UserCircleIcon,
    children: [
      { name: 'My Agents', href: '/dashboard/agents', icon: CpuChipIcon },
      { name: 'Agent Tools', href: '/dashboard/tools', icon: WrenchScrewdriverIcon },
      { name: 'My Knowledge Base', href: '/dashboard/knowledge-base', icon: DocumentTextIcon },
      { name: 'Integrations', href: '/dashboard/integrations', icon: LinkIcon }
    ]
  },
  { name: 'Playground', href: '/dashboard/playground', icon: SparklesIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCardIcon },
  { name: 'Admin', href: '/admin', icon: ShieldCheckIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarVisible, setDesktopSidebarVisible] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [activeSection, setActiveSection] = useState<string>('')
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [selectedView, setSelectedView] = useState<'personal' | 'organization'>('personal')
  const [showDropdown, setShowDropdown] = useState(false)
  const pathname = usePathname()
  
  // Extract organization ID from pathname
  const organizationId = pathname.match(/\/organizations\/(\d+)/)?.[1]
  const isInOrganization = Boolean(organizationId)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      
      // Initialize API client with fresh token when user is authenticated
      if (currentUser) {
        try {
          await initializeApiClient()
        } catch (error) {
          console.error('Failed to initialize API client:', error)
        }
      }
    })

    return () => unsubscribe()
  }, [])

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

  // Scroll-based navigation highlighting
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('[data-section]')
      const scrollPosition = window.scrollY + 100

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i] as HTMLElement
        const sectionTop = section.offsetTop
        const sectionHeight = section.offsetHeight

        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
          setActiveSection(section.dataset.section || '')
          break
        }
      }
    }

    // Set initial active section based on pathname
    setActiveSection(pathname)

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Call once to set initial state

    return () => window.removeEventListener('scroll', handleScroll)
  }, [pathname])

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

  const handleNavClick = (href: string) => {
    // Close mobile sidebar
    setSidebarOpen(false)
    
    // If it's a hash link, scroll to section smoothly
    if (href.includes('#')) {
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  const renderNavItem = (item: any, isMobile: boolean = false) => {
    const isActive = pathname === item.href || activeSection === item.href
    
    return (
      <Link
        key={item.name}
        href={item.href}
        className={`group flex items-center py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-blue-50 text-blue-700 shadow-sm border-l-4 border-blue-500'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        } ${isMobile ? 'px-2' : desktopSidebarVisible ? 'px-2' : 'px-0 justify-center'}`}
        title={!isMobile && !desktopSidebarVisible ? item.name : undefined}
        onClick={() => handleNavClick(item.href)}
      >
        <item.icon className={`h-4 w-4 flex-shrink-0 ${isMobile || desktopSidebarVisible ? 'mr-2' : ''}`} />
        {(isMobile || desktopSidebarVisible) && (
          <>
            <span className="font-medium">{item.name}</span>
            {isActive && (
              <div className="ml-auto w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
            )}
          </>
        )}
      </Link>
    )
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
                <DrixaiLogo width={160} height={50} />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-0.5 px-2 py-4 ml-2">
            {/* View Selector Dropdown */}
            <div className="relative mb-3">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200"
              >
                <div className="flex items-center">
                  <UserCircleIcon className="w-3 h-3 mr-1.5 text-gray-500" />
                  <span>{selectedView === 'personal' ? 'Personal' : 'Organization'}</span>
                </div>
                <ChevronDownIcon className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => {
                      setSelectedView('personal')
                      setShowDropdown(false)
                    }}
                    className={`w-full flex items-center px-2 py-1.5 text-xs hover:bg-gray-50 ${
                      selectedView === 'personal' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <UserCircleIcon className="w-3 h-3 mr-1.5" />
                    Personal
                  </button>
                  <button
                    onClick={() => {
                      setSelectedView('organization')
                      setShowDropdown(false)
                    }}
                    className={`w-full flex items-center px-2 py-1.5 text-xs hover:bg-gray-50 ${
                      selectedView === 'organization' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <BuildingOfficeIcon className="w-3 h-3 mr-1.5" />
                    Organization
                  </button>
                </div>
              )}
            </div>

            {/* Navigation Items */}
            {(isInOrganization 
              ? getOrganizationSpecificNavigation(organizationId!) 
              : (selectedView === 'personal' ? personalNavigation : organizationNavigation)
            ).map((item) => renderNavItem(item, true))}
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
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ease-in-out ${
        desktopSidebarVisible ? 'lg:w-72' : 'lg:w-20'
      }`}>
        <div className={`flex flex-col flex-grow bg-white m-4 rounded-2xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] transition-all duration-300 ease-in-out overflow-hidden`}>
          <div className={`flex items-center px-4 overflow-visible ${desktopSidebarVisible ? 'h-20' : 'h-16'}`}>
            {desktopSidebarVisible ? (
              <>
                <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity flex-1">
                  <DrixaiLogo width={160} height={50} />
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
              </div>
            )}
          </div>
          <nav className={`flex-1 space-y-0.5 py-4 ${desktopSidebarVisible ? 'px-2 ml-2' : 'px-0'}`}>
            {desktopSidebarVisible && (
              <>
                {/* View Selector Dropdown */}
                <div className="relative mb-3">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200"
                  >
                    <div className="flex items-center">
                      <UserCircleIcon className="w-3 h-3 mr-1.5 text-gray-500" />
                      <span>{selectedView === 'personal' ? 'Personal' : 'Organization'}</span>
                    </div>
                    <ChevronDownIcon className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <button
                        onClick={() => {
                          setSelectedView('personal')
                          setShowDropdown(false)
                        }}
                        className={`w-full flex items-center px-2 py-1.5 text-xs hover:bg-gray-50 ${
                          selectedView === 'personal' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <UserCircleIcon className="w-3 h-3 mr-1.5" />
                        Personal
                      </button>
                      <button
                        onClick={() => {
                          setSelectedView('organization')
                          setShowDropdown(false)
                        }}
                        className={`w-full flex items-center px-2 py-1.5 text-xs hover:bg-gray-50 ${
                          selectedView === 'organization' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <BuildingOfficeIcon className="w-3 h-3 mr-1.5" />
                        Organization
                      </button>
                    </div>
                  )}
                </div>

                {/* Navigation Items */}
                {(isInOrganization 
                  ? getOrganizationSpecificNavigation(organizationId!) 
                  : (selectedView === 'personal' ? personalNavigation : organizationNavigation)
                ).map((item) => renderNavItem(item, false))}
              </>
            )}
            
            {!desktopSidebarVisible && (
              <div className="flex flex-col items-center space-y-1">
                {(isInOrganization 
                  ? getOrganizationSpecificNavigation(organizationId!) 
                  : (selectedView === 'personal' ? personalNavigation : organizationNavigation)
                ).map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title={item.name}
                    onClick={() => handleNavClick(item.href)}
                  >
                    <item.icon className="w-4 h-4" />
                  </Link>
                ))}
              </div>
            )}
          </nav>
          <div className={`border-t border-gray-100 ${desktopSidebarVisible ? 'p-4' : 'p-2'}`}>
            {desktopSidebarVisible ? (
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
            ) : (
              <div className="flex flex-col items-center space-y-3">
                {user?.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <UserCircleIcon className="w-8 h-8 text-gray-400" />
                )}
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 rounded-full transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ease-in-out ${
        desktopSidebarVisible ? 'lg:pl-72' : 'lg:pl-24'
      }`}>
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