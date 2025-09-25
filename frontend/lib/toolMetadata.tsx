// Centralized tool metadata for all marketplace tools
// This file provides display names, icons, and logos for all tools

import React from 'react'
import { FaTelegram } from "react-icons/fa"
import { FaSquareRss } from "react-icons/fa6"
import { SiMongodb } from "react-icons/si"
import {
  // Search & Information
  MagnifyingGlassIcon,
  NewspaperIcon,
  RssIcon,
  
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
  CpuChipIcon,
  CodeBracketIcon,
  
  // Scheduling & Time
  CalendarDaysIcon,
  BellIcon,
  CalculatorIcon,
  ClockIcon,
  
  // Communication
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  SpeakerWaveIcon,
  PhoneIcon,
  VideoCameraIcon,
  
  // Social & Integration
  ShareIcon,
  CreditCardIcon,
  LinkIcon,
  BoltIcon,
  ArrowTopRightOnSquareIcon,
  UserGroupIcon,
  HeartIcon,
  
  // Database & Storage
  ServerIcon,
  DocumentPlusIcon,
  BuildingLibraryIcon,
  BuildingOfficeIcon,
  ArchiveBoxIcon,
  FolderIcon,
  
  // Web & Network
  WifiIcon,
  SignalIcon,
  CommandLineIcon,
  
  // Business & Finance
  BanknotesIcon,
  BuildingStorefrontIcon,
  
  // Default
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'

// Custom brand icons as React components
const RedditIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
)

const HubSpotIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.1 8.6V2.3h-2.6v6.3c0 1.1-.9 2-2 2s-2-.9-2-2V2.3H7.9v6.3c0 2.1 1.7 3.8 3.8 3.8s3.8-1.7 3.8-3.8V2.3h-2.6v6.3c0 1.1-.9 2-2 2s-2-.9-2-2V2.3H2.3v19.4h19.4V8.6h-4.6z"/>
  </svg>
)

const MongoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.193 9.555c-1.264-5.58-7.134-5.164-8.693.592-.691 2.655-.149 4.52.643 5.48.801.96 1.9 1.44 3.3 1.44s2.499-.48 3.3-1.44c.792-.96 1.334-2.825.643-5.48zM12 12.24c-.735 0-1.33-.595-1.33-1.33s.595-1.33 1.33-1.33 1.33.595 1.33 1.33-.595 1.33-1.33 1.33z"/>
  </svg>
)

export interface ToolMetadata {
  displayName: string
  icon: any
  logo?: string
  description: string
  category: string
  toolType: string
  brandColor?: string
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
    toolType: 'API',
    brandColor: '#DE5833'
  },
  news_search: {
    displayName: 'News Search',
    icon: NewspaperIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/newsapi.svg',
    description: 'Search for latest news articles on any topic',
    category: 'Search',
    toolType: 'API',
    brandColor: '#FF6B35'
  },
  reddit_tool: {
    displayName: 'Reddit Content Discovery',
    icon: RedditIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/reddit.svg',
    description: 'Discover trending content from Reddit for social media creation',
    category: 'Search',
    toolType: 'API',
    brandColor: '#FF5700'
  },
  rss_feed_tool: {
    displayName: 'RSS Feed Reader',
    icon: FaSquareRss,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/rss.svg',
    description: 'Fetch and process RSS feeds from multiple sources for content discovery',
    category: 'Search',
    toolType: 'API',
    brandColor: '#FF6600'
  },
  telegram_tool: {
    displayName: 'Telegram Content Discovery',
    icon: FaTelegram,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/telegram.svg',
    description: 'Fetch and process content from Telegram channels and groups',
    category: 'Search',
    toolType: 'API',
    brandColor: '#0088CC'
  },

  // Data Tools (11)
  weather_api: {
    displayName: 'Weather API',
    icon: CloudIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openweathermap.svg',
    description: 'Get current weather conditions and forecasts',
    category: 'Data',
    toolType: 'API',
    brandColor: '#4A90E2'
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
    icon: FolderIcon,
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
    icon: DocumentMagnifyingGlassIcon,
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
    toolType: 'API',
    brandColor: '#4285F4'
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
    icon: ClockIcon,
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
    toolType: 'API',
    brandColor: '#EA4335'
  },
  slack_integration: {
    displayName: 'Slack Integration',
    icon: ChatBubbleLeftIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/slack.svg',
    description: 'Integrate with Slack for messaging and notifications',
    category: 'Communication',
    toolType: 'API',
    brandColor: '#4A154B'
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
    icon: HeartIcon,
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
    toolType: 'API',
    brandColor: '#0F9D58'
  },
  payment_processor: {
    displayName: 'Payment Processor',
    icon: BanknotesIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/stripe.svg',
    description: 'Process payments and handle transactions',
    category: 'Integration',
    toolType: 'API',
    brandColor: '#635BFF'
  },
  webhook_handler: {
    displayName: 'Webhook Handler',
    icon: WifiIcon,
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
    icon: ArchiveBoxIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/chromadb.svg',
    description: 'Vector database operations with ChromaDB',
    category: 'Data',
    toolType: 'Database'
  },
  mongodb_advanced: {
    displayName: 'MongoDB Advanced',
    icon: SiMongodb,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/mongodb.svg',
    description: 'Advanced MongoDB operations and queries',
    category: 'Data',
    toolType: 'Database',
    brandColor: '#47A248'
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
    icon: HubSpotIcon,
    logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/hubspot.svg',
    description: 'Integrate with HubSpot CRM and marketing tools',
    category: 'Integration',
    toolType: 'API',
    brandColor: '#FF7A59'
  },
  example_website: {
    displayName: 'Example Website',
    icon: CommandLineIcon,
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

export const getToolBrandColor = (toolName: string): string | null => {
  return TOOL_METADATA[toolName]?.brandColor || null
}

// Helper function to get a styled icon component with brand colors
export const getStyledToolIcon = (toolName: string, className: string = "w-5 h-5"): React.ReactElement => {
  const metadata = TOOL_METADATA[toolName]
  if (!metadata) return <WrenchScrewdriverIcon className={className} />
  
  const IconComponent = metadata.icon as React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  const brandColor = metadata.brandColor
  
  if (brandColor) {
    return <IconComponent className={className} style={{ color: brandColor }} />
  }
  
  return <IconComponent className={className} />
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