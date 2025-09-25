"""
Tool System Prompts Service

This service manages tool-specific system prompts that are automatically
included when tools are added to agents. Each tool can have its own
system prompt that provides specific guidance on how to use that tool.
"""

import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

class ToolSystemPromptsService:
    """
    Service for managing tool-specific system prompts.
    Each tool can have its own system prompt that gets automatically
    included when the tool is added to an agent.
    """
    
    def __init__(self):
        self.tool_prompts = self._load_tool_prompts()
    
    def _load_tool_prompts(self) -> Dict[str, str]:
        """
        Load tool-specific system prompts.
        Each tool can have its own system prompt that provides
        specific guidance on how to use that tool effectively.
        """
        return {
            'web_search': """
**WEB SEARCH TOOL GUIDANCE:**
- Use web_search when users ask about current events, recent news, or information that might have changed
- Use web_search for questions about recent developments, latest updates, or real-time information
- Use web_search when you need to verify current facts or get the most up-to-date information
- Use web_search for questions about recent technology, products, or services
- Always provide the source URLs when sharing search results
- If search results are limited, try rephrasing the query or using different keywords
""",
            
            'reddit_tool': """
**REDDIT TOOL GUIDANCE:**
- Use reddit_tool to discover trending content from Reddit for social media creation
- Perfect for finding viral posts, analyzing engagement, and formatting content for Twitter, Instagram, and TikTok
- Always specify the subreddit you want to search (e.g., 'technology', 'AskReddit', 'todayilearned')
- Use different sort methods: 'hot' for trending, 'new' for latest, 'top' for most popular
- Filter by content type: 'questions', 'stories', 'facts', 'discussions', or 'all'
- Set appropriate upvote and comment thresholds to find quality content
- Use platform-specific formatting (twitter, instagram, tiktok) for social media content
- Include hashtags when formatting for social media platforms
""",
            
            'data_scraper': """
**DATA SCRAPER TOOL GUIDANCE:**
- Use data_scraper to extract structured data from websites
- Perfect for scraping product information, news articles, or any tabular data
- Always specify the target URL and the data structure you want to extract
- Use CSS selectors or XPath expressions to target specific elements
- Handle pagination and dynamic content loading appropriately
- Respect robots.txt and website terms of service
- Use appropriate delays between requests to avoid overwhelming servers
""",
            
            'email_sender': """
**EMAIL SENDER TOOL GUIDANCE:**
- Use email_sender to send emails programmatically
- Perfect for notifications, reports, or automated communications
- Always specify recipient email addresses, subject, and message content
- Use appropriate email templates for different types of communications
- Handle email formatting (HTML vs plain text) appropriately
- Include proper email headers and metadata
- Test email delivery and handle bounce-backs appropriately
""",
            
            'pdf_generator': """
**PDF GENERATOR TOOL GUIDANCE:**
- Use pdf_generator to create PDF documents from markdown content
- ALWAYS include the 'content' parameter with the text/markdown to convert
- Perfect for generating reports, invoices, or formatted documents
- Support different input formats (markdown, text, HTML)
- Handle page layouts, headers, footers, and styling appropriately
- Include proper metadata and document properties
- Optimize file size and quality for different use cases

**REQUIRED PARAMETERS:**
- content: The markdown/text content to convert to PDF (REQUIRED)
- template: Document template (professional, resume, report, letter, minimal)
- page_size: Page size (letter, A4, legal)
- filename: Output filename (optional, defaults to document.pdf)

**EXAMPLE USAGE:**
When user asks for a PDF, call pdf_generator with:
- content: "The actual text/markdown content to convert"
- template: "professional" (or appropriate template)
- page_size: "A4"
- filename: "output.pdf"
""",
            
            'google_sheets_integration': """
**GOOGLE SHEETS INTEGRATION TOOL GUIDANCE:**
- Use google_sheets_integration to interact with Google Sheets
- Perfect for reading, writing, and updating spreadsheet data
- Always specify the spreadsheet ID and sheet name
- Handle different data types (text, numbers, dates) appropriately
- Use batch operations for better performance with large datasets
- Handle authentication and permissions properly
- Validate data before writing to prevent errors
""",
            
            'slack_integration': """
**SLACK INTEGRATION TOOL GUIDANCE:**
- Use slack_integration to send messages and interact with Slack
- Perfect for notifications, updates, and team communications
- Always specify the channel, user, or workspace for messages
- Use appropriate message formatting and attachments
- Handle different message types (text, blocks, files) appropriately
- Respect rate limits and channel permissions
- Use proper error handling for failed message deliveries
""",
            
            'hubspot': """
**HUBSPOT TOOL GUIDANCE:**
- Use hubspot to interact with HubSpot CRM and marketing tools
- Perfect for managing contacts, deals, and marketing campaigns
- Always specify the object type (contact, company, deal) and operation
- Handle different property types and field mappings appropriately
- Use batch operations for better performance with large datasets
- Handle authentication and API rate limits properly
- Validate data before creating or updating records
""",
            
            'database_query': """
**DATABASE QUERY TOOL GUIDANCE:**
- Use database_query to execute SQL queries on databases
- Perfect for data analysis, reporting, and data manipulation
- Always validate SQL queries for security and performance
- Handle different database types and SQL dialects appropriately
- Use parameterized queries to prevent SQL injection
- Handle connection errors and timeouts gracefully
- Limit result sets to prevent memory issues
""",
            
            'file_processor': """
**FILE PROCESSOR TOOL GUIDANCE:**
- Use file_processor to handle various file operations
- Perfect for reading, writing, and transforming files
- Support different file formats (CSV, JSON, XML, text)
- Handle file encoding and format conversions appropriately
- Use appropriate file handling for large files
- Validate file contents and handle malformed data
- Clean up temporary files and handle errors gracefully
""",
            
            'image_processor': """
**IMAGE PROCESSOR TOOL GUIDANCE:**
- Use image_processor to manipulate and analyze images
- Perfect for resizing, cropping, filtering, and format conversion
- Support different image formats (JPEG, PNG, GIF, WebP)
- Handle image metadata and EXIF data appropriately
- Use appropriate compression and quality settings
- Handle large images and memory constraints
- Provide image analysis and feature extraction capabilities
""",
            
            'weather_api': """
**WEATHER API TOOL GUIDANCE:**
- Use weather_api to get current and forecast weather data
- Perfect for weather-based applications and notifications
- Always specify location (city, coordinates, or ZIP code)
- Handle different weather data formats and units appropriately
- Use appropriate caching to avoid excessive API calls
- Handle API rate limits and error responses gracefully
- Provide both current conditions and forecast data
""",
            
            'translation_service': """
**TRANSLATION SERVICE TOOL GUIDANCE:**
- Use translation_service to translate text between languages
- Perfect for multilingual applications and content localization
- Always specify source and target languages clearly
- Handle different text formats and encoding appropriately
- Use appropriate translation models for different language pairs
- Handle context and cultural nuances in translations
- Provide confidence scores and alternative translations
""",
            
            'notification_service': """
**NOTIFICATION SERVICE TOOL GUIDANCE:**
- Use notification_service to send various types of notifications
- Perfect for alerts, reminders, and status updates
- Support different notification channels (email, SMS, push, webhook)
- Handle notification preferences and delivery methods appropriately
- Use appropriate templates and formatting for different channels
- Handle delivery failures and retry logic
- Provide delivery status and confirmation tracking
""",
            
            'payment_processor': """
**PAYMENT PROCESSOR TOOL GUIDANCE:**
- Use payment_processor to handle payment transactions
- Perfect for e-commerce, subscriptions, and financial applications
- Always validate payment information and amounts
- Handle different payment methods (credit cards, PayPal, etc.)
- Provide clear payment confirmations and receipts
- Handle payment errors, refunds, and disputes appropriately
- Ensure PCI compliance and security standards
- Use test mode for development and sandbox environments
"""
        }
    
    def get_tool_prompt(self, tool_name: str) -> Optional[str]:
        """
        Get the system prompt for a specific tool.
        
        Args:
            tool_name: The name of the tool
            
        Returns:
            The system prompt for the tool, or None if not found
        """
        return self.tool_prompts.get(tool_name)
    
    def get_tool_prompts(self, tool_names: List[str]) -> List[str]:
        """
        Get system prompts for multiple tools.
        
        Args:
            tool_names: List of tool names
            
        Returns:
            List of system prompts for the tools
        """
        prompts = []
        for tool_name in tool_names:
            prompt = self.get_tool_prompt(tool_name)
            if prompt:
                prompts.append(prompt.strip())
        return prompts
    
    def add_tool_prompt(self, tool_name: str, prompt: str) -> None:
        """
        Add or update a tool system prompt.
        
        Args:
            tool_name: The name of the tool
            prompt: The system prompt for the tool
        """
        self.tool_prompts[tool_name] = prompt
        logger.info(f"Added system prompt for tool: {tool_name}")
    
    def remove_tool_prompt(self, tool_name: str) -> None:
        """
        Remove a tool system prompt.
        
        Args:
            tool_name: The name of the tool
        """
        if tool_name in self.tool_prompts:
            del self.tool_prompts[tool_name]
            logger.info(f"Removed system prompt for tool: {tool_name}")
    
    def list_tool_prompts(self) -> List[str]:
        """
        Get a list of all tools that have system prompts.
        
        Returns:
            List of tool names that have system prompts
        """
        return list(self.tool_prompts.keys())

# Global instance
tool_system_prompts_service = ToolSystemPromptsService()