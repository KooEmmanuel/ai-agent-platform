#!/usr/bin/env python3
import asyncio
import json
from sqlalchemy import select, text
from app.core.database import get_db

async def check_and_fix_email_config():
    async for db in get_db():
        try:
            # Get agent 1 directly from database
            result = await db.execute(text("SELECT tools FROM agents WHERE id = 1"))
            agent_data = result.fetchone()
            
            if agent_data:
                tools = agent_data[0]
                print("🔍 Current agent tools configuration:")
                print(json.dumps(tools, indent=2))
                
                # Check if email_sender has wrong port
                if 'email_sender' in tools:
                    email_config = tools['email_sender'].get('custom_config', {})
                    current_port = email_config.get('smtp_port')
                    
                    print(f"\n📧 Current email_sender port: {current_port}")
                    
                    if current_port == 581:
                        print("❌ Port is wrong! Should be 587 for Gmail")
                        
                        # Fix the port
                        tools['email_sender']['custom_config']['smtp_port'] = 587
                        
                        # Update the database
                        await db.execute(
                            text("UPDATE agents SET tools = :tools WHERE id = 1"),
                            {"tools": tools}
                        )
                        await db.commit()
                        
                        print("✅ Fixed port to 587")
                    else:
                        print("✅ Port looks correct")
                else:
                    print("❌ No email_sender found in agent tools")
            
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            await db.close()
        break

if __name__ == "__main__":
    asyncio.run(check_and_fix_email_config()) 