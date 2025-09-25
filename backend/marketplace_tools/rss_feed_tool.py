"""
RSS Feed Tool

A tool for fetching and processing RSS feeds from multiple sources.
Provides RSS feed integration with content discovery, categorization, and formatting.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
import aiohttp
import feedparser
from urllib.parse import urlparse, urljoin
import re

from .base import BaseTool

logger = logging.getLogger(__name__)

class RSSFeedTool(BaseTool):
    """
    RSS Feed Tool for content discovery and news aggregation.
    
    Features:
    - Multiple RSS feed source management
    - Content categorization and filtering
    - Date-based filtering
    - Content summarization
    - Social media formatting
    - Keyword-based filtering
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = "RSS Feed Content Discovery Tool"
        self.description = "Fetch and process RSS feeds from multiple sources for content discovery"
        self.category = "Search"
        self.tool_type = "API"
        
        # RSS feed configuration
        self.feed_urls = config.get('feed_urls', [])
        self.categories = config.get('categories', {})
        self.max_items_per_feed = config.get('max_items_per_feed', 20)
        self.max_total_items = config.get('max_total_items', 50)
        
        # Content filtering
        self.min_date_hours = config.get('min_date_hours', 0)  # 0 = no minimum
        self.max_date_hours = config.get('max_date_hours', 168)  # 7 days default
        self.keywords_filter = config.get('keywords_filter', [])
        self.exclude_keywords = config.get('exclude_keywords', [])
        
        # Content processing
        self.include_content = config.get('include_content', False)  # Usually False for RSS
        self.max_description_length = config.get('max_description_length', 500)
        self.include_images = config.get('include_images', True)
        
        # Default RSS sources if none provided
        if not self.feed_urls:
            self.feed_urls = self._get_default_feeds()
    
    def _get_default_feeds(self) -> List[Dict[str, str]]:
        """Get default RSS feed sources."""
        return [
            {
                'name': 'BBC News',
                'url': 'http://feeds.bbci.co.uk/news/rss.xml',
                'category': 'news'
            },
            {
                'name': 'TechCrunch',
                'url': 'https://techcrunch.com/feed/',
                'category': 'technology'
            },
            {
                'name': 'Hacker News',
                'url': 'https://hnrss.org/frontpage',
                'category': 'technology'
            },
            {
                'name': 'Reddit Technology',
                'url': 'https://www.reddit.com/r/technology/.rss',
                'category': 'technology'
            },
            {
                'name': 'Reddit Programming',
                'url': 'https://www.reddit.com/r/programming/.rss',
                'category': 'programming'
            },
            {
                'name': 'Reddit Science',
                'url': 'https://www.reddit.com/r/science/.rss',
                'category': 'science'
            },
            {
                'name': 'Reddit World News',
                'url': 'https://www.reddit.com/r/worldnews/.rss',
                'category': 'news'
            },
            {
                'name': 'Reddit AskReddit',
                'url': 'https://www.reddit.com/r/AskReddit/.rss',
                'category': 'discussion'
            }
        ]
    
    def get_config_schema(self) -> Dict[str, Any]:
        """Get the configuration schema for this tool"""
        return {
            "name": "RSS Feed Content Discovery Tool",
            "description": "Fetch and process RSS feeds from multiple sources for content discovery",
            "parameters": {
                "feed_urls": {
                    "type": "array",
                    "description": "List of RSS feed URLs with metadata",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Feed name"},
                            "url": {"type": "string", "description": "RSS feed URL"},
                            "category": {"type": "string", "description": "Feed category"}
                        }
                    },
                    "default": []
                },
                "max_items_per_feed": {
                    "type": "integer",
                    "description": "Maximum items to fetch per feed",
                    "default": 20,
                    "min": 1,
                    "max": 100
                },
                "max_total_items": {
                    "type": "integer",
                    "description": "Maximum total items to return",
                    "default": 50,
                    "min": 1,
                    "max": 200
                },
                "min_date_hours": {
                    "type": "integer",
                    "description": "Minimum age of items in hours (0 = no minimum)",
                    "default": 0,
                    "min": 0
                },
                "max_date_hours": {
                    "type": "integer",
                    "description": "Maximum age of items in hours",
                    "default": 168,
                    "min": 1
                },
                "keywords_filter": {
                    "type": "array",
                    "description": "Keywords to include (items must contain at least one)",
                    "items": {"type": "string"},
                    "default": []
                },
                "exclude_keywords": {
                    "type": "array",
                    "description": "Keywords to exclude",
                    "items": {"type": "string"},
                    "default": []
                },
                "include_content": {
                    "type": "boolean",
                    "description": "Whether to include full content (usually False for RSS)",
                    "default": False
                },
                "max_description_length": {
                    "type": "integer",
                    "description": "Maximum description length",
                    "default": 500,
                    "min": 100,
                    "max": 2000
                },
                "include_images": {
                    "type": "boolean",
                    "description": "Whether to include image URLs",
                    "default": True
                }
            },
            "capabilities": [
                "rss_feed_parsing",
                "multi_source_aggregation",
                "content_filtering",
                "date_based_filtering",
                "keyword_filtering",
                "content_categorization",
                "social_media_formatting"
            ],
            "config_fields": [
                {
                    "name": "feed_urls",
                    "type": "textarea",
                    "label": "RSS Feed URLs",
                    "description": "JSON array of feed objects with name, url, and category. Leave empty to use defaults.",
                    "default": "[]",
                    "required": False
                },
                {
                    "name": "max_items_per_feed",
                    "type": "number",
                    "label": "Max Items Per Feed",
                    "description": "Maximum items to fetch per feed",
                    "default": 20,
                    "min": 1,
                    "max": 100,
                    "required": False
                },
                {
                    "name": "max_total_items",
                    "type": "number",
                    "label": "Max Total Items",
                    "description": "Maximum total items to return",
                    "default": 50,
                    "min": 1,
                    "max": 200,
                    "required": False
                },
                {
                    "name": "min_date_hours",
                    "type": "number",
                    "label": "Min Age (Hours)",
                    "description": "Minimum age of items in hours (0 = no minimum)",
                    "default": 0,
                    "min": 0,
                    "required": False
                },
                {
                    "name": "max_date_hours",
                    "type": "number",
                    "label": "Max Age (Hours)",
                    "description": "Maximum age of items in hours",
                    "default": 168,
                    "min": 1,
                    "required": False
                },
                {
                    "name": "keywords_filter",
                    "type": "text",
                    "label": "Include Keywords",
                    "description": "Comma-separated keywords to include (items must contain at least one)",
                    "default": "",
                    "required": False
                },
                {
                    "name": "exclude_keywords",
                    "type": "text",
                    "label": "Exclude Keywords",
                    "description": "Comma-separated keywords to exclude",
                    "default": "",
                    "required": False
                },
                {
                    "name": "include_content",
                    "type": "checkbox",
                    "label": "Include Full Content",
                    "description": "Whether to include full content (usually False for RSS)",
                    "default": False,
                    "required": False
                },
                {
                    "name": "max_description_length",
                    "type": "number",
                    "label": "Max Description Length",
                    "description": "Maximum description length",
                    "default": 500,
                    "min": 100,
                    "max": 2000,
                    "required": False
                },
                {
                    "name": "include_images",
                    "type": "checkbox",
                    "label": "Include Images",
                    "description": "Whether to include image URLs",
                    "default": True,
                    "required": False
                }
            ]
        }
    
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute RSS feed content discovery.
        
        Args:
            category: Category to filter by (optional)
            keywords: Keywords to search for (optional)
            max_items: Maximum items to return (optional)
            hours_back: How many hours back to look (optional)
            format_for: Platform to format for (twitter, instagram, tiktok) (optional)
            
        Returns:
            Dictionary containing discovered content and metadata
        """
        # Parse parameters
        category = kwargs.get('category', '')
        keywords = kwargs.get('keywords', '')
        max_items = kwargs.get('max_items', self.max_total_items)
        hours_back = kwargs.get('hours_back', self.max_date_hours)
        format_for = kwargs.get('format_for', 'twitter')
        
        # Convert keywords string to list
        if keywords:
            keywords_list = [k.strip().lower() for k in keywords.split(',') if k.strip()]
        else:
            keywords_list = []
        
        # Filter feeds by category if specified
        feeds_to_process = self.feed_urls
        if category:
            feeds_to_process = [feed for feed in self.feed_urls if feed.get('category', '').lower() == category.lower()]
            if not feeds_to_process:
                return self._format_error(f"No feeds found for category: {category}")
        
        logger.info(f"🔍 Processing {len(feeds_to_process)} RSS feeds")
        
        try:
            # Fetch content from all feeds
            all_items = []
            for feed_config in feeds_to_process:
                try:
                    items = await self._fetch_feed_items(feed_config)
                    all_items.extend(items)
                    logger.info(f"✅ Fetched {len(items)} items from {feed_config['name']}")
                except Exception as e:
                    logger.error(f"❌ Failed to fetch from {feed_config['name']}: {str(e)}")
                    continue
            
            if not all_items:
                return self._format_error("No items found in any RSS feeds")
            
            # Filter items by date
            filtered_items = self._filter_by_date(all_items, hours_back)
            logger.info(f"📅 Date filtering: {len(all_items)} -> {len(filtered_items)} items")
            
            # Filter items by keywords
            if keywords_list:
                filtered_items = self._filter_by_keywords(filtered_items, keywords_list)
                logger.info(f"🔍 Keyword filtering: {len(filtered_items)} items match keywords")
            
            # Sort by date (newest first)
            filtered_items.sort(key=lambda x: x.get('published_parsed', (0, 0, 0, 0, 0, 0, 0, 0, 0)), reverse=True)
            
            # Limit results
            final_items = filtered_items[:max_items]
            
            # Format content for platform
            formatted_content = []
            for item in final_items:
                formatted_item = self._format_item_for_platform(item, format_for)
                formatted_content.append(formatted_item)
            
            metadata = {
                'total_feeds_processed': len(feeds_to_process),
                'total_items_found': len(all_items),
                'items_after_date_filter': len(filtered_items),
                'final_items': len(final_items),
                'categories': list(set(feed.get('category', '') for feed in feeds_to_process)),
                'keywords_used': keywords_list,
                'hours_back': hours_back
            }
            
            return self._format_success(formatted_content, metadata)
            
        except Exception as e:
            logger.error(f"RSS feed tool error: {str(e)}")
            return self._format_error(f"RSS feed search failed: {str(e)}")
    
    async def _fetch_feed_items(self, feed_config: Dict[str, str]) -> List[Dict[str, Any]]:
        """Fetch items from a single RSS feed."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(feed_config['url'], timeout=30) as response:
                    if response.status != 200:
                        logger.error(f"HTTP {response.status} for {feed_config['url']}")
                        return []
                    
                    content = await response.text()
                    
            # Parse RSS feed
            feed = feedparser.parse(content)
            
            if feed.bozo:
                logger.warning(f"RSS parsing warning for {feed_config['name']}: {feed.bozo_exception}")
            
            items = []
            for entry in feed.entries[:self.max_items_per_feed]:
                item = {
                    'title': entry.get('title', ''),
                    'description': entry.get('description', ''),
                    'link': entry.get('link', ''),
                    'published': entry.get('published', ''),
                    'published_parsed': entry.get('published_parsed'),
                    'author': entry.get('author', ''),
                    'feed_name': feed_config['name'],
                    'feed_category': feed_config.get('category', ''),
                    'tags': [tag.term for tag in entry.get('tags', [])],
                    'summary': entry.get('summary', ''),
                    'content': entry.get('content', [{}])[0].get('value', '') if entry.get('content') else '',
                    'image_url': self._extract_image_url(entry),
                    'guid': entry.get('guid', ''),
                    'id': entry.get('id', '')
                }
                items.append(item)
            
            return items
            
        except Exception as e:
            logger.error(f"Error fetching feed {feed_config['name']}: {str(e)}")
            return []
    
    def _extract_image_url(self, entry: Dict[str, Any]) -> Optional[str]:
        """Extract image URL from RSS entry."""
        # Try different image fields
        image_fields = ['image', 'enclosure', 'media_content', 'media_thumbnail']
        
        for field in image_fields:
            if field in entry:
                if isinstance(entry[field], dict):
                    if 'url' in entry[field]:
                        return entry[field]['url']
                elif isinstance(entry[field], list) and entry[field]:
                    if isinstance(entry[field][0], dict) and 'url' in entry[field][0]:
                        return entry[field][0]['url']
        
        # Try to extract from description/summary
        description = entry.get('description', '') or entry.get('summary', '')
        if description:
            img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', description)
            if img_match:
                return img_match.group(1)
        
        return None
    
    def _filter_by_date(self, items: List[Dict[str, Any]], hours_back: int) -> List[Dict[str, Any]]:
        """Filter items by date."""
        if hours_back <= 0:
            return items
        
        cutoff_time = datetime.utcnow() - timedelta(hours=hours_back)
        filtered_items = []
        
        for item in items:
            published_parsed = item.get('published_parsed')
            if published_parsed:
                try:
                    item_time = datetime(*published_parsed[:6])
                    if item_time >= cutoff_time:
                        filtered_items.append(item)
                except (ValueError, TypeError):
                    # If we can't parse the date, include the item
                    filtered_items.append(item)
            else:
                # If no date, include the item
                filtered_items.append(item)
        
        return filtered_items
    
    def _filter_by_keywords(self, items: List[Dict[str, Any]], keywords: List[str]) -> List[Dict[str, Any]]:
        """Filter items by keywords."""
        filtered_items = []
        
        for item in items:
            # Combine title, description, and tags for keyword matching
            search_text = f"{item.get('title', '')} {item.get('description', '')} {item.get('summary', '')}"
            search_text += ' ' + ' '.join(item.get('tags', []))
            search_text = search_text.lower()
            
            # Check if any keyword is present
            if any(keyword in search_text for keyword in keywords):
                # Check if any exclude keyword is present
                if not any(exclude_keyword in search_text for exclude_keyword in self.exclude_keywords):
                    filtered_items.append(item)
        
        return filtered_items
    
    def _format_item_for_platform(self, item: Dict[str, Any], platform: str) -> Dict[str, Any]:
        """Format RSS item for specific social media platform."""
        base_content = {
            'title': item.get('title', ''),
            'description': self._clean_description(item.get('description', '')),
            'link': item.get('link', ''),
            'published': item.get('published', ''),
            'feed_name': item.get('feed_name', ''),
            'feed_category': item.get('feed_category', ''),
            'image_url': item.get('image_url'),
            'tags': item.get('tags', [])
        }
        
        if platform == 'twitter':
            return self._format_for_twitter(item, base_content)
        elif platform == 'instagram':
            return self._format_for_instagram(item, base_content)
        elif platform == 'tiktok':
            return self._format_for_tiktok(item, base_content)
        else:
            return base_content
    
    def _clean_description(self, description: str) -> str:
        """Clean HTML from description."""
        if not description:
            return ''
        
        # Remove HTML tags
        clean = re.sub(r'<[^>]+>', '', description)
        # Decode HTML entities
        clean = clean.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
        clean = clean.replace('&quot;', '"').replace('&#39;', "'")
        # Clean up whitespace
        clean = re.sub(r'\s+', ' ', clean).strip()
        
        # Truncate if too long
        if len(clean) > self.max_description_length:
            clean = clean[:self.max_description_length-3] + '...'
        
        return clean
    
    def _format_for_twitter(self, item: Dict[str, Any], base_content: Dict[str, str]) -> Dict[str, str]:
        """Format content for Twitter."""
        title = item.get('title', '')
        description = base_content['description']
        link = item.get('link', '')
        feed_name = item.get('feed_name', '')
        
        # Twitter character limit considerations
        max_length = 280
        available_length = max_length - len(link) - 3  # 3 for spaces
        
        # Create tweet text
        tweet_text = f"{title}"
        if description and len(tweet_text + ' ' + description) <= available_length:
            tweet_text += f" {description}"
        
        if len(tweet_text) > available_length:
            tweet_text = tweet_text[:available_length-3] + "..."
        
        tweet_text += f" {link}"
        
        return {
            'tweet': tweet_text,
            'thread_starter': f"📰 {feed_name}: {title}",
            'poll_question': f"What's your take on this: {title[:100]}...?"
        }
    
    def _format_for_instagram(self, item: Dict[str, Any], base_content: Dict[str, str]) -> Dict[str, str]:
        """Format content for Instagram."""
        title = item.get('title', '')
        description = base_content['description']
        feed_name = item.get('feed_name', '')
        
        hashtags = self._generate_hashtags(item)
        hashtag_text = '\n'.join(hashtags)
        
        return {
            'caption': f"📰 {title}\n\n{description}\n\n{hashtag_text}",
            'story_text': f"📰 {feed_name}: {title}",
            'carousel_title': f"📰 {feed_name}: {title[:50]}..."
        }
    
    def _format_for_tiktok(self, item: Dict[str, Any], base_content: Dict[str, str]) -> Dict[str, str]:
        """Format content for TikTok."""
        title = item.get('title', '')
        feed_name = item.get('feed_name', '')
        
        hashtags = self._generate_hashtags(item)
        hashtag_text = ' '.join(hashtags[:5])  # Limit hashtags for TikTok
        
        return {
            'script': f"📰 {feed_name} just shared: {title}",
            'hook': f"📰 {feed_name} dropped this news: {title[:60]}...",
            'hashtags': hashtag_text,
            'question': f"What do you think about this news from {feed_name}?"
        }
    
    def _generate_hashtags(self, item: Dict[str, Any]) -> List[str]:
        """Generate relevant hashtags for the item."""
        hashtags = []
        
        # Feed-based hashtags
        feed_name = item.get('feed_name', '').lower().replace(' ', '')
        if feed_name:
            hashtags.append(f"#{feed_name}")
        
        # Category-based hashtags
        category = item.get('feed_category', '').lower()
        if category:
            hashtags.append(f"#{category}")
        
        # Content-based hashtags
        title_words = re.findall(r'\b\w+\b', item.get('title', '').lower())
        common_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'}
        
        for word in title_words:
            if len(word) > 3 and word not in common_words:
                hashtags.append(f"#{word}")
                if len(hashtags) >= 8:  # Limit hashtags
                    break
        
        # Add some generic RSS hashtags
        hashtags.extend(['#rss', '#news', '#trending'])
        
        return hashtags[:10]  # Return max 10 hashtags
