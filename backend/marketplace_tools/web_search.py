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
    Enhanced Web Search Tool with Advanced Business Discovery Capabilities.
    
    Features:
    - Web search with DuckDuckGo
    - Result filtering and formatting
    - Safe search options
    - Multiple result types (web, news, images, social_media)
    
    NEW BUSINESS DISCOVERY FEATURES:
    - Social Media Business Search: Find business accounts on TikTok, Instagram, Facebook, Twitter, LinkedIn, YouTube
    - Business Directory Search: Search across Yelp, Google Business, Vagaro, Yellow Pages, and 15+ other platforms
    - Business Intelligence: Extract contact info, hours, reviews, booking capabilities
    - Cross-platform Discovery: Find businesses across social media and directory platforms
    
    Usage Examples:
    - "barber shop tiktok" (result_type="social_media") - Find TikTok business accounts
    - "restaurant yelp" (result_type="social_media") - Find Yelp business listings
    - "coffee shop" (result_type="social_media") - Cross-platform business discovery
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.api_url = "https://api.duckduckgo.com/"
        self.search_url = "https://html.duckduckgo.com/html/"
        self.max_results = config.get('max_results', 10)
        self.safe_search = config.get('safe_search', True)
        
    async def execute(self, query: str, result_type: str = "web", max_results: Optional[int] = None, **kwargs) -> Dict[str, Any]:
        """
        Execute web search with enhanced business discovery capabilities.
        
        Args:
            query: Search query. For business discovery, use format 'business_type platform' 
                   (e.g., 'barber shop tiktok', 'restaurant yelp', 'coffee shop')
            result_type: Type of results:
                - 'web': General web search
                - 'news': News articles
                - 'images': Image search
                - 'social_media': Business discovery (social media accounts + business directories)
            max_results: Maximum number of results to return
            
        Returns:
            Search results with metadata. For social_media type, includes:
            - Social media business accounts (TikTok, Instagram, Facebook, Twitter, LinkedIn, YouTube)
            - Business directory listings (Yelp, Google Business, Vagaro, Yellow Pages, etc.)
            - Business intelligence (contact info, hours, reviews, booking capabilities)
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
            elif result_type == "social_media":
                results = await self._search_social_media(query, max_results, **kwargs)
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
    
    async def _search_social_media(self, query: str, max_results: int, **kwargs) -> List[Dict[str, Any]]:
        """
        Search for social media business accounts and business directory listings.
        
        Args:
            query: Search query (e.g., "barber shop tiktok", "restaurant instagram")
            max_results: Maximum number of results to return
            
        Returns:
            List of social media and business directory results
        """
        try:
            # Parse the query to extract business type and platform
            business_type, platform = self._parse_social_media_query(query)
            
            # Search for social media accounts using web search
            social_query = f"{business_type} {platform} account business"
            web_results = await self._search_web_html(social_query, max_results * 2)
            
            social_results = []
            for result in web_results[:max_results]:
                # Check if result is likely a social media account
                if self._is_social_media_result(result, platform):
                    social_result = self._format_social_media_result(result, platform, business_type)
                    if social_result:
                        social_results.append(social_result)
            
            # If we don't have enough results, try platform-specific searches
            if len(social_results) < max_results:
                platform_results = await self._search_platform_specific(business_type, platform, max_results - len(social_results))
                social_results.extend(platform_results)
            
            # Also search business directories if we need more results
            if len(social_results) < max_results:
                business_directory_results = await self._search_business_directories(business_type, max_results - len(social_results))
                social_results.extend(business_directory_results)
            
            return social_results[:max_results]
            
        except Exception as e:
            logger.error(f"Social media search failed: {str(e)}")
            return [{
                'title': 'Social Media Search Error',
                'url': '',
                'snippet': f'Unable to search for social media accounts for "{query}" at the moment. Please try again later.',
                'type': 'social_media',
                'platform': 'unknown'
            }]
    
    def _parse_social_media_query(self, query: str) -> tuple[str, str]:
        """
        Parse social media search query to extract business type and platform.
        
        Args:
            query: Search query
            
        Returns:
            Tuple of (business_type, platform)
        """
        query_lower = query.lower()
        
        # Detect platform
        platform = "any"
        if "tiktok" in query_lower:
            platform = "tiktok"
        elif "instagram" in query_lower or "ig" in query_lower:
            platform = "instagram"
        elif "facebook" in query_lower or "fb" in query_lower:
            platform = "facebook"
        elif "twitter" in query_lower or "x.com" in query_lower:
            platform = "twitter"
        elif "linkedin" in query_lower:
            platform = "linkedin"
        elif "youtube" in query_lower or "yt" in query_lower:
            platform = "youtube"
        
        # Extract business type by removing platform keywords
        business_type = query
        platform_keywords = ["tiktok", "instagram", "ig", "facebook", "fb", "twitter", "x.com", "linkedin", "youtube", "yt"]
        for keyword in platform_keywords:
            business_type = business_type.replace(keyword, "").strip()
        
        # Clean up common words
        business_type = business_type.replace("account", "").replace("page", "").replace("profile", "").strip()
        
        return business_type, platform
    
    def _is_social_media_result(self, result: Dict[str, Any], platform: str) -> bool:
        """
        Check if a search result is likely a social media account.
        
        Args:
            result: Search result dictionary
            title: Result title
            url: Result URL
            snippet: Result snippet
            
        Returns:
            True if result appears to be a social media account
        """
        title = result.get('title', '').lower()
        url = result.get('url', '').lower()
        snippet = result.get('snippet', '').lower()
        
        # Platform-specific URL patterns
        platform_patterns = {
            'tiktok': ['tiktok.com', '@'],
            'instagram': ['instagram.com', '@'],
            'facebook': ['facebook.com', 'fb.com'],
            'twitter': ['twitter.com', 'x.com', '@'],
            'linkedin': ['linkedin.com'],
            'youtube': ['youtube.com', 'youtu.be']
        }
        
        # Check URL patterns
        if platform != "any":
            patterns = platform_patterns.get(platform, [])
            if any(pattern in url for pattern in patterns):
                return True
        
        # Check for social media indicators in title/snippet
        social_indicators = ['@', 'follow', 'followers', 'posts', 'videos', 'photos', 'profile', 'page', 'account']
        content = f"{title} {snippet}"
        
        return any(indicator in content for indicator in social_indicators)
    
    def _format_social_media_result(self, result: Dict[str, Any], platform: str, business_type: str) -> Optional[Dict[str, Any]]:
        """
        Format a search result as a social media account result.
        
        Args:
            result: Original search result
            platform: Detected platform
            business_type: Type of business
            
        Returns:
            Formatted social media result or None
        """
        try:
            title = result.get('title', '')
            url = result.get('url', '')
            snippet = result.get('snippet', '')
            
            # Extract username/handle if possible
            username = self._extract_username(url, platform)
            
            # Determine platform from URL if not specified
            detected_platform = self._detect_platform_from_url(url)
            if detected_platform and platform == "any":
                platform = detected_platform
            
            # Create social media result
            social_result = {
                'title': title,
                'url': url,
                'snippet': snippet,
                'type': 'social_media',
                'platform': platform,
                'business_type': business_type,
                'username': username,
                'is_business_account': self._is_likely_business_account(title, snippet),
                'engagement_indicators': self._extract_engagement_indicators(snippet)
            }
            
            return social_result
            
        except Exception as e:
            logger.debug(f"Error formatting social media result: {str(e)}")
            return None
    
    def _extract_username(self, url: str, platform: str) -> Optional[str]:
        """Extract username/handle from social media URL."""
        try:
            if platform == "instagram" and "instagram.com" in url:
                # Extract from instagram.com/username
                parts = url.split("instagram.com/")
                if len(parts) > 1:
                    username = parts[1].split("/")[0].split("?")[0]
                    return f"@{username}"
            
            elif platform == "tiktok" and "tiktok.com" in url:
                # Extract from tiktok.com/@username
                if "/@" in url:
                    username = url.split("/@")[1].split("/")[0].split("?")[0]
                    return f"@{username}"
            
            elif platform == "twitter" and ("twitter.com" in url or "x.com" in url):
                # Extract from twitter.com/username or x.com/username
                domain = "twitter.com" if "twitter.com" in url else "x.com"
                parts = url.split(f"{domain}/")
                if len(parts) > 1:
                    username = parts[1].split("/")[0].split("?")[0]
                    return f"@{username}"
            
            elif platform == "facebook" and "facebook.com" in url:
                # Extract from facebook.com/username
                parts = url.split("facebook.com/")
                if len(parts) > 1:
                    username = parts[1].split("/")[0].split("?")[0]
                    return username
            
            elif platform == "linkedin" and "linkedin.com" in url:
                # Extract from linkedin.com/in/username
                if "/in/" in url:
                    username = url.split("/in/")[1].split("/")[0].split("?")[0]
                    return username
            
            elif platform == "youtube" and ("youtube.com" in url or "youtu.be" in url):
                # Extract from youtube.com/c/username or youtube.com/@username
                if "/c/" in url:
                    username = url.split("/c/")[1].split("/")[0].split("?")[0]
                    return username
                elif "/@" in url:
                    username = url.split("/@")[1].split("/")[0].split("?")[0]
                    return f"@{username}"
            
            return None
            
        except Exception:
            return None
    
    def _detect_platform_from_url(self, url: str) -> Optional[str]:
        """Detect social media platform from URL."""
        url_lower = url.lower()
        
        if "tiktok.com" in url_lower:
            return "tiktok"
        elif "instagram.com" in url_lower:
            return "instagram"
        elif "facebook.com" in url_lower or "fb.com" in url_lower:
            return "facebook"
        elif "twitter.com" in url_lower or "x.com" in url_lower:
            return "twitter"
        elif "linkedin.com" in url_lower:
            return "linkedin"
        elif "youtube.com" in url_lower or "youtu.be" in url_lower:
            return "youtube"
        
        return None
    
    def _is_likely_business_account(self, title: str, snippet: str) -> bool:
        """Determine if account is likely a business account."""
        content = f"{title} {snippet}".lower()
        
        business_indicators = [
            'business', 'shop', 'store', 'restaurant', 'cafe', 'bar', 'salon', 'barber',
            'clinic', 'office', 'company', 'services', 'professional', 'official',
            'contact', 'book', 'appointment', 'order', 'menu', 'hours', 'location'
        ]
        
        return any(indicator in content for indicator in business_indicators)
    
    def _extract_engagement_indicators(self, snippet: str) -> Dict[str, Any]:
        """Extract engagement indicators from snippet."""
        snippet_lower = snippet.lower()
        
        indicators = {
            'has_followers': 'followers' in snippet_lower,
            'has_posts': any(word in snippet_lower for word in ['posts', 'videos', 'photos']),
            'has_engagement': any(word in snippet_lower for word in ['likes', 'comments', 'shares', 'views']),
            'mentions_contact': any(word in snippet_lower for word in ['contact', 'call', 'email', 'phone'])
        }
        
        return indicators
    
    async def _search_platform_specific(self, business_type: str, platform: str, max_results: int) -> List[Dict[str, Any]]:
        """
        Search for platform-specific business accounts.
        
        Args:
            business_type: Type of business
            platform: Social media platform
            max_results: Maximum results to return
            
        Returns:
            List of platform-specific results
        """
        try:
            # Create platform-specific search queries
            platform_queries = {
                'tiktok': f"{business_type} tiktok business account",
                'instagram': f"{business_type} instagram business page",
                'facebook': f"{business_type} facebook business page",
                'twitter': f"{business_type} twitter business account",
                'linkedin': f"{business_type} linkedin business page",
                'youtube': f"{business_type} youtube business channel"
            }
            
            query = platform_queries.get(platform, f"{business_type} {platform} business")
            results = await self._search_web_html(query, max_results)
            
            platform_results = []
            for result in results:
                if self._is_social_media_result(result, platform):
                    formatted_result = self._format_social_media_result(result, platform, business_type)
                    if formatted_result:
                        platform_results.append(formatted_result)
            
            return platform_results
            
        except Exception as e:
            logger.error(f"Platform-specific search failed: {str(e)}")
            return []
    
    async def _search_business_directories(self, business_type: str, max_results: int) -> List[Dict[str, Any]]:
        """
        Search business directories like Yelp, Google Business, Vagaro, etc.
        
        Args:
            business_type: Type of business to search for
            max_results: Maximum results to return
            
        Returns:
            List of business directory results
        """
        try:
            # Create business directory search queries
            directory_queries = [
                f"{business_type} yelp",
                f"{business_type} google business",
                f"{business_type} vagaro",
                f"{business_type} yellow pages",
                f"{business_type} business listings",
                f"{business_type} local business"
            ]
            
            all_results = []
            
            for query in directory_queries:
                try:
                    results = await self._search_web_html(query, max_results // len(directory_queries) + 1)
                    
                    for result in results:
                        if self._is_business_directory_result(result):
                            directory_result = self._format_business_directory_result(result, business_type)
                            if directory_result:
                                all_results.append(directory_result)
                                
                except Exception as e:
                    logger.debug(f"Directory search failed for '{query}': {str(e)}")
                    continue
            
            return all_results[:max_results]
            
        except Exception as e:
            logger.error(f"Business directory search failed: {str(e)}")
            return []
    
    def _is_business_directory_result(self, result: Dict[str, Any]) -> bool:
        """
        Check if a search result is from a business directory.
        
        Args:
            result: Search result dictionary
            
        Returns:
            True if result appears to be from a business directory
        """
        title = result.get('title', '').lower()
        url = result.get('url', '').lower()
        snippet = result.get('snippet', '').lower()
        
        # Business directory URL patterns
        directory_patterns = [
            'yelp.com', 'google.com/maps', 'vagaro.com', 'yellowpages.com',
            'yellowpages.ca', 'superpages.com', 'whitepages.com', 'manta.com',
            'local.com', 'citysearch.com', 'foursquare.com', 'tripadvisor.com',
            'zomato.com', 'opentable.com', 'resy.com', 'booker.com',
            'mindbodyonline.com', 'acuityscheduling.com', 'squareup.com'
        ]
        
        # Check URL patterns
        if any(pattern in url for pattern in directory_patterns):
            return True
        
        # Check for business directory indicators in content
        directory_indicators = [
            'reviews', 'rating', 'stars', 'hours', 'phone', 'address',
            'location', 'directions', 'menu', 'book', 'reserve', 'appointment',
            'services', 'pricing', 'photos', 'contact', 'website'
        ]
        
        content = f"{title} {snippet}"
        return any(indicator in content for indicator in directory_indicators)
    
    def _format_business_directory_result(self, result: Dict[str, Any], business_type: str) -> Optional[Dict[str, Any]]:
        """
        Format a search result as a business directory result.
        
        Args:
            result: Original search result
            business_type: Type of business
            
        Returns:
            Formatted business directory result or None
        """
        try:
            title = result.get('title', '')
            url = result.get('url', '')
            snippet = result.get('snippet', '')
            
            # Detect directory platform
            directory_platform = self._detect_directory_platform(url)
            
            # Extract business information
            business_info = self._extract_business_info(title, snippet)
            
            # Create business directory result
            directory_result = {
                'title': title,
                'url': url,
                'snippet': snippet,
                'type': 'business_directory',
                'platform': directory_platform,
                'business_type': business_type,
                'business_info': business_info,
                'has_reviews': 'review' in snippet.lower() or 'rating' in snippet.lower(),
                'has_contact': any(word in snippet.lower() for word in ['phone', 'call', 'contact', 'email']),
                'has_location': any(word in snippet.lower() for word in ['address', 'location', 'directions', 'map']),
                'has_hours': 'hours' in snippet.lower() or 'open' in snippet.lower()
            }
            
            return directory_result
            
        except Exception as e:
            logger.debug(f"Error formatting business directory result: {str(e)}")
            return None
    
    def _detect_directory_platform(self, url: str) -> str:
        """Detect business directory platform from URL."""
        url_lower = url.lower()
        
        if 'yelp.com' in url_lower:
            return 'yelp'
        elif 'google.com/maps' in url_lower or 'maps.google.com' in url_lower:
            return 'google_business'
        elif 'vagaro.com' in url_lower:
            return 'vagaro'
        elif 'yellowpages.com' in url_lower or 'yellowpages.ca' in url_lower:
            return 'yellow_pages'
        elif 'superpages.com' in url_lower:
            return 'superpages'
        elif 'whitepages.com' in url_lower:
            return 'whitepages'
        elif 'manta.com' in url_lower:
            return 'manta'
        elif 'local.com' in url_lower:
            return 'local'
        elif 'citysearch.com' in url_lower:
            return 'citysearch'
        elif 'foursquare.com' in url_lower:
            return 'foursquare'
        elif 'tripadvisor.com' in url_lower:
            return 'tripadvisor'
        elif 'zomato.com' in url_lower:
            return 'zomato'
        elif 'opentable.com' in url_lower:
            return 'opentable'
        elif 'resy.com' in url_lower:
            return 'resy'
        elif 'booker.com' in url_lower:
            return 'booker'
        elif 'mindbodyonline.com' in url_lower:
            return 'mindbody'
        elif 'acuityscheduling.com' in url_lower:
            return 'acuity'
        elif 'squareup.com' in url_lower:
            return 'square'
        else:
            return 'business_directory'
    
    def _extract_business_info(self, title: str, snippet: str) -> Dict[str, Any]:
        """Extract business information from title and snippet."""
        content = f"{title} {snippet}".lower()
        
        business_info = {
            'has_phone': any(word in content for word in ['phone', 'call', 'tel:']),
            'has_address': any(word in content for word in ['address', 'street', 'avenue', 'road', 'blvd']),
            'has_hours': any(word in content for word in ['hours', 'open', 'closed', 'monday', 'tuesday']),
            'has_website': any(word in content for word in ['website', 'www.', 'http']),
            'has_reviews': any(word in content for word in ['review', 'rating', 'stars']),
            'has_menu': any(word in content for word in ['menu', 'pricing', 'price']),
            'has_booking': any(word in content for word in ['book', 'reserve', 'appointment', 'schedule']),
            'has_photos': any(word in content for word in ['photo', 'image', 'picture']),
            'has_directions': any(word in content for word in ['directions', 'map', 'location'])
        }
        
        return business_info
    
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
                'Social media business search',
                'Business directory search',
                'Search suggestions',
                'Safe search filtering'
            ],
            'parameters': {
                'query': 'Search query (required)',
                'result_type': 'Type of results (web, news, images, social_media)',
                'max_results': 'Maximum number of results to return'
            },
            'social_media_search': {
                'supported_platforms': ['tiktok', 'instagram', 'facebook', 'twitter', 'linkedin', 'youtube'],
                'example_queries': [
                    'barber shop tiktok',
                    'restaurant instagram',
                    'coffee shop facebook',
                    'salon twitter',
                    'gym linkedin',
                    'bakery youtube'
                ],
                'features': [
                    'Business account detection',
                    'Username extraction',
                    'Engagement indicators',
                    'Platform-specific search',
                    'Cross-platform discovery'
                ]
            },
            'business_directory_search': {
                'supported_platforms': [
                    'yelp', 'google_business', 'vagaro', 'yellow_pages',
                    'superpages', 'whitepages', 'manta', 'local',
                    'citysearch', 'foursquare', 'tripadvisor', 'zomato',
                    'opentable', 'resy', 'booker', 'mindbody', 'acuity', 'square'
                ],
                'example_queries': [
                    'barber shop yelp',
                    'restaurant google business',
                    'salon vagaro',
                    'gym yellow pages',
                    'coffee shop local business'
                ],
                'features': [
                    'Business directory detection',
                    'Contact information extraction',
                    'Review and rating indicators',
                    'Location and hours detection',
                    'Booking and appointment detection',
                    'Menu and pricing information'
                ]
            }
        } 