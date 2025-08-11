"""
Calendar Manager Tool

A tool for managing calendar operations including creating events,
checking availability, and managing schedules using Google Calendar API.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
import aiohttp
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import pickle
import os

from .base import BaseTool

logger = logging.getLogger(__name__)

class CalendarManagerTool(BaseTool):
    """
    Calendar Manager Tool using Google Calendar API.
    
    Features:
    - Create, update, delete calendar events
    - Check calendar availability
    - List upcoming events
    - Manage multiple calendars
    - Event reminders and notifications
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        logger.info(f"📅 Initializing Calendar Manager Tool with config: {config}")
        
        self.credentials_path = config.get('credentials_path', '')
        self.calendar_id = config.get('calendar_id', 'primary')
        self.scopes = ['https://www.googleapis.com/auth/calendar']
        self.service = None
        
        logger.info(f"📅 Calendar Manager config - Credentials path: {self.credentials_path}")
        logger.info(f"📅 Calendar Manager config - Calendar ID: {self.calendar_id}")
        logger.info(f"📅 Calendar Manager config - Scopes: {self.scopes}")
        
        # Initialize Google Calendar service
        self._init_service()
    
    def _init_service(self):
        """Initialize Google Calendar service using service account credentials."""
        logger.info(f"🔧 Initializing Google Calendar service...")
        logger.info(f"🔧 Credentials path: {self.credentials_path}")
        
        try:
            if not self.credentials_path:
                logger.warning("⚠️ No credentials path provided for Google Calendar")
                logger.warning("⚠️ Calendar Manager will not be able to create events")
                return
            
            # Check if credentials file exists
            import os
            if not os.path.exists(self.credentials_path):
                logger.error(f"❌ Credentials file not found: {self.credentials_path}")
                logger.error(f"❌ Calendar Manager will not be able to create events")
                return
            
            logger.info(f"✅ Credentials file found: {self.credentials_path}")
            
            # Load service account credentials from JSON file
            from google.oauth2 import service_account
            
            logger.info(f"🔧 Loading service account credentials...")
            creds = service_account.Credentials.from_service_account_file(
                self.credentials_path, 
                scopes=self.scopes
            )
            logger.info(f"✅ Service account credentials loaded successfully")
            
            logger.info(f"🔧 Building Google Calendar service...")
            self.service = build('calendar', 'v3', credentials=creds)
            logger.info("✅ Google Calendar service initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Google Calendar service: {str(e)}")
            logger.error(f"❌ Calendar Manager will not be able to create events")
            self.service = None
    
    async def execute(self, operation: str, **kwargs) -> Dict[str, Any]:
        """
        Execute calendar operation.
        
        Args:
            operation: Type of operation (create_event, list_events, etc.)
            **kwargs: Operation-specific parameters
            
        Returns:
            Operation result
        """
        logger.info(f"📅 Calendar Manager execute called with operation: {operation}")
        logger.info(f"📅 Calendar Manager execute kwargs: {kwargs}")
        
        if not self.service:
            logger.error(f"❌ Google Calendar service not available - cannot execute {operation}")
            logger.error(f"❌ This means the Calendar Manager tool is not properly configured")
            return self._format_error("Google Calendar service not available")
        
        logger.info(f"✅ Google Calendar service is available, proceeding with operation: {operation}")
        
        try:
            if operation == "create_event":
                logger.info(f"📅 Creating calendar event with params: {kwargs}")
                return await self._create_event(**kwargs)
            elif operation == "list_events":
                logger.info(f"📅 Listing calendar events with params: {kwargs}")
                return await self._list_events(**kwargs)
            elif operation == "update_event":
                logger.info(f"📅 Updating calendar event with params: {kwargs}")
                return await self._update_event(**kwargs)
            elif operation == "delete_event":
                logger.info(f"📅 Deleting calendar event with params: {kwargs}")
                return await self._delete_event(**kwargs)
            elif operation == "check_availability":
                logger.info(f"📅 Checking calendar availability with params: {kwargs}")
                return await self._check_availability(**kwargs)
            elif operation == "get_calendars":
                logger.info(f"📅 Getting calendars with params: {kwargs}")
                return await self._get_calendars(**kwargs)
            else:
                logger.error(f"❌ Unsupported calendar operation: {operation}")
                return self._format_error(f"Unsupported operation: {operation}")
                
        except Exception as e:
            logger.error(f"❌ Calendar operation error: {str(e)}")
            logger.error(f"❌ Operation: {operation}, Params: {kwargs}")
            return self._format_error(f"Calendar operation failed: {str(e)}")
    
    async def _create_event(self, summary: str, start_time: str, end_time: str,
                           description: Optional[str] = None, location: Optional[str] = None,
                           attendees: Optional[List[str]] = None, reminders: Optional[Dict] = None) -> Dict[str, Any]:
        """Create a calendar event."""
        logger.info(f"📅 Creating calendar event...")
        logger.info(f"📅 Summary: {summary}")
        logger.info(f"📅 Start time: {start_time}")
        logger.info(f"📅 End time: {end_time}")
        logger.info(f"📅 Description: {description}")
        logger.info(f"📅 Location: {location}")
        logger.info(f"📅 Attendees: {attendees}")
        logger.info(f"📅 Calendar ID: {self.calendar_id}")
        
        # Fix invalid time formats (24:00:00 -> 00:00:00)
        if '24:00:00' in start_time:
            start_time = start_time.replace('24:00:00', '00:00:00')
            logger.info(f"🔧 Fixed start time: {start_time}")
        if '24:00:00' in end_time:
            end_time = end_time.replace('24:00:00', '00:00:00')
            logger.info(f"🔧 Fixed end time: {end_time}")
        
        # Additional time validation
        try:
            from datetime import datetime
            # Try to parse the times to ensure they're valid
            datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            logger.info(f"✅ Time formats are valid")
        except ValueError as e:
            logger.error(f"❌ Invalid time format: {str(e)}")
            raise Exception(f"Invalid time format: {str(e)}")
        
        try:
            event = {
                'summary': summary,
                'description': description,
                'location': location,
                'start': {
                    'dateTime': start_time,
                    'timeZone': 'UTC',
                },
                'end': {
                    'dateTime': end_time,
                    'timeZone': 'UTC',
                },
            }
            
            logger.info(f"📅 Event object created: {event}")
            
            if attendees:
                event['attendees'] = [{'email': email} for email in attendees]
                logger.info(f"📅 Added attendees: {event['attendees']}")
            
            if reminders:
                event['reminders'] = reminders
                logger.info(f"📅 Using custom reminders: {reminders}")
            else:
                event['reminders'] = {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'email', 'minutes': 24 * 60},
                        {'method': 'popup', 'minutes': 10},
                    ],
                }
                logger.info(f"📅 Using default reminders: {event['reminders']}")
            
            logger.info(f"📅 Final event object: {event}")
            logger.info(f"📅 Calling Google Calendar API to insert event...")
            
            event = self.service.events().insert(
                calendarId=self.calendar_id,
                body=event,
                sendUpdates='all'
            ).execute()
            
            logger.info(f"✅ Event created successfully!")
            logger.info(f"✅ Event ID: {event['id']}")
            logger.info(f"✅ Event HTML Link: {event['htmlLink']}")
            
            metadata = {
                'operation': 'create_event',
                'event_id': event['id'],
                'calendar_id': self.calendar_id
            }
            
            return self._format_success({
                'event_id': event['id'],
                'html_link': event['htmlLink'],
                'summary': event['summary'],
                'start': event['start'],
                'end': event['end']
            }, metadata)
            
        except Exception as e:
            logger.error(f"❌ Error creating calendar event: {str(e)}")
            logger.error(f"❌ Event details - Summary: {summary}, Start: {start_time}, End: {end_time}")
            raise Exception(f"Error creating event: {str(e)}")
    
    async def _list_events(self, max_results: int = 10, time_min: Optional[str] = None,
                          time_max: Optional[str] = None, single_events: bool = True) -> Dict[str, Any]:
        """List calendar events."""
        try:
            if not time_min:
                time_min = datetime.utcnow().isoformat() + 'Z'
            
            events_result = self.service.events().list(
                calendarId=self.calendar_id,
                timeMin=time_min,
                timeMax=time_max,
                maxResults=max_results,
                singleEvents=single_events,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            
            formatted_events = []
            for event in events:
                start = event['start'].get('dateTime', event['start'].get('date'))
                end = event['end'].get('dateTime', event['end'].get('date'))
                
                formatted_events.append({
                    'id': event['id'],
                    'summary': event.get('summary', 'No Title'),
                    'description': event.get('description', ''),
                    'location': event.get('location', ''),
                    'start': start,
                    'end': end,
                    'attendees': [attendee['email'] for attendee in event.get('attendees', [])],
                    'html_link': event.get('htmlLink', '')
                })
            
            metadata = {
                'operation': 'list_events',
                'total_events': len(formatted_events),
                'calendar_id': self.calendar_id,
                'time_min': time_min,
                'time_max': time_max
            }
            
            return self._format_success(formatted_events, metadata)
            
        except Exception as e:
            raise Exception(f"Error listing events: {str(e)}")
    
    async def _update_event(self, event_id: str, **kwargs) -> Dict[str, Any]:
        """Update a calendar event."""
        try:
            # Get existing event
            event = self.service.events().get(
                calendarId=self.calendar_id,
                eventId=event_id
            ).execute()
            
            # Update fields
            for key, value in kwargs.items():
                if value is not None:
                    if key == 'attendees':
                        event[key] = [{'email': email} for email in value]
                    else:
                        event[key] = value
            
            updated_event = self.service.events().update(
                calendarId=self.calendar_id,
                eventId=event_id,
                body=event,
                sendUpdates='all'
            ).execute()
            
            metadata = {
                'operation': 'update_event',
                'event_id': event_id,
                'calendar_id': self.calendar_id
            }
            
            return self._format_success({
                'event_id': updated_event['id'],
                'summary': updated_event.get('summary', ''),
                'message': 'Event updated successfully'
            }, metadata)
            
        except Exception as e:
            raise Exception(f"Error updating event: {str(e)}")
    
    async def _delete_event(self, event_id: str) -> Dict[str, Any]:
        """Delete a calendar event."""
        try:
            self.service.events().delete(
                calendarId=self.calendar_id,
                eventId=event_id
            ).execute()
            
            metadata = {
                'operation': 'delete_event',
                'event_id': event_id,
                'calendar_id': self.calendar_id
            }
            
            return self._format_success({
                'message': 'Event deleted successfully',
                'event_id': event_id
            }, metadata)
            
        except Exception as e:
            raise Exception(f"Error deleting event: {str(e)}")
    
    async def _check_availability(self, start_time: str, end_time: str,
                                 attendees: Optional[List[str]] = None) -> Dict[str, Any]:
        """Check calendar availability for a time slot."""
        try:
            # Get events in the time range
            events_result = self.service.events().list(
                calendarId=self.calendar_id,
                timeMin=start_time,
                timeMax=end_time,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            conflicting_events = events_result.get('items', [])
            
            availability = {
                'start_time': start_time,
                'end_time': end_time,
                'is_available': len(conflicting_events) == 0,
                'conflicting_events': []
            }
            
            for event in conflicting_events:
                availability['conflicting_events'].append({
                    'summary': event.get('summary', 'No Title'),
                    'start': event['start'].get('dateTime', event['start'].get('date')),
                    'end': event['end'].get('dateTime', event['end'].get('date'))
                })
            
            metadata = {
                'operation': 'check_availability',
                'calendar_id': self.calendar_id,
                'conflicts_count': len(conflicting_events)
            }
            
            return self._format_success(availability, metadata)
            
        except Exception as e:
            raise Exception(f"Error checking availability: {str(e)}")
    
    async def _get_calendars(self) -> Dict[str, Any]:
        """Get list of available calendars."""
        try:
            calendar_list = self.service.calendarList().list().execute()
            calendars = calendar_list.get('items', [])
            
            formatted_calendars = []
            for calendar in calendars:
                formatted_calendars.append({
                    'id': calendar['id'],
                    'summary': calendar['summary'],
                    'description': calendar.get('description', ''),
                    'primary': calendar.get('primary', False),
                    'access_role': calendar.get('accessRole', ''),
                    'selected': calendar.get('selected', False)
                })
            
            metadata = {
                'operation': 'get_calendars',
                'total_calendars': len(formatted_calendars)
            }
            
            return self._format_success(formatted_calendars, metadata)
            
        except Exception as e:
            raise Exception(f"Error getting calendars: {str(e)}")
    
    async def find_free_time(self, duration_minutes: int = 60, 
                           start_date: Optional[str] = None,
                           end_date: Optional[str] = None) -> Dict[str, Any]:
        """
        Find free time slots in calendar.
        
        Args:
            duration_minutes: Duration of the time slot in minutes
            start_date: Start date to search from
            end_date: End date to search until
            
        Returns:
            Available time slots
        """
        if not self.service:
            return self._format_error("Google Calendar service not available")
        
        try:
            if not start_date:
                start_date = datetime.utcnow().isoformat() + 'Z'
            
            if not end_date:
                end_date = (datetime.utcnow() + timedelta(days=7)).isoformat() + 'Z'
            
            # Get all events in the date range
            events_result = self.service.events().list(
                calendarId=self.calendar_id,
                timeMin=start_date,
                timeMax=end_date,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            
            # Find free time slots
            free_slots = []
            current_time = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            
            for event in events:
                event_start = datetime.fromisoformat(
                    event['start'].get('dateTime', event['start'].get('date')).replace('Z', '+00:00')
                )
                
                # Check if there's enough time before this event
                time_diff = (event_start - current_time).total_seconds() / 60
                if time_diff >= duration_minutes:
                    free_slots.append({
                        'start': current_time.isoformat(),
                        'end': event_start.isoformat(),
                        'duration_minutes': int(time_diff)
                    })
                
                # Move current time to end of this event
                event_end = datetime.fromisoformat(
                    event['end'].get('dateTime', event['end'].get('date')).replace('Z', '+00:00')
                )
                current_time = max(current_time, event_end)
            
            # Check if there's time after the last event
            time_diff = (end_time - current_time).total_seconds() / 60
            if time_diff >= duration_minutes:
                free_slots.append({
                    'start': current_time.isoformat(),
                    'end': end_time.isoformat(),
                    'duration_minutes': int(time_diff)
                })
            
            metadata = {
                'operation': 'find_free_time',
                'duration_minutes': duration_minutes,
                'start_date': start_date,
                'end_date': end_date,
                'free_slots_count': len(free_slots)
            }
            
            return self._format_success(free_slots, metadata)
            
        except Exception as e:
            logger.error(f"Error finding free time: {str(e)}")
            return self._format_error(f"Failed to find free time: {str(e)}")
    
    def get_tool_info(self) -> Dict[str, Any]:
        """
        Get information about this tool.
        
        Returns:
            Tool information dictionary
        """
        logger.info(f"📅 Calendar Manager get_tool_info called")
        logger.info(f"📅 Tool name: {self.name}")
        logger.info(f"📅 Tool description: {self.description}")
        logger.info(f"📅 Tool category: {self.category}")
        logger.info(f"📅 Tool type: {self.tool_type}")
        logger.info(f"📅 Service available: {self.service is not None}")
        
        tool_info = {
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'tool_type': self.tool_type,
            'capabilities': [
                'Create calendar events',
                'List upcoming events',
                'Update existing events',
                'Delete events',
                'Check calendar availability',
                'Find free time slots',
                'Manage multiple calendars',
                'Event reminders and notifications'
            ],
            'supported_operations': [
                'create_event',
                'list_events', 
                'update_event',
                'delete_event',
                'check_availability',
                'get_calendars',
                'find_free_time'
            ],
            'parameters': {
                'operation': 'Type of calendar operation (required)',
                'summary': 'Event title (for create/update)',
                'start_time': 'Event start time (ISO format)',
                'end_time': 'Event end time (ISO format)',
                'description': 'Event description (optional)',
                'location': 'Event location (optional)',
                'attendees': 'List of attendee emails (optional)'
            }
        } 