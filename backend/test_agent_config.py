#!/usr/bin/env python3
"""
Test script to verify the new agent config endpoint
"""

import asyncio
import json
from app.core.database import get_db, Agent
from app.services.json_tool_loader import json_tool_loader
from sqlalchemy import select

async def test_agent_config():
    """Test getting tool configuration for a specific agent"""
    db = await anext(get_db())
    
    try:
        print("=== Testing Agent Tool Configuration ===")
        
        # Test with Calendar Manager (ID: 14) and Agent ID: 1
        tool_id = 14
        agent_id = 1
        
        print(f"Testing tool ID: {tool_id} (Calendar Manager)")
        print(f"Testing agent ID: {agent_id}")
        
        # Get base tool configuration from JSON
        tool_data = json_tool_loader.get_tool_by_id(tool_id)
        if not tool_data:
            print(f"❌ Tool with ID {tool_id} not found in JSON")
            return
        
        print(f"✅ Found tool: {tool_data.get('name')}")
        print(f"✅ Tool category: {tool_data.get('category')}")
        print(f"✅ Tool type: {tool_data.get('tool_type')}")
        
        # Get agent
        result = await db.execute(
            select(Agent).where(Agent.id == agent_id)
        )
        agent = result.scalar_one_or_none()
        
        if not agent:
            print(f"❌ Agent with ID {agent_id} not found")
            return
        
        print(f"✅ Found agent: {agent.name}")
        
        # Find current tool configuration in agent's tools
        current_config = None
        is_configured = False
        
        if agent.tools:
            for tool_config in agent.tools:
                if isinstance(tool_config, dict):
                    config_tool_id = tool_config.get('id') or tool_config.get('tool_id')
                    if config_tool_id == tool_id:
                        current_config = tool_config.get('custom_config', {})
                        is_configured = True
                        break
        
        print(f"✅ Tool configured in agent: {is_configured}")
        if current_config:
            print(f"✅ Current configuration: {json.dumps(current_config, indent=2)}")
        else:
            print("ℹ️ No current configuration found")
        
        # Show what the endpoint would return
        response = {
            "tool_id": tool_id,
            "tool_name": tool_data.get('name'),
            "tool_description": tool_data.get('description'),
            "tool_category": tool_data.get('category'),
            "tool_type": tool_data.get('tool_type'),
            "base_config": tool_data.get('config', {}),
            "current_config": current_config or {},
            "is_configured": is_configured,
            "agent_id": agent_id,
            "agent_name": agent.name
        }
        
        print("\n=== Endpoint Response ===")
        print(json.dumps(response, indent=2))
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(test_agent_config()) 