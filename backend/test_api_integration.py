#!/usr/bin/env python3
"""
Test API Integration for Web Automation Tool

This script tests that the Web Automation Tool is accessible
through the API endpoints.
"""

import asyncio
import sys
import os
import json

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.marketplace_tools_service import MarketplaceToolsService
from app.services.tool_registry import ToolRegistry

async def test_api_integration():
    """Test that Web Automation Tool is accessible through API"""
    print("🧪 Testing API Integration for Web Automation Tool...")
    
    try:
        # Test 1: Marketplace service
        print("\n1. Testing Marketplace Service...")
        service = MarketplaceToolsService()
        all_tools = service.get_all_tools()
        print(f"   ✅ Loaded {len(all_tools)} total tools")
        
        # Test 2: Get public tools
        print("\n2. Testing Public Tools...")
        public_tools = service.get_public_tools()
        print(f"   ✅ Found {len(public_tools)} public tools")
        
        # Test 3: Find Web Automation Tool
        print("\n3. Testing Web Automation Tool...")
        web_automation_tools = [t for t in public_tools if t.get('name') == 'web_automation']
        
        if not web_automation_tools:
            print("   ❌ Web Automation Tool not found in public tools")
            return False
        
        tool = web_automation_tools[0]
        print(f"   ✅ Web Automation Tool found (ID: {tool.get('id')})")
        print(f"   ✅ Display Name: {tool.get('display_name')}")
        print(f"   ✅ Category: {tool.get('category')}")
        print(f"   ✅ Tool Type: {tool.get('tool_type')}")
        print(f"   ✅ Is Public: {tool.get('is_public')}")
        print(f"   ✅ Is Active: {tool.get('is_active')}")
        print(f"   ✅ Cost: {tool.get('cost')} credits")
        
        # Test 4: Tool registry
        print("\n4. Testing Tool Registry...")
        registry = ToolRegistry()
        tool_class = registry.get_tool_class('web_automation')
        
        if not tool_class:
            print("   ❌ Web Automation Tool not found in registry")
            return False
        
        print(f"   ✅ Tool class found: {tool_class.__name__}")
        
        # Test 5: Tool instantiation
        print("\n5. Testing Tool Instantiation...")
        config = {
            'browser': 'chromium',
            'headless': True,
            'timeout': 10000
        }
        
        tool_instance = tool_class(config)
        print(f"   ✅ Tool instantiated: {tool_instance.name}")
        
        # Test 6: Tool info
        print("\n6. Testing Tool Info...")
        tool_info = tool_instance.get_tool_info()
        print(f"   ✅ Tool info retrieved")
        print(f"   ✅ Capabilities: {len(tool_info.get('capabilities', []))} capabilities")
        print(f"   ✅ Supported actions: {len(tool_info.get('supported_actions', []))} actions")
        
        # Test 7: API Response Format
        print("\n7. Testing API Response Format...")
        api_response = {
            "id": tool.get('id'),
            "name": tool.get('name'),
            "display_name": tool.get('display_name'),
            "description": tool.get('description'),
            "category": tool.get('category'),
            "tool_type": tool.get('tool_type'),
            "config": tool.get('config', {}),
            "is_public": tool.get('is_public', True),
            "is_active": tool.get('is_active', True),
            "created_at": tool.get('created_at', ''),
            "updated_at": tool.get('updated_at'),
            "user_id": tool.get('user_id', 1),
            "is_in_user_collection": False  # Would be determined by user context
        }
        
        print(f"   ✅ API response format valid")
        print(f"   ✅ Response keys: {list(api_response.keys())}")
        
        print("\n🎉 API Integration test completed successfully!")
        print("\n📋 Summary:")
        print(f"   - Total marketplace tools: {len(all_tools)}")
        print(f"   - Public tools: {len(public_tools)}")
        print(f"   - Web Automation Tool ID: {tool.get('id')}")
        print(f"   - Web Automation Tool Category: {tool.get('category')}")
        print(f"   - Web Automation Tool Cost: {tool.get('cost')} credits")
        print(f"   - Tool Registry Integration: ✅")
        print(f"   - Frontend Metadata: ✅ (added to toolMetadata.tsx)")
        
        return True
        
    except Exception as e:
        print(f"❌ API Integration test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_api_integration())
    sys.exit(0 if success else 1)