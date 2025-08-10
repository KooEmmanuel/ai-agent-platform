"""
Marketplace Tools Service
Loads marketplace tools from JSON file instead of database
"""

import json
import os
from typing import List, Optional, Dict, Any
from pathlib import Path

class MarketplaceToolsService:
    """Service for managing marketplace tools from JSON file"""
    
    def __init__(self):
        self.json_file_path = Path(__file__).parent.parent.parent / "marketplace_tools.json"
        self._tools_cache = None
        self._last_modified = None
    
    def _load_tools_from_json(self) -> List[Dict[str, Any]]:
        """Load tools from JSON file with caching"""
        if not self.json_file_path.exists():
            print(f"⚠️  Marketplace tools JSON file not found: {self.json_file_path}")
            return []
        
        # Check if file has been modified
        current_modified = self.json_file_path.stat().st_mtime
        if (self._tools_cache is not None and 
            self._last_modified is not None and 
            current_modified <= self._last_modified):
            return self._tools_cache
        
        try:
            with open(self.json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self._tools_cache = data.get('tools', [])
            self._last_modified = current_modified
            
            print(f"✅ Loaded {len(self._tools_cache)} marketplace tools from JSON")
            return self._tools_cache
            
        except Exception as e:
            print(f"❌ Error loading marketplace tools from JSON: {e}")
            return []
    
    def get_all_tools(self) -> List[Dict[str, Any]]:
        """Get all marketplace tools"""
        return self._load_tools_from_json()
    
    def get_tools_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get tools filtered by category"""
        tools = self._load_tools_from_json()
        return [tool for tool in tools if tool.get('category', '').lower() == category.lower()]
    
    def get_tools_by_type(self, tool_type: str) -> List[Dict[str, Any]]:
        """Get tools filtered by type"""
        tools = self._load_tools_from_json()
        return [tool for tool in tools if tool.get('tool_type', '').lower() == tool_type.lower()]
    
    def get_tool_by_id(self, tool_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific tool by ID"""
        tools = self._load_tools_from_json()
        for tool in tools:
            if tool.get('id') == tool_id:
                return tool
        return None
    
    def get_tool_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get a specific tool by name"""
        tools = self._load_tools_from_json()
        for tool in tools:
            if tool.get('name', '').lower() == name.lower():
                return tool
        return None
    
    def search_tools(self, query: str) -> List[Dict[str, Any]]:
        """Search tools by name, description, or category"""
        tools = self._load_tools_from_json()
        query_lower = query.lower()
        
        results = []
        for tool in tools:
            name = tool.get('name', '').lower()
            description = tool.get('description', '').lower()
            category = tool.get('category', '').lower()
            
            if (query_lower in name or 
                query_lower in description or 
                query_lower in category):
                results.append(tool)
        
        return results
    
    def get_categories(self) -> List[str]:
        """Get all available categories"""
        tools = self._load_tools_from_json()
        categories = set()
        for tool in tools:
            category = tool.get('category')
            if category:
                categories.add(category)
        return sorted(list(categories))
    
    def get_tool_types(self) -> List[str]:
        """Get all available tool types"""
        tools = self._load_tools_from_json()
        types = set()
        for tool in tools:
            tool_type = tool.get('tool_type')
            if tool_type:
                types.add(tool_type)
        return sorted(list(types))
    
    def get_active_tools(self) -> List[Dict[str, Any]]:
        """Get only active tools"""
        tools = self._load_tools_from_json()
        return [tool for tool in tools if tool.get('is_active', True)]
    
    def get_public_tools(self) -> List[Dict[str, Any]]:
        """Get only public tools"""
        tools = self._load_tools_from_json()
        return [tool for tool in tools if tool.get('is_public', True)]

# Create a singleton instance
marketplace_tools_service = MarketplaceToolsService() 