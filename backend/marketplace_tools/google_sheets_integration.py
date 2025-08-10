"""
Google Sheets Integration Tool

This tool provides functionality to read and write data to Google Sheets.
It supports various operations like reading, writing, updating, and managing Google Sheets.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
import pandas as pd
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import gspread
from gspread_dataframe import set_with_dataframe, get_as_dataframe

from .base import BaseTool

logger = logging.getLogger(__name__)

class GoogleSheetsIntegrationTool(BaseTool):
    """
    Tool for integrating with Google Sheets.
    
    Features:
    - Read data from Google Sheets
    - Write data to Google Sheets
    - Update existing sheets
    - Create new sheets
    - Manage permissions
    - Format sheets
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = "Google Sheets Integration"
        self.description = "Read and write data to Google Sheets"
        self.category = "Integration"
        self.tool_type = "API"
        
        # Google Sheets configuration
        self.credentials_file = config.get('credentials_file', '')
        self.token_file = config.get('token_file', '')
        self.scopes = config.get('scopes', [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ])
        
        # Initialize Google Sheets client
        self.service = None
        self.gc = None
        
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute Google Sheets operation with given parameters.
        
        Args:
            action: Operation to perform (read, write, create, update, etc.)
            spreadsheet_id: Google Sheets spreadsheet ID
            sheet_name: Name of the worksheet
            range_name: Cell range (e.g., 'A1:D10')
            data: Data to write
            credentials: Google credentials
            operation: Specific operation (append, clear, format, etc.)
            
        Returns:
            Dictionary containing operation result
        """
        action = kwargs.get('action', 'read')
        
        try:
            # Initialize Google Sheets client if not already done
            if not self.service:
                await self._initialize_client(kwargs.get('credentials', {}))
            
            if action == 'read':
                return await self._read_sheet(kwargs)
            elif action == 'write':
                return await self._write_sheet(kwargs)
            elif action == 'create':
                return await self._create_sheet(kwargs)
            elif action == 'update':
                return await self._update_sheet(kwargs)
            elif action == 'append':
                return await self._append_data(kwargs)
            elif action == 'clear':
                return await self._clear_sheet(kwargs)
            elif action == 'list_sheets':
                return await self._list_sheets(kwargs)
            elif action == 'get_sheet_info':
                return await self._get_sheet_info(kwargs)
            else:
                return self._format_error(f"Unknown action: {action}")
                
        except Exception as e:
            logger.error(f"Error in Google Sheets operation: {str(e)}")
            return self._format_error(f"Google Sheets operation failed: {str(e)}")
    
    async def _initialize_client(self, credentials: Dict[str, Any]) -> None:
        """Initialize Google Sheets client."""
        try:
            if credentials:
                # Use provided credentials
                creds = Credentials.from_authorized_user_info(credentials, self.scopes)
            elif self.credentials_file:
                # Use service account credentials
                creds = Credentials.from_service_account_file(self.credentials_file, scopes=self.scopes)
            else:
                return self._format_error("No credentials provided")
            
            # Refresh credentials if needed
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            
            # Initialize Google Sheets API service
            self.service = build('sheets', 'v4', credentials=creds)
            
            # Initialize gspread client
            self.gc = gspread.authorize(creds)
            
        except Exception as e:
            raise Exception(f"Failed to initialize Google Sheets client: {str(e)}")
    
    async def _read_sheet(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Read data from Google Sheets."""
        spreadsheet_id = params.get('spreadsheet_id', '')
        sheet_name = params.get('sheet_name', '')
        range_name = params.get('range_name', '')
        include_headers = params.get('include_headers', True)
        
        if not spreadsheet_id:
            return self._format_error("Spreadsheet ID is required")
        
        try:
            # Determine the range to read
            if range_name:
                range_spec = range_name
            elif sheet_name:
                range_spec = f"{sheet_name}!A:Z"
            else:
                range_spec = "A:Z"
            
            # Read data from Google Sheets
            result = self.service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=range_spec
            ).execute()
            
            values = result.get('values', [])
            
            if not values:
                return self._format_success({
                    'data': [],
                    'rows': 0,
                    'columns': 0,
                    'spreadsheet_id': spreadsheet_id,
                    'range': range_spec
                })
            
            # Convert to list of dictionaries if headers are included
            if include_headers and values:
                headers = values[0]
                data = []
                for row in values[1:]:
                    # Pad row with empty values if shorter than headers
                    padded_row = row + [''] * (len(headers) - len(row))
                    data.append(dict(zip(headers, padded_row)))
            else:
                data = values
            
            return self._format_success({
                'data': data,
                'rows': len(values),
                'columns': len(values[0]) if values else 0,
                'spreadsheet_id': spreadsheet_id,
                'range': range_spec,
                'has_headers': include_headers
            })
            
        except HttpError as e:
            return self._format_error(f"Google Sheets API error: {str(e)}")
        except Exception as e:
            return self._format_error(f"Error reading sheet: {str(e)}")
    
    async def _write_sheet(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Write data to Google Sheets."""
        spreadsheet_id = params.get('spreadsheet_id', '')
        sheet_name = params.get('sheet_name', '')
        data = params.get('data', [])
        range_name = params.get('range_name', '')
        clear_sheet = params.get('clear_sheet', False)
        
        if not spreadsheet_id:
            return self._format_error("Spreadsheet ID is required")
        
        if not data:
            return self._format_error("Data is required")
        
        try:
            # Determine the range to write
            if range_name:
                range_spec = range_name
            elif sheet_name:
                range_spec = f"{sheet_name}!A1"
            else:
                range_spec = "A1"
            
            # Convert data to list format if it's a list of dictionaries
            if data and isinstance(data[0], dict):
                headers = list(data[0].keys())
                values = [headers]  # Add headers as first row
                for row in data:
                    values.append([row.get(header, '') for header in headers])
            else:
                values = data
            
            # Clear sheet if requested
            if clear_sheet:
                clear_range = f"{sheet_name}!A:Z" if sheet_name else "A:Z"
                self.service.spreadsheets().values().clear(
                    spreadsheetId=spreadsheet_id,
                    range=clear_range
                ).execute()
            
            # Write data
            body = {
                'values': values
            }
            
            result = self.service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=range_spec,
                valueInputOption='RAW',
                body=body
            ).execute()
            
            return self._format_success({
                'data_written': True,
                'spreadsheet_id': spreadsheet_id,
                'range': range_spec,
                'rows_written': len(values),
                'columns_written': len(values[0]) if values else 0,
                'updated_cells': result.get('updatedCells', 0),
                'updated_range': result.get('updatedRange', '')
            })
            
        except HttpError as e:
            return self._format_error(f"Google Sheets API error: {str(e)}")
        except Exception as e:
            return self._format_error(f"Error writing sheet: {str(e)}")
    
    async def _create_sheet(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new Google Sheets spreadsheet."""
        title = params.get('title', f'Sheet_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
        data = params.get('data', [])
        share_with = params.get('share_with', [])
        
        try:
            # Create new spreadsheet
            spreadsheet = self.gc.create(title)
            
            # Get the first worksheet
            worksheet = spreadsheet.get_worksheet(0)
            
            # Write data if provided
            if data:
                if isinstance(data[0], dict):
                    # Convert to DataFrame for easier handling
                    df = pd.DataFrame(data)
                    set_with_dataframe(worksheet, df)
                else:
                    worksheet.update(data)
            
            # Share with specified users
            if share_with:
                for email in share_with:
                    spreadsheet.share(email, perm_type='user', role='writer')
            
            return self._format_success({
                'spreadsheet_created': True,
                'spreadsheet_id': spreadsheet.id,
                'spreadsheet_url': spreadsheet.url,
                'title': title,
                'rows_written': len(data) if data else 0,
                'shared_with': share_with
            })
            
        except Exception as e:
            return self._format_error(f"Error creating spreadsheet: {str(e)}")
    
    async def _update_sheet(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing data in Google Sheets."""
        spreadsheet_id = params.get('spreadsheet_id', '')
        sheet_name = params.get('sheet_name', '')
        data = params.get('data', [])
        range_name = params.get('range_name', '')
        update_type = params.get('update_type', 'overwrite')  # overwrite, append, insert
        
        if not spreadsheet_id:
            return self._format_error("Spreadsheet ID is required")
        
        if not data:
            return self._format_error("Data is required")
        
        try:
            # Determine the range to update
            if range_name:
                range_spec = range_name
            elif sheet_name:
                range_spec = f"{sheet_name}!A1"
            else:
                range_spec = "A1"
            
            # Convert data to list format if it's a list of dictionaries
            if data and isinstance(data[0], dict):
                headers = list(data[0].keys())
                values = [headers]  # Add headers as first row
                for row in data:
                    values.append([row.get(header, '') for header in headers])
            else:
                values = data
            
            if update_type == 'overwrite':
                # Overwrite existing data
                body = {'values': values}
                result = self.service.spreadsheets().values().update(
                    spreadsheetId=spreadsheet_id,
                    range=range_spec,
                    valueInputOption='RAW',
                    body=body
                ).execute()
                
            elif update_type == 'append':
                # Append data to the end
                body = {'values': values}
                result = self.service.spreadsheets().values().append(
                    spreadsheetId=spreadsheet_id,
                    range=range_spec,
                    valueInputOption='RAW',
                    insertDataOption='INSERT_ROWS',
                    body=body
                ).execute()
                
            else:
                return self._format_error(f"Unknown update type: {update_type}")
            
            return self._format_success({
                'data_updated': True,
                'spreadsheet_id': spreadsheet_id,
                'range': range_spec,
                'update_type': update_type,
                'rows_updated': len(values),
                'updated_cells': result.get('updatedCells', 0),
                'updated_range': result.get('updatedRange', '')
            })
            
        except HttpError as e:
            return self._format_error(f"Google Sheets API error: {str(e)}")
        except Exception as e:
            return self._format_error(f"Error updating sheet: {str(e)}")
    
    async def _append_data(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Append data to Google Sheets."""
        spreadsheet_id = params.get('spreadsheet_id', '')
        sheet_name = params.get('sheet_name', '')
        data = params.get('data', [])
        
        if not spreadsheet_id:
            return self._format_error("Spreadsheet ID is required")
        
        if not data:
            return self._format_error("Data is required")
        
        try:
            # Determine the range
            range_spec = f"{sheet_name}!A:Z" if sheet_name else "A:Z"
            
            # Convert data to list format if it's a list of dictionaries
            if data and isinstance(data[0], dict):
                headers = list(data[0].keys())
                values = []
                for row in data:
                    values.append([row.get(header, '') for header in headers])
            else:
                values = data
            
            # Append data
            body = {'values': values}
            result = self.service.spreadsheets().values().append(
                spreadsheetId=spreadsheet_id,
                range=range_spec,
                valueInputOption='RAW',
                insertDataOption='INSERT_ROWS',
                body=body
            ).execute()
            
            return self._format_success({
                'data_appended': True,
                'spreadsheet_id': spreadsheet_id,
                'range': range_spec,
                'rows_appended': len(values),
                'updated_cells': result.get('updatedCells', 0),
                'updated_range': result.get('updatedRange', '')
            })
            
        except HttpError as e:
            return self._format_error(f"Google Sheets API error: {str(e)}")
        except Exception as e:
            return self._format_error(f"Error appending data: {str(e)}")
    
    async def _clear_sheet(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Clear data from Google Sheets."""
        spreadsheet_id = params.get('spreadsheet_id', '')
        sheet_name = params.get('sheet_name', '')
        range_name = params.get('range_name', '')
        
        if not spreadsheet_id:
            return self._format_error("Spreadsheet ID is required")
        
        try:
            # Determine the range to clear
            if range_name:
                range_spec = range_name
            elif sheet_name:
                range_spec = f"{sheet_name}!A:Z"
            else:
                range_spec = "A:Z"
            
            # Clear the range
            result = self.service.spreadsheets().values().clear(
                spreadsheetId=spreadsheet_id,
                range=range_spec
            ).execute()
            
            return self._format_success({
                'sheet_cleared': True,
                'spreadsheet_id': spreadsheet_id,
                'range': range_spec,
                'cleared_range': result.get('clearedRange', '')
            })
            
        except HttpError as e:
            return self._format_error(f"Google Sheets API error: {str(e)}")
        except Exception as e:
            return self._format_error(f"Error clearing sheet: {str(e)}")
    
    async def _list_sheets(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """List all sheets in a spreadsheet."""
        spreadsheet_id = params.get('spreadsheet_id', '')
        
        if not spreadsheet_id:
            return self._format_error("Spreadsheet ID is required")
        
        try:
            # Get spreadsheet metadata
            spreadsheet = self.service.spreadsheets().get(
                spreadsheetId=spreadsheet_id
            ).execute()
            
            sheets = []
            for sheet in spreadsheet.get('sheets', []):
                sheet_props = sheet.get('properties', {})
                sheets.append({
                    'sheet_id': sheet_props.get('sheetId'),
                    'title': sheet_props.get('title'),
                    'index': sheet_props.get('index'),
                    'grid_properties': {
                        'row_count': sheet_props.get('gridProperties', {}).get('rowCount'),
                        'column_count': sheet_props.get('gridProperties', {}).get('columnCount')
                    }
                })
            
            return self._format_success({
                'spreadsheet_id': spreadsheet_id,
                'spreadsheet_title': spreadsheet.get('properties', {}).get('title'),
                'sheets': sheets,
                'total_sheets': len(sheets)
            })
            
        except HttpError as e:
            return self._format_error(f"Google Sheets API error: {str(e)}")
        except Exception as e:
            return self._format_error(f"Error listing sheets: {str(e)}")
    
    async def _get_sheet_info(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get detailed information about a sheet."""
        spreadsheet_id = params.get('spreadsheet_id', '')
        sheet_name = params.get('sheet_name', '')
        
        if not spreadsheet_id:
            return self._format_error("Spreadsheet ID is required")
        
        try:
            # Get spreadsheet metadata
            spreadsheet = self.service.spreadsheets().get(
                spreadsheetId=spreadsheet_id
            ).execute()
            
            # Find the specific sheet
            target_sheet = None
            for sheet in spreadsheet.get('sheets', []):
                sheet_props = sheet.get('properties', {})
                if sheet_name and sheet_props.get('title') == sheet_name:
                    target_sheet = sheet
                    break
                elif not sheet_name:
                    target_sheet = sheet  # Use first sheet if no name specified
                    break
            
            if not target_sheet:
                return self._format_error(f"Sheet '{sheet_name}' not found")
            
            sheet_props = target_sheet.get('properties', {})
            grid_props = sheet_props.get('gridProperties', {})
            
            # Get data range
            try:
                data_range = f"{sheet_props.get('title')}!A:Z"
                data_result = self.service.spreadsheets().values().get(
                    spreadsheetId=spreadsheet_id,
                    range=data_range
                ).execute()
                values = data_result.get('values', [])
            except:
                values = []
            
            return self._format_success({
                'sheet_info': {
                    'sheet_id': sheet_props.get('sheetId'),
                    'title': sheet_props.get('title'),
                    'index': sheet_props.get('index'),
                    'row_count': grid_props.get('rowCount'),
                    'column_count': grid_props.get('columnCount'),
                    'frozen_row_count': grid_props.get('frozenRowCount', 0),
                    'frozen_column_count': grid_props.get('frozenColumnCount', 0),
                    'data_rows': len(values),
                    'data_columns': len(values[0]) if values else 0
                },
                'spreadsheet_id': spreadsheet_id,
                'spreadsheet_title': spreadsheet.get('properties', {}).get('title')
            })
            
        except HttpError as e:
            return self._format_error(f"Google Sheets API error: {str(e)}")
        except Exception as e:
            return self._format_error(f"Error getting sheet info: {str(e)}")
    
    async def format_sheet(self, spreadsheet_id: str, sheet_name: str = None, 
                          format_options: Dict[str, Any] = None) -> Dict[str, Any]:
        """Format a Google Sheets worksheet."""
        if not spreadsheet_id:
            return self._format_error("Spreadsheet ID is required")
        
        try:
            # Determine sheet range
            if sheet_name:
                range_spec = f"{sheet_name}!A:Z"
            else:
                range_spec = "A:Z"
            
            # Prepare format requests
            requests = []
            
            if format_options:
                # Header formatting
                if format_options.get('header_format'):
                    requests.append({
                        'repeatCell': {
                            'range': {
                                'sheetId': 0,  # Assuming first sheet
                                'startRowIndex': 0,
                                'endRowIndex': 1
                            },
                            'cell': {
                                'userEnteredFormat': format_options['header_format']
                            },
                            'fields': 'userEnteredFormat'
                        }
                    })
                
                # Auto-resize columns
                if format_options.get('auto_resize_columns', True):
                    requests.append({
                        'autoResizeDimensions': {
                            'dimensions': {
                                'sheetId': 0,
                                'dimension': 'COLUMNS',
                                'startIndex': 0,
                                'endIndex': 26  # A-Z
                            }
                        }
                    })
            
            if requests:
                body = {'requests': requests}
                self.service.spreadsheets().batchUpdate(
                    spreadsheetId=spreadsheet_id,
                    body=body
                ).execute()
            
            return self._format_success({
                'sheet_formatted': True,
                'spreadsheet_id': spreadsheet_id,
                'sheet_name': sheet_name,
                'format_requests': len(requests)
            })
            
        except HttpError as e:
            return self._format_error(f"Google Sheets API error: {str(e)}")
        except Exception as e:
            return self._format_error(f"Error formatting sheet: {str(e)}") 