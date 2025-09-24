"""
Tool Registry Service

This service manages the mapping between database tool configurations
and actual marketplace tool implementations. It handles tool instantiation,
configuration mapping, and execution.
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional, Type
from sqlalchemy.ext.asyncio import AsyncSession

# Import all marketplace tools
from marketplace_tools import (
    WebSearchTool,
    DatabaseQueryTool,
    EmailSenderTool,
    FileProcessorTool,
    CalendarManagerTool,
    WeatherAPITool,
    TranslationServiceTool,
    ImageProcessorTool,
    TextAnalyzerTool,
    WebhookHandlerTool,
    DataScraperTool,
    PDFProcessorTool,
    SocialMediaTool,
    PaymentProcessorTool,
    NotificationServiceTool,
    NewsSearchTool,
    ReminderTool,
    SlackIntegrationTool,
    CSVProcessorTool,
    DataVisualizationTool,
    StatisticalAnalysisTool,
    ZapierWebhookTool,
    GoogleSheetsIntegrationTool,
    DateCalculatorTool,
    MultiLinkScraperTool,
    ChromaDBTool,
    MongoDBAdvancedTool,
    PDFGeneratorTool,
    WebsiteKnowledgeBaseTool,
    RedditTool
)

logger = logging.getLogger(__name__)

class ToolRegistry:
    """
    Registry for mapping tool names to their implementations.
    Handles tool instantiation, configuration, and execution.
    """
    
    def __init__(self):
        # Map tool names to their class implementations
        self.tool_classes = {
            # Search tools
            'web_search': WebSearchTool,
            'news_search': NewsSearchTool,
            'reddit_tool': RedditTool,
            
            # Data tools
            'database_query': DatabaseQueryTool,
            'csv_processor': CSVProcessorTool,
            'data_visualization': DataVisualizationTool,
            'statistical_analysis': StatisticalAnalysisTool,
            'data_scraper': DataScraperTool,
            'multi_link_scraper': MultiLinkScraperTool,
            'chromadb_tool': ChromaDBTool,
            'mongodb_advanced': MongoDBAdvancedTool,
            'website_knowledge_base': WebsiteKnowledgeBaseTool,
            
            # Communication tools
            'email_sender': EmailSenderTool,
            'slack_integration': SlackIntegrationTool,
            'notification_service': NotificationServiceTool,
            
            # File processing tools
            'file_processor': FileProcessorTool,
            'pdf_processor': PDFProcessorTool,
            'pdf_generator': PDFGeneratorTool,
            'image_processor': ImageProcessorTool,
            
            # Scheduling tools
            'calendar_manager': CalendarManagerTool,
            'reminder_tool': ReminderTool,
            'date_calculator': DateCalculatorTool,
            
            # External services
            'weather_api': WeatherAPITool,
            'translation_service': TranslationServiceTool,
            'webhook_handler': WebhookHandlerTool,
            'zapier_webhook': ZapierWebhookTool,
            'google_sheets_integration': GoogleSheetsIntegrationTool,
            
            # Social and payment
            'social_media': SocialMediaTool,
            'payment_processor': PaymentProcessorTool,
            
            # Analysis tools
            'text_analyzer': TextAnalyzerTool,
        }
        
        # Tool name aliases for backward compatibility
        self.tool_aliases = {
            # Database tool names to registry names
            'web_search_tool': 'web_search',
            'news_search_tool': 'news_search',
            'database_query_tool': 'database_query',
            'email_sender_tool': 'email_sender',
            'slack_integration_tool': 'slack_integration',
            'csv_processor_tool': 'csv_processor',
            'data_visualization_tool': 'data_visualization',
            'statistical_analysis_tool': 'statistical_analysis',
            'zapier_webhook_tool': 'zapier_webhook',
            'google_sheets_integration_tool': 'google_sheets_integration',
            'text_processor_tool': 'text_analyzer',
            'date_calculator_tool': 'date_calculator',
            'reminder_tool': 'reminder_tool',
            'weather_tool': 'weather_api',
            'calendar_integration': 'calendar_manager',
            'text_processor': 'text_analyzer',
            'Weather Tool': 'weather_api',
            'Weather API': 'weather_api',
            'weather_api_tool': 'weather_api',
            'News Search Tool': 'news_search',
            'Calendar Integration': 'calendar_manager',
            'Reminder Tool': 'reminder_tool',
            'Email Sender': 'email_sender',
            'Slack Integration': 'slack_integration',
            'Database Query Tool': 'database_query',
            'CSV Processor': 'csv_processor',
            
            # Original aliases
            'web_search_tool': 'web_search',
            'news_search_tool': 'news_search',
            'database_query_tool': 'database_query',
            'email_sender_tool': 'email_sender',
            'slack_integration_tool': 'slack_integration',
            'notification_service_tool': 'notification_service',
            'file_processor_tool': 'file_processor',
            'pdf_processor_tool': 'pdf_processor',
            'image_processor_tool': 'image_processor',
            'calendar_manager_tool': 'calendar_manager',
            'reminder_tool': 'reminder_tool',
            'date_calculator_tool': 'date_calculator',
            'weather_api_tool': 'weather_api',
            'translation_service_tool': 'translation_service',
            'webhook_handler_tool': 'webhook_handler',
            'zapier_webhook_tool': 'zapier_webhook',
            'google_sheets_tool': 'google_sheets_integration',
            'social_media_tool': 'social_media',
            'payment_processor_tool': 'payment_processor',
            'text_analyzer_tool': 'text_analyzer',
            'data_scraper_tool': 'data_scraper',
            'multi_link_scraper_tool': 'multi_link_scraper',
            'chromadb_tool': 'chromadb_tool',
            'mongodb_advanced_tool': 'mongodb_advanced',
            'pdf_generator_tool': 'pdf_generator',
            'website_knowledge_base_tool': 'website_knowledge_base',
        }
        
        # Database tool name mappings (database names to registry names)
        self.database_tool_mappings = {
            'Web Search Tool': 'web_search',
            'News Search Tool': 'news_search',
            'Weather Tool': 'weather_api',
            'Calendar Integration': 'calendar_manager',
            'Reminder Tool': 'reminder_tool',
            'Email Sender': 'email_sender',
            'Slack Integration': 'slack_integration',
            'Database Query Tool': 'database_query',
            'CSV Processor': 'csv_processor',
            'Data Visualization': 'data_visualization',
            'Statistical Analysis': 'statistical_analysis',
            'Zapier Webhook': 'zapier_webhook',
            'Google Sheets Integration': 'google_sheets_integration',
            'Text Processor': 'text_analyzer',
            'Date Calculator': 'date_calculator',
            'Multi Link Scraper': 'multi_link_scraper',
            'ChromaDB Tool': 'chromadb_tool',
            'MongoDB Advanced': 'mongodb_advanced',
            'PDF Generator': 'pdf_generator',
        }
    
    def get_tool_class(self, tool_name: str) -> Optional[Type]:
        """
        Get the tool class for a given tool name.
        
        Args:
            tool_name: Name of the tool (can be original or sanitized)
            
        Returns:
            Tool class or None if not found
        """
        logger.info(f"🔍 Looking for tool class: '{tool_name}'")
        logger.info(f"📋 Available tool classes: {list(self.tool_classes.keys())}")
        
        # First, try to find the tool class directly
        if tool_name in self.tool_classes:
            logger.info(f"✅ Found direct match: {tool_name}")
            return self.tool_classes[tool_name]
        
        # Check if it's in aliases
        if tool_name in self.tool_aliases:
            alias_target = self.tool_aliases[tool_name]
            if alias_target in self.tool_classes:
                logger.info(f"✅ Found via alias: {tool_name} -> {alias_target}")
                return self.tool_classes[alias_target]
        
        # Try common mappings for sanitized names
        tool_mappings = {
            'web_search_tool': 'web_search',
            'news_search_tool': 'news_search', 
            'weather_tool': 'weather_api',
            'email_sender': 'email_sender',
            'slack_integration': 'slack_integration',
            'database_query_tool': 'database_query',
            'csv_processor': 'csv_processor',
            'data_visualization': 'data_visualization',
            'statistical_analysis': 'statistical_analysis',
            'zapier_webhook': 'zapier_webhook',
            'google_sheets': 'google_sheets_integration',
            'text_processor': 'text_analyzer',
            'date_calculator': 'date_calculator',
            'reminder_tool': 'reminder_tool',
            'calendar_integration': 'calendar_manager'
        }
        
        if tool_name in tool_mappings:
            mapped_name = tool_mappings[tool_name]
            if mapped_name in self.tool_classes:
                logger.info(f"✅ Found via mapping: {tool_name} -> {mapped_name}")
                return self.tool_classes[mapped_name]
        
        # Try to find by partial match
        tool_name_lower = tool_name.lower()
        for registry_name, tool_class in self.tool_classes.items():
            if 'search' in tool_name_lower and 'search' in registry_name:
                logger.info(f"✅ Found via search match: {tool_name} -> {registry_name}")
                return tool_class
            if tool_name_lower.replace('_', ' ') in registry_name.replace('_', ' '):
                logger.info(f"✅ Found via partial match: {tool_name} -> {registry_name}")
                return tool_class
        
        # List available tools for debugging
        logger.error(f"❌ Tool '{tool_name}' not found. Available tools: {list(self.tool_classes.keys())}")
        return None
    
    def create_tool_instance(self, tool_name: str, config: Dict[str, Any]):
        """
        Create a tool instance with the given configuration.
        
        Args:
            tool_name: Name of the tool
            config: Tool configuration
            
        Returns:
            Tool instance or None if creation failed
        """
        try:
            tool_class = self.get_tool_class(tool_name)
            if not tool_class:
                logger.error(f"Tool class not found for: {tool_name}")
                return None
            
            # Create tool instance with configuration
            tool_instance = tool_class(config)
            return tool_instance
            
        except Exception as e:
            logger.error(f"Error creating tool instance for {tool_name}: {str(e)}")
            return None
    
    async def execute_tool(self, tool_name: str, config: Dict[str, Any], 
                          operation: str = None, **kwargs) -> Dict[str, Any]:
        """
        Execute a tool with the given configuration and parameters.
        
        Args:
            tool_name: Name of the tool
            config: Tool configuration
            operation: Specific operation to execute (optional)
            **kwargs: Tool-specific parameters
            
        Returns:
            Tool execution result
        """
        try:
            logger.info(f"🔧 Tool Registry: Executing {tool_name}")
            if operation:
                logger.info(f"🎯 Operation: {operation}")
            logger.info(f"⚙️ Parameters: {kwargs}")
            
            # Create tool instance
            tool_instance = self.create_tool_instance(tool_name, config)
            if not tool_instance:
                logger.error(f"❌ Tool Registry: Tool not found: {tool_name}")
                return {
                    'success': False,
                    'error': f'Tool not found: {tool_name}',
                    'result': None
                }
            
            # Execute the tool
            if operation:
                # Some tools support specific operations
                if hasattr(tool_instance, 'execute') and callable(getattr(tool_instance, 'execute')):
                    result = await tool_instance.execute(operation, **kwargs)
                else:
                    result = await tool_instance.execute(**kwargs)
            else:
                result = await tool_instance.execute(**kwargs)
            
            # Log successful execution
            if result.get('success'):
                logger.info(f"✅ Tool Registry: {tool_name} executed successfully")
                logger.info(f"📊 Result type: {type(result.get('result'))}")
            else:
                logger.warning(f"⚠️ Tool Registry: {tool_name} returned failure: {result.get('error')}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Tool Registry: Error executing tool {tool_name}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'result': None
            }
    
    def get_available_tools(self) -> Dict[str, str]:
        """
        Get a list of available tools and their descriptions.
        
        Returns:
            Dictionary mapping tool names to descriptions
        """
        tools = {}
        for name, tool_class in self.tool_classes.items():
            try:
                # Create a temporary instance to get description
                temp_config = {'name': name}
                temp_instance = tool_class(temp_config)
                tools[name] = getattr(temp_instance, 'description', f'{name} tool')
            except:
                tools[name] = f'{name} tool'
        
        return tools
    
    def validate_tool_config(self, tool_name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate tool configuration and return any validation errors.
        
        Args:
            tool_name: Name of the tool
            config: Tool configuration
            
        Returns:
            Validation result with success status and any errors
        """
        try:
            tool_class = self.get_tool_class(tool_name)
            if not tool_class:
                return {
                    'valid': False,
                    'errors': [f'Tool not found: {tool_name}']
                }
            
            # Create tool instance to validate config
            tool_instance = tool_class(config)
            
            # Check if tool has validation method
            if hasattr(tool_instance, 'validate_config'):
                return tool_instance.validate_config()
            
            return {'valid': True, 'errors': []}
            
        except Exception as e:
            return {
                'valid': False,
                'errors': [str(e)]
            }

# Global tool registry instance
tool_registry = ToolRegistry() 