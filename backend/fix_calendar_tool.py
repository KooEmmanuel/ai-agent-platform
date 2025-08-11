#!/usr/bin/env python3
"""
Script to add the missing Calendar Manager tool to the database
"""

import asyncio
import json
from app.core.database import get_db, Tool
from sqlalchemy import select

async def add_calendar_manager():
    """Add the missing Calendar Manager tool to the database"""
    db = await anext(get_db())
    
    try:
        # Check if Calendar Manager already exists
        result = await db.execute(
            select(Tool).where(Tool.name == 'calendar_manager')
        )
        existing_tool = result.scalar_one_or_none()
        
        if existing_tool:
            print(f"✅ Calendar Manager tool already exists with ID: {existing_tool.id}")
            return
        
        # Calendar Manager tool definition from marketplace_tools.json
        calendar_manager_config = {
            "credentials_path": "path/to/credentials.json",
            "calendar_id": "primary",
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "Calendar operation",
                        "enum": [
                            "create_event",
                            "list_events",
                            "update_event",
                            "delete_event"
                        ]
                    },
                    "summary": {
                        "type": "string",
                        "description": "Event summary"
                    },
                    "start_time": {
                        "type": "string",
                        "description": "Event start time"
                    },
                    "end_time": {
                        "type": "string",
                        "description": "Event end time"
                    }
                },
                "required": [
                    "operation"
                ]
            }
        }
        
        # Create the Calendar Manager tool
        new_tool = Tool(
            user_id=1,  # System user ID
            name="calendar_manager",
            description="Manage calendar operations including creating events and scheduling",
            category="Scheduling",
            tool_type="Function",
            config=calendar_manager_config,
            is_public=True,
            is_active=True
        )
        
        db.add(new_tool)
        await db.commit()
        await db.refresh(new_tool)
        
        print(f"✅ Calendar Manager tool added successfully with ID: {new_tool.id}")
        print(f"✅ Tool name: {new_tool.name}")
        print(f"✅ Tool category: {new_tool.category}")
        
        # Verify the tool was added
        result = await db.execute(
            select(Tool).where(Tool.name == 'calendar_manager')
        )
        tool = result.scalar_one_or_none()
        
        if tool:
            print(f"✅ Verification: Calendar Manager found in database with ID: {tool.id}")
        else:
            print("❌ Verification failed: Calendar Manager not found in database")
        
    except Exception as e:
        print(f"❌ Error adding Calendar Manager tool: {e}")
        await db.rollback()
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(add_calendar_manager()) 