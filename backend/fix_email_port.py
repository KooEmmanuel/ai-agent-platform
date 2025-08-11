#!/usr/bin/env python3
import asyncio
import json
from sqlalchemy import text
from app.core.database import get_db

async def fix_email_port():
    async for db in get_db():
        try:
            # Get agent 1 tools
            result = await db.execute(text("SELECT tools FROM agents WHERE id = 1"))
            agent_data = result.fetchone()
            
            if agent_data:
                tools = agent_data[0]
                
                # Find email_sender tool and fix port
                for tool in tools:
                    if tool.get('name') == 'email_sender':
                        custom_config = tool.get('custom_config', {})
                        current_port = custom_config.get('smtp_port')
                        
                        print(f"📧 Current email_sender port: {current_port}")
                        
                        if current_port == 581:
                            print("❌ Port is wrong! Fixing to 587...")
                            custom_config['smtp_port'] = 587
                            tool['custom_config'] = custom_config
                            
                            # Convert to JSON string for database storage
                            tools_json = json.dumps(tools)
                            
                            # Update the database
                            await db.execute(
                                text("UPDATE agents SET tools = :tools WHERE id = 1"),
                                {"tools": tools_json}
                            )
                            await db.commit()
                            
                            print("✅ Fixed port to 587")
                        else:
                            print("✅ Port looks correct")
                        break
                else:
                    print("❌ email_sender tool not found")
            
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            await db.close()
        break

if __name__ == "__main__":
    asyncio.run(fix_email_port()) 