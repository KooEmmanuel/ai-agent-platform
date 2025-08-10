"""
Reminder Tool

This tool provides functionality to set and manage reminders with notifications.
It supports various notification methods and scheduling options.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import uuid

from .base import BaseTool

logger = logging.getLogger(__name__)

class ReminderTool(BaseTool):
    """
    Tool for setting and managing reminders with notifications.
    
    Features:
    - Set one-time and recurring reminders
    - Multiple notification methods (email, webhook, in-app)
    - Priority levels and categories
    - Reminder management (list, update, delete)
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = "Reminder Tool"
        self.description = "Set and manage reminders with notifications"
        self.category = "Scheduling"
        self.tool_type = "Function"
        
        # Configuration
        self.storage_file = config.get('storage_file', 'reminders.json')
        self.default_timezone = config.get('timezone', 'UTC')
        self.max_reminders = config.get('max_reminders', 100)
        
        # Notification settings
        self.email_enabled = config.get('email_enabled', False)
        self.webhook_enabled = config.get('webhook_enabled', False)
        self.webhook_url = config.get('webhook_url', '')
        
        # Initialize storage
        self.reminders = self._load_reminders()
    
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute reminder operation with given parameters.
        
        Args:
            action: Operation to perform (create, list, update, delete, get)
            title: Reminder title (required for create)
            description: Reminder description (optional)
            due_date: Due date in ISO format (required for create)
            priority: Priority level (low, medium, high, urgent)
            category: Reminder category
            recurring: Recurring pattern (daily, weekly, monthly, yearly, none)
            notification_methods: List of notification methods (email, webhook, in_app)
            reminder_id: Reminder ID for update/delete operations
            
        Returns:
            Dictionary containing operation result
        """
        action = kwargs.get('action', 'create')
        
        try:
            if action == 'create':
                return await self._create_reminder(kwargs)
            elif action == 'list':
                return await self._list_reminders(kwargs)
            elif action == 'update':
                return await self._update_reminder(kwargs)
            elif action == 'delete':
                return await self._delete_reminder(kwargs)
            elif action == 'get':
                return await self._get_reminder(kwargs)
            elif action == 'mark_completed':
                return await self._mark_completed(kwargs)
            elif action == 'snooze':
                return await self._snooze_reminder(kwargs)
            else:
                return self._format_error(f"Unknown action: {action}")
                
        except Exception as e:
            logger.error(f"Error in reminder operation: {str(e)}")
            return self._format_error(f"Reminder operation failed: {str(e)}")
    
    async def _create_reminder(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new reminder."""
        title = params.get('title', '')
        description = params.get('description', '')
        due_date_str = params.get('due_date', '')
        priority = params.get('priority', 'medium')
        category = params.get('category', 'general')
        recurring = params.get('recurring', 'none')
        notification_methods = params.get('notification_methods', ['in_app'])
        
        if not title:
            return self._format_error("Title is required")
        
        if not due_date_str:
            return self._format_error("Due date is required")
        
        try:
            due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
        except ValueError:
            return self._format_error("Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)")
        
        if due_date <= datetime.now(due_date.tzinfo):
            return self._format_error("Due date must be in the future")
        
        if len(self.reminders) >= self.max_reminders:
            return self._format_error(f"Maximum number of reminders ({self.max_reminders}) reached")
        
        reminder_id = str(uuid.uuid4())
        reminder = {
            'id': reminder_id,
            'title': title,
            'description': description,
            'due_date': due_date.isoformat(),
            'priority': priority,
            'category': category,
            'recurring': recurring,
            'notification_methods': notification_methods,
            'status': 'pending',
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'completed_at': None,
            'snooze_count': 0,
            'last_snoozed': None
        }
        
        self.reminders[reminder_id] = reminder
        self._save_reminders()
        
        # Schedule notification
        await self._schedule_notification(reminder)
        
        return self._format_success({
            'reminder': reminder,
            'message': f"Reminder '{title}' created successfully"
        })
    
    async def _list_reminders(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """List reminders with optional filtering."""
        status = params.get('status', 'all')  # all, pending, completed, overdue
        category = params.get('category', '')
        priority = params.get('priority', '')
        limit = min(params.get('limit', 50), 100)
        
        filtered_reminders = []
        now = datetime.now()
        
        for reminder in self.reminders.values():
            # Status filtering
            if status == 'pending' and reminder['status'] != 'pending':
                continue
            elif status == 'completed' and reminder['status'] != 'completed':
                continue
            elif status == 'overdue':
                due_date = datetime.fromisoformat(reminder['due_date'].replace('Z', '+00:00'))
                if due_date > now or reminder['status'] == 'completed':
                    continue
            
            # Category filtering
            if category and reminder['category'] != category:
                continue
            
            # Priority filtering
            if priority and reminder['priority'] != priority:
                continue
            
            filtered_reminders.append(reminder)
        
        # Sort by due date
        filtered_reminders.sort(key=lambda x: x['due_date'])
        
        return self._format_success({
            'reminders': filtered_reminders[:limit],
            'total_count': len(filtered_reminders),
            'filters': {
                'status': status,
                'category': category,
                'priority': priority
            }
        })
    
    async def _update_reminder(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing reminder."""
        reminder_id = params.get('reminder_id', '')
        
        if not reminder_id:
            return self._format_error("Reminder ID is required")
        
        if reminder_id not in self.reminders:
            return self._format_error("Reminder not found")
        
        reminder = self.reminders[reminder_id]
        
        # Updateable fields
        updateable_fields = ['title', 'description', 'due_date', 'priority', 
                           'category', 'recurring', 'notification_methods']
        
        for field in updateable_fields:
            if field in params:
                if field == 'due_date':
                    try:
                        due_date = datetime.fromisoformat(params[field].replace('Z', '+00:00'))
                        reminder[field] = due_date.isoformat()
                    except ValueError:
                        return self._format_error("Invalid date format")
                else:
                    reminder[field] = params[field]
        
        reminder['updated_at'] = datetime.now().isoformat()
        self._save_reminders()
        
        # Reschedule notification if due date changed
        if 'due_date' in params:
            await self._schedule_notification(reminder)
        
        return self._format_success({
            'reminder': reminder,
            'message': f"Reminder '{reminder['title']}' updated successfully"
        })
    
    async def _delete_reminder(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Delete a reminder."""
        reminder_id = params.get('reminder_id', '')
        
        if not reminder_id:
            return self._format_error("Reminder ID is required")
        
        if reminder_id not in self.reminders:
            return self._format_error("Reminder not found")
        
        reminder = self.reminders.pop(reminder_id)
        self._save_reminders()
        
        return self._format_success({
            'message': f"Reminder '{reminder['title']}' deleted successfully"
        })
    
    async def _get_reminder(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get a specific reminder by ID."""
        reminder_id = params.get('reminder_id', '')
        
        if not reminder_id:
            return self._format_error("Reminder ID is required")
        
        if reminder_id not in self.reminders:
            return self._format_error("Reminder not found")
        
        return self._format_success({
            'reminder': self.reminders[reminder_id]
        })
    
    async def _mark_completed(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Mark a reminder as completed."""
        reminder_id = params.get('reminder_id', '')
        
        if not reminder_id:
            return self._format_error("Reminder ID is required")
        
        if reminder_id not in self.reminders:
            return self._format_error("Reminder not found")
        
        reminder = self.reminders[reminder_id]
        reminder['status'] = 'completed'
        reminder['completed_at'] = datetime.now().isoformat()
        reminder['updated_at'] = datetime.now().isoformat()
        
        self._save_reminders()
        
        return self._format_success({
            'reminder': reminder,
            'message': f"Reminder '{reminder['title']}' marked as completed"
        })
    
    async def _snooze_reminder(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Snooze a reminder for a specified duration."""
        reminder_id = params.get('reminder_id', '')
        duration_minutes = params.get('duration_minutes', 15)
        
        if not reminder_id:
            return self._format_error("Reminder ID is required")
        
        if reminder_id not in self.reminders:
            return self._format_error("Reminder not found")
        
        reminder = self.reminders[reminder_id]
        
        # Calculate new due date
        current_due_date = datetime.fromisoformat(reminder['due_date'].replace('Z', '+00:00'))
        new_due_date = current_due_date + timedelta(minutes=duration_minutes)
        
        reminder['due_date'] = new_due_date.isoformat()
        reminder['snooze_count'] = reminder.get('snooze_count', 0) + 1
        reminder['last_snoozed'] = datetime.now().isoformat()
        reminder['updated_at'] = datetime.now().isoformat()
        
        self._save_reminders()
        
        # Reschedule notification
        await self._schedule_notification(reminder)
        
        return self._format_success({
            'reminder': reminder,
            'message': f"Reminder '{reminder['title']}' snoozed for {duration_minutes} minutes"
        })
    
    async def _schedule_notification(self, reminder: Dict[str, Any]):
        """Schedule notification for a reminder."""
        # This is a simplified implementation
        # In a real application, you would use a proper task scheduler
        # like Celery, APScheduler, or a cron job
        
        due_date = datetime.fromisoformat(reminder['due_date'].replace('Z', '+00:00'))
        now = datetime.now(due_date.tzinfo)
        
        if due_date > now:
            # Calculate delay in seconds
            delay = (due_date - now).total_seconds()
            
            # Schedule notification (simplified)
            asyncio.create_task(self._send_notification_after_delay(reminder, delay))
    
    async def _send_notification_after_delay(self, reminder: Dict[str, Any], delay: float):
        """Send notification after specified delay."""
        await asyncio.sleep(delay)
        await self._send_notification(reminder)
    
    async def _send_notification(self, reminder: Dict[str, Any]):
        """Send notification for a reminder."""
        notification_data = {
            'reminder_id': reminder['id'],
            'title': reminder['title'],
            'description': reminder['description'],
            'due_date': reminder['due_date'],
            'priority': reminder['priority'],
            'category': reminder['category']
        }
        
        # Send notifications based on configured methods
        for method in reminder.get('notification_methods', []):
            try:
                if method == 'email' and self.email_enabled:
                    await self._send_email_notification(notification_data)
                elif method == 'webhook' and self.webhook_enabled:
                    await self._send_webhook_notification(notification_data)
                elif method == 'in_app':
                    # In-app notifications are handled by the frontend
                    pass
            except Exception as e:
                logger.error(f"Failed to send {method} notification: {str(e)}")
    
    async def _send_email_notification(self, notification_data: Dict[str, Any]):
        """Send email notification."""
        # This would integrate with your email service
        # For now, just log the notification
        logger.info(f"Email notification sent: {notification_data}")
    
    async def _send_webhook_notification(self, notification_data: Dict[str, Any]):
        """Send webhook notification."""
        if not self.webhook_url:
            return
        
        try:
            await self._make_request('POST', self.webhook_url, json=notification_data)
        except Exception as e:
            logger.error(f"Webhook notification failed: {str(e)}")
    
    def _load_reminders(self) -> Dict[str, Any]:
        """Load reminders from storage."""
        try:
            with open(self.storage_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
        except Exception as e:
            logger.error(f"Error loading reminders: {str(e)}")
            return {}
    
    def _save_reminders(self):
        """Save reminders to storage."""
        try:
            with open(self.storage_file, 'w') as f:
                json.dump(self.reminders, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving reminders: {str(e)}")
    
    async def get_overdue_reminders(self) -> Dict[str, Any]:
        """Get all overdue reminders."""
        now = datetime.now()
        overdue = []
        
        for reminder in self.reminders.values():
            if reminder['status'] == 'pending':
                due_date = datetime.fromisoformat(reminder['due_date'].replace('Z', '+00:00'))
                if due_date < now:
                    overdue.append(reminder)
        
        return self._format_success({
            'overdue_reminders': overdue,
            'count': len(overdue)
        })
    
    async def get_reminder_stats(self) -> Dict[str, Any]:
        """Get reminder statistics."""
        total = len(self.reminders)
        pending = sum(1 for r in self.reminders.values() if r['status'] == 'pending')
        completed = sum(1 for r in self.reminders.values() if r['status'] == 'completed')
        
        # Count by priority
        priority_counts = {}
        for reminder in self.reminders.values():
            priority = reminder['priority']
            priority_counts[priority] = priority_counts.get(priority, 0) + 1
        
        # Count by category
        category_counts = {}
        for reminder in self.reminders.values():
            category = reminder['category']
            category_counts[category] = category_counts.get(category, 0) + 1
        
        return self._format_success({
            'total_reminders': total,
            'pending_reminders': pending,
            'completed_reminders': completed,
            'completion_rate': (completed / total * 100) if total > 0 else 0,
            'priority_distribution': priority_counts,
            'category_distribution': category_counts
        }) 