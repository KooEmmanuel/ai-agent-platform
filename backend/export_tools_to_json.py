#!/usr/bin/env python3
"""
Export marketplace tools from database to JSON file
This script exports all tools from the marketplace_tools table to a JSON file
"""

import asyncio
import sys
import os
import json
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db, Tool
from sqlalchemy import select

async def export_tools_to_json():
    """Export all marketplace tools to JSON file"""
    async for db in get_db():
        try:
            # Get all tools from the database
            result = await db.execute(select(Tool))
            tools = result.scalars().all()
            
            # Convert tools to JSON-serializable format
            tools_data = []
            for tool in tools:
                tool_dict = {
                    "id": tool.id,
                    "name": tool.name,
                    "description": tool.description,
                    "category": tool.category,
                    "tool_type": tool.tool_type,
                    "config": tool.config,
                    "is_public": tool.is_public,
                    "is_active": tool.is_active,
                    "created_at": tool.created_at.isoformat() if tool.created_at else None,
                    "updated_at": tool.updated_at.isoformat() if tool.updated_at else None,
                    "user_id": tool.user_id,
                    "cost": getattr(tool, 'cost', 10)  # Default cost if not set
                }
                tools_data.append(tool_dict)
            
            # Create the JSON file
            json_data = {
                "exported_at": datetime.utcnow().isoformat(),
                "total_tools": len(tools_data),
                "tools": tools_data
            }
            
            # Write to JSON file
            with open('marketplace_tools.json', 'w', encoding='utf-8') as f:
                json.dump(json_data, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Successfully exported {len(tools_data)} tools to marketplace_tools.json")
            print(f"📁 File location: {os.path.abspath('marketplace_tools.json')}")
            
            # Print summary
            print("\n📋 Tools exported:")
            for tool in tools_data:
                print(f"  • {tool['name']} ({tool['category']} - {tool['tool_type']})")
            
        except Exception as e:
            print(f"❌ Error exporting tools: {e}")
            raise
        finally:
            await db.close()

if __name__ == "__main__":
    print("📤 Exporting marketplace tools to JSON...")
    asyncio.run(export_tools_to_json())
    print("✅ Export completed!") 