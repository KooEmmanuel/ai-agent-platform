import asyncio
import os
import sys
from sqlalchemy import select, update

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db, Tool

async def update_google_suite_tool():
    """Update existing Google Suite Tool with new authentication functionality"""
    
    async for session in get_db():
        try:
            # Find the existing Google Suite tool
            result = await session.execute(
                select(Tool).where(Tool.name == 'google_suite_tool')
            )
            existing_tool = result.scalar_one_or_none()

            if existing_tool:
                # Update the tool with new parameters
                updated_config = {
                    'client_id': '${GOOGLE_CLIENT_ID}',
                    'client_secret': '${GOOGLE_CLIENT_SECRET}',
                    'redirect_uri': 'http://localhost:3000/auth/google/callback',
                    'scopes': [
                        'https://www.googleapis.com/auth/calendar',
                        'https://www.googleapis.com/auth/drive',
                        'https://www.googleapis.com/auth/gmail.send',
                        'https://www.googleapis.com/auth/gmail.readonly'
                    ],
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
                                'items': {
                                    'type': 'string'
                                }
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
                                'description': 'Search query for Gmail'
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
            
                # Update the tool
                await session.execute(
                    update(Tool)
                    .where(Tool.id == existing_tool.id)
                    .values(config=updated_config)
                )
                
                await session.commit()
                print("✅ Google Suite Tool updated with authentication functionality!")
                print(f"   Tool ID: {existing_tool.id}")
                print(f"   Added operations: get_auth_status, get_auth_url")
                print(f"   Added auth parameters: auth_status, auth_url, access_token, refresh_token")
            else:
                print("❌ Google Suite Tool not found in marketplace")
                
        except Exception as e:
            print(f"❌ Error updating Google Suite Tool: {e}")
            await session.rollback()
        finally:
            await session.close()

if __name__ == "__main__":
    asyncio.run(update_google_suite_tool())