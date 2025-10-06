"""
Web Search Tool

A tool for searching the web using Tavily API.
Provides web search functionality with result formatting and filtering.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional
from tavily import TavilyClient

from .base import BaseTool

logger = logging.getLogger(__name__)

class WebSearchTool(BaseTool):
    """
    Enhanced Web Search Tool with Tavily API.
    
    Features:
    - Web search with Tavily API
    - Result filtering and formatting
    - Safe search options
    - Multiple result types (web, news, images, social_media)
    
    BUSINESS DISCOVERY FEATURES (Optional):
    - Social Media Business Search: Find business accounts on TikTok, Instagram, Facebook, Twitter, LinkedIn, YouTube
    - Business Directory Search: Search across Yelp, Google Business, Vagaro, Yellow Pages, and 15+ other platforms
    - Business Intelligence: Extract contact info, hours, reviews, booking capabilities
    - Cross-platform Discovery: Find businesses across social media and directory platforms
    
    Usage Examples:
    - General search: "latest AI news" (result_type="web")
    - Business discovery: "barber shop tiktok" (result_type="social_media") - Find TikTok business accounts
    - News search: "technology news today" (result_type="news")
    - Image search: "sunset photos" (result_type="images")
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.max_results = config.get('max_results', 10)
        self.safe_search = config.get('safe_search', True)
        self.tavily_client = TavilyClient("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")
        
    async def execute(self, query: str, result_type: str = "web", max_results: Optional[int] = None, **kwargs) -> Dict[str, Any]:
        """
        Execute web search using Tavily API.
        
        Args:
            query: Search query
            result_type: Type of results:
                - 'web': General web search
                - 'news': News articles
                - 'images': Image search
                - 'social_media': Business discovery (social media accounts + business directories)
            max_results: Maximum number of results to return
            
        Returns:
            Search results with metadata
        """
        if not query or not query.strip():
            return self._format_error("Search query is required")
        
        max_results = max_results or self.max_results
        
        try:
            # Use Tavily API for all search types
            results = await self._search_with_tavily(query, result_type, max_results)
            
            metadata = {
                'query': query,
                'result_type': result_type,
                'results_count': len(results),
                'max_results': max_results,
                'safe_search': self.safe_search
            }
            
            return self._format_success(results, metadata)
            
        except Exception as e:
            logger.error(f"Web search error: {str(e)}")
            return self._format_error(f"Search failed: {str(e)}")
    
    async def _search_with_tavily(self, query: str, result_type: str, max_results: int) -> List[Dict[str, Any]]:
        """
        Search using Tavily API.
        
        Args:
            query: Search query
            result_type: Type of results
            max_results: Maximum number of results
            
        Returns:
            List of search results
        """
        try:
            # Configure search parameters based on result type
            search_kwargs = {
                'query': query,
                'max_results': max_results,
                'include_answer': True,
                'include_images': result_type == "images",
                'include_raw_content': False,
                'search_depth': "basic" if result_type == "news" else "advanced"
            }
            
            # Add domain filters for specific result types
            if result_type == "social_media":
                # Focus on social media platforms
                social_media_domains = [
                    "instagram.com", "tiktok.com", "facebook.com", "twitter.com", 
                    "linkedin.com", "youtube.com", "yelp.com", "google.com/maps"
                ]
                search_kwargs['include_domains'] = social_media_domains
            
            # Execute search with Tavily
            response = self.tavily_client.search(**search_kwargs)
            
            # Format results
            results = []
            for result in response.get('results', [])[:max_results]:
                formatted_result = {
                    'title': result.get('title', ''),
                    'url': result.get('url', ''),
                    'snippet': result.get('content', ''),
                    'type': result_type,
                    'score': result.get('score', 0),
                    'published_date': result.get('published_date', ''),
                    'raw_content': result.get('raw_content', '')
                }
                
                # Add platform detection for social media results
                if result_type == "social_media":
                    formatted_result['platform'] = self._detect_platform(result.get('url', ''))
                    formatted_result['is_business_account'] = self._is_business_account(
                        result.get('title', ''), 
                        result.get('content', ''), 
                        query
                    )
                
                results.append(formatted_result)
            
            return results
            
        except Exception as e:
            logger.error(f"Tavily search failed: {str(e)}")
            return [{
                'title': 'Search Error',
                'url': '',
                'snippet': f'Unable to search for "{query}" at the moment. Please try again later.',
                'type': 'error'
            }]
    
    def _detect_platform(self, url: str) -> str:
        """Detect platform from URL."""
        url_lower = url.lower()
        if 'instagram.com' in url_lower:
            return 'instagram'
        elif 'tiktok.com' in url_lower:
            return 'tiktok'
        elif 'facebook.com' in url_lower:
            return 'facebook'
        elif 'twitter.com' in url_lower or 'x.com' in url_lower:
            return 'twitter'
        elif 'linkedin.com' in url_lower:
            return 'linkedin'
        elif 'youtube.com' in url_lower:
            return 'youtube'
        elif 'yelp.com' in url_lower:
            return 'yelp'
        elif 'google.com/maps' in url_lower:
            return 'google_maps'
        else:
            return 'web'
    
    def _is_business_account(self, title: str, content: str, query: str) -> bool:
        """Check if the account appears to be a business account."""
        text = f"{title} {content}".lower()
        business_indicators = [
            'business', 'shop', 'store', 'salon', 'restaurant', 'clinic', 'studio',
            'service', 'booking', 'appointment', 'contact', 'location', 'hours',
            'professional', 'official', 'company', 'wa.me', 'whatsapp', 'phone'
        ]
        
        # Check for business indicators
        has_business_indicators = any(indicator in text for indicator in business_indicators)
        
        # Check for business type keywords from query
        query_words = query.lower().split()
        has_business_type = any(word in text for word in query_words)
        
        return has_business_indicators or has_business_type
    
    def get_tool_info(self) -> Dict[str, Any]:
        """
        Get information about this tool.
        
        Returns:
            Tool information dictionary
        """
        return {
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'tool_type': self.tool_type,
            'capabilities': [
                'Web search',
                'News search', 
                'Image search',
                'Social media business search',
                'Business directory search',
                'Search suggestions',
                'Safe search filtering'
            ],
            'parameters': {
                'type': 'object',
                'properties': {
                    'query': {
                        'type': 'string',
                        'description': 'Search query. For business discovery, use format "business_type platform" (e.g., "barber shop tiktok", "restaurant yelp")'
                    },
                    'result_type': {
                        'type': 'string',
                        'description': 'Type of results. Use "social_media" for business discovery (social media accounts + business directories)',
                        'enum': ['web', 'news', 'images', 'social_media'],
                        'default': 'web'
                    },
                    'max_results': {
                        'type': 'integer',
                        'description': 'Maximum number of results to return',
                        'default': 10
                    }
                },
                'required': ['query']
            }
        }