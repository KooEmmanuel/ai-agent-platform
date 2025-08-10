"""
Web Search Tool

A tool for searching the web using DuckDuckGo API.
Provides web search functionality with result formatting and filtering.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus
import aiohttp
from bs4 import BeautifulSoup
import re

from .base import BaseTool

logger = logging.getLogger(__name__)

class WebSearchTool(BaseTool):
    """
    Web Search Tool using DuckDuckGo API.
    
    Features:
    - Web search with DuckDuckGo
    - Result filtering and formatting
    - Safe search options
    - Multiple result types (web, news, images)
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.api_url = "https://api.duckduckgo.com/"
        self.search_url = "https://html.duckduckgo.com/html/"
        self.max_results = config.get('max_results', 10)
        self.safe_search = config.get('safe_search', True)
        
    async def execute(self, query: str, result_type: str = "web", max_results: Optional[int] = None) -> Dict[str, Any]:
        """
        Execute web search.
        
        Args:
            query: Search query
            result_type: Type of results (web, news, images)
            max_results: Maximum number of results to return
            
        Returns:
            Search results with metadata
        """
        if not query or not query.strip():
            return self._format_error("Search query is required")
        
        max_results = max_results or self.max_results
        
        try:
            if result_type == "web":
                results = await self._search_web(query, max_results)
            elif result_type == "news":
                results = await self._search_news(query, max_results)
            elif result_type == "images":
                results = await self._search_images(query, max_results)
            else:
                return self._format_error(f"Unsupported result type: {result_type}")
            
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
    
    async def _search_web(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """
        Search for web results using DuckDuckGo HTML scraping.
        
        Args:
            query: Search query
            max_results: Maximum number of results
            
        Returns:
            List of web search results
        """
        try:
            # Try HTML scraping first (more reliable)
            results = await self._search_web_html(query, max_results)
            if results:
                return results
            
            # Fallback to JSON API
            return await self._search_web_json(query, max_results)
            
        except Exception as e:
            logger.error(f"Web search failed: {str(e)}")
            # Return a helpful message instead of crashing
            return [{
                'title': 'Search Error',
                'url': '',
                'snippet': f'Unable to search for "{query}" at the moment. Please try again later.',
                'type': 'error'
            }]
    
    async def _search_web_html(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """Search using DuckDuckGo HTML interface."""
        search_url = "https://html.duckduckgo.com/html/"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        }
        
        params = {'q': query}
        
        async with aiohttp.ClientSession() as session:
            async with session.get(search_url, params=params, headers=headers) as response:
                if response.status == 200:
                    html_content = await response.text()
                    return self._parse_html_results(html_content, max_results)
                else:
                    return []
    
    def _parse_html_results(self, html_content: str, max_results: int) -> List[Dict[str, Any]]:
        """Parse search results from HTML content and detect image URLs."""
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            results = []
            
            # Find all result containers
            result_divs = soup.find_all('div', class_='result')
            
            for div in result_divs[:max_results]:
                try:
                    # Extract title and URL
                    title_link = div.find('a', class_='result__a')
                    if not title_link:
                        continue
                        
                    title = title_link.get_text(strip=True)
                    url = title_link.get('href', '')
                    
                    # Extract snippet
                    snippet_elem = div.find('a', class_='result__snippet')
                    snippet = snippet_elem.get_text(strip=True) if snippet_elem else ''
                    
                    if title and url:
                        result = {
                            'title': title,
                            'url': url,
                            'snippet': snippet,
                            'type': 'web'
                        }
                        
                        # Check for image URLs in the content
                        image_urls = self._extract_image_urls_from_text(title + ' ' + snippet + ' ' + url)
                        if image_urls:
                            result['image_urls'] = image_urls[:3]  # Include up to 3 image URLs
                            result['has_images'] = True
                        
                        results.append(result)
                        
                except Exception as e:
                    logger.debug(f"Error parsing result: {str(e)}")
                    continue
            
            return results
            
        except Exception as e:
            logger.error(f"HTML parsing error: {str(e)}")
            return []
    
    async def _search_web_json(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """Fallback JSON API search."""
        params = {
            'q': query,
            'format': 'json',
            'no_html': '1',
            'skip_disambig': '1'
        }
        
        if self.safe_search:
            params['safe'] = '1'
        
        async with aiohttp.ClientSession() as session:
            async with session.get(self.api_url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    results = []
                    
                    # Process instant answer
                    if data.get('Answer'):
                        results.append({
                            'title': 'Instant Answer',
                            'url': data.get('AbstractURL', ''),
                            'snippet': data.get('Answer', ''),
                            'type': 'answer'
                        })
                    
                    # Process abstract
                    if data.get('Abstract'):
                        results.append({
                            'title': data.get('AbstractSource', 'Abstract'),
                            'url': data.get('AbstractURL', ''),
                            'snippet': data.get('Abstract', ''),
                            'type': 'abstract'
                        })
                    
                    # Process related topics
                    for topic in data.get('RelatedTopics', [])[:max_results - len(results)]:
                        if isinstance(topic, dict) and 'Text' in topic:
                            results.append({
                                'title': topic.get('Text', '').split(' - ')[0] if ' - ' in topic.get('Text', '') else 'Related',
                                'url': topic.get('FirstURL', ''),
                                'snippet': topic.get('Text', ''),
                                'type': 'related'
                            })
                    
                    return results[:max_results]
                else:
                    return []
    
    async def _search_news(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """
        Search for news results using web search with news keywords.
        
        Args:
            query: Search query
            max_results: Maximum number of results
            
        Returns:
            List of news search results
        """
        try:
            # Use web search with news-specific query
            news_query = f"{query} news latest"
            results = await self._search_web_html(news_query, max_results)
            
            if results:
                # Filter and mark as news results
                news_results = []
                for result in results:
                    # Check if result looks like news
                    text_content = (result.get('title', '') + ' ' + result.get('snippet', '')).lower()
                    if any(keyword in text_content for keyword in ['news', 'report', 'today', 'latest', 'breaking', 'update']):
                        result['type'] = 'news'
                        news_results.append(result)
                    elif len(news_results) < max_results:
                        # Include general results if we don't have enough news
                        result['type'] = 'news'
                        news_results.append(result)
                
                return news_results[:max_results]
            
            # Fallback to JSON API
            return await self._search_news_json(query, max_results)
            
        except Exception as e:
            logger.error(f"News search failed: {str(e)}")
            return [{
                'title': 'News Search Error',
                'url': '',
                'snippet': f'Unable to search for news about "{query}" at the moment. Please try again later.',
                'type': 'news'
            }]
    
    async def _search_news_json(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """Fallback news search using JSON API."""
        params = {
            'q': f"{query} news",
            'format': 'json',
            'no_html': '1'
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(self.api_url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    results = []
                    
                    # Look for news-related results
                    if 'RelatedTopics' in data:
                        for topic in data['RelatedTopics'][:max_results]:
                            if isinstance(topic, dict) and 'Text' in topic:
                                results.append({
                                    'title': topic.get('Text', '').split(' - ')[0] if ' - ' in topic.get('Text', '') else 'News',
                                    'url': topic.get('FirstURL', ''),
                                    'snippet': topic.get('Text', ''),
                                    'type': 'news'
                                })
                    
                    return results
                elif response.status == 202:
                    # 202 means accepted but still processing, return a message
                    return [{
                        'title': 'Search In Progress',
                        'url': '',
                        'snippet': f'News search for "{query}" is being processed. Please try again in a moment.',
                        'type': 'news'
                    }]
                else:
                    return []
    
    async def _search_images(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """
        Search for image results using web search and extract image URLs.
        
        Args:
            query: Search query
            max_results: Maximum number of results
            
        Returns:
            List of image search results with actual image URLs
        """
        try:
            # Search for images using web search with image-specific query
            image_query = f"{query} images photos"
            web_results = await self._search_web_html(image_query, max_results * 2)  # Get more to filter
            
            image_results = []
            for result in web_results[:max_results]:
                # Try to extract image URLs from the page content
                image_urls = self._extract_image_urls_from_text(result.get('snippet', '') + ' ' + result.get('title', ''))
                
                if image_urls:
                    # Use the first found image URL
                    image_url = image_urls[0]
                    image_results.append({
                        'title': result.get('title', 'Image'),
                        'url': result.get('url', ''),
                        'image_url': image_url,
                        'snippet': result.get('snippet', ''),
                        'type': 'image'
                    })
                else:
                    # Even without direct image URL, include the result
                    image_results.append({
                        'title': result.get('title', 'Image'),
                        'url': result.get('url', ''),
                        'snippet': result.get('snippet', ''),
                        'type': 'image'
                    })
            
            # Also try to find some common image hosting patterns
            await self._add_common_image_results(query, image_results, max_results)
            
            return image_results[:max_results]
            
        except Exception as e:
            logger.error(f"Image search failed: {str(e)}")
            return [{
                'title': 'Image Search Error',
                'url': '',
                'snippet': f'Unable to search for images of "{query}" at the moment.',
                'type': 'image'
            }]
    
    def _extract_image_urls_from_text(self, text: str) -> List[str]:
        """Extract image URLs from text content."""
        import re
        # Pattern to match image URLs
        image_pattern = r'https?://[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp|ico)(?:\?[^\s]*)?'
        return re.findall(image_pattern, text, re.IGNORECASE)
    
    async def _add_common_image_results(self, query: str, results: List[Dict], max_results: int):
        """Add some common image search results from well-known sources."""
        if len(results) >= max_results:
            return
        
        # Add placeholder results with common image search suggestions
        common_sources = [
            {
                'title': f'Search {query} on Unsplash',
                'url': f'https://unsplash.com/s/photos/{query.replace(" ", "-")}',
                'snippet': f'High-quality free photos of {query} on Unsplash',
                'type': 'image'
            },
            {
                'title': f'Search {query} on Pexels',
                'url': f'https://www.pexels.com/search/{query.replace(" ", "%20")}/',
                'snippet': f'Free stock photos of {query} on Pexels',
                'type': 'image'
            }
        ]
        
        for source in common_sources:
            if len(results) < max_results:
                results.append(source)
    
    async def search_suggestions(self, query: str) -> Dict[str, Any]:
        """
        Get search suggestions for a query.
        
        Args:
            query: Partial search query
            
        Returns:
            List of search suggestions
        """
        if not query or len(query) < 2:
            return self._format_error("Query must be at least 2 characters long")
        
        try:
            # Use DuckDuckGo's instant answer API for suggestions
            params = {
                'q': query,
                'format': 'json',
                'no_html': '1'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.api_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        suggestions = []
                        
                        # Extract suggestions from related topics
                        if 'RelatedTopics' in data:
                            for topic in data['RelatedTopics'][:5]:
                                if 'Text' in topic:
                                    suggestions.append(topic['Text'])
                        
                        return self._format_success(suggestions, {'query': query})
                    else:
                        raise Exception(f"Suggestions API returned status {response.status}")
                        
        except Exception as e:
            logger.error(f"Search suggestions error: {str(e)}")
            return self._format_error(f"Failed to get suggestions: {str(e)}")
    
    def _format_success(self, result: Any, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Format successful search results with enhanced image handling"""
        from typing import Optional
        from datetime import datetime
        
        # If result is a list of search results, enhance them
        if isinstance(result, list):
            enhanced_results = []
            for item in result:
                if isinstance(item, dict):
                    enhanced_item = item.copy()
                    
                    # Format image URLs for display in AI responses
                    if item.get('has_images') and item.get('image_urls'):
                        image_urls = item['image_urls']
                        enhanced_item['display_images'] = []
                        for i, img_url in enumerate(image_urls):
                            enhanced_item['display_images'].append(f"![Image {i+1} from {item.get('title', 'source')}]({img_url})")
                        
                        # Add image info to snippet for AI context
                        if enhanced_item.get('snippet'):
                            enhanced_item['snippet'] += f" [Contains {len(image_urls)} image(s) - see display_images for markdown]"
                    
                    # For image search results, create markdown for the main image
                    if item.get('type') == 'image' and item.get('image_url'):
                        enhanced_item['display_image'] = f"![{item.get('title', 'Image')}]({item['image_url']})"
                    
                    enhanced_results.append(enhanced_item)
                else:
                    enhanced_results.append(item)
            
            # Update metadata to indicate image content
            enhanced_metadata = metadata.copy() if metadata else {}
            enhanced_metadata['has_images'] = any(
                (isinstance(r, dict) and (r.get('has_images') or r.get('image_url'))) 
                for r in enhanced_results
            )
            enhanced_metadata['image_count'] = sum(
                len(r.get('image_urls', [])) if isinstance(r, dict) else 0 
                for r in enhanced_results
            )
            
            return {
                'success': True,
                'result': enhanced_results,
                'metadata': enhanced_metadata,
                'timestamp': datetime.utcnow().isoformat(),
                'tool_name': self.name
            }
        
        # Fallback to parent implementation
        return super()._format_success(result, metadata)
    
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
                'Search suggestions',
                'Safe search filtering'
            ],
            'parameters': {
                'query': 'Search query (required)',
                'result_type': 'Type of results (web, news, images)',
                'max_results': 'Maximum number of results to return'
            }
        } 