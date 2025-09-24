// Centralized tool metadata for all marketplace tools
// This file provides display names, icons, and logos for all tools

import {
  // Search & Information
  MagnifyingGlassIcon,
  NewspaperIcon,
  
  // Data & Analytics
  CloudIcon,
  TableCellsIcon,
  CircleStackIcon,
  GlobeAltIcon,
  DocumentIcon,
  PhotoIcon,
  DocumentMagnifyingGlassIcon,
  LanguageIcon,
  ChartBarIcon,
  ChartPieIcon,
  
  // Scheduling & Time
  CalendarDaysIcon,
  BellIcon,
  CalculatorIcon,
  
  // Communication
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  SpeakerWaveIcon,
  
  // Social & Integration
  ShareIcon,
  CreditCardIcon,
  LinkIcon,
  BoltIcon,
  ArrowTopRightOnSquareIcon,
  
  // Database & Storage
  ServerIcon,
  DocumentPlusIcon,
  BuildingLibraryIcon,
  BuildingOfficeIcon,
  
  // Default
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'

export interface ToolMetadata {
  displayName: string
  icon: any
  logo?: string
  description: string
  category: string
  toolType: string
}

// Complete mapping of all 31 marketplace tools
export const TOOL_METADATA: Record<string, ToolMetadata> = {
  // Search Tools (3)
  web_search: {
    displayName: 'Web Search',
    icon: MagnifyingGlassIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/duckduckgo.svg',
    description: 'Search the web for current information using DuckDuckGo',
    category: 'Search',
    toolType: 'API'
  },
  news_search: {
    displayName: 'News Search',
    icon: NewspaperIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/newsapi.svg',
    description: 'Search for latest news articles on any topic',
    category: 'Search',
    toolType: 'API'
  },
  reddit_tool: {
    displayName: 'Reddit Content Discovery',
    icon: ShareIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/reddit.svg',
    description: 'Discover trending content from Reddit for social media creation',
    category: 'Search',
    toolType: 'API'
  },

  // Data Tools (11)
  weather_api: {
    displayName: 'Weather API',
    icon: CloudIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openweathermap.svg',
    description: 'Get current weather conditions and forecasts',
    category: 'Data',
    toolType: 'API'
  },
  csv_processor: {
    displayName: 'CSV Processor',
    icon: TableCellsIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/microsoftoffice.svg',
    description: 'Process and analyze CSV data with various operations',
    category: 'Data',
    toolType: 'Function'
  },
  database_query: {
    displayName: 'Database Query',
    icon: CircleStackIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/mysql.svg',
    description: 'Execute database queries and retrieve data',
    category: 'Data',
    toolType: 'Database'
  },
  data_scraper: {
    displayName: 'Data Scraper',
    icon: GlobeAltIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/scrapy.svg',
    description: 'Extract data from websites and web pages',
    category: 'Data',
    toolType: 'Function'
  },
  file_processor: {
    displayName: 'File Processor',
    icon: DocumentIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/filezilla.svg',
    description: 'Process and manipulate various file formats',
    category: 'Data',
    toolType: 'Function'
  },
  image_processor: {
    displayName: 'Image Processor',
    icon: PhotoIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/gimp.svg',
    description: 'Process and manipulate images',
    category: 'Data',
    toolType: 'Function'
  },
  pdf_processor: {
    displayName: 'PDF Processor',
    icon: DocumentIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/adobeacrobatreader.svg',
    description: 'Extract and process PDF documents',
    category: 'Data',
    toolType: 'Function'
  },
  text_analyzer: {
    displayName: 'Text Analyzer',
    icon: DocumentMagnifyingGlassIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/ibmwatson.svg',
    description: 'Analyze and process text content',
    category: 'Data',
    toolType: 'Function'
  },
  translation_service: {
    displayName: 'Translation Service',
    icon: LanguageIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googletranslate.svg',
    description: 'Translate text between different languages',
    category: 'Data',
    toolType: 'API'
  },
  data_visualization: {
    displayName: 'Data Visualization',
    icon: ChartBarIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/tableau.svg',
    description: 'Create charts and visualizations from data',
    category: 'Data',
    toolType: 'Function'
  },
  statistical_analysis: {
    displayName: 'Statistical Analysis',
    icon: ChartPieIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/r.svg',
    description: 'Perform statistical analysis on datasets',
    category: 'Data',
    toolType: 'Function'
  },

  // Scheduling Tools (3)
  calendar_manager: {
    displayName: 'Calendar Manager',
    icon: CalendarDaysIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googlecalendar.svg',
    description: 'Manage calendar events and scheduling',
    category: 'Scheduling',
    toolType: 'API'
  },
  reminder_tool: {
    displayName: 'Reminder Tool',
    icon: BellIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/pushbullet.svg',
    description: 'Set and manage reminders and notifications',
    category: 'Scheduling',
    toolType: 'Function'
  },
  date_calculator: {
    displayName: 'Date Calculator',
    icon: CalculatorIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/calculator.svg',
    description: 'Calculate dates and time differences',
    category: 'Scheduling',
    toolType: 'Function'
  },

  // Communication Tools (3)
  email_sender: {
    displayName: 'Email Sender',
    icon: EnvelopeIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/gmail.svg',
    description: 'Send emails and manage email communications',
    category: 'Communication',
    toolType: 'API'
  },
  slack_integration: {
    displayName: 'Slack Integration',
    icon: ChatBubbleLeftIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/slack.svg',
    description: 'Integrate with Slack for messaging and notifications',
    category: 'Communication',
    toolType: 'API'
  },
  notification_service: {
    displayName: 'Notification Service',
    icon: SpeakerWaveIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/pushbullet.svg',
    description: 'Send notifications across multiple channels',
    category: 'Communication',
    toolType: 'API'
  },

  // Integration Tools (5)
  social_media: {
    displayName: 'Social Media',
    icon: ShareIcon,
    logo: undefined, // Use generic ShareIcon instead of specific platform logo
    description: 'Manage social media posts and interactions',
    category: 'Integration',
    toolType: 'API'
  },
  google_sheets_integration: {
    displayName: 'Google Sheets',
    icon: TableCellsIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googlesheets.svg',
    description: 'Integrate with Google Sheets for data management',
    category: 'Integration',
    toolType: 'API'
  },
  payment_processor: {
    displayName: 'Payment Processor',
    icon: CreditCardIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/stripe.svg',
    description: 'Process payments and handle transactions',
    category: 'Integration',
    toolType: 'API'
  },
  webhook_handler: {
    displayName: 'Webhook Handler',
    icon: LinkIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/webhooks.svg',
    description: 'Handle webhook events and integrations',
    category: 'Integration',
    toolType: 'Webhook'
  },
  zapier_webhook: {
    displayName: 'Zapier Webhook',
    icon: BoltIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/zapier.svg',
    description: 'Integrate with Zapier for workflow automation',
    category: 'Integration',
    toolType: 'Webhook'
  },

  // Advanced Tools (5)
  multi_link_scraper: {
    displayName: 'Multi-Link Scraper',
    icon: ArrowTopRightOnSquareIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/scrapy.svg',
    description: 'Scrape data from multiple links simultaneously',
    category: 'Data',
    toolType: 'Function'
  },
  chromadb_tool: {
    displayName: 'ChromaDB Tool',
    icon: CircleStackIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/chromadb.svg',
    description: 'Vector database operations with ChromaDB',
    category: 'Data',
    toolType: 'Database'
  },
  mongodb_advanced: {
    displayName: 'MongoDB Advanced',
    icon: ServerIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/mongodb.svg',
    description: 'Advanced MongoDB operations and queries',
    category: 'Data',
    toolType: 'Database'
  },
  pdf_generator: {
    displayName: 'PDF Generator',
    icon: DocumentPlusIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/adobeacrobatreader.svg',
    description: 'Generate PDF documents from various sources',
    category: 'Data',
    toolType: 'Function'
  },
  website_knowledge_base: {
    displayName: 'Website Knowledge Base',
    icon: BuildingLibraryIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/wikipedia.svg',
    description: 'Create knowledge bases from website content',
    category: 'Data',
    toolType: 'Function'
  },

  // CRM & Business Tools (2)
  hubspot: {
    displayName: 'HubSpot CRM',
    icon: BuildingOfficeIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/hubspot.svg',
    description: 'Integrate with HubSpot CRM and marketing tools',
    category: 'Integration',
    toolType: 'API'
  },
  example_website: {
    displayName: 'Example Website',
    icon: GlobeAltIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/webpack.svg',
    description: 'Example website integration tool',
    category: 'Integration',
    toolType: 'API'
  }
}

// Helper functions
export const getToolDisplayName = (toolName: string): string => {
  return TOOL_METADATA[toolName]?.displayName || toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export const getToolIcon = (toolName: string) => {
  return TOOL_METADATA[toolName]?.icon || WrenchScrewdriverIcon
}

export const getToolLogo = (toolName: string): string | null => {
  return TOOL_METADATA[toolName]?.logo || null
}

export const getToolMetadata = (toolName: string): ToolMetadata | null => {
  return TOOL_METADATA[toolName] || null
}

// Get all tools by category
export const getToolsByCategory = (category: string): ToolMetadata[] => {
  return Object.values(TOOL_METADATA).filter(tool => tool.category === category)
}

// Get all categories
export const getCategories = (): string[] => {
  const categories = new Set(Object.values(TOOL_METADATA).map(tool => tool.category))
  return Array.from(categories).sort()
}

// Get all tool types
export const getToolTypes = (): string[] => {
  const types = new Set(Object.values(TOOL_METADATA).map(tool => tool.toolType))
  return Array.from(types).sort()
}