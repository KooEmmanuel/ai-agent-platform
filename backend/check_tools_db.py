#!/usr/bin/env python3
"""
Script to check tools in the database
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine
from sqlalchemy import text

async def check_tools():
    """Check what tools exist in the database"""
    try:
        async with engine.begin() as conn:
            # Check tools table
            result = await conn.execute(text("SELECT id, name, category, tool_type FROM tools ORDER BY id"))
            tools = result.fetchall()
            
            print("🔍 Tools in database:")
            print("=" * 50)
            if tools:
                for tool in tools:
                    print(f"ID: {tool[0]}, Name: {tool[1]}, Category: {tool[2]}, Type: {tool[3]}")
            else:
                print("❌ No tools found in database!")
            
            print("\n" + "=" * 50)
            
            # Check marketplace tools JSON
            import json
            try:
                with open('marketplace_tools.json', 'r') as f:
                    marketplace_data = json.load(f)
                
                # Handle the correct JSON structure
                if isinstance(marketplace_data, dict) and 'tools' in marketplace_data:
                    tools_list = marketplace_data['tools']
                    print(f"📦 Marketplace tools JSON has {len(tools_list)} tools")
                    
                    # Show first few marketplace tools
                    print("\nFirst 5 marketplace tools:")
                    for i, tool in enumerate(tools_list[:5]):
                        print(f"  {i+1}. ID: {tool.get('id')}, Name: {tool.get('name')}")
                        
                    # Check if multi_link_scraper exists in marketplace
                    multi_link_tool = None
                    for tool in tools_list:
                        if tool.get('name') == 'multi_link_scraper':
                            multi_link_tool = tool
                            break
                    
                    if multi_link_tool:
                        print(f"\n✅ Found multi_link_scraper in marketplace: ID {multi_link_tool.get('id')}")
                    else:
                        print("\n❌ multi_link_scraper NOT found in marketplace tools!")
                else:
                    print("❌ Invalid marketplace tools JSON structure!")
                    
            except FileNotFoundError:
                print("❌ marketplace_tools.json not found!")
                
    except Exception as e:
        print(f"❌ Error checking database: {e}")

if __name__ == "__main__":
    asyncio.run(check_tools()) 