"""
JSON-based tool loader for marketplace tools
"""

import json
import logging
from typing import Dict, Any, Optional, List
from pathlib import Path

logger = logging.getLogger(__name__)

class JSONToolLoader:
    """Load tools from marketplace_tools.json instead of database"""
    
    def __init__(self):
        self.tools_data = None
        self.tools_by_id = {}
        self.tools_by_name = {}
        self._load_tools()
    
    def _load_tools(self):
        """Load tools from marketplace_tools.json"""
        try:
            json_path = Path(__file__).parent.parent.parent / "marketplace_tools.json"
            with open(json_path, 'r') as f:
                self.tools_data = json.load(f)
            
            # Create lookup dictionaries
            for tool in self.tools_data.get('tools', []):
                tool_id = tool.get('id')
                tool_name = tool.get('name')
                
                if tool_id is not None:
                    self.tools_by_id[tool_id] = tool
                if tool_name:
                    self.tools_by_name[tool_name] = tool
            
            logger.info(f"✅ Loaded {len(self.tools_data.get('tools', []))} tools from marketplace_tools.json")
            
        except Exception as e:
            logger.error(f"❌ Failed to load marketplace_tools.json: {e}")
            self.tools_data = {"tools": []}
    
    def get_tool_by_id(self, tool_id: int) -> Optional[Dict[str, Any]]:
        """Get tool by ID"""
        return self.tools_by_id.get(tool_id)
    
    def get_tool_by_name(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """Get tool by name"""
        return self.tools_by_name.get(tool_name)
    
    def get_all_tools(self) -> List[Dict[str, Any]]:
        """Get all tools"""
        return self.tools_data.get('tools', [])
    
    def tool_exists(self, tool_id: int) -> bool:
        """Check if tool exists by ID"""
        return tool_id in self.tools_by_id
    
    def get_tool_config(self, tool_id: int) -> Optional[Dict[str, Any]]:
        """Get tool configuration by ID"""
        tool = self.get_tool_by_id(tool_id)
        return tool.get('config') if tool else None

# Global instance
json_tool_loader = JSONToolLoader() 