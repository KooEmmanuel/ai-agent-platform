#!/usr/bin/env python3
"""
Test script to verify JSON tool loader is working
"""

import asyncio
from app.services.json_tool_loader import json_tool_loader

def test_json_tool_loader():
    """Test the JSON tool loader"""
    print("=== Testing JSON Tool Loader ===")
    
    # Test loading tools
    print(f"✅ Loaded {len(json_tool_loader.get_all_tools())} tools from marketplace_tools.json")
    
    # Test specific tool lookups
    test_tools = [
        {"id": 3, "name": "multi_link_scraper"},
        {"id": 4, "name": "email_sender"},
        {"id": 14, "name": "calendar_manager"}
    ]
    
    for test_tool in test_tools:
        tool_id = test_tool["id"]
        tool_name = test_tool["name"]
        
        # Test by ID
        tool_by_id = json_tool_loader.get_tool_by_id(tool_id)
        if tool_by_id:
            print(f"✅ Tool ID {tool_id} ({tool_name}): FOUND")
            print(f"   - Name: {tool_by_id.get('name')}")
            print(f"   - Category: {tool_by_id.get('category')}")
            print(f"   - Type: {tool_by_id.get('tool_type')}")
        else:
            print(f"❌ Tool ID {tool_id} ({tool_name}): NOT FOUND")
        
        # Test by name
        tool_by_name = json_tool_loader.get_tool_by_name(tool_name)
        if tool_by_name:
            print(f"✅ Tool name '{tool_name}': FOUND")
        else:
            print(f"❌ Tool name '{tool_name}': NOT FOUND")
        
        print()

if __name__ == "__main__":
    test_json_tool_loader() 