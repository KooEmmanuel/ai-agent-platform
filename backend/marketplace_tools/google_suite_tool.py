"""
Google Suite Integration Tool
Provides authentication and access to Google Calendar, Google Drive, and Gmail
"""

import os
import json
import asyncio
import aiohttp
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from app.core.config import settings
from email import encoders

class GoogleSuiteTool:
    """
    Google Suite Integration Tool for Calendar, Drive, and Gmail
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        # Get credentials from settings (which loads from .env) or config
        self.client_id = settings.GOOGLE_CLIENT_ID or config.get('client_id', '')
        self.client_secret = settings.GOOGLE_CLIENT_SECRET or config.get('client_secret', '')
        self.redirect_uri = settings.GOOGLE_CALLBACK_URL or config.get('redirect_uri', 'http://localhost:3000/auth/google/callback')
        
        # Only validate credentials if we have meaningful config data
        # (empty config usually means schema request)
        has_config_data = any(key in config for key in ['client_id', 'client_secret', 'redirect_uri', 'scopes'])
        if has_config_data and (self.client_id or self.client_secret):
            if not self.client_id or not self.client_secret:
                raise ValueError("Google OAuth credentials not found. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.")
        self.scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/youtube.readonly'
        ]
        self.base_url = 'https://www.googleapis.com'
        
    def get_tool_info(self) -> Dict[str, Any]:
        """Get tool information"""
        return {
            'name': 'Google Suite Tool',
            'description': 'Access Google Calendar, Drive, Gmail, and YouTube with OAuth2 authentication. Search YouTube videos, manage events, files, and emails seamlessly.',
            'version': '1.0.0',
            'author': 'KooAgent',
            'category': 'Productivity',
            'parameters': {
                'type': 'object',
                'properties': {
                    'operation': {
                        'type': 'string',
                        'description': 'Operation to perform',
                        'enum': [
                            'authenticate',
                            'get_auth_status',
                            'get_auth_url',
                            'calendar_events',
                            'calendar_create_event',
                            'calendar_update_event',
                            'calendar_delete_event',
                            'drive_list_files',
                            'drive_upload_file',
                            'drive_download_file',
                            'drive_share_file',
                            'gmail_send',
                            'gmail_read',
                            'gmail_search',
                            'youtube_search',
                            'youtube_video_details',
                            'youtube_channel_info',
                            'refresh_token'
                        ],
                        'default': 'authenticate'
                    },
                    'auth_code': {
                        'type': 'string',
                        'description': 'OAuth2 authorization code (for authentication)'
                    },
                    'calendar_id': {
                        'type': 'string',
                        'description': 'Google Calendar ID (default: primary)',
                        'default': 'primary'
                    },
                    'event_title': {
                        'type': 'string',
                        'description': 'Event title'
                    },
                    'event_start': {
                        'type': 'string',
                        'description': 'Event start time (ISO format)'
                    },
                    'event_end': {
                        'type': 'string',
                        'description': 'Event end time (ISO format)'
                    },
                    'event_description': {
                        'type': 'string',
                        'description': 'Event description'
                    },
                    'attendees': {
                        'type': 'array',
                        'description': 'Event attendees (email addresses)',
                        'items': {'type': 'string'}
                    },
                    'file_name': {
                        'type': 'string',
                        'description': 'File name for Drive operations'
                    },
                    'file_content': {
                        'type': 'string',
                        'description': 'File content (for upload)'
                    },
                    'file_id': {
                        'type': 'string',
                        'description': 'Google Drive file ID'
                    },
                    'folder_id': {
                        'type': 'string',
                        'description': 'Google Drive folder ID'
                    },
                    'to_email': {
                        'type': 'string',
                        'description': 'Recipient email address'
                    },
                    'subject': {
                        'type': 'string',
                        'description': 'Email subject'
                    },
                    'body': {
                        'type': 'string',
                        'description': 'Email body'
                    },
                    'query': {
                        'type': 'string',
                        'description': 'Search query for Gmail or YouTube'
                    },
                    'video_id': {
                        'type': 'string',
                        'description': 'YouTube video ID'
                    },
                    'channel_id': {
                        'type': 'string',
                        'description': 'YouTube channel ID'
                    },
                    'username': {
                        'type': 'string',
                        'description': 'YouTube channel username'
                    },
                    'order': {
                        'type': 'string',
                        'description': 'YouTube search order (relevance, date, rating, viewCount)',
                        'enum': ['relevance', 'date', 'rating', 'viewCount'],
                        'default': 'relevance'
                    },
                    'duration': {
                        'type': 'string',
                        'description': 'YouTube video duration filter',
                        'enum': ['any', 'short', 'medium', 'long'],
                        'default': 'any'
                    },
                    'max_results': {
                        'type': 'integer',
                        'description': 'Maximum number of results',
                        'default': 10
                    },
                    'auth_status': {
                        'type': 'string',
                        'description': 'Authentication status',
                        'enum': ['not_authenticated', 'authenticated', 'expired'],
                        'default': 'not_authenticated'
                    },
                    'auth_url': {
                        'type': 'string',
                        'description': 'Google OAuth2 authorization URL'
                    },
                    'access_token': {
                        'type': 'string',
                        'description': 'OAuth2 access token (stored securely)'
                    },
                    'refresh_token': {
                        'type': 'string',
                        'description': 'OAuth2 refresh token (stored securely)'
                    }
                },
                'required': ['operation']
            }
        }
    
    async def execute(self, operation: str, **kwargs) -> Dict[str, Any]:
        """Execute Google Suite operation"""
        try:
            # Handle authentication status check
            if operation == 'get_auth_status':
                return await self._get_auth_status()
            elif operation == 'get_auth_url':
                return await self._get_auth_url_response()
            
            # Check if we have credentials for operations that need them
            if operation != 'authenticate' and (not self.client_id or not self.client_secret):
                return {
                    'error': 'Google OAuth credentials not configured',
                    'message': 'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables',
                    'auth_url': self._get_auth_url() if self.client_id else None
                }
            
            if operation == 'authenticate':
                return await self._authenticate(kwargs.get('auth_code'))
            elif operation == 'refresh_token':
                return await self._refresh_token()
            elif operation.startswith('calendar_'):
                return await self._handle_calendar_operation(operation, **kwargs)
            elif operation.startswith('drive_'):
                return await self._handle_drive_operation(operation, **kwargs)
            elif operation.startswith('gmail_'):
                return await self._handle_gmail_operation(operation, **kwargs)
            elif operation.startswith('youtube_'):
                return await self._handle_youtube_operation(operation, **kwargs)
            elif operation == 'help':
                return await self._get_help()
            else:
                return {'error': f'Unknown operation: {operation}. Use "help" operation to see available operations.'}
        except Exception as e:
            return {'error': f'Google Suite operation failed: {str(e)}'}
    
    async def _authenticate(self, auth_code: str) -> Dict[str, Any]:
        """Authenticate with Google OAuth2"""
        if not auth_code:
            return {
                'auth_url': self._get_auth_url(),
                'message': 'Please visit the auth_url to get authorization code'
            }
        
        # Exchange authorization code for tokens
        token_data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'code': auth_code,
            'grant_type': 'authorization_code',
            'redirect_uri': self.redirect_uri
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post('https://oauth2.googleapis.com/token', data=token_data) as response:
                if response.status == 200:
                    tokens = await response.json()
                    
                    # Store tokens in config for persistence
                    self.config['access_token'] = tokens.get('access_token')
                    self.config['refresh_token'] = tokens.get('refresh_token')
                    self.config['token_expires_at'] = datetime.utcnow() + timedelta(seconds=tokens.get('expires_in', 3600))
                    self.config['auth_status'] = 'authenticated'
                    
                    print(f"🔍 Authentication Debug - Stored access_token: {bool(tokens.get('access_token'))}")
                    print(f"🔍 Authentication Debug - Stored refresh_token: {bool(tokens.get('refresh_token'))}")
                    print(f"🔍 Authentication Debug - Set auth_status: {self.config['auth_status']}")
                    
                    return {
                        'success': True,
                        'message': 'Authentication successful',
                        'access_token': tokens.get('access_token'),
                        'refresh_token': tokens.get('refresh_token'),
                        'expires_in': tokens.get('expires_in')
                    }
                else:
                    error = await response.text()
                    return {'error': f'Authentication failed: {error}'}
    
    def _get_auth_url(self) -> str:
        """Generate Google OAuth2 authorization URL"""
        if not self.client_id:
            return None
            
        params = {
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'scope': ' '.join(self.scopes),
            'response_type': 'code',
            'access_type': 'offline',
            'prompt': 'consent'
        }
        
        query_string = '&'.join([f'{k}={v}' for k, v in params.items()])
        return f'https://accounts.google.com/o/oauth2/v2/auth?{query_string}'
    
    async def _get_auth_status(self) -> Dict[str, Any]:
        """Get authentication status"""
        print(f"🔍 Auth Status Debug - config keys: {list(self.config.keys())}")
        print(f"🔍 Auth Status Debug - access_token: {'***' if self.config.get('access_token') else 'None'}")
        print(f"🔍 Auth Status Debug - refresh_token: {'***' if self.config.get('refresh_token') else 'None'}")
        print(f"🔍 Auth Status Debug - auth_status: {self.config.get('auth_status', 'not_set')}")
        
        if not self.client_id or not self.client_secret:
            return {
                'status': 'not_configured',
                'message': 'Google OAuth credentials not configured',
                'auth_url': None
            }
        
        # Check if we have stored tokens
        access_token = self.config.get('access_token')
        refresh_token = self.config.get('refresh_token')
        auth_status = self.config.get('auth_status', 'not_authenticated')
        
        # If we have tokens, we're authenticated
        if access_token or refresh_token:
            return {
                'status': 'authenticated',
                'message': 'Successfully authenticated with Google',
                'auth_url': None,
                'has_access_token': bool(access_token),
                'has_refresh_token': bool(refresh_token)
            }
        
        # No tokens found, need to authenticate
        return {
            'status': 'not_authenticated',
            'message': 'Please authenticate with Google',
            'auth_url': self._get_auth_url()
        }
    
    async def _get_auth_url_response(self) -> Dict[str, Any]:
        """Get authentication URL for frontend"""
        print(f"🔍 Google Suite Debug - client_id: {self.client_id[:10] if self.client_id else 'None'}...")
        print(f"🔍 Google Suite Debug - client_secret: {'***' if self.client_secret else 'None'}")
        print(f"🔍 Google Suite Debug - redirect_uri: {self.redirect_uri}")
        print(f"🔍 Google Suite Debug - settings.GOOGLE_CLIENT_ID: {settings.GOOGLE_CLIENT_ID[:10] if settings.GOOGLE_CLIENT_ID else 'None'}...")
        print(f"🔍 Google Suite Debug - settings.GOOGLE_CLIENT_SECRET: {'***' if settings.GOOGLE_CLIENT_SECRET else 'None'}")
        
        if not self.client_id or not self.client_secret:
            return {
                'error': 'Google OAuth credentials not configured',
                'message': 'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables in your .env file and restart the backend server. See GOOGLE_SUITE_SETUP.md for detailed instructions.',
                'setup_required': True,
                'debug_info': {
                    'client_id_set': bool(self.client_id),
                    'client_secret_set': bool(self.client_secret),
                    'settings_client_id_set': bool(settings.GOOGLE_CLIENT_ID),
                    'settings_client_secret_set': bool(settings.GOOGLE_CLIENT_SECRET)
                }
            }
        
        auth_url = self._get_auth_url()
        if not auth_url:
            return {
                'error': 'Unable to generate authentication URL',
                'message': 'Missing required OAuth configuration'
            }
        
        return {
            'success': True,
            'auth_url': auth_url,
            'message': 'Click the link to authenticate with Google'
        }
    
    async def _refresh_token(self) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        refresh_token = self.config.get('refresh_token')
        if not refresh_token:
            return {'error': 'No refresh token available'}
        
        token_data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'refresh_token': refresh_token,
            'grant_type': 'refresh_token'
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post('https://oauth2.googleapis.com/token', data=token_data) as response:
                if response.status == 200:
                    tokens = await response.json()
                    
                    # Update stored tokens
                    self.config['access_token'] = tokens.get('access_token')
                    if tokens.get('expires_in'):
                        self.config['token_expires_at'] = datetime.utcnow() + timedelta(seconds=tokens.get('expires_in'))
                    
                    return {
                        'success': True,
                        'access_token': tokens.get('access_token'),
                        'expires_in': tokens.get('expires_in')
                    }
                else:
                    error = await response.text()
                    return {'error': f'Token refresh failed: {error}'}
    
    async def _get_access_token(self) -> str:
        """Get valid access token (refresh if needed)"""
        access_token = self.config.get('access_token')
        token_expires_at = self.config.get('token_expires_at')
        
        # Check if token is expired or missing
        if not access_token:
            # Try to refresh token
            refresh_result = await self._refresh_token()
            if refresh_result.get('success'):
                return refresh_result.get('access_token')
            else:
                raise Exception('No valid access token available')
        
        # Check if token is expired (handle both datetime and string formats)
        if token_expires_at:
            try:
                # If it's a string, parse it as datetime
                if isinstance(token_expires_at, str):
                    expires_at = datetime.fromisoformat(token_expires_at.replace('Z', '+00:00'))
                else:
                    expires_at = token_expires_at
                
                if datetime.utcnow() >= expires_at:
                    # Token is expired, try to refresh
                    refresh_result = await self._refresh_token()
                    if refresh_result.get('success'):
                        return refresh_result.get('access_token')
                    else:
                        raise Exception('No valid access token available')
            except Exception as e:
                print(f"⚠️ Error checking token expiration: {e}")
                # If we can't parse the expiration, assume it's valid and continue
        
        return access_token
    
    async def _handle_calendar_operation(self, operation: str, **kwargs) -> Dict[str, Any]:
        """Handle Google Calendar operations"""
        access_token = await self._get_access_token()
        headers = {'Authorization': f'Bearer {access_token}'}
        
        if operation == 'calendar_events':
            return await self._get_calendar_events(headers, **kwargs)
        elif operation == 'calendar_create_event':
            return await self._create_calendar_event(headers, **kwargs)
        elif operation == 'calendar_update_event':
            return await self._update_calendar_event(headers, **kwargs)
        elif operation == 'calendar_delete_event':
            return await self._delete_calendar_event(headers, **kwargs)
    
    async def _get_calendar_events(self, headers: Dict[str, str], **kwargs) -> Dict[str, Any]:
        """Get calendar events"""
        calendar_id = kwargs.get('calendar_id', 'primary')
        max_results = kwargs.get('max_results', 10)
        
        url = f'{self.base_url}/calendar/v3/calendars/{calendar_id}/events'
        params = {
            'maxResults': max_results,
            'singleEvents': True,
            'orderBy': 'startTime'
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    events = []
                    for event in data.get('items', []):
                        events.append({
                            'id': event.get('id'),
                            'title': event.get('summary'),
                            'start': event.get('start', {}).get('dateTime'),
                            'end': event.get('end', {}).get('dateTime'),
                            'description': event.get('description'),
                            'attendees': [a.get('email') for a in event.get('attendees', [])]
                        })
                    return {'success': True, 'events': events}
                else:
                    error = await response.text()
                    return {'error': f'Failed to get events: {error}'}
    
    async def _create_calendar_event(self, headers: Dict[str, str], **kwargs) -> Dict[str, Any]:
        """Create calendar event"""
        calendar_id = kwargs.get('calendar_id', 'primary')
        
        event_data = {
            'summary': kwargs.get('event_title'),
            'description': kwargs.get('event_description', ''),
            'start': {
                'dateTime': kwargs.get('event_start'),
                'timeZone': 'UTC'
            },
            'end': {
                'dateTime': kwargs.get('event_end'),
                'timeZone': 'UTC'
            }
        }
        
        if kwargs.get('attendees'):
            event_data['attendees'] = [{'email': email} for email in kwargs.get('attendees', [])]
        
        url = f'{self.base_url}/calendar/v3/calendars/{calendar_id}/events'
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=event_data) as response:
                if response.status == 200:
                    event = await response.json()
                    return {
                        'success': True,
                        'event_id': event.get('id'),
                        'event_url': event.get('htmlLink'),
                        'message': 'Event created successfully'
                    }
                else:
                    error = await response.text()
                    return {'error': f'Failed to create event: {error}'}
    
    async def _handle_drive_operation(self, operation: str, **kwargs) -> Dict[str, Any]:
        """Handle Google Drive operations"""
        access_token = await self._get_access_token()
        headers = {'Authorization': f'Bearer {access_token}'}
        
        if operation == 'drive_list_files':
            return await self._list_drive_files(headers, **kwargs)
        elif operation == 'drive_upload_file':
            return await self._upload_drive_file(headers, **kwargs)
        elif operation == 'drive_download_file':
            return await self._download_drive_file(headers, **kwargs)
        elif operation == 'drive_share_file':
            return await self._share_drive_file(headers, **kwargs)
    
    async def _list_drive_files(self, headers: Dict[str, str], **kwargs) -> Dict[str, Any]:
        """List Google Drive files"""
        folder_id = kwargs.get('folder_id', 'root')
        max_results = kwargs.get('max_results', 10)
        
        url = f'{self.base_url}/drive/v3/files'
        params = {
            'q': f"'{folder_id}' in parents",
            'pageSize': max_results,
            'fields': 'files(id,name,mimeType,size,createdTime,modifiedTime)'
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    files = []
                    for file in data.get('files', []):
                        files.append({
                            'id': file.get('id'),
                            'name': file.get('name'),
                            'mime_type': file.get('mimeType'),
                            'size': file.get('size'),
                            'created_time': file.get('createdTime'),
                            'modified_time': file.get('modifiedTime')
                        })
                    return {'success': True, 'files': files}
                else:
                    error = await response.text()
                    return {'error': f'Failed to list files: {error}'}
    
    async def _upload_drive_file(self, headers: Dict[str, str], **kwargs) -> Dict[str, Any]:
        """Upload file to Google Drive"""
        file_name = kwargs.get('file_name')
        file_content = kwargs.get('file_content', '')
        folder_id = kwargs.get('folder_id', 'root')
        
        # Create file metadata
        metadata = {
            'name': file_name,
            'parents': [folder_id]
        }
        
        # Create multipart upload
        boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
        body = f'--{boundary}\r\n'
        body += 'Content-Type: application/json\r\n\r\n'
        body += json.dumps(metadata) + '\r\n'
        body += f'--{boundary}\r\n'
        body += 'Content-Type: text/plain\r\n\r\n'
        body += file_content + '\r\n'
        body += f'--{boundary}--\r\n'
        
        headers['Content-Type'] = f'multipart/related; boundary={boundary}'
        
        url = f'{self.base_url}/upload/drive/v3/files?uploadType=multipart'
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, data=body) as response:
                if response.status == 200:
                    file_data = await response.json()
                    return {
                        'success': True,
                        'file_id': file_data.get('id'),
                        'file_name': file_data.get('name'),
                        'message': 'File uploaded successfully'
                    }
                else:
                    error = await response.text()
                    return {'error': f'Failed to upload file: {error}'}
    
    async def _download_drive_file(self, headers: Dict[str, str], **kwargs) -> Dict[str, Any]:
        """Download file from Google Drive"""
        file_id = kwargs.get('file_id')
        
        if not file_id:
            # First try to list files to help the user find a file ID
            list_result = await self._list_drive_files(headers, **kwargs)
            if list_result.get('success') and list_result.get('files'):
                files = list_result['files']
                file_list = []
                for file in files[:5]:  # Show first 5 files
                    file_list.append(f"- {file.get('name')} (ID: {file.get('id')})")
                
                return {
                    'error': 'File ID is required for download. Available files:\n' + '\n'.join(file_list) + '\n\nPlease specify a file_id parameter.',
                    'available_files': files[:5]
                }
            else:
                return {'error': 'File ID is required for download. Use drive_list_files first to see available files.'}
        
        # First get file metadata
        url = f'{self.base_url}/drive/v3/files/{file_id}'
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    file_metadata = await response.json()
                    file_name = file_metadata.get('name', 'download')
                    
                    # Download file content
                    download_url = f'{self.base_url}/drive/v3/files/{file_id}?alt=media'
                    async with session.get(download_url, headers=headers) as download_response:
                        if download_response.status == 200:
                            content = await download_response.read()
                            return {
                                'success': True,
                                'file_name': file_name,
                                'content': base64.b64encode(content).decode(),
                                'size': len(content),
                                'message': 'File downloaded successfully'
                            }
                        else:
                            error = await download_response.text()
                            return {'error': f'Failed to download file content: {error}'}
                else:
                    error = await response.text()
                    return {'error': f'Failed to get file metadata: {error}'}
    
    async def _share_drive_file(self, headers: Dict[str, str], **kwargs) -> Dict[str, Any]:
        """Share Google Drive file"""
        file_id = kwargs.get('file_id')
        role = kwargs.get('role', 'reader')  # reader, writer, owner
        email = kwargs.get('email')
        
        if not file_id:
            # First try to list files to help the user find a file ID
            list_result = await self._list_drive_files(headers, **kwargs)
            if list_result.get('success') and list_result.get('files'):
                files = list_result['files']
                file_list = []
                for file in files[:5]:  # Show first 5 files
                    file_list.append(f"- {file.get('name')} (ID: {file.get('id')})")
                
                return {
                    'error': 'File ID is required for sharing. Available files:\n' + '\n'.join(file_list) + '\n\nPlease specify file_id and email parameters.',
                    'available_files': files[:5]
                }
            else:
                return {'error': 'File ID is required for sharing. Use drive_list_files first to see available files.'}
        
        if not email:
            return {'error': 'Email is required for sharing. Please specify the email parameter with the recipient\'s email address.'}
        
        permission_data = {
            'role': role,
            'type': 'user',
            'emailAddress': email
        }
        
        url = f'{self.base_url}/drive/v3/files/{file_id}/permissions'
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=permission_data) as response:
                if response.status == 200:
                    result = await response.json()
                    return {
                        'success': True,
                        'permission_id': result.get('id'),
                        'message': f'File shared with {email} as {role}'
                    }
                else:
                    error = await response.text()
                    return {'error': f'Failed to share file: {error}'}
    
    async def _handle_gmail_operation(self, operation: str, **kwargs) -> Dict[str, Any]:
        """Handle Gmail operations"""
        access_token = await self._get_access_token()
        headers = {'Authorization': f'Bearer {access_token}'}
        
        if operation == 'gmail_send':
            return await self._send_gmail(headers, **kwargs)
        elif operation == 'gmail_read':
            return await self._read_gmail(headers, **kwargs)
        elif operation == 'gmail_search':
            return await self._search_gmail(headers, **kwargs)
    
    async def _send_gmail(self, headers: Dict[str, str], **kwargs) -> Dict[str, Any]:
        """Send email via Gmail"""
        to_email = kwargs.get('to_email')
        subject = kwargs.get('subject')
        body = kwargs.get('body')
        
        # Create email message
        message = MIMEText(body)
        message['to'] = to_email
        message['subject'] = subject
        
        # Encode message
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        email_data = {
            'raw': raw_message
        }
        
        url = f'{self.base_url}/gmail/v1/users/me/messages/send'
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=email_data) as response:
                if response.status == 200:
                    result = await response.json()
                    return {
                        'success': True,
                        'message_id': result.get('id'),
                        'message': 'Email sent successfully'
                    }
                else:
                    error = await response.text()
                    return {'error': f'Failed to send email: {error}'}
    
    async def _read_gmail(self, headers: Dict[str, str], **kwargs) -> Dict[str, Any]:
        """Read Gmail messages"""
        max_results = kwargs.get('max_results', 10)
        
        url = f'{self.base_url}/gmail/v1/users/me/messages'
        params = {'maxResults': max_results}
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    messages = []
                    for msg in data.get('messages', []):
                        # Get message details
                        msg_url = f'{self.base_url}/gmail/v1/users/me/messages/{msg["id"]}'
                        async with session.get(msg_url, headers=headers) as msg_response:
                            if msg_response.status == 200:
                                msg_data = await msg_response.json()
                                payload = msg_data.get('payload', {})
                                headers_list = payload.get('headers', [])
                                
                                # Extract headers
                                subject = next((h['value'] for h in headers_list if h['name'] == 'Subject'), '')
                                sender = next((h['value'] for h in headers_list if h['name'] == 'From'), '')
                                date = next((h['value'] for h in headers_list if h['name'] == 'Date'), '')
                                
                                messages.append({
                                    'id': msg['id'],
                                    'subject': subject,
                                    'sender': sender,
                                    'date': date
                                })
                    
                    return {'success': True, 'messages': messages}
                else:
                    error = await response.text()
                    return {'error': f'Failed to read emails: {error}'}
    
    async def _search_gmail(self, headers: Dict[str, str], **kwargs) -> Dict[str, Any]:
        """Search Gmail messages"""
        query = kwargs.get('query', '')
        max_results = kwargs.get('max_results', 10)
        
        url = f'{self.base_url}/gmail/v1/users/me/messages'
        params = {
            'q': query,
            'maxResults': max_results
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        'success': True,
                        'message_count': len(data.get('messages', [])),
                        'messages': data.get('messages', [])
                    }
                else:
                    error = await response.text()
                    return {'error': f'Failed to search emails: {error}'}
    
    async def _handle_youtube_operation(self, operation: str, **kwargs) -> Dict[str, Any]:
        """Handle YouTube operations"""
        access_token = await self._get_access_token()
        headers = {'Authorization': f'Bearer {access_token}'}
        
        if operation == 'youtube_search':
            return await self._search_youtube(headers, **kwargs)
        elif operation == 'youtube_video_details':
            return await self._get_youtube_video_details(headers, **kwargs)
        elif operation == 'youtube_channel_info':
            return await self._get_youtube_channel_info(headers, **kwargs)
        else:
            return {'error': f'Unknown YouTube operation: {operation}'}
    
    async def _search_youtube(self, headers: Dict[str, str], **kwargs) -> Dict[str, Any]:
        """Search YouTube videos"""
        query = kwargs.get('query')
        max_results = kwargs.get('max_results', 10)
        order = kwargs.get('order', 'relevance')  # relevance, date, rating, viewCount
        duration = kwargs.get('duration', 'any')  # any, short, medium, long
        
        if not query:
            return {'error': 'Search query is required. Please specify the query parameter.'}
        
        url = f'{self.base_url}/youtube/v3/search'
        params = {
            'part': 'snippet',
            'q': query,
            'maxResults': min(max_results, 50),  # YouTube API limit
            'order': order,
            'type': 'video'
        }
        
        # Add duration filter if specified
        if duration != 'any':
            if duration == 'short':
                params['videoDuration'] = 'short'  # < 4 minutes
            elif duration == 'medium':
                params['videoDuration'] = 'medium'  # 4-20 minutes
            elif duration == 'long':
                params['videoDuration'] = 'long'  # > 20 minutes
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    videos = []
                    for item in data.get('items', []):
                        video = {
                            'video_id': item['id']['videoId'],
                            'title': item['snippet']['title'],
                            'description': item['snippet']['description'],
                            'channel_title': item['snippet']['channelTitle'],
                            'published_at': item['snippet']['publishedAt'],
                            'thumbnail_url': item['snippet']['thumbnails'].get('high', {}).get('url'),
                            'url': f"https://www.youtube.com/watch?v={item['id']['videoId']}"
                        }
                        videos.append(video)
                    
                    return {
                        'success': True,
                        'query': query,
                        'total_results': len(videos),
                        'videos': videos
                    }
                else:
                    error = await response.text()
                    return {'error': f'YouTube search failed: {error}'}
    
    async def _get_youtube_video_details(self, headers: Dict[str, str], **kwargs) -> Dict[str, Any]:
        """Get detailed information about a YouTube video"""
        video_id = kwargs.get('video_id')
        
        if not video_id:
            return {'error': 'Video ID is required. Please specify the video_id parameter.'}
        
        url = f'{self.base_url}/youtube/v3/videos'
        params = {
            'part': 'snippet,statistics,contentDetails',
            'id': video_id
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get('items'):
                        item = data['items'][0]
                        video_details = {
                            'video_id': video_id,
                            'title': item['snippet']['title'],
                            'description': item['snippet']['description'],
                            'channel_title': item['snippet']['channelTitle'],
                            'published_at': item['snippet']['publishedAt'],
                            'duration': item['contentDetails']['duration'],
                            'view_count': item['statistics'].get('viewCount', '0'),
                            'like_count': item['statistics'].get('likeCount', '0'),
                            'comment_count': item['statistics'].get('commentCount', '0'),
                            'thumbnail_url': item['snippet']['thumbnails'].get('high', {}).get('url'),
                            'url': f"https://www.youtube.com/watch?v={video_id}"
                        }
                        return {
                            'success': True,
                            'video': video_details
                        }
                    else:
                        return {'error': 'Video not found'}
                else:
                    error = await response.text()
                    return {'error': f'Failed to get video details: {error}'}
    
    async def _get_youtube_channel_info(self, headers: Dict[str, str], **kwargs) -> Dict[str, Any]:
        """Get YouTube channel information"""
        channel_id = kwargs.get('channel_id')
        username = kwargs.get('username')
        
        if not channel_id and not username:
            return {'error': 'Channel ID or username is required. Please specify channel_id or username parameter.'}
        
        url = f'{self.base_url}/youtube/v3/channels'
        params = {
            'part': 'snippet,statistics,brandingSettings'
        }
        
        if channel_id:
            params['id'] = channel_id
        elif username:
            params['forUsername'] = username
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get('items'):
                        item = data['items'][0]
                        channel_info = {
                            'channel_id': item['id'],
                            'title': item['snippet']['title'],
                            'description': item['snippet']['description'],
                            'subscriber_count': item['statistics'].get('subscriberCount', '0'),
                            'video_count': item['statistics'].get('videoCount', '0'),
                            'view_count': item['statistics'].get('viewCount', '0'),
                            'country': item['snippet'].get('country'),
                            'thumbnail_url': item['snippet']['thumbnails'].get('high', {}).get('url'),
                            'url': f"https://www.youtube.com/channel/{item['id']}"
                        }
                        return {
                            'success': True,
                            'channel': channel_info
                        }
                    else:
                        return {'error': 'Channel not found'}
                else:
                    error = await response.text()
                    return {'error': f'Failed to get channel info: {error}'}
    
    async def _get_help(self) -> Dict[str, Any]:
        """Get help information about available operations"""
        return {
            'success': True,
            'message': 'Google Suite Tool Help',
            'operations': {
                'authentication': {
                    'get_auth_status': 'Check authentication status',
                    'get_auth_url': 'Get Google OAuth URL for authentication',
                    'authenticate': 'Authenticate with authorization code',
                    'refresh_token': 'Refresh expired access token'
                },
                'calendar': {
                    'calendar_events': 'List calendar events (optional: calendar_id, max_results)',
                    'calendar_create_event': 'Create calendar event (required: event_title, event_start, event_end)',
                    'calendar_update_event': 'Update calendar event (required: event_id)',
                    'calendar_delete_event': 'Delete calendar event (required: event_id)'
                },
                'drive': {
                    'drive_list_files': 'List Google Drive files (optional: folder_id, max_results)',
                    'drive_upload_file': 'Upload file to Drive (required: file_name, file_content)',
                    'drive_download_file': 'Download file from Drive (required: file_id)',
                    'drive_share_file': 'Share Drive file (required: file_id, email)'
                },
                'gmail': {
                    'gmail_send': 'Send email (required: to_email, subject, body)',
                    'gmail_read': 'Read recent emails (optional: max_results)',
                    'gmail_search': 'Search emails (required: query)'
                },
                'youtube': {
                    'youtube_search': 'Search YouTube videos (required: query, optional: max_results, order, duration)',
                    'youtube_video_details': 'Get video details (required: video_id)',
                    'youtube_channel_info': 'Get channel info (required: channel_id or username)'
                }
            },
            'usage_examples': [
                '1. First authenticate: authenticate with auth_code',
                '2. List files: drive_list_files',
                '3. Download file: drive_download_file with file_id from step 2',
                '4. Share file: drive_share_file with file_id and email',
                '5. Send email: gmail_send with to_email, subject, body',
                '6. Search YouTube: youtube_search with query',
                '7. Get video details: youtube_video_details with video_id',
                '8. Get channel info: youtube_channel_info with channel_id'
            ]
        }