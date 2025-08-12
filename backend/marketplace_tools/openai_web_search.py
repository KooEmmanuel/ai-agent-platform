"""
OpenAI Web Search Tool

A tool that leverages OpenAI's built-in web search capabilities.
This provides more reliable and comprehensive web search results.
"""

import json
import logging
from typing import Any, Dict, List, Optional
from .base import BaseTool

logger = logging.getLogger(__name__)

class OpenAIWebSearchTool(BaseTool):
    """
    OpenAI Web Search Tool using OpenAI's built-in web search.
    
    Features:
    - Uses OpenAI's reliable web search
    - Comprehensive result formatting
    - Better accuracy than third-party search APIs
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.max_results = config.get('max_results', 5)
        
    async def execute(self, query: str, max_results: Optional[int] = None) -> Dict[str, Any]:
        """
        Execute web search using OpenAI's web search.
        
        Args:
            query: Search query
            max_results: Maximum number of results to return
            
        Returns:
            Search results with metadata
        """
        if not query or not query.strip():
            return self._format_error("Search query is required")
        
        max_results = max_results or self.max_results
        
        try:
            # This tool is designed to be used with OpenAI's built-in web_search tool
            # The actual web search will be handled by OpenAI's API when this tool is called
            
            # Return a structured response that indicates web search should be performed
            search_request = {
                "type": "web_search",
                "query": query,
                "max_results": max_results,
                "instructions": f"Search the web for: {query}. Return up to {max_results} relevant results."
            }
            
            metadata = {
                'query': query,
                'max_results': max_results,
                'search_type': 'openai_web_search'
            }
            
            return self._format_success(search_request, metadata)
            
        except Exception as e:
            logger.error(f"OpenAI web search error: {str(e)}")
            return self._format_error(f"Search failed: {str(e)}")
    
    def get_tool_info(self) -> Dict[str, Any]:
        """Get tool information for OpenAI API"""
        return {
            "name": "web_search",
            "description": "Search the web for current information. Use this when you need to find recent or real-time information about topics, news, current events, or any information that might have changed recently.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to look up on the web"
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default: 5)",
                        "default": 5
                    }
                },
                "required": ["query"]
            }
        } 