"""
Webhook Handler Tool

A tool for handling webhooks including sending webhooks to external services,
receiving webhooks, and managing webhook configurations.
"""

import asyncio
import json
import logging
import hmac
import hashlib
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
import aiohttp
from aiohttp import web
import base64

from .base import BaseTool

logger = logging.getLogger(__name__)

class WebhookHandlerTool(BaseTool):
    """
    Webhook Handler Tool for managing webhook operations.
    
    Features:
    - Send webhooks to external services
    - Receive and validate webhooks
    - Webhook signature verification
    - Retry mechanisms
    - Webhook event logging
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.secret_key = config.get('secret_key', '')
        self.max_retries = config.get('max_retries', 3)
        self.timeout = config.get('timeout', 30)
        self.verify_ssl = config.get('verify_ssl', True)
        
    async def execute(self, operation: str, **kwargs) -> Dict[str, Any]:
        """
        Execute webhook operation.
        
        Args:
            operation: Type of operation (send, receive, verify, etc.)
            **kwargs: Operation-specific parameters
            
        Returns:
            Operation result
        """
        try:
            if operation == "send":
                return await self._send_webhook(**kwargs)
            elif operation == "verify_signature":
                return await self._verify_webhook_signature(**kwargs)
            elif operation == "create_signature":
                return await self._create_webhook_signature(**kwargs)
            elif operation == "test_endpoint":
                return await self._test_webhook_endpoint(**kwargs)
            else:
                return self._format_error(f"Unsupported operation: {operation}")
                
        except Exception as e:
            logger.error(f"Webhook operation error: {str(e)}")
            return self._format_error(f"Webhook operation failed: {str(e)}")
    
    async def _send_webhook(self, url: str, payload: Dict[str, Any], 
                          method: str = "POST", headers: Optional[Dict[str, str]] = None,
                          secret: Optional[str] = None, retry_count: int = 0) -> Dict[str, Any]:
        """Send webhook to external service."""
        try:
            if not url or not payload:
                return self._format_error("URL and payload are required")
            
            # Prepare headers
            request_headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'WebhookHandler/1.0'
            }
            
            if headers:
                request_headers.update(headers)
            
            # Add signature if secret is provided
            if secret:
                signature = self._create_signature(payload, secret)
                request_headers['X-Webhook-Signature'] = signature
            
            # Prepare request data
            request_data = json.dumps(payload, default=str)
            
            # Send webhook
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method=method,
                    url=url,
                    data=request_data,
                    headers=request_headers,
                    timeout=aiohttp.ClientTimeout(total=self.timeout),
                    ssl=self.verify_ssl
                ) as response:
                    response_text = await response.text()
                    
                    result = {
                        'status_code': response.status,
                        'status_text': response.reason,
                        'response_headers': dict(response.headers),
                        'response_body': response_text,
                        'success': 200 <= response.status < 300
                    }
                    
                    # Retry on failure if retries remaining
                    if not result['success'] and retry_count < self.max_retries:
                        await asyncio.sleep(2 ** retry_count)  # Exponential backoff
                        return await self._send_webhook(
                            url, payload, method, headers, secret, retry_count + 1
                        )
                    
                    metadata = {
                        'operation': 'send_webhook',
                        'url': url,
                        'method': method,
                        'retry_count': retry_count,
                        'payload_size': len(request_data)
                    }
                    
                    return self._format_success(result, metadata)
                    
        except Exception as e:
            raise Exception(f"Webhook send error: {str(e)}")
    
    async def _verify_webhook_signature(self, payload: str, signature: str, 
                                      secret: Optional[str] = None) -> Dict[str, Any]:
        """Verify webhook signature."""
        try:
            secret = secret or self.secret_key
            if not secret:
                return self._format_error("Secret key is required for signature verification")
            
            # Create expected signature
            expected_signature = self._create_signature(payload, secret)
            
            # Compare signatures
            is_valid = hmac.compare_digest(signature, expected_signature)
            
            verification_data = {
                'is_valid': is_valid,
                'provided_signature': signature,
                'expected_signature': expected_signature,
                'payload_hash': hashlib.sha256(payload.encode()).hexdigest()
            }
            
            metadata = {
                'operation': 'verify_signature',
                'signature_length': len(signature)
            }
            
            return self._format_success(verification_data, metadata)
            
        except Exception as e:
            raise Exception(f"Signature verification error: {str(e)}")
    
    async def _create_webhook_signature(self, payload: Union[str, Dict[str, Any]], 
                                      secret: Optional[str] = None) -> Dict[str, Any]:
        """Create webhook signature."""
        try:
            secret = secret or self.secret_key
            if not secret:
                return self._format_error("Secret key is required for signature creation")
            
            # Convert payload to string if it's a dict
            if isinstance(payload, dict):
                payload_str = json.dumps(payload, sort_keys=True)
            else:
                payload_str = str(payload)
            
            signature = self._create_signature(payload_str, secret)
            
            signature_data = {
                'signature': signature,
                'payload_hash': hashlib.sha256(payload_str.encode()).hexdigest(),
                'algorithm': 'sha256'
            }
            
            metadata = {
                'operation': 'create_signature',
                'payload_type': type(payload).__name__
            }
            
            return self._format_success(signature_data, metadata)
            
        except Exception as e:
            raise Exception(f"Signature creation error: {str(e)}")
    
    async def _test_webhook_endpoint(self, url: str, method: str = "POST",
                                   test_payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Test webhook endpoint connectivity and response."""
        try:
            if not url:
                return self._format_error("URL is required")
            
            test_payload = test_payload or {
                'test': True,
                'timestamp': datetime.utcnow().isoformat(),
                'message': 'Webhook endpoint test'
            }
            
            # Send test webhook
            result = await self._send_webhook(url, test_payload, method)
            
            if result['success']:
                test_data = {
                    'endpoint_url': url,
                    'method': method,
                    'status': 'reachable',
                    'response_time_ms': result.get('response_time', 0),
                    'test_payload': test_payload
                }
            else:
                test_data = {
                    'endpoint_url': url,
                    'method': method,
                    'status': 'unreachable',
                    'error': result.get('error', 'Unknown error'),
                    'test_payload': test_payload
                }
            
            metadata = {
                'operation': 'test_endpoint',
                'url': url,
                'method': method
            }
            
            return self._format_success(test_data, metadata)
            
        except Exception as e:
            raise Exception(f"Endpoint test error: {str(e)}")
    
    def _create_signature(self, payload: str, secret: str) -> str:
        """Create HMAC signature for webhook payload."""
        signature = hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        )
        return base64.b64encode(signature.digest()).decode('utf-8')
    
    async def send_webhook_with_retry(self, url: str, payload: Dict[str, Any],
                                    max_retries: Optional[int] = None,
                                    **kwargs) -> Dict[str, Any]:
        """
        Send webhook with automatic retry mechanism.
        
        Args:
            url: Webhook URL
            payload: Webhook payload
            max_retries: Maximum number of retries
            **kwargs: Additional webhook parameters
            
        Returns:
            Webhook send result
        """
        max_retries = max_retries or self.max_retries
        
        for attempt in range(max_retries + 1):
            try:
                result = await self._send_webhook(url, payload, retry_count=attempt, **kwargs)
                
                if result['success']:
                    return result
                
                if attempt < max_retries:
                    # Wait before retry with exponential backoff
                    wait_time = 2 ** attempt
                    await asyncio.sleep(wait_time)
                    
            except Exception as e:
                if attempt == max_retries:
                    return self._format_error(f"Webhook failed after {max_retries} retries: {str(e)}")
                
                # Wait before retry
                await asyncio.sleep(2 ** attempt)
        
        return self._format_error(f"Webhook failed after {max_retries} retries")
    
    async def create_webhook_server(self, port: int = 8080, 
                                  webhook_path: str = "/webhook") -> Dict[str, Any]:
        """
        Create a simple webhook server for receiving webhooks.
        
        Args:
            port: Server port
            webhook_path: Webhook endpoint path
            
        Returns:
            Server information
        """
        try:
            app = web.Application()
            
            @app.route(webhook_path, 'POST')
            async def webhook_handler(request):
                try:
                    # Get request data
                    payload = await request.json()
                    headers = dict(request.headers)
                    
                    # Verify signature if present
                    signature = headers.get('X-Webhook-Signature')
                    if signature and self.secret_key:
                        payload_str = json.dumps(payload, sort_keys=True)
                        is_valid = await self._verify_webhook_signature(payload_str, signature)
                        
                        if not is_valid['is_valid']:
                            return web.Response(status=401, text="Invalid signature")
                    
                    # Process webhook
                    webhook_data = {
                        'payload': payload,
                        'headers': headers,
                        'timestamp': datetime.utcnow().isoformat(),
                        'ip_address': request.remote
                    }
                    
                    # Log webhook (in a real implementation, you'd store this)
                    logger.info(f"Received webhook: {webhook_data}")
                    
                    return web.json_response({
                        'status': 'received',
                        'timestamp': webhook_data['timestamp']
                    })
                    
                except Exception as e:
                    logger.error(f"Webhook processing error: {str(e)}")
                    return web.Response(status=500, text="Internal server error")
            
            # Start server
            runner = web.AppRunner(app)
            await runner.setup()
            site = web.TCPSite(runner, 'localhost', port)
            await site.start()
            
            server_data = {
                'server_url': f"http://localhost:{port}",
                'webhook_url': f"http://localhost:{port}{webhook_path}",
                'port': port,
                'status': 'running'
            }
            
            metadata = {
                'operation': 'create_webhook_server',
                'port': port,
                'webhook_path': webhook_path
            }
            
            return self._format_success(server_data, metadata)
            
        except Exception as e:
            raise Exception(f"Server creation error: {str(e)}")
    
    def get_tool_info(self) -> Dict[str, Any]:
        """
        Get information about this tool.
        
        Returns:
            Tool information dictionary
        """
        return {
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'tool_type': self.tool_type,
            'capabilities': [
                'Send webhooks to external services',
                'Receive and validate webhooks',
                'Webhook signature verification',
                'Automatic retry mechanisms',
                'Webhook endpoint testing',
                'Webhook server creation'
            ],
            'supported_operations': [
                'send',
                'verify_signature',
                'create_signature',
                'test_endpoint',
                'send_webhook_with_retry',
                'create_webhook_server'
            ],
            'parameters': {
                'operation': 'Type of webhook operation (required)',
                'url': 'Webhook URL (for send operations)',
                'payload': 'Webhook payload data (for send operations)',
                'method': 'HTTP method (GET, POST, PUT, DELETE)',
                'headers': 'Custom HTTP headers',
                'secret': 'Secret key for signature verification'
            }
        } 