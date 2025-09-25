"""
Telegram Tool

A tool for fetching and processing content from Telegram channels and groups.
Provides Telegram integration with content discovery, message filtering, and formatting.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
import aiohttp
from urllib.parse import urlparse, urljoin
import re

from .base import BaseTool

logger = logging.getLogger(__name__)

class TelegramTool(BaseTool):
    """
    Telegram Tool for content discovery and message aggregation.
    
    Features:
    - Multiple Telegram channel/group support
    - Message filtering and search
    - Date-based filtering
    - Content categorization
    - Social media formatting
    - Media extraction (images, videos, documents)
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = "Telegram Content Discovery Tool"
        self.description = "Fetch and process content from Telegram channels and groups"
        self.category = "Search"
        self.tool_type = "API"
        
        # Telegram API configuration
        self.api_id = config.get('api_id', '')
        self.api_hash = config.get('api_hash', '')
        self.phone_number = config.get('phone_number', '')
        self.session_name = config.get('session_name', 'telegram_session')
        
        # Channel/Group configuration
        self.channel_usernames = config.get('channel_usernames', [])
        self.group_usernames = config.get('group_usernames', [])
        self.max_messages_per_channel = config.get('max_messages_per_channel', 50)
        self.max_total_messages = config.get('max_total_messages', 100)
        
        # Content filtering
        self.min_date_hours = config.get('min_date_hours', 0)  # 0 = no minimum
        self.max_date_hours = config.get('max_date_hours', 168)  # 7 days default
        self.keywords_filter = config.get('keywords_filter', [])
        self.exclude_keywords = config.get('exclude_keywords', [])
        self.include_media = config.get('include_media', True)
        self.include_links = config.get('include_links', True)
        
        # Content processing
        self.max_message_length = config.get('max_message_length', 1000)
        self.include_forwarded = config.get('include_forwarded', True)
        self.include_replies = config.get('include_replies', False)
        
        # Default channels if none provided
        if not self.channel_usernames and not self.group_usernames:
            self.channel_usernames = self._get_default_channels()
    
    def _get_default_channels(self) -> List[str]:
        """Get default Telegram channels."""
        return [
            'durov',  # Pavel Durov's channel
            'telegram',  # Official Telegram channel
            'techcrunch',  # TechCrunch
            'bbcnews',  # BBC News
            'reuters',  # Reuters
            'cnn',  # CNN
            'wired',  # Wired
            'theverge',  # The Verge
            'hackernews',  # Hacker News
            'producthunt'  # Product Hunt
        ]
    
    def get_config_schema(self) -> Dict[str, Any]:
        """Get the configuration schema for this tool"""
        return {
            "name": "Telegram Content Discovery Tool",
            "description": "Fetch and process content from Telegram channels and groups",
            "parameters": {
                "api_id": {
                    "type": "string",
                    "description": "Telegram API ID from my.telegram.org",
                    "required": True,
                    "sensitive": True
                },
                "api_hash": {
                    "type": "string",
                    "description": "Telegram API Hash from my.telegram.org",
                    "required": True,
                    "sensitive": True
                },
                "phone_number": {
                    "type": "string",
                    "description": "Your phone number (with country code, e.g., +1234567890)",
                    "required": True,
                    "sensitive": True
                },
                "session_name": {
                    "type": "string",
                    "description": "Session name for Telegram client",
                    "default": "telegram_session",
                    "required": False
                },
                "channel_usernames": {
                    "type": "array",
                    "description": "List of Telegram channel usernames (without @)",
                    "items": {"type": "string"},
                    "default": []
                },
                "group_usernames": {
                    "type": "array",
                    "description": "List of Telegram group usernames (without @)",
                    "items": {"type": "string"},
                    "default": []
                },
                "max_messages_per_channel": {
                    "type": "integer",
                    "description": "Maximum messages to fetch per channel/group",
                    "default": 50,
                    "min": 1,
                    "max": 200
                },
                "max_total_messages": {
                    "type": "integer",
                    "description": "Maximum total messages to return",
                    "default": 100,
                    "min": 1,
                    "max": 500
                },
                "min_date_hours": {
                    "type": "integer",
                    "description": "Minimum age of messages in hours (0 = no minimum)",
                    "default": 0,
                    "min": 0
                },
                "max_date_hours": {
                    "type": "integer",
                    "description": "Maximum age of messages in hours",
                    "default": 168,
                    "min": 1
                },
                "keywords_filter": {
                    "type": "array",
                    "description": "Keywords to include (messages must contain at least one)",
                    "items": {"type": "string"},
                    "default": []
                },
                "exclude_keywords": {
                    "type": "array",
                    "description": "Keywords to exclude",
                    "items": {"type": "string"},
                    "default": []
                },
                "include_media": {
                    "type": "boolean",
                    "description": "Whether to include media information",
                    "default": True
                },
                "include_links": {
                    "type": "boolean",
                    "description": "Whether to include link information",
                    "default": True
                },
                "max_message_length": {
                    "type": "integer",
                    "description": "Maximum message length to process",
                    "default": 1000,
                    "min": 100,
                    "max": 4000
                },
                "include_forwarded": {
                    "type": "boolean",
                    "description": "Whether to include forwarded messages",
                    "default": True
                },
                "include_replies": {
                    "type": "boolean",
                    "description": "Whether to include reply messages",
                    "default": False
                }
            },
            "capabilities": [
                "telegram_channel_access",
                "telegram_group_access",
                "message_filtering",
                "date_based_filtering",
                "keyword_filtering",
                "media_extraction",
                "content_categorization",
                "social_media_formatting"
            ],
            "config_fields": [
                {
                    "name": "api_id",
                    "type": "text",
                    "label": "Telegram API ID",
                    "description": "Get this from https://my.telegram.org/apps",
                    "required": True,
                    "sensitive": True
                },
                {
                    "name": "api_hash",
                    "type": "text",
                    "label": "Telegram API Hash",
                    "description": "Get this from https://my.telegram.org/apps",
                    "required": True,
                    "sensitive": True
                },
                {
                    "name": "phone_number",
                    "type": "text",
                    "label": "Phone Number",
                    "description": "Your phone number with country code (e.g., +1234567890)",
                    "required": True,
                    "sensitive": True
                },
                {
                    "name": "session_name",
                    "type": "text",
                    "label": "Session Name",
                    "description": "Name for the Telegram session",
                    "default": "telegram_session",
                    "required": False
                },
                {
                    "name": "channel_usernames",
                    "type": "textarea",
                    "label": "Channel Usernames",
                    "description": "Comma-separated list of channel usernames (without @). Leave empty to use defaults.",
                    "default": "",
                    "required": False
                },
                {
                    "name": "group_usernames",
                    "type": "textarea",
                    "label": "Group Usernames",
                    "description": "Comma-separated list of group usernames (without @)",
                    "default": "",
                    "required": False
                },
                {
                    "name": "max_messages_per_channel",
                    "type": "number",
                    "label": "Max Messages Per Channel",
                    "description": "Maximum messages to fetch per channel/group",
                    "default": 50,
                    "min": 1,
                    "max": 200,
                    "required": False
                },
                {
                    "name": "max_total_messages",
                    "type": "number",
                    "label": "Max Total Messages",
                    "description": "Maximum total messages to return",
                    "default": 100,
                    "min": 1,
                    "max": 500,
                    "required": False
                },
                {
                    "name": "min_date_hours",
                    "type": "number",
                    "label": "Min Age (Hours)",
                    "description": "Minimum age of messages in hours (0 = no minimum)",
                    "default": 0,
                    "min": 0,
                    "required": False
                },
                {
                    "name": "max_date_hours",
                    "type": "number",
                    "label": "Max Age (Hours)",
                    "description": "Maximum age of messages in hours",
                    "default": 168,
                    "min": 1,
                    "required": False
                },
                {
                    "name": "keywords_filter",
                    "type": "text",
                    "label": "Include Keywords",
                    "description": "Comma-separated keywords to include (messages must contain at least one)",
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
                    "name": "include_media",
                    "type": "checkbox",
                    "label": "Include Media",
                    "description": "Whether to include media information",
                    "default": True,
                    "required": False
                },
                {
                    "name": "include_links",
                    "type": "checkbox",
                    "label": "Include Links",
                    "description": "Whether to include link information",
                    "default": True,
                    "required": False
                },
                {
                    "name": "max_message_length",
                    "type": "number",
                    "label": "Max Message Length",
                    "description": "Maximum message length to process",
                    "default": 1000,
                    "min": 100,
                    "max": 4000,
                    "required": False
                },
                {
                    "name": "include_forwarded",
                    "type": "checkbox",
                    "label": "Include Forwarded",
                    "description": "Whether to include forwarded messages",
                    "default": True,
                    "required": False
                },
                {
                    "name": "include_replies",
                    "type": "checkbox",
                    "label": "Include Replies",
                    "description": "Whether to include reply messages",
                    "default": False,
                    "required": False
                }
            ]
        }
    
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute Telegram content discovery.
        
        Args:
            channel: Specific channel to search (optional)
            keywords: Keywords to search for (optional)
            max_messages: Maximum messages to return (optional)
            hours_back: How many hours back to look (optional)
            format_for: Platform to format for (twitter, instagram, tiktok) (optional)
            
        Returns:
            Dictionary containing discovered content and metadata
        """
        # Check if credentials are provided
        if not self.api_id or not self.api_hash or not self.phone_number:
            return self._format_error("Telegram API credentials not provided. Please configure api_id, api_hash, and phone_number.")
        
        # Parse parameters
        channel = kwargs.get('channel', '')
        keywords = kwargs.get('keywords', '')
        max_messages = kwargs.get('max_messages', self.max_total_messages)
        hours_back = kwargs.get('hours_back', self.max_date_hours)
        format_for = kwargs.get('format_for', 'twitter')
        
        # Convert keywords string to list
        if keywords:
            keywords_list = [k.strip().lower() for k in keywords.split(',') if k.strip()]
        else:
            keywords_list = []
        
        # Filter channels by specific channel if specified
        channels_to_process = []
        if channel:
            # Check if it's in channel_usernames or group_usernames
            if channel in self.channel_usernames:
                channels_to_process = [{'type': 'channel', 'username': channel}]
            elif channel in self.group_usernames:
                channels_to_process = [{'type': 'group', 'username': channel}]
            else:
                return self._format_error(f"Channel '{channel}' not found in configured channels/groups")
        else:
            # Process all configured channels and groups
            for username in self.channel_usernames:
                channels_to_process.append({'type': 'channel', 'username': username})
            for username in self.group_usernames:
                channels_to_process.append({'type': 'group', 'username': username})
        
        if not channels_to_process:
            return self._format_error("No channels or groups configured")
        
        logger.info(f"🔍 Processing {len(channels_to_process)} Telegram channels/groups")
        
        try:
            # Initialize Telegram client
            client = await self._initialize_telegram_client()
            if not client:
                return self._format_error("Failed to initialize Telegram client")
            
            # Fetch messages from all channels/groups
            all_messages = []
            for channel_config in channels_to_process:
                try:
                    messages = await self._fetch_channel_messages(client, channel_config)
                    all_messages.extend(messages)
                    logger.info(f"✅ Fetched {len(messages)} messages from {channel_config['type']} {channel_config['username']}")
                except Exception as e:
                    logger.error(f"❌ Failed to fetch from {channel_config['type']} {channel_config['username']}: {str(e)}")
                    continue
            
            # Close client
            await client.disconnect()
            
            if not all_messages:
                return self._format_error("No messages found in any channels/groups")
            
            # Filter messages by date
            filtered_messages = self._filter_by_date(all_messages, hours_back)
            logger.info(f"📅 Date filtering: {len(all_messages)} -> {len(filtered_messages)} messages")
            
            # Filter messages by keywords
            if keywords_list:
                filtered_messages = self._filter_by_keywords(filtered_messages, keywords_list)
                logger.info(f"🔍 Keyword filtering: {len(filtered_messages)} messages match keywords")
            
            # Sort by date (newest first)
            filtered_messages.sort(key=lambda x: x.get('date', datetime.min), reverse=True)
            
            # Limit results
            final_messages = filtered_messages[:max_messages]
            
            # Format content for platform
            formatted_content = []
            for message in final_messages:
                formatted_message = self._format_message_for_platform(message, format_for)
                formatted_content.append(formatted_message)
            
            metadata = {
                'total_channels_processed': len(channels_to_process),
                'total_messages_found': len(all_messages),
                'messages_after_date_filter': len(filtered_messages),
                'final_messages': len(final_messages),
                'channels_processed': [f"{c['type']}:{c['username']}" for c in channels_to_process],
                'keywords_used': keywords_list,
                'hours_back': hours_back
            }
            
            return self._format_success(formatted_content, metadata)
            
        except Exception as e:
            logger.error(f"Telegram tool error: {str(e)}")
            return self._format_error(f"Telegram search failed: {str(e)}")
    
    async def _initialize_telegram_client(self):
        """Initialize Telegram client."""
        try:
            # Import here to avoid import errors if telethon is not installed
            from telethon import TelegramClient
            from telethon.errors import SessionPasswordNeededError
            
            client = TelegramClient(self.session_name, self.api_id, self.api_hash)
            await client.start(phone=self.phone_number)
            
            # Check if we need to authenticate
            if not await client.is_user_authorized():
                await client.send_code_request(self.phone_number)
                # Note: In a real implementation, you'd need to handle the code input
                # For now, we'll assume the session is already authorized
                logger.warning("Telegram client not authorized. Please authenticate manually first.")
                return None
            
            logger.info("Telegram client initialized successfully")
            return client
            
        except ImportError:
            logger.error("Telethon library not installed. Please install it with: pip install telethon")
            return None
        except Exception as e:
            logger.error(f"Failed to initialize Telegram client: {str(e)}")
            return None
    
    async def _fetch_channel_messages(self, client, channel_config: Dict[str, str]) -> List[Dict[str, Any]]:
        """Fetch messages from a single Telegram channel/group."""
        try:
            channel_type = channel_config['type']
            username = channel_config['username']
            
            # Get the entity (channel or group)
            if channel_type == 'channel':
                entity = await client.get_entity(f'@{username}')
            else:
                entity = await client.get_entity(f'@{username}')
            
            # Fetch messages
            messages = []
            async for message in client.iter_messages(entity, limit=self.max_messages_per_channel):
                # Skip if it's a reply and we don't want replies
                if message.reply_to and not self.include_replies:
                    continue
                
                # Skip if it's forwarded and we don't want forwarded
                if message.forward and not self.include_forwarded:
                    continue
                
                # Skip if message is too long
                if message.text and len(message.text) > self.max_message_length:
                    continue
                
                message_data = {
                    'id': message.id,
                    'text': message.text or '',
                    'date': message.date,
                    'channel_name': username,
                    'channel_type': channel_type,
                    'views': getattr(message, 'views', 0),
                    'forwards': getattr(message, 'forwards', 0),
                    'replies': getattr(message, 'replies', {}).get('replies', 0) if hasattr(message, 'replies') else 0,
                    'is_forwarded': bool(message.forward),
                    'is_reply': bool(message.reply_to),
                    'media_type': self._get_media_type(message),
                    'media_url': self._get_media_url(message),
                    'links': self._extract_links(message.text or ''),
                    'hashtags': self._extract_hashtags(message.text or ''),
                    'mentions': self._extract_mentions(message.text or ''),
                    'author': self._get_author_info(message)
                }
                
                messages.append(message_data)
            
            return messages
            
        except Exception as e:
            logger.error(f"Error fetching messages from {channel_config['type']} {channel_config['username']}: {str(e)}")
            return []
    
    def _get_media_type(self, message) -> Optional[str]:
        """Get media type from message."""
        if not message.media:
            return None
        
        media_type = type(message.media).__name__
        if 'Photo' in media_type:
            return 'photo'
        elif 'Video' in media_type:
            return 'video'
        elif 'Document' in media_type:
            return 'document'
        elif 'Audio' in media_type:
            return 'audio'
        elif 'Voice' in media_type:
            return 'voice'
        elif 'Sticker' in media_type:
            return 'sticker'
        else:
            return 'other'
    
    def _get_media_url(self, message) -> Optional[str]:
        """Get media URL from message."""
        if not message.media or not self.include_media:
            return None
        
        # Note: Getting media URLs requires additional API calls
        # For now, we'll return a placeholder
        return f"media_{message.id}"
    
    def _extract_links(self, text: str) -> List[str]:
        """Extract links from message text."""
        if not self.include_links:
            return []
        
        url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        return re.findall(url_pattern, text)
    
    def _extract_hashtags(self, text: str) -> List[str]:
        """Extract hashtags from message text."""
        hashtag_pattern = r'#\w+'
        return re.findall(hashtag_pattern, text)
    
    def _extract_mentions(self, text: str) -> List[str]:
        """Extract mentions from message text."""
        mention_pattern = r'@\w+'
        return re.findall(mention_pattern, text)
    
    def _get_author_info(self, message) -> Dict[str, Any]:
        """Get author information from message."""
        if not message.sender:
            return {}
        
        return {
            'id': getattr(message.sender, 'id', None),
            'username': getattr(message.sender, 'username', None),
            'first_name': getattr(message.sender, 'first_name', None),
            'last_name': getattr(message.sender, 'last_name', None)
        }
    
    def _filter_by_date(self, messages: List[Dict[str, Any]], hours_back: int) -> List[Dict[str, Any]]:
        """Filter messages by date."""
        if hours_back <= 0:
            return messages
        
        cutoff_time = datetime.utcnow() - timedelta(hours=hours_back)
        filtered_messages = []
        
        for message in messages:
            message_date = message.get('date')
            if message_date and message_date >= cutoff_time:
                filtered_messages.append(message)
        
        return filtered_messages
    
    def _filter_by_keywords(self, messages: List[Dict[str, Any]], keywords: List[str]) -> List[Dict[str, Any]]:
        """Filter messages by keywords."""
        filtered_messages = []
        
        for message in messages:
            # Combine text and hashtags for keyword matching
            search_text = f"{message.get('text', '')} {' '.join(message.get('hashtags', []))}"
            search_text = search_text.lower()
            
            # Check if any keyword is present
            if any(keyword in search_text for keyword in keywords):
                # Check if any exclude keyword is present
                if not any(exclude_keyword in search_text for exclude_keyword in self.exclude_keywords):
                    filtered_messages.append(message)
        
        return filtered_messages
    
    def _format_message_for_platform(self, message: Dict[str, Any], platform: str) -> Dict[str, Any]:
        """Format Telegram message for specific social media platform."""
        base_content = {
            'text': message.get('text', ''),
            'date': message.get('date'),
            'channel_name': message.get('channel_name', ''),
            'channel_type': message.get('channel_type', ''),
            'views': message.get('views', 0),
            'forwards': message.get('forwards', 0),
            'replies': message.get('replies', 0),
            'media_type': message.get('media_type'),
            'media_url': message.get('media_url'),
            'links': message.get('links', []),
            'hashtags': message.get('hashtags', []),
            'mentions': message.get('mentions', [])
        }
        
        if platform == 'twitter':
            return self._format_for_twitter(message, base_content)
        elif platform == 'instagram':
            return self._format_for_instagram(message, base_content)
        elif platform == 'tiktok':
            return self._format_for_tiktok(message, base_content)
        else:
            return base_content
    
    def _format_for_twitter(self, message: Dict[str, Any], base_content: Dict[str, Any]) -> Dict[str, str]:
        """Format content for Twitter."""
        text = message.get('text', '')
        channel_name = message.get('channel_name', '')
        views = message.get('views', 0)
        
        # Twitter character limit considerations
        max_length = 280
        available_length = max_length - 20  # Reserve space for channel info
        
        # Create tweet text
        tweet_text = text
        if len(tweet_text) > available_length:
            tweet_text = tweet_text[:available_length-3] + "..."
        
        tweet_text += f"\n📱 {channel_name}"
        
        return {
            'tweet': tweet_text,
            'thread_starter': f"📱 {channel_name}: {text[:100]}...",
            'poll_question': f"What's your take on this from {channel_name}?"
        }
    
    def _format_for_instagram(self, message: Dict[str, Any], base_content: Dict[str, Any]) -> Dict[str, str]:
        """Format content for Instagram."""
        text = message.get('text', '')
        channel_name = message.get('channel_name', '')
        hashtags = message.get('hashtags', [])
        
        hashtag_text = '\n'.join(hashtags)
        
        return {
            'caption': f"📱 {channel_name}\n\n{text}\n\n{hashtag_text}",
            'story_text': f"📱 {channel_name}: {text[:100]}...",
            'carousel_title': f"📱 {channel_name}: {text[:50]}..."
        }
    
    def _format_for_tiktok(self, message: Dict[str, Any], base_content: Dict[str, Any]) -> Dict[str, str]:
        """Format content for TikTok."""
        text = message.get('text', '')
        channel_name = message.get('channel_name', '')
        hashtags = message.get('hashtags', [])
        
        hashtag_text = ' '.join(hashtags[:5])  # Limit hashtags for TikTok
        
        return {
            'script': f"📱 {channel_name} shared: {text}",
            'hook': f"📱 {channel_name} dropped this: {text[:60]}...",
            'hashtags': hashtag_text,
            'question': f"What do you think about this from {channel_name}?"
        }
