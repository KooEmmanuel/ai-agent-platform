#!/usr/bin/env python3
"""
Seed Project Management Tool into the database
"""

import asyncio
import json
import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.core.database import get_db
from app.core.database import Tool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

async def seed_project_management_tool():
    """Seed the Project Management Tool into the database."""
    
    # Load the tool configuration from marketplace_tools.json
    tools_file = backend_dir / "marketplace_tools.json"
    
    if not tools_file.exists():
        print("❌ marketplace_tools.json not found")
        return
    
    with open(tools_file, 'r') as f:
        data = json.load(f)
    
    # Find the project management tool
    project_management_tool = None
    for tool in data['tools']:
        if tool['name'] == 'project_management_tool':
            project_management_tool = tool
            break
    
    if not project_management_tool:
        print("❌ Project Management Tool not found in marketplace_tools.json")
        return
    
    print(f"📋 Found Project Management Tool: {project_management_tool['display_name']}")
    
    # Get database session
    async for db in get_db():
        try:
            # Check if tool already exists
            result = await db.execute(
                select(Tool).where(Tool.name == 'project_management_tool')
            )
            existing_tool = result.scalar_one_or_none()
            
            if existing_tool:
                print(f"✅ Project Management Tool already exists (ID: {existing_tool.id})")
                return
            
            # Create new tool
            new_tool = Tool(
                name=project_management_tool['name'],
                description=project_management_tool['description'],
                category=project_management_tool['category'],
                tool_type=project_management_tool['tool_type'],
                config=project_management_tool['config'],
                is_public=project_management_tool['is_public'],
                is_active=project_management_tool['is_active'],
                user_id=project_management_tool['user_id']
            )
            
            db.add(new_tool)
            await db.commit()
            await db.refresh(new_tool)
            
            print(f"✅ Successfully seeded Project Management Tool (ID: {new_tool.id})")
            print(f"   Name: {new_tool.name}")
            print(f"   Category: {new_tool.category}")
            print(f"   Description: {new_tool.description[:100]}...")
            
        except Exception as e:
            print(f"❌ Error seeding Project Management Tool: {str(e)}")
            await db.rollback()
        finally:
            await db.close()
        break

if __name__ == "__main__":
    asyncio.run(seed_project_management_tool())
