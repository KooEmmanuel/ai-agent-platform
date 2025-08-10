"""
Date Calculator Tool

This tool provides functionality to perform date calculations and formatting.
It supports various date operations, timezone handling, and date formatting.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta, date
from typing import Any, Dict, List, Optional, Union
import pytz
from dateutil import parser, relativedelta
import calendar

from .base import BaseTool

logger = logging.getLogger(__name__)

class DateCalculatorTool(BaseTool):
    """
    Tool for performing date calculations and formatting.
    
    Features:
    - Date arithmetic (add/subtract days, months, years)
    - Date difference calculations
    - Date formatting and parsing
    - Timezone conversions
    - Business day calculations
    - Date range generation
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = "Date Calculator"
        self.description = "Perform date calculations and formatting"
        self.category = "Custom"
        self.tool_type = "Function"
        
        # Configuration
        self.default_timezone = config.get('timezone', 'UTC')
        self.default_date_format = config.get('date_format', '%Y-%m-%d')
        self.default_datetime_format = config.get('datetime_format', '%Y-%m-%d %H:%M:%S')
        self.business_days = config.get('business_days', [0, 1, 2, 3, 4])  # Monday to Friday
        
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute date calculation operation with given parameters.
        
        Args:
            action: Operation to perform (add, subtract, difference, format, etc.)
            date1: First date (string or datetime)
            date2: Second date (string or datetime)
            amount: Amount to add/subtract
            unit: Unit of time (days, weeks, months, years, etc.)
            format: Date format string
            timezone: Timezone for conversion
            
        Returns:
            Dictionary containing calculation result
        """
        action = kwargs.get('action', 'add')
        
        try:
            if action == 'add':
                return await self._add_date(kwargs)
            elif action == 'subtract':
                return await self._subtract_date(kwargs)
            elif action == 'difference':
                return await self._date_difference(kwargs)
            elif action == 'format':
                return await self._format_date(kwargs)
            elif action == 'parse':
                return await self._parse_date(kwargs)
            elif action == 'convert_timezone':
                return await self._convert_timezone(kwargs)
            elif action == 'business_days':
                return await self._business_days(kwargs)
            elif action == 'date_range':
                return await self._date_range(kwargs)
            elif action == 'week_info':
                return await self._week_info(kwargs)
            elif action == 'month_info':
                return await self._month_info(kwargs)
            else:
                return self._format_error(f"Unknown action: {action}")
                
        except Exception as e:
            logger.error(f"Error in date calculation: {str(e)}")
            return self._format_error(f"Date calculation failed: {str(e)}")
    
    async def _add_date(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Add time to a date."""
        date_str = params.get('date', '')
        amount = params.get('amount', 0)
        unit = params.get('unit', 'days')
        timezone = params.get('timezone', self.default_timezone)
        
        if not date_str:
            return self._format_error("Date is required")
        
        try:
            # Parse the input date
            input_date = self._parse_date_string(date_str, timezone)
            
            # Add the specified amount
            if unit == 'days':
                result_date = input_date + timedelta(days=amount)
            elif unit == 'weeks':
                result_date = input_date + timedelta(weeks=amount)
            elif unit == 'months':
                result_date = input_date + relativedelta.relativedelta(months=amount)
            elif unit == 'years':
                result_date = input_date + relativedelta.relativedelta(years=amount)
            elif unit == 'hours':
                result_date = input_date + timedelta(hours=amount)
            elif unit == 'minutes':
                result_date = input_date + timedelta(minutes=amount)
            elif unit == 'seconds':
                result_date = input_date + timedelta(seconds=amount)
            else:
                return self._format_error(f"Unknown unit: {unit}")
            
            return self._format_success({
                'original_date': self._format_datetime(input_date),
                'amount_added': amount,
                'unit': unit,
                'result_date': self._format_datetime(result_date),
                'timezone': timezone
            })
            
        except Exception as e:
            return self._format_error(f"Error adding date: {str(e)}")
    
    async def _subtract_date(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Subtract time from a date."""
        date_str = params.get('date', '')
        amount = params.get('amount', 0)
        unit = params.get('unit', 'days')
        timezone = params.get('timezone', self.default_timezone)
        
        if not date_str:
            return self._format_error("Date is required")
        
        try:
            # Parse the input date
            input_date = self._parse_date_string(date_str, timezone)
            
            # Subtract the specified amount
            if unit == 'days':
                result_date = input_date - timedelta(days=amount)
            elif unit == 'weeks':
                result_date = input_date - timedelta(weeks=amount)
            elif unit == 'months':
                result_date = input_date - relativedelta.relativedelta(months=amount)
            elif unit == 'years':
                result_date = input_date - relativedelta.relativedelta(years=amount)
            elif unit == 'hours':
                result_date = input_date - timedelta(hours=amount)
            elif unit == 'minutes':
                result_date = input_date - timedelta(minutes=amount)
            elif unit == 'seconds':
                result_date = input_date - timedelta(seconds=amount)
            else:
                return self._format_error(f"Unknown unit: {unit}")
            
            return self._format_success({
                'original_date': self._format_datetime(input_date),
                'amount_subtracted': amount,
                'unit': unit,
                'result_date': self._format_datetime(result_date),
                'timezone': timezone
            })
            
        except Exception as e:
            return self._format_error(f"Error subtracting date: {str(e)}")
    
    async def _date_difference(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate the difference between two dates."""
        date1_str = params.get('date1', '')
        date2_str = params.get('date2', '')
        unit = params.get('unit', 'days')
        timezone = params.get('timezone', self.default_timezone)
        
        if not date1_str or not date2_str:
            return self._format_error("Both dates are required")
        
        try:
            # Parse the input dates
            date1 = self._parse_date_string(date1_str, timezone)
            date2 = self._parse_date_string(date2_str, timezone)
            
            # Calculate difference
            if date1 > date2:
                earlier_date = date2
                later_date = date1
                is_negative = True
            else:
                earlier_date = date1
                later_date = date2
                is_negative = False
            
            if unit == 'days':
                difference = (later_date - earlier_date).days
            elif unit == 'weeks':
                difference = (later_date - earlier_date).days / 7
            elif unit == 'months':
                rd = relativedelta.relativedelta(later_date, earlier_date)
                difference = rd.years * 12 + rd.months
            elif unit == 'years':
                rd = relativedelta.relativedelta(later_date, earlier_date)
                difference = rd.years
            elif unit == 'hours':
                difference = (later_date - earlier_date).total_seconds() / 3600
            elif unit == 'minutes':
                difference = (later_date - earlier_date).total_seconds() / 60
            elif unit == 'seconds':
                difference = (later_date - earlier_date).total_seconds()
            else:
                return self._format_error(f"Unknown unit: {unit}")
            
            if is_negative:
                difference = -difference
            
            return self._format_success({
                'date1': self._format_datetime(date1),
                'date2': self._format_datetime(date2),
                'difference': difference,
                'unit': unit,
                'timezone': timezone,
                'is_negative': is_negative
            })
            
        except Exception as e:
            return self._format_error(f"Error calculating date difference: {str(e)}")
    
    async def _format_date(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Format a date according to specified format."""
        date_str = params.get('date', '')
        format_str = params.get('format', self.default_datetime_format)
        timezone = params.get('timezone', self.default_timezone)
        
        if not date_str:
            return self._format_error("Date is required")
        
        try:
            # Parse the input date
            input_date = self._parse_date_string(date_str, timezone)
            
            # Format the date
            formatted_date = input_date.strftime(format_str)
            
            return self._format_success({
                'original_date': date_str,
                'formatted_date': formatted_date,
                'format': format_str,
                'timezone': timezone
            })
            
        except Exception as e:
            return self._format_error(f"Error formatting date: {str(e)}")
    
    async def _parse_date(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Parse a date string into a datetime object."""
        date_str = params.get('date', '')
        timezone = params.get('timezone', self.default_timezone)
        
        if not date_str:
            return self._format_error("Date string is required")
        
        try:
            # Parse the date string
            parsed_date = self._parse_date_string(date_str, timezone)
            
            return self._format_success({
                'date_string': date_str,
                'parsed_date': self._format_datetime(parsed_date),
                'timezone': timezone,
                'year': parsed_date.year,
                'month': parsed_date.month,
                'day': parsed_date.day,
                'hour': parsed_date.hour,
                'minute': parsed_date.minute,
                'second': parsed_date.second,
                'weekday': parsed_date.strftime('%A'),
                'weekday_number': parsed_date.weekday()
            })
            
        except Exception as e:
            return self._format_error(f"Error parsing date: {str(e)}")
    
    async def _convert_timezone(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Convert a date from one timezone to another."""
        date_str = params.get('date', '')
        from_timezone = params.get('from_timezone', self.default_timezone)
        to_timezone = params.get('to_timezone', 'UTC')
        
        if not date_str:
            return self._format_error("Date is required")
        
        try:
            # Parse the input date
            input_date = self._parse_date_string(date_str, from_timezone)
            
            # Convert timezone
            from_tz = pytz.timezone(from_timezone)
            to_tz = pytz.timezone(to_timezone)
            
            # Localize the datetime if it's naive
            if input_date.tzinfo is None:
                input_date = from_tz.localize(input_date)
            
            # Convert to target timezone
            converted_date = input_date.astimezone(to_tz)
            
            return self._format_success({
                'original_date': self._format_datetime(input_date),
                'from_timezone': from_timezone,
                'to_timezone': to_timezone,
                'converted_date': self._format_datetime(converted_date),
                'timezone_offset': converted_date.strftime('%z')
            })
            
        except Exception as e:
            return self._format_error(f"Error converting timezone: {str(e)}")
    
    async def _business_days(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate business days between two dates."""
        start_date_str = params.get('start_date', '')
        end_date_str = params.get('end_date', '')
        business_days = params.get('business_days', self.business_days)
        timezone = params.get('timezone', self.default_timezone)
        
        if not start_date_str or not end_date_str:
            return self._format_error("Both start and end dates are required")
        
        try:
            # Parse the input dates
            start_date = self._parse_date_string(start_date_str, timezone)
            end_date = self._parse_date_string(end_date_str, timezone)
            
            # Ensure we're working with date objects
            start_date = start_date.date()
            end_date = end_date.date()
            
            # Calculate business days
            business_day_count = 0
            current_date = start_date
            
            while current_date <= end_date:
                if current_date.weekday() in business_days:
                    business_day_count += 1
                current_date += timedelta(days=1)
            
            # Calculate total days
            total_days = (end_date - start_date).days + 1
            
            return self._format_success({
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'total_days': total_days,
                'business_days': business_day_count,
                'weekend_days': total_days - business_day_count,
                'business_days_list': business_days
            })
            
        except Exception as e:
            return self._format_error(f"Error calculating business days: {str(e)}")
    
    async def _date_range(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a range of dates."""
        start_date_str = params.get('start_date', '')
        end_date_str = params.get('end_date', '')
        step = params.get('step', 1)
        unit = params.get('unit', 'days')
        format_str = params.get('format', self.default_date_format)
        timezone = params.get('timezone', self.default_timezone)
        
        if not start_date_str or not end_date_str:
            return self._format_error("Both start and end dates are required")
        
        try:
            # Parse the input dates
            start_date = self._parse_date_string(start_date_str, timezone)
            end_date = self._parse_date_string(end_date_str, timezone)
            
            # Generate date range
            dates = []
            current_date = start_date
            
            while current_date <= end_date:
                dates.append(self._format_datetime(current_date, format_str))
                
                # Increment by step
                if unit == 'days':
                    current_date += timedelta(days=step)
                elif unit == 'weeks':
                    current_date += timedelta(weeks=step)
                elif unit == 'months':
                    current_date += relativedelta.relativedelta(months=step)
                elif unit == 'years':
                    current_date += relativedelta.relativedelta(years=step)
                else:
                    return self._format_error(f"Unknown unit: {unit}")
            
            return self._format_success({
                'start_date': self._format_datetime(start_date),
                'end_date': self._format_datetime(end_date),
                'step': step,
                'unit': unit,
                'date_count': len(dates),
                'dates': dates,
                'format': format_str
            })
            
        except Exception as e:
            return self._format_error(f"Error generating date range: {str(e)}")
    
    async def _week_info(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get information about a specific week."""
        date_str = params.get('date', '')
        timezone = params.get('timezone', self.default_timezone)
        
        if not date_str:
            return self._format_error("Date is required")
        
        try:
            # Parse the input date
            input_date = self._parse_date_string(date_str, timezone)
            
            # Get week information
            year, week, weekday = input_date.isocalendar()
            
            # Get start and end of week
            start_of_week = input_date - timedelta(days=weekday)
            end_of_week = start_of_week + timedelta(days=6)
            
            # Get all days in the week
            week_days = []
            for i in range(7):
                day = start_of_week + timedelta(days=i)
                week_days.append({
                    'date': day.strftime('%Y-%m-%d'),
                    'day_name': day.strftime('%A'),
                    'day_number': day.day,
                    'is_weekend': day.weekday() >= 5
                })
            
            return self._format_success({
                'input_date': self._format_datetime(input_date),
                'year': year,
                'week_number': week,
                'weekday': weekday,
                'start_of_week': self._format_datetime(start_of_week),
                'end_of_week': self._format_datetime(end_of_week),
                'week_days': week_days
            })
            
        except Exception as e:
            return self._format_error(f"Error getting week info: {str(e)}")
    
    async def _month_info(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get information about a specific month."""
        date_str = params.get('date', '')
        timezone = params.get('timezone', self.default_timezone)
        
        if not date_str:
            return self._format_error("Date is required")
        
        try:
            # Parse the input date
            input_date = self._parse_date_string(date_str, timezone)
            
            # Get month information
            year = input_date.year
            month = input_date.month
            
            # Get start and end of month
            start_of_month = input_date.replace(day=1)
            if month == 12:
                end_of_month = input_date.replace(year=year + 1, month=1, day=1) - timedelta(days=1)
            else:
                end_of_month = input_date.replace(month=month + 1, day=1) - timedelta(days=1)
            
            # Get calendar information
            cal = calendar.monthcalendar(year, month)
            
            # Get month statistics
            days_in_month = calendar.monthrange(year, month)[1]
            first_weekday = calendar.monthrange(year, month)[0]
            
            return self._format_success({
                'input_date': self._format_datetime(input_date),
                'year': year,
                'month': month,
                'month_name': input_date.strftime('%B'),
                'start_of_month': self._format_datetime(start_of_month),
                'end_of_month': self._format_datetime(end_of_month),
                'days_in_month': days_in_month,
                'first_weekday': first_weekday,
                'first_weekday_name': calendar.day_name[first_weekday],
                'calendar': cal
            })
            
        except Exception as e:
            return self._format_error(f"Error getting month info: {str(e)}")
    
    def _parse_date_string(self, date_str: str, timezone: str) -> datetime:
        """Parse a date string into a datetime object."""
        try:
            # Try to parse with dateutil
            parsed_date = parser.parse(date_str)
            
            # If the date is naive, localize it
            if parsed_date.tzinfo is None:
                tz = pytz.timezone(timezone)
                parsed_date = tz.localize(parsed_date)
            
            return parsed_date
            
        except Exception as e:
            raise Exception(f"Failed to parse date string '{date_str}': {str(e)}")
    
    def _format_datetime(self, dt: datetime, format_str: str = None) -> str:
        """Format a datetime object to string."""
        if format_str is None:
            format_str = self.default_datetime_format
        
        return dt.strftime(format_str)
    
    async def get_current_date(self, timezone: str = None) -> Dict[str, Any]:
        """Get the current date and time."""
        try:
            tz = pytz.timezone(timezone or self.default_timezone)
            current_date = datetime.now(tz)
            
            return self._format_success({
                'current_date': self._format_datetime(current_date),
                'timezone': timezone or self.default_timezone,
                'timestamp': current_date.timestamp(),
                'year': current_date.year,
                'month': current_date.month,
                'day': current_date.day,
                'hour': current_date.hour,
                'minute': current_date.minute,
                'second': current_date.second,
                'weekday': current_date.strftime('%A'),
                'weekday_number': current_date.weekday()
            })
            
        except Exception as e:
            return self._format_error(f"Error getting current date: {str(e)}")
    
    async def validate_date(self, date_str: str, format_str: str = None) -> Dict[str, Any]:
        """Validate if a date string is valid."""
        try:
            # Try to parse the date
            parsed_date = self._parse_date_string(date_str, self.default_timezone)
            
            # Check if it matches the expected format
            is_valid = True
            format_matches = True
            
            if format_str:
                try:
                    parsed_date.strftime(format_str)
                except:
                    format_matches = False
            
            return self._format_success({
                'date_string': date_str,
                'is_valid': is_valid,
                'format_matches': format_matches,
                'parsed_date': self._format_datetime(parsed_date)
            })
            
        except Exception as e:
            return self._format_success({
                'date_string': date_str,
                'is_valid': False,
                'format_matches': False,
                'error': str(e)
            }) 