// Tool documentation data for all 24 marketplace tools

export interface ToolDoc {
  name: string
  description: string
  category: string
  toolType: string
  icon: string
  overview: string
  features: string[]
  useCases: string[]
  configuration: {
    field: string
    description: string
    required: boolean
    type: string
  }[]
  setupSteps: string[]
}

export const TOOL_DOCS: Record<string, ToolDoc> = {
  // Search Tools (2)
  web_search: {
    name: 'Web Search',
    description: 'Advanced web search with DuckDuckGo integration, result filtering, and intelligent content extraction',
    category: 'Search',
    toolType: 'API',
    icon: '🔍',
    overview: 'The Web Search tool provides powerful web search capabilities using DuckDuckGo with advanced result processing, content filtering, and intelligent data extraction. Perfect for AI agents that need reliable, fast web search with privacy-focused results.',
    features: [
      'DuckDuckGo-powered web search with privacy protection',
      'Advanced safe search and content filtering',
      'Multiple result types (web pages, news, images, videos)',
      'Intelligent result ranking and relevance scoring',
      'Content extraction and summarization',
      'Domain-specific search filtering',
      'Customizable result limits and pagination',
      'Image search with fallback suggestions',
      'Real-time search result processing'
    ],
    useCases: [
      'AI research and fact-checking systems',
      'Real-time information gathering for agents',
      'Competitive intelligence and market research',
      'News monitoring and trend analysis',
      'Content discovery for social media',
      'Academic and professional research automation',
      'Product and service comparison research'
    ],
    configuration: [
      { field: 'Max Results', description: 'Maximum number of search results to return', required: false, type: 'Number' },
      { field: 'Safe Search', description: 'Enable safe search content filtering', required: false, type: 'Boolean' },
      { field: 'Result Type', description: 'Type of search results (web, images, news)', required: false, type: 'Select' },
      { field: 'Timeout (seconds)', description: 'Search request timeout in seconds', required: false, type: 'Number' },
      { field: 'Region', description: 'Search region/country code for localized results', required: false, type: 'Text' }
    ],
    setupSteps: [
      'Configure maximum result limits for performance',
      'Set safe search preferences based on use case',
      'Choose default result types (web, images, news)',
      'Set appropriate timeout values',
      'Configure regional search preferences if needed',
      'Test with various search queries',
      'Verify result filtering and formatting'
    ]
  },

  news_search: {
    name: 'News Search',
    description: 'Search for latest news articles using multiple news APIs',
    category: 'Search',
    toolType: 'API',
    icon: '📰',
    overview: 'The News Search tool aggregates news from multiple sources including NewsAPI.org, GNews, and Bing News. It provides comprehensive news coverage with language and country filtering capabilities.',
    features: [
      'Multiple news API integration',
      'Language and country filtering',
      'Real-time news updates',
      'Source credibility filtering',
      'Customizable result limits'
    ],
    useCases: [
      'News monitoring and alerts',
      'Market sentiment analysis',
      'Current events tracking',
      'Media coverage analysis'
    ],
    configuration: [
      { field: 'NewsAPI Key', description: 'API key for NewsAPI.org service', required: false, type: 'API Key' },
      { field: 'GNews API Key', description: 'API key for GNews service', required: false, type: 'API Key' },
      { field: 'Default Language', description: 'Default language for news articles', required: false, type: 'Text' },
      { field: 'Default Country', description: 'Default country for news sources', required: false, type: 'Text' }
    ],
    setupSteps: [
      'Register for NewsAPI.org account',
      'Register for GNews account',
      'Set language and country preferences',
      'Configure rate limiting',
      'Test with sample queries'
    ]
  },

  // Data Tools (9)
  weather_api: {
    name: 'Weather API',
    description: 'Get weather information using OpenWeatherMap API with forecasts and alerts',
    category: 'Data',
    toolType: 'API',
    icon: '🌤️',
    overview: 'The Weather API tool provides comprehensive weather information using OpenWeatherMap API. It supports current weather, forecasts, historical data, and weather alerts with multiple unit systems.',
    features: [
      'Current weather conditions',
      'Weather forecasts (daily/hourly)',
      'Weather alerts and warnings',
      'Multiple unit systems',
      'Location search by city/coordinates',
      'Historical weather data'
    ],
    useCases: [
      'Weather-based decision making',
      'Agricultural planning',
      'Travel and event planning',
      'Emergency preparedness',
      'Climate monitoring'
    ],
    configuration: [
      { field: 'API Key', description: 'OpenWeatherMap API key', required: true, type: 'API Key' },
      { field: 'Base URL', description: 'OpenWeatherMap API base URL', required: false, type: 'URL' },
      { field: 'Units', description: 'Temperature units (metric, imperial, kelvin)', required: false, type: 'Select' },
      { field: 'Language', description: 'Language for weather descriptions', required: false, type: 'Text' }
    ],
    setupSteps: [
      'Register for OpenWeatherMap account',
      'Get API key from dashboard',
      'Choose unit system',
      'Set language preferences',
      'Test with location queries'
    ]
  },

  csv_processor: {
    name: 'CSV Processor',
    description: 'Process and analyze CSV data with various operations',
    category: 'Data',
    toolType: 'Function',
    icon: '📊',
    overview: 'The CSV Processor tool provides comprehensive CSV file processing capabilities including reading, writing, filtering, sorting, and data analysis. It supports multiple file formats and encoding options.',
    features: [
      'Read and write CSV files',
      'Data filtering and sorting',
      'Statistical analysis',
      'Format conversion (CSV, XLSX, JSON)',
      'Data validation and cleaning',
      'Large file handling'
    ],
    useCases: [
      'Data import/export operations',
      'Report generation',
      'Data cleaning and preprocessing',
      'Business analytics',
      'Database migrations'
    ],
    configuration: [
      { field: 'File Encoding', description: 'CSV file encoding format', required: false, type: 'Select' },
      { field: 'Delimiter', description: 'CSV delimiter character', required: false, type: 'Text' },
      { field: 'Max Results', description: 'Maximum number of results', required: false, type: 'Number' },
      { field: 'Timeout', description: 'Processing timeout in seconds', required: false, type: 'Number' }
    ],
    setupSteps: [
      'Set file encoding preferences',
      'Configure delimiter settings',
      'Set processing limits',
      'Test with sample CSV files',
      'Verify data integrity'
    ]
  },

  database_query: {
    name: 'Database Query',
    description: 'Execute database queries safely with parameterized queries',
    category: 'Data',
    toolType: 'Function',
    icon: '🗄️',
    overview: 'The Database Query tool provides secure database access with support for multiple database systems. It uses parameterized queries to prevent SQL injection and supports connection pooling.',
    features: [
      'Multi-database support (PostgreSQL, MySQL, SQLite)',
      'Parameterized queries for security',
      'Connection pooling',
      'Query timeout handling',
      'Result set pagination',
      'Transaction support'
    ],
    useCases: [
      'Data retrieval and reporting',
      'Database maintenance tasks',
      'Data synchronization',
      'Business intelligence queries',
      'Application data access'
    ],
    configuration: [
      { field: 'Connection String', description: 'Database connection string', required: true, type: 'Password' },
      { field: 'Query Timeout', description: 'Maximum query execution time', required: false, type: 'Number' },
      { field: 'Max Rows', description: 'Maximum rows to return', required: false, type: 'Number' }
    ],
    setupSteps: [
      'Prepare database connection string',
      'Test database connectivity',
      'Set query timeout limits',
      'Configure row limits',
      'Test with sample queries'
    ]
  },

  data_scraper: {
    name: 'Data Scraper',
    description: 'Scrape data from websites using various methods including CSS selectors',
    category: 'Data',
    toolType: 'Function',
    icon: '🕷️',
    overview: 'The Data Scraper tool provides ethical web scraping capabilities with CSS selectors, XPath support, and respect for robots.txt. It includes rate limiting and anti-detection features.',
    features: [
      'CSS selector-based extraction',
      'XPath support',
      'Rate limiting and delays',
      'Robots.txt compliance',
      'Multiple output formats',
      'JavaScript rendering support'
    ],
    useCases: [
      'Market research and pricing',
      'Content aggregation',
      'Competitor analysis',
      'Real estate listings',
      'Product information gathering'
    ],
    configuration: [
      { field: 'User Agent', description: 'User agent string for requests', required: false, type: 'Text' },
      { field: 'Request Delay', description: 'Delay between requests', required: false, type: 'Number' },
      { field: 'Max Pages', description: 'Maximum pages to scrape', required: false, type: 'Number' },
      { field: 'Respect robots.txt', description: 'Follow robots.txt rules', required: false, type: 'Boolean' }
    ],
    setupSteps: [
      'Set appropriate user agent',
      'Configure request delays',
      'Set page limits',
      'Enable robots.txt compliance',
      'Test with target websites'
    ]
  },

  file_processor: {
    name: 'File Processor',
    description: 'Process various file types including text, CSV, JSON, and images',
    category: 'Data',
    toolType: 'Function',
    icon: '📁',
    overview: 'The File Processor tool handles multiple file formats with operations like reading, writing, conversion, validation, and compression. It supports batch processing and format detection.',
    features: [
      'Multi-format support (TXT, JSON, XML, YAML)',
      'File format conversion',
      'Batch processing',
      'File validation',
      'Compression and extraction',
      'Automatic encoding detection'
    ],
    useCases: [
      'File format conversion',
      'Batch file processing',
      'Data migration',
      'File validation and cleanup',
      'Archive management'
    ],
    configuration: [
      { field: 'Max File Size (MB)', description: 'Maximum file size limit', required: false, type: 'Number' },
      { field: 'Supported Formats', description: 'Comma-separated file formats', required: false, type: 'Text' },
      { field: 'Auto-detect Encoding', description: 'Automatically detect file encoding', required: false, type: 'Boolean' }
    ],
    setupSteps: [
      'Set file size limits',
      'Configure supported formats',
      'Enable encoding detection',
      'Test with various file types',
      'Verify processing results'
    ]
  },

  image_processor: {
    name: 'Image Processor',
    description: 'Process images including resizing, filtering, and format conversion',
    category: 'Data',
    toolType: 'Function',
    icon: '🖼️',
    overview: 'The Image Processor tool provides comprehensive image manipulation capabilities including resizing, cropping, filtering, format conversion, and optimization.',
    features: [
      'Image resizing and cropping',
      'Format conversion (JPEG, PNG, WebP)',
      'Image filters and effects',
      'Batch processing',
      'Quality optimization',
      'Metadata extraction'
    ],
    useCases: [
      'Website image optimization',
      'Thumbnail generation',
      'Image format standardization',
      'Photo editing automation',
      'Content management'
    ],
    configuration: [
      { field: 'Max File Size (MB)', description: 'Maximum image file size', required: false, type: 'Number' },
      { field: 'Supported Formats', description: 'Supported image formats', required: false, type: 'Text' },
      { field: 'Default Quality', description: 'Default image quality (1-100)', required: false, type: 'Number' }
    ],
    setupSteps: [
      'Set file size limits',
      'Configure supported formats',
      'Set default quality settings',
      'Test with sample images',
      'Verify output quality'
    ]
  },

  pdf_processor: {
    name: 'PDF Processor',
    description: 'Process PDF files including text extraction and image extraction',
    category: 'Data',
    toolType: 'Function',
    icon: '📄',
    overview: 'The PDF Processor tool provides comprehensive PDF manipulation capabilities including text extraction, image extraction, page splitting, merging, and OCR support.',
    features: [
      'Text extraction from PDFs',
      'Image extraction',
      'PDF splitting and merging',
      'OCR for scanned documents',
      'Metadata extraction',
      'Password-protected PDF support'
    ],
    useCases: [
      'Document digitization',
      'Content extraction for analysis',
      'PDF manipulation and editing',
      'Archive processing',
      'Data mining from documents'
    ],
    configuration: [
      { field: 'Max File Size (MB)', description: 'Maximum PDF file size', required: false, type: 'Number' },
      { field: 'Extract Images', description: 'Extract images from PDF', required: false, type: 'Boolean' },
      { field: 'OCR Enabled', description: 'Enable OCR for scanned PDFs', required: false, type: 'Boolean' }
    ],
    setupSteps: [
      'Set file size limits',
      'Configure image extraction',
      'Enable OCR if needed',
      'Test with sample PDFs',
      'Verify extraction quality'
    ]
  },

  text_analyzer: {
    name: 'Text Analyzer',
    description: 'Perform various text analysis operations including sentiment analysis',
    category: 'Data',
    toolType: 'Function',
    icon: '📝',
    overview: 'The Text Analyzer tool provides comprehensive text analysis capabilities including sentiment analysis, keyword extraction, language detection, and readability scoring.',
    features: [
      'Sentiment analysis',
      'Keyword extraction',
      'Language detection',
      'Readability scoring',
      'Text summarization',
      'Entity recognition'
    ],
    useCases: [
      'Social media monitoring',
      'Customer feedback analysis',
      'Content optimization',
      'Market research',
      'Document classification'
    ],
    configuration: [
      { field: 'Max Text Length', description: 'Maximum text length to analyze', required: false, type: 'Number' },
      { field: 'Default Language', description: 'Default language for analysis', required: false, type: 'Text' },
      { field: 'Sentiment Threshold', description: 'Threshold for sentiment classification', required: false, type: 'Number' }
    ],
    setupSteps: [
      'Set text length limits',
      'Configure language settings',
      'Set sentiment thresholds',
      'Test with sample texts',
      'Verify analysis accuracy'
    ]
  },

  translation_service: {
    name: 'Translation Service',
    description: 'Translate text between multiple languages using Deep Translator',
    category: 'Data',
    toolType: 'Function',
    icon: '🌐',
    overview: 'The Translation Service tool provides multi-language translation capabilities using various translation engines including Google Translate, Microsoft Translator, and others.',
    features: [
      'Multi-language support',
      'Multiple translation engines',
      'Automatic language detection',
      'Batch translation',
      'Translation confidence scoring',
      'Text formatting preservation'
    ],
    useCases: [
      'Content localization',
      'Multilingual customer support',
      'Document translation',
      'Real-time communication',
      'International business'
    ],
    configuration: [
      { field: 'Source Language', description: 'Source language code', required: false, type: 'Text' },
      { field: 'Target Language', description: 'Target language code', required: false, type: 'Text' }
    ],
    setupSteps: [
      'Set source language preferences',
      'Configure target languages',
      'Test with sample texts',
      'Verify translation quality',
      'Set up batch processing'
    ]
  },

  // Analytics Tools (2)
  data_visualization: {
    name: 'Data Visualization',
    description: 'Create charts and graphs from data',
    category: 'Analytics',
    toolType: 'Function',
    icon: '📊',
    overview: 'The Data Visualization tool creates professional charts, graphs, and visualizations from various data sources with customizable styling and export options.',
    features: [
      'Multiple chart types (bar, line, pie, scatter)',
      'Interactive visualizations',
      'Custom styling and themes',
      'Export to multiple formats',
      'Real-time data updates',
      'Dashboard creation'
    ],
    useCases: [
      'Business reporting and dashboards',
      'Data analysis and insights',
      'Presentation materials',
      'Performance monitoring',
      'Research visualization'
    ],
    configuration: [
      { field: 'Default Style', description: 'Default chart style', required: false, type: 'Select' },
      { field: 'Figure Width', description: 'Default figure width', required: false, type: 'Number' },
      { field: 'Figure Height', description: 'Default figure height', required: false, type: 'Number' },
      { field: 'DPI', description: 'Image resolution', required: false, type: 'Number' }
    ],
    setupSteps: [
      'Choose default chart style',
      'Set figure dimensions',
      'Configure resolution settings',
      'Test with sample data',
      'Verify export formats'
    ]
  },

  statistical_analysis: {
    name: 'Statistical Analysis',
    description: 'Perform statistical analysis on datasets',
    category: 'Analytics',
    toolType: 'Function',
    icon: '📈',
    overview: 'The Statistical Analysis tool provides comprehensive statistical analysis capabilities including hypothesis testing, correlation analysis, regression, and advanced statistical methods.',
    features: [
      'Descriptive statistics',
      'Hypothesis testing',
      'Correlation and regression analysis',
      'Distribution analysis',
      'ANOVA and chi-square tests',
      'Time series analysis'
    ],
    useCases: [
      'Research and academic studies',
      'Business analytics',
      'Quality control analysis',
      'Market research',
      'Scientific data analysis'
    ],
    configuration: [
      { field: 'Confidence Level', description: 'Default confidence level', required: false, type: 'Number' },
      { field: 'Random Seed', description: 'Random seed for reproducibility', required: false, type: 'Number' },
      { field: 'Max Samples', description: 'Maximum samples to process', required: false, type: 'Number' }
    ],
    setupSteps: [
      'Set confidence levels',
      'Configure random seed',
      'Set sample limits',
      'Test with datasets',
      'Verify statistical outputs'
    ]
  },

  // Scheduling Tools (3)
  calendar_manager: {
    name: 'Calendar Manager',
    description: 'Complete Google Calendar management with AI-powered scheduling and availability detection',
    category: 'Scheduling',
    toolType: 'Function',
    icon: '📅',
    overview: 'The Calendar Manager provides comprehensive Google Calendar integration with advanced features for AI agents. Create, update, and delete events, automatically find free time slots, manage multiple calendars, and coordinate complex scheduling scenarios with intelligent availability detection.',
    features: [
      'Full CRUD operations for calendar events',
      'Intelligent free time slot detection',
      'Multi-calendar management and coordination',
      'Automatic conflict detection and resolution',
      'Event reminders and notification management',
      'Attendee management and invitation handling',
      'Recurring event pattern support',
      'Time zone handling and conversion',
      'Calendar sharing and permissions',
      'Integration with other scheduling tools'
    ],
    useCases: [
      'AI-powered personal assistant scheduling',
      'Automated meeting coordination systems',
      'Smart calendar availability APIs',
      'Event management automation',
      'Cross-timezone meeting planning',
      'Resource booking and management',
      'Appointment scheduling systems'
    ],
    configuration: [
      { field: 'Google Credentials Path', description: 'Path to Google Calendar API service account credentials JSON file', required: true, type: 'File Path' },
      { field: 'Token Storage Path', description: 'Path to store OAuth authentication tokens for persistent access', required: false, type: 'File Path' },
      { field: 'Calendar ID', description: 'Primary Google Calendar ID (use "primary" for main calendar)', required: false, type: 'Text' },
      { field: 'Default Reminder (minutes)', description: 'Default reminder time in minutes before events', required: false, type: 'Number' },
      { field: 'Time Zone', description: 'Default timezone for event creation', required: false, type: 'Text' }
    ],
    setupSteps: [
      'Create Google Cloud Project and enable Calendar API',
      'Create service account with Calendar API access',
      'Download service account credentials JSON file',
      'Share target calendars with service account email',
      'Configure credentials path in tool settings',
      'Test authentication and basic operations',
      'Verify calendar access and permissions',
      'Set up default calendar and reminder preferences'
    ]
  },

  reminder_tool: {
    name: 'Reminder Tool',
    description: 'Set and manage reminders with notifications',
    category: 'Scheduling',
    toolType: 'Function',
    icon: '⏰',
    overview: 'The Reminder Tool provides comprehensive reminder management with multiple notification channels, recurring reminders, and priority levels.',
    features: [
      'Create and manage reminders',
      'Multiple notification channels',
      'Recurring reminders',
      'Priority levels',
      'Snooze functionality',
      'Reminder categories'
    ],
    useCases: [
      'Task and deadline management',
      'Appointment reminders',
      'Recurring task automation',
      'Personal productivity',
      'Team coordination'
    ],
    configuration: [
      { field: 'Storage File', description: 'File to store reminders', required: false, type: 'File Path' },
      { field: 'Default Timezone', description: 'Default timezone for reminders', required: false, type: 'Text' },
      { field: 'Notification Methods', description: 'Notification channels', required: false, type: 'Text' }
    ],
    setupSteps: [
      'Set storage location',
      'Configure timezone',
      'Set up notification channels',
      'Test reminder creation',
      'Verify notifications'
    ]
  },

  date_calculator: {
    name: 'Date Calculator',
    description: 'Perform date calculations and formatting operations',
    category: 'Scheduling',
    toolType: 'Function',
    icon: '🗓️',
    overview: 'The Date Calculator tool provides comprehensive date and time calculations including date arithmetic, timezone conversions, and business day calculations.',
    features: [
      'Date arithmetic operations',
      'Timezone conversions',
      'Business day calculations',
      'Date formatting',
      'Age calculations',
      'Holiday and weekend handling'
    ],
    useCases: [
      'Project timeline planning',
      'Age and duration calculations',
      'Business day scheduling',
      'International date handling',
      'Deadline management'
    ],
    configuration: [
      { field: 'Default Timezone', description: 'Default timezone for calculations', required: false, type: 'Text' },
      { field: 'Default Date Format', description: 'Default format for date output', required: false, type: 'Text' },
      { field: 'Business Days Only', description: 'Consider only business days', required: false, type: 'Boolean' }
    ],
    setupSteps: [
      'Set default timezone',
      'Configure date formats',
      'Set business day rules',
      'Test date calculations',
      'Verify timezone handling'
    ]
  },

  // Communication Tools (4)
  email_sender: {
    name: 'Email Sender',
    description: 'Send emails using SMTP with support for multiple email providers',
    category: 'Communication',
    toolType: 'Function',
    icon: '📧',
    overview: 'The Email Sender tool provides robust email sending capabilities through SMTP with support for HTML emails, attachments, and multiple providers.',
    features: [
      'SMTP email sending',
      'HTML and plain text emails',
      'Email attachments',
      'CC and BCC recipients',
      'Custom headers',
      'Multiple provider support'
    ],
    useCases: [
      'Automated email notifications',
      'Marketing campaigns',
      'System alerts',
      'Customer communication',
      'Report distribution'
    ],
    configuration: [
      { field: 'SMTP Server', description: 'SMTP server hostname', required: true, type: 'Text' },
      { field: 'SMTP Port', description: 'SMTP server port', required: true, type: 'Number' },
      { field: 'Email Username', description: 'Email account username', required: true, type: 'Text' },
      { field: 'Email Password', description: 'Email account password', required: true, type: 'Password' },
      { field: 'Use TLS', description: 'Enable TLS encryption', required: false, type: 'Boolean' }
    ],
    setupSteps: [
      'Choose email provider',
      'Enable 2-factor authentication',
      'Generate app password',
      'Configure SMTP settings',
      'Test email sending',
      'Set up templates'
    ]
  },

  slack_integration: {
    name: 'Slack Integration',
    description: 'Send messages to Slack channels and manage Slack operations',
    category: 'Communication',
    toolType: 'Webhook',
    icon: '💬',
    overview: 'The Slack Integration tool provides comprehensive Slack workspace integration including messaging, channel management, and user interactions.',
    features: [
      'Send messages to channels',
      'Create and manage channels',
      'User and team management',
      'File uploads',
      'Interactive messages',
      'Bot integration'
    ],
    useCases: [
      'Team communication automation',
      'System notifications',
      'Project updates',
      'Alert management',
      'Workflow integration'
    ],
    configuration: [
      { field: 'Slack Bot Token', description: 'Slack bot token for API access', required: true, type: 'API Key' },
      { field: 'Webhook URL', description: 'Slack webhook URL', required: false, type: 'URL' },
      { field: 'Default Channel', description: 'Default Slack channel', required: false, type: 'Text' },
      { field: 'Bot Username', description: 'Display name for bot', required: false, type: 'Text' }
    ],
    setupSteps: [
      'Create Slack app',
      'Install app to workspace',
      'Get bot token',
      'Set up webhooks',
      'Configure permissions',
      'Test messaging'
    ]
  },

  notification_service: {
    name: 'Notification Service',
    description: 'Advanced notification system with immediate and scheduled delivery across multiple channels',
    category: 'Communication',
    toolType: 'Function',
    icon: '🔔',
    overview: 'The Notification Service provides comprehensive notification management with support for immediate delivery, scheduled notifications, and recurring automation. Send notifications via email, SMS, push notifications, and in-app messages with advanced scheduling and analytics.',
    features: [
      'Multi-channel delivery (Email, SMS, Push, In-app)',
      'Immediate notification sending',
      'Scheduled notifications with precise timing',
      'Recurring notifications (daily, weekly, monthly, yearly)',
      'Batch notification processing',
      'Cross-provider support (Firebase, Twilio, SMTP)',
      'Delivery analytics and reporting',
      'Notification scheduling management',
      'Retry mechanisms and error handling'
    ],
    useCases: [
      'AI agent alert systems',
      'Automated reminder services',
      'Marketing campaign automation',
      'System monitoring and alerts',
      'User engagement workflows',
      'Event-driven notifications',
      'Recurring business communications'
    ],
    configuration: [
      { field: 'SMTP Server', description: 'SMTP server for email notifications', required: false, type: 'Text' },
      { field: 'SMTP Username', description: 'SMTP username/email', required: false, type: 'Text' },
      { field: 'SMTP Password', description: 'SMTP password or app password', required: false, type: 'Password' },
      { field: 'Twilio Account SID', description: 'Twilio account SID for SMS', required: false, type: 'API Key' },
      { field: 'Twilio Auth Token', description: 'Twilio authentication token', required: false, type: 'Password' },
      { field: 'Twilio Phone Number', description: 'Twilio phone number for SMS sending', required: false, type: 'Text' },
      { field: 'Firebase Service Account', description: 'Firebase service account JSON path', required: false, type: 'File Path' },
      { field: 'Default Provider', description: 'Default notification provider', required: false, type: 'Select' }
    ],
    setupSteps: [
      'Set up email provider (Gmail, Outlook, or custom SMTP)',
      'Configure Twilio account for SMS notifications',
      'Set up Firebase project for push notifications',
      'Configure service account credentials',
      'Test immediate notification delivery',
      'Set up scheduled notification storage',
      'Configure recurring notification patterns',
      'Test automation and scheduling features'
    ]
  },

  social_media: {
    name: 'Social Media',
    description: 'Complete social media management across Twitter, Facebook, LinkedIn, and Instagram',
    category: 'Communication',
    toolType: 'Function',
    icon: '📱',
    overview: 'The Social Media tool provides comprehensive social media management with support for all major platforms. Post content, analyze engagement, schedule posts, and manage cross-platform campaigns with advanced analytics and automation.',
    features: [
      'Multi-platform posting (Twitter, Facebook, LinkedIn, Instagram)',
      'Cross-platform campaigns with single command',
      'Real-time analytics and engagement metrics',
      'Content scheduling and automation',
      'Media uploads (images, videos)',
      'Unified analytics dashboard',
      'Platform-specific optimizations',
      'Engagement tracking and insights'
    ],
    useCases: [
      'AI-powered social media marketing',
      'Cross-platform content distribution',
      'Brand management and consistency',
      'Social media analytics and reporting',
      'Automated posting schedules',
      'Influencer and business account management'
    ],
    configuration: [
      { field: 'Twitter API Key', description: 'Twitter API key for posting and analytics', required: false, type: 'API Key' },
      { field: 'Twitter API Secret', description: 'Twitter API secret', required: false, type: 'Password' },
      { field: 'Facebook Page Token', description: 'Facebook page access token', required: false, type: 'API Key' },
      { field: 'Facebook Page ID', description: 'Facebook page ID for posting', required: false, type: 'Text' },
      { field: 'LinkedIn Access Token', description: 'LinkedIn API access token', required: false, type: 'API Key' },
      { field: 'LinkedIn Person ID', description: 'LinkedIn person/profile ID', required: false, type: 'Text' },
      { field: 'Instagram Access Token', description: 'Instagram business account access token', required: false, type: 'API Key' },
      { field: 'Instagram User ID', description: 'Instagram business account user ID', required: false, type: 'Text' },
      { field: 'Default Platform', description: 'Default platform when none specified', required: false, type: 'Select' }
    ],
    setupSteps: [
      'Create developer accounts for each platform (Twitter, Facebook, LinkedIn, Instagram)',
      'Generate API keys and access tokens for each platform',
      'Set up Facebook Business account for Instagram access',
      'Configure LinkedIn developer application',
      'Test individual platform connections',
      'Configure cross-platform posting preferences',
      'Set up analytics tracking and reporting'
    ]
  },

  // Integration Tools (4)
  google_sheets_integration: {
    name: 'Google Sheets Integration',
    description: 'Complete Google Sheets automation with advanced data processing and real-time collaboration',
    category: 'Integration',
    toolType: 'API',
    icon: '📊',
    overview: 'The Google Sheets Integration provides comprehensive spreadsheet automation with advanced data processing capabilities. Perfect for AI agents that need to read, write, analyze, and manage spreadsheet data with support for complex operations, formatting, and real-time collaboration.',
    features: [
      'Full CRUD operations on spreadsheet data',
      'Advanced cell formatting and conditional styling',
      'Formula creation and calculation support',
      'Batch data operations for performance',
      'Multi-sheet workbook management',
      'Real-time collaborative editing',
      'Data validation and error checking',
      'Chart and visualization creation',
      'Import/export to multiple formats (CSV, XLSX, PDF)',
      'Automated data synchronization'
    ],
    useCases: [
      'AI-powered data analysis and reporting',
      'Automated inventory and resource management',
      'Dynamic dashboard and KPI tracking',
      'Collaborative project management',
      'Financial modeling and budgeting',
      'Customer relationship management (CRM)',
      'Content management and publishing workflows',
      'Data pipeline integration and ETL processes'
    ],
    configuration: [
      { field: 'Google Service Account Path', description: 'Path to Google Sheets API service account credentials JSON', required: true, type: 'File Path' },
      { field: 'Token Storage Path', description: 'Path to store OAuth tokens for user authentication', required: false, type: 'File Path' },
      { field: 'Default Value Input Option', description: 'How input data is interpreted (RAW, USER_ENTERED)', required: false, type: 'Select' },
      { field: 'Default Date Format', description: 'Default date format for data entry', required: false, type: 'Text' },
      { field: 'Batch Size', description: 'Number of operations to batch together', required: false, type: 'Number' }
    ],
    setupSteps: [
      'Create Google Cloud Project and enable Sheets API',
      'Create service account with Sheets API permissions',
      'Download service account credentials JSON file',
      'Share target spreadsheets with service account email',
      'Configure credentials path and authentication',
      'Set up default formatting and data input options',
      'Test basic read/write operations',
      'Verify batch operations and performance'
    ]
  },

  payment_processor: {
    name: 'Payment Processor',
    description: 'Process payments, handle refunds, and manage payment analytics',
    category: 'Integration',
    toolType: 'API',
    icon: '💳',
    overview: 'The Payment Processor tool provides secure payment processing with support for multiple payment providers and comprehensive transaction management.',
    features: [
      'Multi-provider support (Stripe, PayPal)',
      'Secure payment processing',
      'Refund management',
      'Subscription handling',
      'Transaction analytics',
      'Fraud detection'
    ],
    useCases: [
      'E-commerce transactions',
      'Subscription billing',
      'Marketplace payments',
      'Donation processing',
      'Invoice payments'
    ],
    configuration: [
      { field: 'Stripe Secret Key', description: 'Stripe API secret key', required: false, type: 'API Key' },
      { field: 'PayPal Client ID', description: 'PayPal API client ID', required: false, type: 'API Key' },
      { field: 'Default Currency', description: 'Default currency code', required: false, type: 'Text' },
      { field: 'Test Mode', description: 'Enable test mode', required: false, type: 'Boolean' }
    ],
    setupSteps: [
      'Create payment provider accounts',
      'Get API credentials',
      'Set up webhooks',
      'Configure test mode',
      'Test payment flows',
      'Set up production'
    ]
  },

  webhook_handler: {
    name: 'Webhook Handler',
    description: 'Handle webhooks including sending webhooks to external services',
    category: 'Integration',
    toolType: 'Webhook',
    icon: '🔗',
    overview: 'The Webhook Handler tool provides comprehensive webhook management for sending and receiving HTTP callbacks with authentication and retry logic.',
    features: [
      'Send and receive webhooks',
      'Authentication support',
      'Retry mechanisms',
      'Payload transformation',
      'Rate limiting',
      'Logging and monitoring'
    ],
    useCases: [
      'System integration',
      'Event-driven automation',
      'Real-time notifications',
      'Third-party integrations',
      'Microservice communication'
    ],
    configuration: [
      { field: 'Webhook URL', description: 'Webhook endpoint URL', required: true, type: 'URL' },
      { field: 'HTTP Method', description: 'HTTP method for requests', required: false, type: 'Select' },
      { field: 'Headers', description: 'Additional headers', required: false, type: 'Text' },
      { field: 'Authorization Header', description: 'Authorization header', required: false, type: 'Password' },
      { field: 'Timeout (seconds)', description: 'Request timeout', required: false, type: 'Number' }
    ],
    setupSteps: [
      'Set up webhook endpoint',
      'Configure authentication',
      'Set request parameters',
      'Test webhook delivery',
      'Set up monitoring'
    ]
  },

  zapier_webhook: {
    name: 'Zapier Webhook',
    description: 'Trigger Zapier automations via webhooks',
    category: 'Integration',
    toolType: 'Webhook',
    icon: '⚡',
    overview: 'The Zapier Webhook tool provides seamless integration with Zapier automation platform for triggering workflows and connecting apps.',
    features: [
      'Zapier workflow triggers',
      'Multi-app automation',
      'Data transformation',
      'Conditional logic',
      'Error handling',
      'Workflow monitoring'
    ],
    useCases: [
      'Workflow automation',
      'App integration',
      'Data synchronization',
      'Business process automation',
      'Notification workflows'
    ],
    configuration: [
      { field: 'Zapier Webhook URL', description: 'Zapier webhook trigger URL', required: true, type: 'URL' },
      { field: 'Auth Header', description: 'Authorization header', required: false, type: 'Password' },
      { field: 'Retry Attempts', description: 'Number of retry attempts', required: false, type: 'Number' }
    ],
    setupSteps: [
      'Create Zapier account',
      'Set up webhook trigger',
      'Get webhook URL',
      'Configure authentication',
      'Test trigger',
      'Set up automation'
    ]
  }
}

export const getCategoryIcon = (category: string): string => {
  switch (category) {
    case 'Search': return '🔍'
    case 'Data': return '📊'
    case 'Analytics': return '📈'
    case 'Scheduling': return '📅'
    case 'Communication': return '📧'
    case 'Integration': return '🔗'
    default: return '🛠️'
  }
}