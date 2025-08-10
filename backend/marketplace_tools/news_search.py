"""
News Search Tool

This tool provides functionality to search for latest news articles on any topic.
It supports multiple news sources and APIs for comprehensive news coverage.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus

from .base import BaseTool

logger = logging.getLogger(__name__)

class NewsSearchTool(BaseTool):
    """
    Tool for searching news articles from various sources.
    
    Supports multiple news APIs including:
    - NewsAPI.org
    - GNews
    - Bing News Search
    - Custom RSS feeds
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = "News Search Tool"
        self.description = "Search for latest news articles on any topic"
        self.category = "Search"
        self.tool_type = "API"
        
        # API configurations
        self.news_api_key = config.get('news_api_key', '')
        self.gnews_api_key = config.get('gnews_api_key', '')
        self.bing_api_key = config.get('bing_api_key', '')
        
        # Default settings
        self.default_language = config.get('language', 'en')
        self.default_country = config.get('country', 'us')
        self.max_results = config.get('max_results', 10)
        self.sort_by = config.get('sort_by', 'publishedAt')  # publishedAt, relevancy, popularity
        
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute news search with given parameters.
        
        Args:
            query: Search query string
            sources: Comma-separated list of news sources (optional)
            language: Language code (optional, default: en)
            country: Country code (optional, default: us)
            from_date: Start date in YYYY-MM-DD format (optional)
            to_date: End date in YYYY-MM-DD format (optional)
            sort_by: Sort order (publishedAt, relevancy, popularity)
            max_results: Maximum number of results (optional, default: 10)
            api_source: Preferred API source (newsapi, gnews, bing, all)
            
        Returns:
            Dictionary containing news articles and metadata
        """
        query = kwargs.get('query', '')
        if not query:
            return self._format_error("Query parameter is required")
            
        sources = kwargs.get('sources', '')
        language = kwargs.get('language', self.default_language)
        country = kwargs.get('country', self.default_country)
        from_date = kwargs.get('from_date', '')
        to_date = kwargs.get('to_date', '')
        sort_by = kwargs.get('sort_by', self.sort_by)
        max_results = min(kwargs.get('max_results', self.max_results), 50)
        api_source = kwargs.get('api_source', 'all')
        
        try:
            if api_source == 'all':
                # Try multiple APIs for comprehensive results
                results = await self._search_multiple_apis(
                    query, sources, language, country, from_date, to_date, sort_by, max_results
                )
            elif api_source == 'newsapi':
                results = await self._search_newsapi(
                    query, sources, language, from_date, to_date, sort_by, max_results
                )
            elif api_source == 'gnews':
                results = await self._search_gnews(
                    query, language, country, from_date, to_date, max_results
                )
            elif api_source == 'bing':
                results = await self._search_bing(query, max_results)
            else:
                return self._format_error(f"Unknown API source: {api_source}")
                
            if results.get('success'):
                self.log_execution(kwargs, results)
                
            return results
            
        except Exception as e:
            logger.error(f"Error in news search: {str(e)}")
            return self._format_error(f"News search failed: {str(e)}")
    
    async def _search_multiple_apis(self, query: str, sources: str, language: str, 
                                  country: str, from_date: str, to_date: str, 
                                  sort_by: str, max_results: int) -> Dict[str, Any]:
        """Search using multiple APIs and combine results."""
        results = []
        errors = []
        
        # Try NewsAPI
        if self.news_api_key:
            try:
                newsapi_result = await self._search_newsapi(
                    query, sources, language, from_date, to_date, sort_by, max_results
                )
                if newsapi_result.get('success'):
                    results.extend(newsapi_result.get('result', {}).get('articles', []))
                else:
                    errors.append(f"NewsAPI: {newsapi_result.get('error', 'Unknown error')}")
            except Exception as e:
                errors.append(f"NewsAPI: {str(e)}")
        
        # Try GNews
        if self.gnews_api_key:
            try:
                gnews_result = await self._search_gnews(
                    query, language, country, from_date, to_date, max_results
                )
                if gnews_result.get('success'):
                    results.extend(gnews_result.get('result', {}).get('articles', []))
                else:
                    errors.append(f"GNews: {gnews_result.get('error', 'Unknown error')}")
            except Exception as e:
                errors.append(f"GNews: {str(e)}")
        
        # Try Bing News
        if self.bing_api_key:
            try:
                bing_result = await self._search_bing(query, max_results)
                if bing_result.get('success'):
                    results.extend(bing_result.get('result', {}).get('articles', []))
                else:
                    errors.append(f"Bing: {bing_result.get('error', 'Unknown error')}")
            except Exception as e:
                errors.append(f"Bing: {str(e)}")
        
        # Remove duplicates and sort by date
        unique_results = self._deduplicate_articles(results)
        unique_results.sort(key=lambda x: x.get('publishedAt', ''), reverse=True)
        
        return self._format_success({
            'articles': unique_results[:max_results],
            'total_results': len(unique_results),
            'query': query,
            'sources_used': [r for r in ['newsapi', 'gnews', 'bing'] 
                           if self._get_api_key(r)],
            'errors': errors if errors else None
        })
    
    async def _search_newsapi(self, query: str, sources: str, language: str,
                            from_date: str, to_date: str, sort_by: str, 
                            max_results: int) -> Dict[str, Any]:
        """Search using NewsAPI.org."""
        if not self.news_api_key:
            return self._format_error("NewsAPI key not configured")
        
        url = "https://newsapi.org/v2/everything"
        params = {
            'q': query,
            'apiKey': self.news_api_key,
            'language': language,
            'sortBy': sort_by,
            'pageSize': min(max_results, 100)
        }
        
        if sources:
            params['sources'] = sources
        if from_date:
            params['from'] = from_date
        if to_date:
            params['to'] = to_date
        
        result = await self._make_request('GET', url, params=params)
        
        if result.get('success'):
            articles = result['result'].get('articles', [])
            return self._format_success({
                'articles': articles[:max_results],
                'total_results': result['result'].get('totalResults', 0),
                'query': query,
                'source': 'newsapi'
            })
        else:
            return result
    
    async def _search_gnews(self, query: str, language: str, country: str,
                          from_date: str, to_date: str, max_results: int) -> Dict[str, Any]:
        """Search using GNews API."""
        if not self.gnews_api_key:
            return self._format_error("GNews API key not configured")
        
        url = "https://gnews.io/api/v4/search"
        params = {
            'q': query,
            'token': self.gnews_api_key,
            'lang': language,
            'country': country,
            'max': min(max_results, 10)
        }
        
        if from_date:
            params['from'] = from_date
        if to_date:
            params['to'] = to_date
        
        result = await self._make_request('GET', url, params=params)
        
        if result.get('success'):
            articles = result['result'].get('articles', [])
            return self._format_success({
                'articles': articles[:max_results],
                'total_results': len(articles),
                'query': query,
                'source': 'gnews'
            })
        else:
            return result
    
    async def _search_bing(self, query: str, max_results: int) -> Dict[str, Any]:
        """Search using Bing News Search API."""
        if not self.bing_api_key:
            return self._format_error("Bing API key not configured")
        
        url = "https://api.bing.microsoft.com/v7.0/news/search"
        headers = {
            'Ocp-Apim-Subscription-Key': self.bing_api_key
        }
        params = {
            'q': query,
            'count': min(max_results, 50),
            'mkt': 'en-US',
            'freshness': 'Day'
        }
        
        result = await self._make_request('GET', url, headers=headers, params=params)
        
        if result.get('success'):
            articles = result['result'].get('value', [])
            return self._format_success({
                'articles': articles[:max_results],
                'total_results': len(articles),
                'query': query,
                'source': 'bing'
            })
        else:
            return result
    
    def _deduplicate_articles(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate articles based on title and URL."""
        seen_titles = set()
        seen_urls = set()
        unique_articles = []
        
        for article in articles:
            title = article.get('title', '').lower().strip()
            url = article.get('url', '').lower().strip()
            
            if title and url and title not in seen_titles and url not in seen_urls:
                seen_titles.add(title)
                seen_urls.add(url)
                unique_articles.append(article)
        
        return unique_articles
    
    def _get_api_key(self, api_name: str) -> str:
        """Get API key for specified service."""
        if api_name == 'newsapi':
            return self.news_api_key
        elif api_name == 'gnews':
            return self.gnews_api_key
        elif api_name == 'bing':
            return self.bing_api_key
        return ''
    
    async def get_top_headlines(self, country: str = 'us', category: str = 'general', 
                              max_results: int = 10) -> Dict[str, Any]:
        """
        Get top headlines for a specific country and category.
        
        Args:
            country: Country code (default: us)
            category: News category (default: general)
            max_results: Maximum number of results
            
        Returns:
            Dictionary containing top headlines
        """
        if not self.news_api_key:
            return self._format_error("NewsAPI key not configured")
        
        url = "https://newsapi.org/v2/top-headlines"
        params = {
            'country': country,
            'category': category,
            'apiKey': self.news_api_key,
            'pageSize': min(max_results, 100)
        }
        
        result = await self._make_request('GET', url, params=params)
        
        if result.get('success'):
            articles = result['result'].get('articles', [])
            return self._format_success({
                'articles': articles[:max_results],
                'total_results': result['result'].get('totalResults', 0),
                'country': country,
                'category': category,
                'source': 'newsapi'
            })
        else:
            return result
    
    async def get_news_sources(self, category: str = '', language: str = 'en', 
                             country: str = 'us') -> Dict[str, Any]:
        """
        Get available news sources.
        
        Args:
            category: Filter by category (optional)
            language: Filter by language (optional)
            country: Filter by country (optional)
            
        Returns:
            Dictionary containing available sources
        """
        if not self.news_api_key:
            return self._format_error("NewsAPI key not configured")
        
        url = "https://newsapi.org/v2/sources"
        params = {
            'apiKey': self.news_api_key
        }
        
        if category:
            params['category'] = category
        if language:
            params['language'] = language
        if country:
            params['country'] = country
        
        result = await self._make_request('GET', url, params=params)
        
        if result.get('success'):
            sources = result['result'].get('sources', [])
            return self._format_success({
                'sources': sources,
                'total_results': len(sources),
                'category': category,
                'language': language,
                'country': country,
                'source': 'newsapi'
            })
        else:
            return result 