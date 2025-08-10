"""
Base Tool Class for Marketplace Tools

This module provides the base class that all marketplace tools inherit from.
It provides common functionality, error handling, and a consistent interface.
"""

import asyncio
import json
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
import aiohttp
import requests

logger = logging.getLogger(__name__)

class BaseTool(ABC):
    """
    Base class for all marketplace tools.
    
    Provides common functionality like:
    - Error handling and logging
    - HTTP request helpers
    - Configuration management
    - Result formatting
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the tool with configuration.
        
        Args:
            config: Tool configuration dictionary
        """
        self.config = config
        self.name = config.get('name', self.__class__.__name__)
        self.description = config.get('description', '')
        self.category = config.get('category', 'Custom')
        self.tool_type = config.get('tool_type', 'Function')
        
    @abstractmethod
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute the tool with given parameters.
        
        Args:
            **kwargs: Tool-specific parameters
            
        Returns:
            Dictionary containing the result and metadata
        """
        pass
    
    async def execute_sync(self, **kwargs) -> Dict[str, Any]:
        """
        Synchronous wrapper for execute method.
        
        Args:
            **kwargs: Tool-specific parameters
            
        Returns:
            Dictionary containing the result and metadata
        """
        try:
            return await self.execute(**kwargs)
        except Exception as e:
            logger.error(f"Error executing {self.name}: {str(e)}")
            return self._format_error(str(e))
    
    def _format_success(self, result: Any, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Format a successful result.
        
        Args:
            result: The tool's result
            metadata: Additional metadata
            
        Returns:
            Formatted result dictionary
        """
        return {
            'success': True,
            'result': result,
            'metadata': metadata or {},
            'timestamp': datetime.utcnow().isoformat(),
            'tool_name': self.name
        }
    
    def _format_error(self, error_message: str, error_code: Optional[str] = None) -> Dict[str, Any]:
        """
        Format an error result.
        
        Args:
            error_message: Error message
            error_code: Optional error code
            
        Returns:
            Formatted error dictionary
        """
        return {
            'success': False,
            'error': error_message,
            'error_code': error_code,
            'timestamp': datetime.utcnow().isoformat(),
            'tool_name': self.name
        }
    
    async def _make_request(self, method: str, url: str, **kwargs) -> Dict[str, Any]:
        """
        Make an HTTP request with error handling.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            url: Request URL
            **kwargs: Additional request parameters
            
        Returns:
            Response data or error information
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.request(method, url, **kwargs) as response:
                    if response.status == 200:
                        data = await response.json()
                        return self._format_success(data)
                    else:
                        error_text = await response.text()
                        return self._format_error(f"HTTP {response.status}: {error_text}")
        except Exception as e:
            logger.error(f"Request error in {self.name}: {str(e)}")
            return self._format_error(f"Request failed: {str(e)}")
    
    def _make_sync_request(self, method: str, url: str, **kwargs) -> Dict[str, Any]:
        """
        Make a synchronous HTTP request.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            url: Request URL
            **kwargs: Additional request parameters
            
        Returns:
            Response data or error information
        """
        try:
            response = requests.request(method, url, **kwargs)
            if response.status_code == 200:
                data = response.json()
                return self._format_success(data)
            else:
                return self._format_error(f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Sync request error in {self.name}: {str(e)}")
            return self._format_error(f"Request failed: {str(e)}")
    
    def validate_config(self, required_keys: List[str]) -> bool:
        """
        Validate that required configuration keys are present.
        
        Args:
            required_keys: List of required configuration keys
            
        Returns:
            True if valid, False otherwise
        """
        missing_keys = [key for key in required_keys if key not in self.config]
        if missing_keys:
            logger.error(f"Missing required config keys for {self.name}: {missing_keys}")
            return False
        return True
    
    def get_config_value(self, key: str, default: Any = None) -> Any:
        """
        Get a configuration value with a default fallback.
        
        Args:
            key: Configuration key
            default: Default value if key not found
            
        Returns:
            Configuration value or default
        """
        return self.config.get(key, default)
    
    def log_execution(self, params: Dict[str, Any], result: Dict[str, Any]):
        """
        Log tool execution for monitoring and debugging.
        
        Args:
            params: Input parameters
            result: Execution result
        """
        logger.info(f"Tool {self.name} executed with params: {params}, result: {result.get('success', False)}")
    
    def __str__(self) -> str:
        return f"{self.name} ({self.category})"
    
    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} name='{self.name}' category='{self.category}'>" 