"""
Slack Integration Tool

This tool provides functionality to interact with Slack workspaces.
It supports sending messages, managing channels, and retrieving information.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus

from .base import BaseTool

logger = logging.getLogger(__name__)

class SlackIntegrationTool(BaseTool):
    """
    Tool for integrating with Slack workspaces.
    
    Features:
    - Send messages to channels, users, or threads
    - Create and manage channels
    - Retrieve workspace information
    - Upload files
    - Manage reactions and pins
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = "Slack Integration"
        self.description = "Send messages to Slack channels"
        self.category = "Communication"
        self.tool_type = "Webhook"
        
        # Slack configuration
        self.bot_token = config.get('bot_token', '')
        self.user_token = config.get('user_token', '')
        self.webhook_url = config.get('webhook_url', '')
        self.default_channel = config.get('default_channel', 'general')
        
        # API base URL
        self.api_base = "https://slack.com/api"
        
        # Headers for API requests
        self.headers = {
            'Authorization': f'Bearer {self.bot_token}',
            'Content-Type': 'application/json'
        }
    
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute Slack operation with given parameters.
        
        Args:
            action: Operation to perform (send_message, create_channel, list_channels, etc.)
            channel: Channel name or ID
            message: Message text to send
            thread_ts: Thread timestamp for replies
            blocks: Slack blocks for rich formatting
            attachments: Message attachments
            username: Custom username for the message
            icon_emoji: Custom emoji icon
            icon_url: Custom icon URL
            
        Returns:
            Dictionary containing operation result
        """
        action = kwargs.get('action', 'send_message')
        
        try:
            if action == 'send_message':
                return await self._send_message(kwargs)
            elif action == 'create_channel':
                return await self._create_channel(kwargs)
            elif action == 'list_channels':
                return await self._list_channels(kwargs)
            elif action == 'get_channel_info':
                return await self._get_channel_info(kwargs)
            elif action == 'invite_users':
                return await self._invite_users(kwargs)
            elif action == 'upload_file':
                return await self._upload_file(kwargs)
            elif action == 'add_reaction':
                return await self._add_reaction(kwargs)
            elif action == 'pin_message':
                return await self._pin_message(kwargs)
            elif action == 'get_user_info':
                return await self._get_user_info(kwargs)
            elif action == 'list_users':
                return await self._list_users(kwargs)
            else:
                return self._format_error(f"Unknown action: {action}")
                
        except Exception as e:
            logger.error(f"Error in Slack operation: {str(e)}")
            return self._format_error(f"Slack operation failed: {str(e)}")
    
    async def _send_message(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Send a message to a Slack channel."""
        channel = params.get('channel', self.default_channel)
        message = params.get('message', '')
        thread_ts = params.get('thread_ts', '')
        blocks = params.get('blocks', [])
        attachments = params.get('attachments', [])
        username = params.get('username', '')
        icon_emoji = params.get('icon_emoji', '')
        icon_url = params.get('icon_url', '')
        
        if not message and not blocks:
            return self._format_error("Message text or blocks are required")
        
        # Use webhook if available, otherwise use API
        if self.webhook_url:
            return await self._send_via_webhook(params)
        else:
            return await self._send_via_api(params)
    
    async def _send_via_webhook(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Send message via Slack webhook."""
        payload = {
            'channel': params.get('channel', self.default_channel),
            'text': params.get('message', ''),
            'thread_ts': params.get('thread_ts', ''),
            'blocks': params.get('blocks', []),
            'attachments': params.get('attachments', [])
        }
        
        # Add optional fields
        if params.get('username'):
            payload['username'] = params['username']
        if params.get('icon_emoji'):
            payload['icon_emoji'] = params['icon_emoji']
        if params.get('icon_url'):
            payload['icon_url'] = params['icon_url']
        
        # Remove empty fields
        payload = {k: v for k, v in payload.items() if v}
        
        result = await self._make_request('POST', self.webhook_url, json=payload)
        
        if result.get('success'):
            return self._format_success({
                'message': 'Message sent successfully via webhook',
                'channel': params.get('channel', self.default_channel),
                'method': 'webhook'
            })
        else:
            return result
    
    async def _send_via_api(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Send message via Slack API."""
        if not self.bot_token:
            return self._format_error("Bot token is required for API operations")
        
        url = f"{self.api_base}/chat.postMessage"
        
        payload = {
            'channel': params.get('channel', self.default_channel),
            'text': params.get('message', ''),
            'thread_ts': params.get('thread_ts', ''),
            'blocks': params.get('blocks', []),
            'attachments': params.get('attachments', [])
        }
        
        # Add optional fields
        if params.get('username'):
            payload['username'] = params['username']
        if params.get('icon_emoji'):
            payload['icon_emoji'] = params['icon_emoji']
        if params.get('icon_url'):
            payload['icon_url'] = params['icon_url']
        
        # Remove empty fields
        payload = {k: v for k, v in payload.items() if v}
        
        result = await self._make_request('POST', url, headers=self.headers, json=payload)
        
        if result.get('success'):
            response_data = result['result']
            if response_data.get('ok'):
                return self._format_success({
                    'message': 'Message sent successfully',
                    'channel': params.get('channel', self.default_channel),
                    'ts': response_data.get('ts'),
                    'method': 'api'
                })
            else:
                return self._format_error(f"Slack API error: {response_data.get('error', 'Unknown error')}")
        else:
            return result
    
    async def _create_channel(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new Slack channel."""
        if not self.bot_token:
            return self._format_error("Bot token is required for API operations")
        
        name = params.get('name', '')
        is_private = params.get('is_private', False)
        
        if not name:
            return self._format_error("Channel name is required")
        
        url = f"{self.api_base}/conversations.create"
        payload = {
            'name': name,
            'is_private': is_private
        }
        
        result = await self._make_request('POST', url, headers=self.headers, json=payload)
        
        if result.get('success'):
            response_data = result['result']
            if response_data.get('ok'):
                channel = response_data.get('channel', {})
                return self._format_success({
                    'channel': {
                        'id': channel.get('id'),
                        'name': channel.get('name'),
                        'is_private': channel.get('is_private', False),
                        'created': channel.get('created')
                    },
                    'message': f"Channel '{name}' created successfully"
                })
            else:
                return self._format_error(f"Slack API error: {response_data.get('error', 'Unknown error')}")
        else:
            return result
    
    async def _list_channels(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """List all channels in the workspace."""
        if not self.bot_token:
            return self._format_error("Bot token is required for API operations")
        
        exclude_archived = params.get('exclude_archived', True)
        types = params.get('types', 'public_channel,private_channel')
        limit = min(params.get('limit', 1000), 1000)
        
        url = f"{self.api_base}/conversations.list"
        payload = {
            'exclude_archived': exclude_archived,
            'types': types,
            'limit': limit
        }
        
        result = await self._make_request('GET', url, headers=self.headers, params=payload)
        
        if result.get('success'):
            response_data = result['result']
            if response_data.get('ok'):
                channels = response_data.get('channels', [])
                return self._format_success({
                    'channels': [{
                        'id': channel.get('id'),
                        'name': channel.get('name'),
                        'is_private': channel.get('is_private', False),
                        'is_archived': channel.get('is_archived', False),
                        'member_count': channel.get('num_members', 0),
                        'topic': channel.get('topic', {}).get('value', ''),
                        'purpose': channel.get('purpose', {}).get('value', '')
                    } for channel in channels],
                    'total_count': len(channels)
                })
            else:
                return self._format_error(f"Slack API error: {response_data.get('error', 'Unknown error')}")
        else:
            return result
    
    async def _get_channel_info(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get information about a specific channel."""
        if not self.bot_token:
            return self._format_error("Bot token is required for API operations")
        
        channel = params.get('channel', '')
        
        if not channel:
            return self._format_error("Channel ID or name is required")
        
        url = f"{self.api_base}/conversations.info"
        payload = {'channel': channel}
        
        result = await self._make_request('GET', url, headers=self.headers, params=payload)
        
        if result.get('success'):
            response_data = result['result']
            if response_data.get('ok'):
                channel_info = response_data.get('channel', {})
                return self._format_success({
                    'channel': {
                        'id': channel_info.get('id'),
                        'name': channel_info.get('name'),
                        'is_private': channel_info.get('is_private', False),
                        'is_archived': channel_info.get('is_archived', False),
                        'member_count': channel_info.get('num_members', 0),
                        'topic': channel_info.get('topic', {}).get('value', ''),
                        'purpose': channel_info.get('purpose', {}).get('value', ''),
                        'created': channel_info.get('created'),
                        'creator': channel_info.get('creator')
                    }
                })
            else:
                return self._format_error(f"Slack API error: {response_data.get('error', 'Unknown error')}")
        else:
            return result
    
    async def _invite_users(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Invite users to a channel."""
        if not self.bot_token:
            return self._format_error("Bot token is required for API operations")
        
        channel = params.get('channel', '')
        users = params.get('users', [])
        
        if not channel:
            return self._format_error("Channel ID is required")
        
        if not users:
            return self._format_error("At least one user ID is required")
        
        url = f"{self.api_base}/conversations.invite"
        payload = {
            'channel': channel,
            'users': ','.join(users) if isinstance(users, list) else users
        }
        
        result = await self._make_request('POST', url, headers=self.headers, json=payload)
        
        if result.get('success'):
            response_data = result['result']
            if response_data.get('ok'):
                return self._format_success({
                    'message': f"Users invited to channel successfully",
                    'channel': channel,
                    'users': users
                })
            else:
                return self._format_error(f"Slack API error: {response_data.get('error', 'Unknown error')}")
        else:
            return result
    
    async def _upload_file(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Upload a file to a Slack channel."""
        if not self.bot_token:
            return self._format_error("Bot token is required for API operations")
        
        channel = params.get('channel', self.default_channel)
        file_path = params.get('file_path', '')
        file_content = params.get('file_content', '')
        file_name = params.get('file_name', '')
        title = params.get('title', '')
        initial_comment = params.get('initial_comment', '')
        
        if not file_path and not file_content:
            return self._format_error("Either file_path or file_content is required")
        
        url = f"{self.api_base}/files.upload"
        
        # Prepare form data
        form_data = {
            'channels': channel,
            'title': title,
            'initial_comment': initial_comment
        }
        
        files = {}
        if file_path:
            # Upload from file path
            try:
                with open(file_path, 'rb') as f:
                    files['file'] = (file_name or file_path.split('/')[-1], f, 'application/octet-stream')
            except Exception as e:
                return self._format_error(f"Error reading file: {str(e)}")
        else:
            # Upload from content
            files['file'] = (file_name or 'file.txt', file_content, 'text/plain')
        
        # Note: This is a simplified implementation
        # In a real implementation, you would need to handle multipart form data properly
        return self._format_error("File upload via API requires proper multipart form handling")
    
    async def _add_reaction(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Add a reaction to a message."""
        if not self.bot_token:
            return self._format_error("Bot token is required for API operations")
        
        channel = params.get('channel', '')
        timestamp = params.get('timestamp', '')
        name = params.get('name', '')
        
        if not channel or not timestamp or not name:
            return self._format_error("Channel, timestamp, and reaction name are required")
        
        url = f"{self.api_base}/reactions.add"
        payload = {
            'channel': channel,
            'timestamp': timestamp,
            'name': name
        }
        
        result = await self._make_request('POST', url, headers=self.headers, json=payload)
        
        if result.get('success'):
            response_data = result['result']
            if response_data.get('ok'):
                return self._format_success({
                    'message': f"Reaction '{name}' added successfully",
                    'channel': channel,
                    'timestamp': timestamp
                })
            else:
                return self._format_error(f"Slack API error: {response_data.get('error', 'Unknown error')}")
        else:
            return result
    
    async def _pin_message(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Pin a message to a channel."""
        if not self.bot_token:
            return self._format_error("Bot token is required for API operations")
        
        channel = params.get('channel', '')
        timestamp = params.get('timestamp', '')
        
        if not channel or not timestamp:
            return self._format_error("Channel and timestamp are required")
        
        url = f"{self.api_base}/pins.add"
        payload = {
            'channel': channel,
            'timestamp': timestamp
        }
        
        result = await self._make_request('POST', url, headers=self.headers, json=payload)
        
        if result.get('success'):
            response_data = result['result']
            if response_data.get('ok'):
                return self._format_success({
                    'message': "Message pinned successfully",
                    'channel': channel,
                    'timestamp': timestamp
                })
            else:
                return self._format_error(f"Slack API error: {response_data.get('error', 'Unknown error')}")
        else:
            return result
    
    async def _get_user_info(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get information about a specific user."""
        if not self.bot_token:
            return self._format_error("Bot token is required for API operations")
        
        user = params.get('user', '')
        
        if not user:
            return self._format_error("User ID is required")
        
        url = f"{self.api_base}/users.info"
        payload = {'user': user}
        
        result = await self._make_request('GET', url, headers=self.headers, params=payload)
        
        if result.get('success'):
            response_data = result['result']
            if response_data.get('ok'):
                user_info = response_data.get('user', {})
                return self._format_success({
                    'user': {
                        'id': user_info.get('id'),
                        'name': user_info.get('name'),
                        'real_name': user_info.get('real_name', ''),
                        'display_name': user_info.get('profile', {}).get('display_name', ''),
                        'email': user_info.get('profile', {}).get('email', ''),
                        'status': user_info.get('profile', {}).get('status_text', ''),
                        'is_bot': user_info.get('is_bot', False),
                        'is_admin': user_info.get('is_admin', False),
                        'timezone': user_info.get('tz', ''),
                        'created': user_info.get('created')
                    }
                })
            else:
                return self._format_error(f"Slack API error: {response_data.get('error', 'Unknown error')}")
        else:
            return result
    
    async def _list_users(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """List all users in the workspace."""
        if not self.bot_token:
            return self._format_error("Bot token is required for API operations")
        
        include_locale = params.get('include_locale', False)
        limit = min(params.get('limit', 1000), 1000)
        
        url = f"{self.api_base}/users.list"
        payload = {
            'include_locale': include_locale,
            'limit': limit
        }
        
        result = await self._make_request('GET', url, headers=self.headers, params=payload)
        
        if result.get('success'):
            response_data = result['result']
            if response_data.get('ok'):
                users = response_data.get('members', [])
                return self._format_success({
                    'users': [{
                        'id': user.get('id'),
                        'name': user.get('name'),
                        'real_name': user.get('real_name', ''),
                        'display_name': user.get('profile', {}).get('display_name', ''),
                        'email': user.get('profile', {}).get('email', ''),
                        'is_bot': user.get('is_bot', False),
                        'is_admin': user.get('is_admin', False),
                        'status': user.get('profile', {}).get('status_text', '')
                    } for user in users if not user.get('deleted', False)],
                    'total_count': len(users)
                })
            else:
                return self._format_error(f"Slack API error: {response_data.get('error', 'Unknown error')}")
        else:
            return result
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test the Slack connection and authentication."""
        if not self.bot_token:
            return self._format_error("Bot token is required")
        
        url = f"{self.api_base}/auth.test"
        
        result = await self._make_request('GET', url, headers=self.headers)
        
        if result.get('success'):
            response_data = result['result']
            if response_data.get('ok'):
                return self._format_success({
                    'workspace': response_data.get('team', ''),
                    'user': response_data.get('user', ''),
                    'user_id': response_data.get('user_id', ''),
                    'team_id': response_data.get('team_id', ''),
                    'url': response_data.get('url', ''),
                    'message': 'Slack connection successful'
                })
            else:
                return self._format_error(f"Authentication failed: {response_data.get('error', 'Unknown error')}")
        else:
            return result 