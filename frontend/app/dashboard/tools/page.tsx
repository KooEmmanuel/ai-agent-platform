'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  WrenchScrewdriverIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  GlobeAltIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  StarIcon,
  CpuChipIcon,
  CodeBracketIcon,
  BoltIcon,
  CircleStackIcon,
  ShoppingCartIcon,
  UserIcon,
  MinusIcon
} from '@heroicons/react/24/outline'
import { apiClient, type Tool } from '../../../lib/api'
import { getToolIcon, getStyledToolIcon } from '../../../lib/toolMetadata'
import { useToast } from '../../../components/ui/Toast'
import { LoadingButton } from '../../../components/ui/LoadingButton'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'

const categories = [
  'All',
  'Search',
  'Scheduling',
  'Communication',
  'Data',
  'Analytics',
  'Integration',
  'Productivity',
  'Education',
  'Content Analysis',
  'Automation',
  'Custom'
]

const toolTypes = [
  'All',
  'API',
  'Function',
  'Webhook',
  'Database'
]

type TabType = 'marketplace' | 'your-tools'

export default function ToolsPage() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('marketplace')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedType, setSelectedType] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [marketplaceTools, setMarketplaceTools] = useState<Tool[]>([])
  const [userTools, setUserTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>({})
  
  // Confirmation dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    action: 'remove' | 'delete' | null
    tool: Tool | null
  }>({
    isOpen: false,
    action: null,
    tool: null
  })

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (activeTab === 'marketplace') {
      fetchMarketplaceTools()
    } else {
      fetchUserTools()
    }
  }, [activeTab])

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      apiClient.setToken(token)
      const user = await apiClient.getCurrentUser()
      setCurrentUser(user)
    } catch (error) {
      console.error('Error fetching current user:', error)
    }
  }

  const fetchMarketplaceTools = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setError('No authentication token found')
        return
      }

      apiClient.setToken(token)
      const toolsData = await apiClient.getMarketplaceTools()
      setMarketplaceTools(toolsData)
    } catch (error) {
      console.error('Error fetching marketplace tools:', error)
      setError('Failed to load marketplace tools')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserTools = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setError('No authentication token found')
        return
      }

      apiClient.setToken(token)
      const toolsData = await apiClient.getTools()
      setUserTools(toolsData)
    } catch (error) {
      console.error('Error fetching user tools:', error)
      setError('Failed to load your tools')
    } finally {
      setLoading(false)
    }
  }

  const setToolLoading = (toolId: number, isLoading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [toolId]: isLoading
    }))
  }

  const handleAddToYourTools = async (tool: Tool) => {
    setToolLoading(tool.id, true)
    
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      apiClient.setToken(token)
      
      // Add tool to user's collection
      await apiClient.addToolToCollection(tool.id)

      // Update the UI immediately for better UX
      setMarketplaceTools(prevTools => 
        prevTools.map(t => 
          t.id === tool.id 
            ? { ...t, is_in_user_collection: true }
            : t
        )
      )
      
      // Also update user tools count
      setUserTools(prevTools => [...prevTools, tool])
      
      // Show professional toast notification
      showToast({
        type: 'success',
        title: 'Tool Added',
        message: `${tool.display_name || tool.name} has been added to your collection`,
        duration: 3000
      })
      
    } catch (error: any) {
      console.error('Error adding tool to your tools:', error)
      const errorMessage = error.response?.data?.detail || 'Failed to add tool to your collection'
      
      showToast({
        type: 'error',
        title: 'Add Failed',
        message: errorMessage,
        duration: 5000
      })
    } finally {
      setToolLoading(tool.id, false)
    }
  }

  const handleRemoveFromYourTools = async (tool: Tool) => {
    setConfirmDialog({
      isOpen: true,
      action: 'remove',
      tool
    })
  }

  const handleDeleteTool = async (toolId: number) => {
    const tool = userTools.find(t => t.id === toolId) || marketplaceTools.find(t => t.id === toolId)
    if (!tool) return
    
    setConfirmDialog({
      isOpen: true,
      action: 'delete',
      tool
    })
  }

  const confirmAction = async () => {
    if (!confirmDialog.tool || !confirmDialog.action) return

    const { tool, action } = confirmDialog

    if (action === 'remove') {
      await performRemoveTool(tool)
    } else if (action === 'delete') {
      await performDeleteTool(tool.id)
    }

    setConfirmDialog({ isOpen: false, action: null, tool: null })
  }

  const performRemoveTool = async (tool: Tool) => {
    setToolLoading(tool.id, true)
    
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      apiClient.setToken(token)
      
      // Remove tool from user's collection
      await apiClient.removeToolFromCollection(tool.id)
      
      // Update the UI immediately
      setUserTools(prevTools => prevTools.filter(t => t.id !== tool.id))
      
      // Also update marketplace tools if they show the tool as added
      setMarketplaceTools(prevTools => 
        prevTools.map(t => 
          t.id === tool.id 
            ? { ...t, is_in_user_collection: false }
            : t
        )
      )
      
      showToast({
        type: 'success',
        title: 'Tool Removed',
        message: `${tool.display_name || tool.name} has been removed from your collection`,
        duration: 3000
      })
      
    } catch (error: any) {
      console.error('Error removing tool from your tools:', error)
      const errorMessage = error.response?.data?.detail || 'Failed to remove tool from your collection'
      
      showToast({
        type: 'error',
        title: 'Remove Failed',
        message: errorMessage,
        duration: 5000
      })
    } finally {
      setToolLoading(tool.id, false)
    }
  }

  const performDeleteTool = async (toolId: number) => {
    setToolLoading(toolId, true)
    
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      apiClient.setToken(token)
      await apiClient.deleteTool(toolId)
      
      // Remove from both lists
      setUserTools(prevTools => prevTools.filter(tool => tool.id !== toolId))
      setMarketplaceTools(prevTools => prevTools.filter(tool => tool.id !== toolId))
      
      showToast({
        type: 'success',
        title: 'Tool Deleted',
        message: 'Tool has been permanently deleted',
        duration: 3000
      })
    } catch (error: any) {
      console.error('Error deleting tool:', error)
      const errorMessage = error.response?.data?.detail || 'Failed to delete tool'
      
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: errorMessage,
        duration: 5000
      })
    } finally {
      setToolLoading(toolId, false)
    }
  }

  const getCurrentTools = () => {
    return activeTab === 'marketplace' ? marketplaceTools : userTools
  }

  const filteredTools = getCurrentTools().filter(tool => {
    const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory
    const matchesType = selectedType === 'All' || tool.tool_type === selectedType
    const matchesSearch = (tool.display_name || tool.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesCategory && matchesType && matchesSearch
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getToolTypeIcon = (toolType: string) => {
    switch (toolType) {
      case 'API':
        return GlobeAltIcon
      case 'Function':
        return CodeBracketIcon
      case 'Webhook':
        return BoltIcon
      case 'Database':
        return CircleStackIcon
      default:
        return WrenchScrewdriverIcon
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile-First Header */}
      <div className="space-y-4">
        {/* Title Section */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tools</h1>
            <p className="text-sm sm:text-base text-gray-600">Discover and manage tools for your agents</p>
          </div>
          {/* Desktop Create Button */}
          <Link
            href="/dashboard/tools/create"
            className="hidden sm:inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create
          </Link>
        </div>
      </div>

      {/* Mobile-First Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 lg:p-6 rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <GlobeAltIcon className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">Marketplace</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-900">{marketplaceTools.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-4 lg:p-6 rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserIcon className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">Your Tools</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-900">{userTools.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-4 lg:p-6 rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        >
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <WrenchScrewdriverIcon className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">Total Available</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-900">{marketplaceTools.length + userTools.length}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Mobile-First Tabs */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] lg:shadow-[0_4px_20px_rgba(59,130,246,0.1)]">
        {/* Mobile Tab Toggle */}
        <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-gray-200 sm:hidden">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'marketplace'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <GlobeAltIcon className="w-4 h-4" />
              <span>Marketplace</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('your-tools')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'your-tools'
                ? 'bg-green-100 text-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <UserIcon className="w-4 h-4" />
              <span>Your Tools</span>
            </div>
          </button>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden sm:block border-b border-gray-200">
          <nav className="-mb-px flex space-x-6 lg:space-x-8 px-4 lg:px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`py-3 lg:py-4 px-1 border-b-2 font-medium text-xs lg:text-sm ${
                activeTab === 'marketplace'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <GlobeAltIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                <span>Marketplace</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('your-tools')}
              className={`py-3 lg:py-4 px-1 border-b-2 font-medium text-xs lg:text-sm ${
                activeTab === 'your-tools'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <UserIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                <span>Your Tools</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Mobile-First Filters and Search */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'marketplace' ? 'marketplace' : 'your'} tools...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm text-sm sm:text-base"
              />
            </div>

            {/* Mobile-First Filter Row */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* Category Filter */}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <FunnelIcon className="w-4 h-4 text-gray-400" />
                  <label className="text-xs font-medium text-gray-600">Category</label>
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <label className="text-xs font-medium text-gray-600">Type</label>
                </div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {toolTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tools Table */}
        <div className="overflow-hidden">
          {loading && (
            <div className="p-4 lg:p-6 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm">Loading {activeTab === 'marketplace' ? 'marketplace' : 'your'} tools...</p>
            </div>
          )}
          
          {error && (
            <div className="p-4 lg:p-6 text-center text-red-600">
              <div className="bg-red-50 rounded-lg p-4">
                <p className="font-medium text-sm">Error loading tools</p>
                <p className="text-xs lg:text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}
          
          {!loading && !error && filteredTools.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 lg:py-12"
            >
              <WrenchScrewdriverIcon className="mx-auto h-10 w-10 lg:h-12 lg:w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tools found</h3>
              <p className="mt-1 text-xs lg:text-sm text-gray-500">
                {searchTerm || selectedCategory !== 'All' || selectedType !== 'All'
                  ? 'Try adjusting your search or filters.'
                  : activeTab === 'marketplace' 
                    ? 'No marketplace tools available.'
                    : 'You haven\'t created any tools yet.'}
              </p>
              {activeTab === 'your-tools' && (
                <div className="mt-4 lg:mt-6">
                  <Link
                    href="/dashboard/tools/create"
                    className="inline-flex items-center px-3 lg:px-4 py-2 border border-transparent shadow-sm text-xs lg:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                    Create
                  </Link>
                </div>
              )}
            </motion.div>
          )}
          
          {!loading && !error && filteredTools.length > 0 && (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tool
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTools.map((tool, index) => {
                      const ToolIcon = getStyledToolIcon(tool.name, "w-5 h-5")
                      return (
                        <motion.tr
                          key={tool.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="p-2 rounded-lg mr-3 bg-blue-100">
                                {ToolIcon}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{tool.display_name || tool.name}</div>
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {tool.description || 'No description'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                tool.is_public 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                <span className={`w-2 h-2 rounded-full mr-1.5 ${
                                  tool.is_public ? 'bg-green-400' : 'bg-purple-400'
                                }`}></span>
                                {tool.is_public ? 'Public' : 'Private'}
                              </span>
                              {activeTab === 'marketplace' && tool.is_in_user_collection && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <span className="w-2 h-2 rounded-full bg-blue-400 mr-1.5"></span>
                                  In Your Collection
                                </span>
                              )}
                              {activeTab === 'your-tools' && tool.user_id === currentUser?.id && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  <span className="w-2 h-2 rounded-full bg-orange-400 mr-1.5"></span>
                                  You Own This
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tool.tool_type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {tool.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(tool.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-1">
                              {activeTab === 'marketplace' ? (
                                <>
                                  {tool.is_in_user_collection ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <span className="w-2 h-2 rounded-full bg-green-400 mr-1.5"></span>
                                      Added
                                    </span>
                                  ) : (
                                    <LoadingButton
                                      onClick={() => handleAddToYourTools(tool)}
                                      loading={loadingStates[tool.id]}
                                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
                                      title="Add to Your Tools"
                                    >
                                      <ShoppingCartIcon className="w-4 h-4" />
                                    </LoadingButton>
                                  )}
                                </>
                              ) : (
                                <>
                                  {/* Only show edit/delete for tools the user owns */}
                                  {tool.user_id === currentUser?.id && (
                                    <>
                                      <Link
                                        href={`/dashboard/tools/configure/${tool.id}`}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
                                        title="Edit Tool"
                                      >
                                        <PencilIcon className="w-4 h-4" />
                                      </Link>
                                      <LoadingButton
                                        onClick={() => handleDeleteTool(tool.id)}
                                        loading={loadingStates[tool.id]}
                                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                                        title="Delete Tool"
                                      >
                                        <TrashIcon className="w-4 h-4" />
                                      </LoadingButton>
                                    </>
                                  )}
                                  {/* Show remove button for all tools in collection */}
                                  <LoadingButton
                                    onClick={() => handleRemoveFromYourTools(tool)}
                                    loading={loadingStates[tool.id]}
                                    className="p-1.5 text-gray-400 hover:text-orange-600 transition-colors rounded-md hover:bg-orange-50"
                                    title="Remove from Your Tools"
                                  >
                                    <MinusIcon className="w-4 h-4" />
                                  </LoadingButton>
                                </>
                              )}
                              <Link
                                href={`/dashboard/tools/${tool.id}`}
                                className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
                                title="View Details"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 lg:p-6">
                  {filteredTools.map((tool, index) => {
                    const ToolIcon = getStyledToolIcon(tool.name, "w-5 h-5")
                    return (
                      <motion.div
                        key={tool.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.08)] p-4 hover:shadow-[0_4px_16px_rgba(59,130,246,0.12)] transition-all duration-200"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg bg-blue-100">
                              {ToolIcon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-gray-900 truncate">{tool.display_name || tool.name}</h3>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {tool.description || 'No description'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Link
                              href={`/dashboard/tools/${tool.id}`}
                              className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
                              title="View Details"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </Link>
                            {activeTab === 'your-tools' && tool.user_id === currentUser?.id && (
                              <Link
                                href={`/dashboard/tools/configure/${tool.id}`}
                                className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
                                title="Edit Tool"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </Link>
                            )}
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="mb-3 space-y-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tool.is_public 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            <span className={`w-2 h-2 rounded-full mr-1.5 ${
                              tool.is_public ? 'bg-green-400' : 'bg-purple-400'
                            }`}></span>
                            {tool.is_public ? 'Public' : 'Private'}
                          </span>
                          {activeTab === 'marketplace' && tool.is_in_user_collection && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <span className="w-2 h-2 rounded-full bg-blue-400 mr-1.5"></span>
                              In Your Collection
                            </span>
                          )}
                          {activeTab === 'your-tools' && tool.user_id === currentUser?.id && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              <span className="w-2 h-2 rounded-full bg-orange-400 mr-1.5"></span>
                              You Own This
                            </span>
                          )}
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-gray-500">Type</span>
                            <p className="text-gray-900 font-medium mt-0.5">{tool.tool_type}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Category</span>
                            <p className="text-gray-900 font-medium mt-0.5">{tool.category}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Created</span>
                            <p className="text-gray-900 font-medium mt-0.5">{formatDate(tool.created_at)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Actions</span>
                            <div className="flex items-center space-x-1 mt-0.5">
                              {activeTab === 'marketplace' ? (
                                <>
                                  {tool.is_in_user_collection ? (
                                    <span className="text-green-600 text-xs font-medium">Added</span>
                                  ) : (
                                    <LoadingButton
                                      onClick={() => handleAddToYourTools(tool)}
                                      loading={loadingStates[tool.id]}
                                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded hover:bg-blue-50"
                                      title="Add to Your Tools"
                                    >
                                      <ShoppingCartIcon className="w-3 h-3" />
                                    </LoadingButton>
                                  )}
                                </>
                              ) : (
                                <>
                                  {tool.user_id === currentUser?.id && (
                                    <LoadingButton
                                      onClick={() => handleDeleteTool(tool.id)}
                                      loading={loadingStates[tool.id]}
                                      className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded hover:bg-red-50"
                                      title="Delete Tool"
                                    >
                                      <TrashIcon className="w-3 h-3" />
                                    </LoadingButton>
                                  )}
                                  <LoadingButton
                                    onClick={() => handleRemoveFromYourTools(tool)}
                                    loading={loadingStates[tool.id]}
                                    className="p-1 text-gray-400 hover:text-orange-600 transition-colors rounded hover:bg-orange-50"
                                    title="Remove from Your Tools"
                                  >
                                    <MinusIcon className="w-3 h-3" />
                                  </LoadingButton>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, action: null, tool: null })}
        onConfirm={confirmAction}
        title={confirmDialog.action === 'remove' ? 'Remove from Collection' : 'Delete Tool'}
        message={
          confirmDialog.action === 'remove' 
            ? `Are you sure you want to remove "${confirmDialog.tool?.name}" from your collection? You can always add it back later.`
            : `Are you sure you want to permanently delete "${confirmDialog.tool?.name}"? This action cannot be undone and will remove it from all users' collections.`
        }
        confirmText={confirmDialog.action === 'remove' ? 'Remove' : 'Delete'}
        cancelText="Cancel"
        variant={confirmDialog.action === 'remove' ? 'warning' : 'danger'}
        loading={loadingStates[confirmDialog.tool?.id || 0]}
      />

      {/* Mobile Floating Action Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0 }}
        className="fixed bottom-6 right-6 z-50 sm:hidden"
      >
        <Link
          href="/dashboard/tools/create"
          className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
        >
          <PlusIcon className="w-6 h-6 transition-transform group-hover:scale-110" />
        </Link>
      </motion.div>
    </div>
  )
} 