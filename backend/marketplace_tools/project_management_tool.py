"""
Project Management Tool

This tool provides comprehensive project management functionality for agents.
It allows agents to create, manage, and track projects, tasks, time entries, and team collaboration.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import aiohttp

from .base import BaseTool

logger = logging.getLogger(__name__)

class ProjectManagementTool(BaseTool):
    """
    Comprehensive Project Management Tool for AI Agents
    
    Features:
    - Project creation and management
    - Task creation, assignment, and tracking
    - Time tracking and logging
    - Team member management
    - Project templates and workflows
    - Progress monitoring and reporting
    - Budget and cost tracking
    - Milestone management
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = "Project Management Tool"
        self.description = "Comprehensive project management with tasks, time tracking, and team collaboration"
        self.category = "Productivity"
        self.tool_type = "Function"
        
        # Configuration
        self.api_base_url = config.get('api_base_url', 'http://localhost:8000/api/v1')
        self.auth_token = config.get('auth_token', '')
        self.user_id = config.get('user_id', 1)
        self.integration_id = config.get('integration_id', None)
        
        # Headers for API requests
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.auth_token}' if self.auth_token else ''
        }
    
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute project management operation with given parameters.
        
        Args:
            action: Operation to perform (create_project, get_projects, create_task, etc.)
            project_id: Project ID for project-specific operations
            task_id: Task ID for task-specific operations
            name: Project or task name
            description: Project or task description
            priority: Priority level (low, medium, high, urgent)
            status: Status (todo, in_progress, completed, etc.)
            due_date: Due date in ISO format
            estimated_hours: Estimated hours for tasks
            assignee_id: User ID to assign task to
            template_id: Template ID for project creation
            hours: Hours for time tracking
            is_billable: Whether time entry is billable
            hourly_rate: Hourly rate for billing
            
        Returns:
            Dictionary containing operation result
        """
        action = kwargs.get('action', 'get_projects')
        
        try:
            if action == 'create_project':
                return await self._create_project(kwargs)
            elif action == 'get_projects':
                return await self._get_projects(kwargs)
            elif action == 'get_project':
                return await self._get_project(kwargs)
            elif action == 'update_project':
                return await self._update_project(kwargs)
            elif action == 'delete_project':
                return await self._delete_project(kwargs)
            elif action == 'create_task':
                return await self._create_task(kwargs)
            elif action == 'get_tasks':
                return await self._get_tasks(kwargs)
            elif action == 'get_task':
                return await self._get_task(kwargs)
            elif action == 'update_task':
                return await self._update_task(kwargs)
            elif action == 'delete_task':
                return await self._delete_task(kwargs)
            elif action == 'create_time_entry':
                return await self._create_time_entry(kwargs)
            elif action == 'get_time_entries':
                return await self._get_time_entries(kwargs)
            elif action == 'delete_time_entry':
                return await self._delete_time_entry(kwargs)
            elif action == 'get_templates':
                return await self._get_templates(kwargs)
            elif action == 'create_project_from_template':
                return await self._create_project_from_template(kwargs)
            elif action == 'get_project_analytics':
                return await self._get_project_analytics(kwargs)
            elif action == 'get_project_details':
                return await self._get_project_details(kwargs)
            else:
                return self._format_error(f"Unknown action: {action}")
                
        except Exception as e:
            logger.error(f"Error in project management operation: {str(e)}")
            return self._format_error(f"Project management operation failed: {str(e)}")
    
    async def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """Make HTTP request to the project management API."""
        url = f"{self.api_base_url}{endpoint}"
        
        # For internal tool calls, we need to bypass authentication
        # Add a special header to indicate this is an internal tool call
        headers = self.headers.copy()
        headers['X-Internal-Tool'] = 'true'
        headers['X-User-ID'] = str(self.user_id)
        
        async with aiohttp.ClientSession() as session:
            try:
                if method.upper() == 'GET':
                    async with session.get(url, headers=headers) as response:
                        result = await response.json()
                        return {'status': response.status, 'data': result}
                elif method.upper() == 'POST':
                    async with session.post(url, headers=headers, json=data) as response:
                        result = await response.json()
                        return {'status': response.status, 'data': result}
                elif method.upper() == 'PUT':
                    async with session.put(url, headers=headers, json=data) as response:
                        result = await response.json()
                        return {'status': response.status, 'data': result}
                elif method.upper() == 'DELETE':
                    async with session.delete(url, headers=headers) as response:
                        result = await response.json() if response.content_type == 'application/json' else {}
                        return {'status': response.status, 'data': result}
            except Exception as e:
                logger.error(f"HTTP request failed: {str(e)}")
                raise e
    
    async def _create_project(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new project."""
        name = params.get('name', '')
        description = params.get('description', '')
        priority = params.get('priority', 'medium')
        start_date = params.get('start_date')
        end_date = params.get('end_date')
        budget = params.get('budget')
        color = params.get('color', '#3B82F6')
        template_id = params.get('template_id')
        
        if not name:
            return self._format_error("Project name is required")
        
        # Try to get integration_id from params or config
        integration_id = params.get('integration_id', self.integration_id)
        if not integration_id:
            return self._format_error(
                "Project Management integration is required. Please ensure you have a Project Management integration set up and the agent is configured to use it."
            )
        
        project_data = {
            'integration_id': integration_id,
            'name': name,
            'description': description,
            'priority': priority,
            'start_date': start_date,
            'end_date': end_date,
            'budget': budget,
            'color': color
        }
        
        if template_id:
            # Create project from template
            response = await self._make_request('POST', f'/project-management/projects/from-template', {
                'integration_id': integration_id,
                'template_id': template_id,
                'name': name,
                'description': description,
                'start_date': start_date,
                'end_date': end_date
            })
        else:
            # Create regular project
            response = await self._make_request('POST', '/project-management/projects', project_data)
        
        if response['status'] == 200:
            return self._format_success({
                'project': response['data'],
                'message': f"Project '{name}' created successfully"
            })
        else:
            return self._format_error(f"Failed to create project: {response['data']}")
    
    async def _get_projects(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get all projects."""
        # Try to get integration_id from params, config, or agent's tool configuration
        integration_id = params.get('integration_id', self.integration_id)
        
        # If still no integration_id, try to find the project management integration for this user
        if not integration_id:
            # This is a fallback - in practice, the integration_id should be passed from the agent service
            return self._format_error(
                "Project Management integration is required. Please ensure you have a Project Management integration set up and the agent is configured to use it."
            )
        
        response = await self._make_request('GET', f'/project-management/projects?integration_id={integration_id}')
        
        if response['status'] == 200:
            projects = response['data']
            return self._format_success({
                'projects': projects,
                'count': len(projects),
                'message': f"Found {len(projects)} projects"
            })
        else:
            return self._format_error(f"Failed to get projects: {response['data']}")
    
    async def _get_project(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get a specific project by ID."""
        project_id = params.get('project_id')
        if not project_id:
            return self._format_error("Project ID is required")
        
        response = await self._make_request('GET', f'/project-management/projects/{project_id}')
        
        if response['status'] == 200:
            return self._format_success({
                'project': response['data'],
                'message': f"Retrieved project details"
            })
        elif response['status'] == 404:
            # Project not found - suggest checking available projects
            projects_result = await self._get_projects(params)
            if projects_result.get('success'):
                projects_data = projects_result.get('data', {})
                projects = projects_data.get('projects', [])
                if projects:
                    project_list = [f"ID {p.get('id')}: {p.get('name')}" for p in projects]
                    return self._format_error(
                        f"Project with ID {project_id} not found. Available projects: {', '.join(project_list)}. "
                        f"Use 'get_projects' action to see all available projects."
                    )
                else:
                    return self._format_error(
                        f"Project with ID {project_id} not found. No projects exist yet. "
                        f"Use 'create_project' or 'create_project_from_template' to create a project first."
                    )
            else:
                return self._format_error(f"Project with ID {project_id} not found. Use 'get_projects' to see available projects.")
        else:
            return self._format_error(f"Failed to get project: {response['data']}")
    
    async def _update_project(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Update a project."""
        project_id = params.get('project_id')
        if not project_id:
            return self._format_error("Project ID is required")
        
        update_data = {k: v for k, v in params.items() if k not in ['action', 'project_id'] and v is not None}
        
        response = await self._make_request('PUT', f'/project-management/projects/{project_id}', update_data)
        
        if response['status'] == 200:
            return self._format_success({
                'project': response['data'],
                'message': f"Project updated successfully"
            })
        else:
            return self._format_error(f"Failed to update project: {response['data']}")
    
    async def _delete_project(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Delete a project."""
        project_id = params.get('project_id')
        if not project_id:
            return self._format_error("Project ID is required")
        
        response = await self._make_request('DELETE', f'/project-management/projects/{project_id}')
        
        if response['status'] == 200:
            return self._format_success({
                'message': f"Project deleted successfully"
            })
        else:
            return self._format_error(f"Failed to delete project: {response['data']}")
    
    async def _create_task(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new task."""
        project_id = params.get('project_id')
        title = params.get('title', '')
        description = params.get('description', '')
        priority = params.get('priority', 'medium')
        due_date = params.get('due_date')
        estimated_hours = params.get('estimated_hours')
        assignee_id = params.get('assignee_id')
        tags = params.get('tags', [])
        
        if not project_id:
            return self._format_error("Project ID is required")
        
        if not title:
            return self._format_error("Task title is required")
        
        task_data = {
            'project_id': project_id,
            'title': title,
            'description': description,
            'priority': priority,
            'due_date': due_date,
            'estimated_hours': estimated_hours,
            'assignee_id': assignee_id,
            'tags': tags
        }
        
        response = await self._make_request('POST', '/project-management/tasks', task_data)
        
        if response['status'] == 200:
            return self._format_success({
                'task': response['data'],
                'message': f"Task '{title}' created successfully"
            })
        else:
            return self._format_error(f"Failed to create task: {response['data']}")
    
    async def _get_tasks(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get tasks for a project."""
        project_id = params.get('project_id')
        
        # If no project_id provided, try to get it automatically
        if not project_id:
            projects_result = await self._get_projects(params)
            if projects_result.get('success'):
                projects_data = projects_result.get('result', {})
                projects = projects_data.get('projects', [])
                if len(projects) == 1:
                    # Auto-use the single project
                    project_id = projects[0]['id']
                    logger.info(f"🔍 Auto-selected project ID {project_id} for tasks retrieval")
                elif len(projects) > 1:
                    # Multiple projects - return list for user to choose
                    project_list = [f"ID {p.get('id')}: {p.get('name')}" for p in projects]
                    return self._format_error(
                        f"Multiple projects found. Please specify project_id. Available projects: {', '.join(project_list)}"
                    )
                else:
                    return self._format_error(
                        "No projects found. Use 'create_project' or 'create_project_from_template' to create a project first."
                    )
            else:
                return self._format_error("Could not retrieve projects to determine project_id")
        
        response = await self._make_request('GET', f'/project-management/projects/{project_id}/tasks')
        
        if response['status'] == 200:
            tasks = response['data']
            return self._format_success({
                'tasks': tasks,
                'count': len(tasks),
                'project_id': project_id,
                'message': f"Found {len(tasks)} tasks for project {project_id}"
            })
        elif response['status'] == 404:
            # Project not found - suggest checking available projects
            projects_result = await self._get_projects(params)
            if projects_result.get('success'):
                projects_data = projects_result.get('data', {})
                projects = projects_data.get('projects', [])
                if projects:
                    project_list = [f"ID {p.get('id')}: {p.get('name')}" for p in projects]
                    return self._format_error(
                        f"Project with ID {project_id} not found. Available projects: {', '.join(project_list)}. "
                        f"Use 'get_projects' action to see all available projects."
                    )
                else:
                    return self._format_error(
                        f"Project with ID {project_id} not found. No projects exist yet. "
                        f"Use 'create_project' or 'create_project_from_template' to create a project first."
                    )
            else:
                return self._format_error(f"Project with ID {project_id} not found. Use 'get_projects' to see available projects.")
        else:
            return self._format_error(f"Failed to get tasks: {response['data']}")
    
    async def _get_task(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get a specific task by ID."""
        task_id = params.get('task_id')
        if not task_id:
            return self._format_error("Task ID is required")
        
        response = await self._make_request('GET', f'/project-management/tasks/{task_id}')
        
        if response['status'] == 200:
            return self._format_success({
                'task': response['data'],
                'message': f"Retrieved task details"
            })
        else:
            return self._format_error(f"Failed to get task: {response['data']}")
    
    async def _update_task(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Update a task."""
        task_id = params.get('task_id')
        if not task_id:
            return self._format_error("Task ID is required")
        
        update_data = {k: v for k, v in params.items() if k not in ['action', 'task_id'] and v is not None}
        
        response = await self._make_request('PUT', f'/project-management/tasks/{task_id}', update_data)
        
        if response['status'] == 200:
            return self._format_success({
                'task': response['data'],
                'message': f"Task updated successfully"
            })
        else:
            return self._format_error(f"Failed to update task: {response['data']}")
    
    async def _delete_task(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Delete a task."""
        task_id = params.get('task_id')
        if not task_id:
            return self._format_error("Task ID is required")
        
        response = await self._make_request('DELETE', f'/project-management/tasks/{task_id}')
        
        if response['status'] == 200:
            return self._format_success({
                'message': f"Task deleted successfully"
            })
        else:
            return self._format_error(f"Failed to delete task: {response['data']}")
    
    async def _create_time_entry(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a time entry for a task."""
        project_id = params.get('project_id')
        task_id = params.get('task_id')
        description = params.get('description', '')
        hours = params.get('hours')
        date = params.get('date', datetime.now().isoformat())
        is_billable = params.get('is_billable', True)
        hourly_rate = params.get('hourly_rate')
        
        if not project_id:
            return self._format_error("Project ID is required")
        
        if not task_id:
            return self._format_error("Task ID is required")
        
        if not hours:
            return self._format_error("Hours is required")
        
        time_data = {
            'project_id': project_id,
            'task_id': task_id,
            'description': description,
            'hours': float(hours),
            'date': date,
            'is_billable': is_billable,
            'hourly_rate': float(hourly_rate) if hourly_rate else None
        }
        
        response = await self._make_request('POST', '/project-management/time-entries', time_data)
        
        if response['status'] == 200:
            return self._format_success({
                'time_entry': response['data'],
                'message': f"Time entry of {hours} hours logged successfully"
            })
        else:
            return self._format_error(f"Failed to create time entry: {response['data']}")
    
    async def _get_time_entries(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get time entries for a project."""
        project_id = params.get('project_id')
        
        # If no project_id provided, try to get it automatically
        if not project_id:
            projects_result = await self._get_projects(params)
            if projects_result.get('success'):
                projects_data = projects_result.get('result', {})
                projects = projects_data.get('projects', [])
                if len(projects) == 1:
                    # Auto-use the single project
                    project_id = projects[0]['id']
                    logger.info(f"🔍 Auto-selected project ID {project_id} for time entries retrieval")
                elif len(projects) > 1:
                    # Multiple projects - return list for user to choose
                    project_list = [f"ID {p.get('id')}: {p.get('name')}" for p in projects]
                    return self._format_error(
                        f"Multiple projects found. Please specify project_id. Available projects: {', '.join(project_list)}"
                    )
                else:
                    return self._format_error(
                        "No projects found. Use 'create_project' or 'create_project_from_template' to create a project first."
                    )
            else:
                return self._format_error("Could not retrieve projects to determine project_id")
        
        response = await self._make_request('GET', f'/project-management/projects/{project_id}/time-entries')
        
        if response['status'] == 200:
            time_entries = response['data']
            total_hours = sum(entry.get('hours', 0) for entry in time_entries)
            billable_hours = sum(entry.get('hours', 0) for entry in time_entries if entry.get('is_billable', False))
            
            return self._format_success({
                'time_entries': time_entries,
                'count': len(time_entries),
                'total_hours': total_hours,
                'billable_hours': billable_hours,
                'project_id': project_id,
                'message': f"Found {len(time_entries)} time entries ({total_hours} total hours) for project {project_id}"
            })
        elif response['status'] == 404:
            # Project not found - suggest checking available projects
            projects_result = await self._get_projects(params)
            if projects_result.get('success'):
                projects_data = projects_result.get('data', {})
                projects = projects_data.get('projects', [])
                if projects:
                    project_list = [f"ID {p.get('id')}: {p.get('name')}" for p in projects]
                    return self._format_error(
                        f"Project with ID {project_id} not found. Available projects: {', '.join(project_list)}. "
                        f"Use 'get_projects' action to see all available projects."
                    )
                else:
                    return self._format_error(
                        f"Project with ID {project_id} not found. No projects exist yet. "
                        f"Use 'create_project' or 'create_project_from_template' to create a project first."
                    )
            else:
                return self._format_error(f"Project with ID {project_id} not found. Use 'get_projects' to see available projects.")
        else:
            return self._format_error(f"Failed to get time entries: {response['data']}")
    
    async def _delete_time_entry(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Delete a time entry."""
        time_entry_id = params.get('time_entry_id')
        if not time_entry_id:
            return self._format_error("Time entry ID is required")
        
        response = await self._make_request('DELETE', f'/project-management/time-entries/{time_entry_id}')
        
        if response['status'] == 200:
            return self._format_success({
                'message': f"Time entry deleted successfully"
            })
        else:
            return self._format_error(f"Failed to delete time entry: {response['data']}")
    
    async def _get_templates(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get available project templates."""
        response = await self._make_request('GET', '/project-management/templates')
        
        if response['status'] == 200:
            templates = response['data']
            return self._format_success({
                'templates': templates,
                'count': len(templates),
                'message': f"Found {len(templates)} project templates"
            })
        else:
            return self._format_error(f"Failed to get templates: {response['data']}")
    
    async def _create_project_from_template(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a project from a template."""
        template_id = params.get('template_id')
        name = params.get('name', '')
        description = params.get('description', '')
        start_date = params.get('start_date')
        end_date = params.get('end_date')
        
        if not template_id:
            return self._format_error("Template ID is required")
        
        if not name:
            return self._format_error("Project name is required")
        
        # Try to get integration_id from params or config
        integration_id = params.get('integration_id', self.integration_id)
        if not integration_id:
            return self._format_error(
                "Project Management integration is required. Please ensure you have a Project Management integration set up and the agent is configured to use it."
            )
        
        project_data = {
            'integration_id': integration_id,
            'template_id': str(template_id),  # Convert to string as expected by API
            'name': name,
            'description': description,
            'start_date': start_date,
            'end_date': end_date
        }
        
        response = await self._make_request('POST', '/project-management/projects/from-template', project_data)
        
        if response['status'] == 200:
            return self._format_success({
                'project': response['data'],
                'message': f"Project '{name}' created from template successfully"
            })
        else:
            return self._format_error(f"Failed to create project from template: {response['data']}")
    
    async def _get_project_analytics(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get project analytics and insights."""
        project_id = params.get('project_id')
        if not project_id:
            return self._format_error("Project ID is required")
        
        response = await self._make_request('GET', f'/project-management/projects/{project_id}/analytics')
        
        if response['status'] == 200:
            return self._format_success({
                'analytics': response['data'],
                'message': f"Retrieved project analytics"
            })
        else:
            return self._format_error(f"Failed to get project analytics: {response['data']}")
    
    async def _get_project_details(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get comprehensive project details including tasks and time entries."""
        project_id = params.get('project_id')
        
        # If no project_id provided, try to get it automatically
        if not project_id:
            projects_result = await self._get_projects(params)
            if projects_result.get('success'):
                projects_data = projects_result.get('result', {})
                projects = projects_data.get('projects', [])
                if len(projects) == 1:
                    # Auto-use the single project
                    project_id = projects[0]['id']
                    logger.info(f"🔍 Auto-selected project ID {project_id} for project details retrieval")
                elif len(projects) > 1:
                    # Multiple projects - return list for user to choose
                    project_list = [f"ID {p.get('id')}: {p.get('name')}" for p in projects]
                    return self._format_error(
                        f"Multiple projects found. Please specify project_id. Available projects: {', '.join(project_list)}"
                    )
                else:
                    return self._format_error(
                        "No projects found. Use 'create_project' or 'create_project_from_template' to create a project first."
                    )
            else:
                return self._format_error("Could not retrieve projects to determine project_id")
        
        # Get project info
        project_response = await self._make_request('GET', f'/project-management/projects/{project_id}')
        if project_response['status'] != 200:
            return self._format_error(f"Failed to get project: {project_response['data']}")
        
        # Get tasks
        tasks_response = await self._make_request('GET', f'/project-management/projects/{project_id}/tasks')
        tasks = tasks_response['data'] if tasks_response['status'] == 200 else []
        
        # Get time entries
        time_response = await self._make_request('GET', f'/project-management/projects/{project_id}/time-entries')
        time_entries = time_response['data'] if time_response['status'] == 200 else []
        
        # Calculate time statistics
        total_hours = sum(entry.get('hours', 0) for entry in time_entries)
        billable_hours = sum(entry.get('hours', 0) for entry in time_entries if entry.get('is_billable', False))
        
        # Calculate task statistics
        task_status_counts = {}
        for task in tasks:
            status = task.get('status', 'unknown')
            task_status_counts[status] = task_status_counts.get(status, 0) + 1
        
        return self._format_success({
            'project': project_response['data'],
            'tasks': tasks,
            'time_entries': time_entries,
            'statistics': {
                'task_count': len(tasks),
                'time_entry_count': len(time_entries),
                'total_hours_logged': total_hours,
                'billable_hours': billable_hours,
                'task_status_breakdown': task_status_counts
            },
            'project_id': project_id,
            'message': f"Retrieved complete project details for project {project_id}: {len(tasks)} tasks, {len(time_entries)} time entries ({total_hours} total hours)"
        })
    
    def get_tool_info(self) -> Dict[str, Any]:
        """Get tool information for agent integration."""
        return {
            'description': self.description,
            'parameters': {
                'type': 'object',
                'properties': {
                    'action': {
                        'type': 'string',
                        'enum': [
                            'create_project', 'get_projects', 'get_project', 'update_project', 'delete_project',
                            'create_task', 'get_tasks', 'get_task', 'update_task', 'delete_task',
                            'create_time_entry', 'get_time_entries', 'delete_time_entry',
                            'get_templates', 'create_project_from_template', 'get_project_analytics', 'get_project_details'
                        ],
                        'description': 'The action to perform. Use get_project_details to get comprehensive project information including tasks and time entries. If no project_id is provided, the tool will automatically use the single available project.'
                    },
                    'project_id': {
                        'type': 'integer',
                        'description': 'Project ID for project-specific operations. If not provided, the tool will automatically use the single available project.'
                    },
                    'task_id': {
                        'type': 'integer',
                        'description': 'Task ID for task-specific operations'
                    },
                    'time_entry_id': {
                        'type': 'integer',
                        'description': 'Time entry ID for time entry operations'
                    },
                    'name': {
                        'type': 'string',
                        'description': 'Project or task name'
                    },
                    'title': {
                        'type': 'string',
                        'description': 'Task title'
                    },
                    'description': {
                        'type': 'string',
                        'description': 'Project or task description'
                    },
                    'priority': {
                        'type': 'string',
                        'enum': ['low', 'medium', 'high', 'urgent'],
                        'description': 'Priority level'
                    },
                    'status': {
                        'type': 'string',
                        'enum': ['pending', 'in_progress', 'completed', 'closed', 'achieved'],
                        'description': 'Task status'
                    },
                    'due_date': {
                        'type': 'string',
                        'format': 'date-time',
                        'description': 'Due date in ISO format'
                    },
                    'start_date': {
                        'type': 'string',
                        'format': 'date-time',
                        'description': 'Start date in ISO format'
                    },
                    'end_date': {
                        'type': 'string',
                        'format': 'date-time',
                        'description': 'End date in ISO format'
                    },
                    'estimated_hours': {
                        'type': 'number',
                        'description': 'Estimated hours for tasks'
                    },
                    'hours': {
                        'type': 'number',
                        'description': 'Hours for time tracking'
                    },
                    'assignee_id': {
                        'type': 'integer',
                        'description': 'User ID to assign task to'
                    },
                    'template_id': {
                        'type': 'string',
                        'description': 'Template ID for project creation'
                    },
                    'is_billable': {
                        'type': 'boolean',
                        'description': 'Whether time entry is billable'
                    },
                    'hourly_rate': {
                        'type': 'number',
                        'description': 'Hourly rate for billing'
                    },
                    'budget': {
                        'type': 'number',
                        'description': 'Project budget'
                    },
                    'color': {
                        'type': 'string',
                        'description': 'Project color (hex code)'
                    },
                    'tags': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'Task tags'
                    },
                    'integration_id': {
                        'type': 'integer',
                        'description': 'Integration ID for project management platform (automatically provided by the system)'
                    }
                },
                'required': ['action']
            }
        }
