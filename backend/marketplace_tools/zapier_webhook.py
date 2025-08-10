"""
Zapier Webhook Tool

This tool provides functionality to trigger Zapier automations via webhooks.
It supports sending data to Zapier webhooks and managing webhook configurations.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from .base import BaseTool

logger = logging.getLogger(__name__)

class ZapierWebhookTool(BaseTool):
    """
    Tool for triggering Zapier automations via webhooks.
    
    Features: 
    - Send data to Zapier webhooks
    - Trigger automations
    - Handle webhook responses
    - Manage webhook configurations
    - Retry failed requests
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = "Zapier Webhook"
        self.description = "Trigger Zapier automations via webhooks"
        self.category = "Integration"
        self.tool_type = "Webhook"
        
        # Configuration
        self.default_timeout = config.get('timeout', 30)
        self.max_retries = config.get('max_retries', 3)
        self.retry_delay = config.get('retry_delay', 1)
        self.webhook_urls = config.get('webhook_urls', {})
        
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute Zapier webhook operation with given parameters.
        
        Args:
            action: Operation to perform (trigger, test, list_webhooks, etc.)
            webhook_name: Name of the webhook to trigger
            webhook_url: Direct webhook URL
            data: Data to send to webhook
            headers: Custom headers to include
            timeout: Request timeout in seconds
            retry_on_failure: Whether to retry on failure
            
        Returns:
            Dictionary containing operation result
        """
        action = kwargs.get('action', 'trigger')
        
        try:
            if action == 'trigger':
                return await self._trigger_webhook(kwargs)
            elif action == 'test':
                return await self._test_webhook(kwargs)
            elif action == 'list_webhooks':
                return await self._list_webhooks(kwargs)
            elif action == 'add_webhook':
                return await self._add_webhook(kwargs)
            elif action == 'remove_webhook':
                return await self._remove_webhook(kwargs)
            elif action == 'get_webhook_status':
                return await self._get_webhook_status(kwargs)
            else:
                return self._format_error(f"Unknown action: {action}")
                
        except Exception as e:
            logger.error(f"Error in Zapier webhook operation: {str(e)}")
            return self._format_error(f"Zapier webhook operation failed: {str(e)}")
    
    async def _trigger_webhook(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger a Zapier webhook."""
        webhook_name = params.get('webhook_name', '')
        webhook_url = params.get('webhook_url', '')
        data = params.get('data', {})
        headers = params.get('headers', {})
        timeout = params.get('timeout', self.default_timeout)
        retry_on_failure = params.get('retry_on_failure', True)
        
        # Get webhook URL
        if webhook_url:
            url = webhook_url
        elif webhook_name and webhook_name in self.webhook_urls:
            url = self.webhook_urls[webhook_name]
        else:
            return self._format_error("Either webhook_url or valid webhook_name is required")
        
        # Validate URL
        if not self._is_valid_webhook_url(url):
            return self._format_error("Invalid webhook URL")
        
        try:
            # Prepare request data
            payload = {
                'timestamp': datetime.now().isoformat(),
                'data': data
            }
            
            # Add custom headers
            request_headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'KooAgent-Zapier-Webhook/1.0'
            }
            request_headers.update(headers)
            
            # Send webhook with retry logic
            if retry_on_failure:
                result = await self._send_with_retry(url, payload, request_headers, timeout)
            else:
                result = await self._make_request('POST', url, json=payload, headers=request_headers, timeout=timeout)
            
            if result.get('success'):
                return self._format_success({
                    'webhook_triggered': True,
                    'webhook_name': webhook_name,
                    'webhook_url': url,
                    'data_sent': data,
                    'response_status': result.get('status_code', 200),
                    'response_data': result.get('result', {}),
                    'triggered_at': datetime.now().isoformat()
                })
            else:
                return result
                
        except Exception as e:
            return self._format_error(f"Error triggering webhook: {str(e)}")
    
    async def _test_webhook(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Test a webhook connection."""
        webhook_name = params.get('webhook_name', '')
        webhook_url = params.get('webhook_url', '')
        
        # Get webhook URL
        if webhook_url:
            url = webhook_url
        elif webhook_name and webhook_name in self.webhook_urls:
            url = self.webhook_urls[webhook_name]
        else:
            return self._format_error("Either webhook_url or valid webhook_name is required")
        
        # Validate URL
        if not self._is_valid_webhook_url(url):
            return self._format_error("Invalid webhook URL")
        
        try:
            # Send test payload
            test_payload = {
                'test': True,
                'timestamp': datetime.now().isoformat(),
                'message': 'Test webhook from KooAgent'
            }
            
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'KooAgent-Zapier-Webhook/1.0'
            }
            
            result = await self._make_request('POST', url, json=test_payload, headers=headers, timeout=10)
            
            if result.get('success'):
                return self._format_success({
                    'webhook_test': True,
                    'webhook_name': webhook_name,
                    'webhook_url': url,
                    'status': 'success',
                    'response_status': result.get('status_code', 200),
                    'response_time': result.get('response_time', 0),
                    'tested_at': datetime.now().isoformat()
                })
            else:
                return self._format_success({
                    'webhook_test': False,
                    'webhook_name': webhook_name,
                    'webhook_url': url,
                    'status': 'failed',
                    'error': result.get('error', 'Unknown error'),
                    'tested_at': datetime.now().isoformat()
                })
                
        except Exception as e:
            return self._format_error(f"Error testing webhook: {str(e)}")
    
    async def _list_webhooks(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """List configured webhooks."""
        try:
            webhooks = []
            
            for name, url in self.webhook_urls.items():
                webhook_info = {
                    'name': name,
                    'url': url,
                    'domain': urlparse(url).netloc if url else '',
                    'configured_at': datetime.now().isoformat()  # This would be stored in a real implementation
                }
                webhooks.append(webhook_info)
            
            return self._format_success({
                'webhooks': webhooks,
                'total_webhooks': len(webhooks)
            })
            
        except Exception as e:
            return self._format_error(f"Error listing webhooks: {str(e)}")
    
    async def _add_webhook(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Add a new webhook configuration."""
        webhook_name = params.get('webhook_name', '')
        webhook_url = params.get('webhook_url', '')
        description = params.get('description', '')
        
        if not webhook_name:
            return self._format_error("Webhook name is required")
        
        if not webhook_url:
            return self._format_error("Webhook URL is required")
        
        if not self._is_valid_webhook_url(webhook_url):
            return self._format_error("Invalid webhook URL")
        
        try:
            # In a real implementation, this would be stored in a database
            # For now, we'll just add to the in-memory dictionary
            self.webhook_urls[webhook_name] = webhook_url
            
            return self._format_success({
                'webhook_added': True,
                'webhook_name': webhook_name,
                'webhook_url': webhook_url,
                'description': description,
                'added_at': datetime.now().isoformat()
            })
            
        except Exception as e:
            return self._format_error(f"Error adding webhook: {str(e)}")
    
    async def _remove_webhook(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Remove a webhook configuration."""
        webhook_name = params.get('webhook_name', '')
        
        if not webhook_name:
            return self._format_error("Webhook name is required")
        
        if webhook_name not in self.webhook_urls:
            return self._format_error("Webhook not found")
        
        try:
            # Remove webhook
            removed_url = self.webhook_urls.pop(webhook_name)
            
            return self._format_success({
                'webhook_removed': True,
                'webhook_name': webhook_name,
                'webhook_url': removed_url,
                'removed_at': datetime.now().isoformat()
            })
            
        except Exception as e:
            return self._format_error(f"Error removing webhook: {str(e)}")
    
    async def _get_webhook_status(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get status of a webhook."""
        webhook_name = params.get('webhook_name', '')
        webhook_url = params.get('webhook_url', '')
        
        # Get webhook URL
        if webhook_url:
            url = webhook_url
        elif webhook_name and webhook_name in self.webhook_urls:
            url = self.webhook_urls[webhook_name]
        else:
            return self._format_error("Either webhook_url or valid webhook_name is required")
        
        try:
            # Test the webhook to get status
            test_result = await self._test_webhook({
                'webhook_url': url,
                'webhook_name': webhook_name
            })
            
            if test_result.get('success'):
                status_data = test_result['result']
                return self._format_success({
                    'webhook_name': webhook_name,
                    'webhook_url': url,
                    'status': 'active' if status_data.get('status') == 'success' else 'inactive',
                    'last_tested': status_data.get('tested_at'),
                    'response_time': status_data.get('response_time', 0),
                    'response_status': status_data.get('response_status', 0)
                })
            else:
                return self._format_success({
                    'webhook_name': webhook_name,
                    'webhook_url': url,
                    'status': 'error',
                    'error': test_result.get('error', 'Unknown error'),
                    'last_tested': datetime.now().isoformat()
                })
                
        except Exception as e:
            return self._format_error(f"Error getting webhook status: {str(e)}")
    
    async def _send_with_retry(self, url: str, payload: Dict[str, Any], 
                              headers: Dict[str, str], timeout: int) -> Dict[str, Any]:
        """Send webhook request with retry logic."""
        last_error = None
        
        for attempt in range(self.max_retries + 1):
            try:
                result = await self._make_request('POST', url, json=payload, headers=headers, timeout=timeout)
                
                if result.get('success'):
                    return result
                else:
                    last_error = result.get('error', 'Unknown error')
                    
            except Exception as e:
                last_error = str(e)
            
            # Wait before retry (except on last attempt)
            if attempt < self.max_retries:
                await asyncio.sleep(self.retry_delay * (attempt + 1))
        
        return self._format_error(f"Webhook failed after {self.max_retries + 1} attempts. Last error: {last_error}")
    
    def _is_valid_webhook_url(self, url: str) -> bool:
        """Validate webhook URL."""
        try:
            parsed = urlparse(url)
            return (
                parsed.scheme in ['http', 'https'] and
                parsed.netloc and
                'zapier.com' in parsed.netloc
            )
        except:
            return False
    
    async def trigger_multiple_webhooks(self, webhook_names: List[str], 
                                      data: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger multiple webhooks simultaneously."""
        if not webhook_names:
            return self._format_error("Webhook names are required")
        
        try:
            tasks = []
            for name in webhook_names:
                if name in self.webhook_urls:
                    task = self._trigger_webhook({
                        'webhook_name': name,
                        'data': data
                    })
                    tasks.append(task)
            
            # Execute all webhooks concurrently
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            successful = []
            failed = []
            
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    failed.append({
                        'webhook_name': webhook_names[i],
                        'error': str(result)
                    })
                elif result.get('success'):
                    successful.append({
                        'webhook_name': webhook_names[i],
                        'result': result['result']
                    })
                else:
                    failed.append({
                        'webhook_name': webhook_names[i],
                        'error': result.get('error', 'Unknown error')
                    })
            
            return self._format_success({
                'multiple_webhooks_triggered': True,
                'total_webhooks': len(webhook_names),
                'successful': len(successful),
                'failed': len(failed),
                'successful_webhooks': successful,
                'failed_webhooks': failed,
                'triggered_at': datetime.now().isoformat()
            })
            
        except Exception as e:
            return self._format_error(f"Error triggering multiple webhooks: {str(e)}")
    
    async def get_webhook_analytics(self, webhook_name: str = None) -> Dict[str, Any]:
        """Get analytics for webhook usage."""
        try:
            # In a real implementation, this would query a database for webhook usage statistics
            # For now, return mock data
            analytics = {
                'total_triggers': 0,
                'successful_triggers': 0,
                'failed_triggers': 0,
                'average_response_time': 0,
                'last_triggered': None,
                'webhook_name': webhook_name
            }
            
            if webhook_name and webhook_name in self.webhook_urls:
                analytics['webhook_exists'] = True
                analytics['webhook_url'] = self.webhook_urls[webhook_name]
            else:
                analytics['webhook_exists'] = False
            
            return self._format_success(analytics)
            
        except Exception as e:
            return self._format_error(f"Error getting webhook analytics: {str(e)}") 