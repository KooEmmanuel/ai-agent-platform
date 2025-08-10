#!/usr/bin/env python3
"""
Script to check database connection and run migrations
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from sqlalchemy import text

async def check_database():
    """Check database connection and tables"""
    print("🔍 Checking database connection...")
    
    async for db in get_db():
        try:
            # Check if we can connect
            result = await db.execute(text("SELECT 1"))
            print("✅ Database connection successful!")
            
            # Check if tools table exists and has data
            result = await db.execute(text("SELECT COUNT(*) FROM tools"))
            tool_count = result.scalar()
            print(f"📊 Found {tool_count} tools in database")
            
            # Check if users table exists
            result = await db.execute(text("SELECT COUNT(*) FROM users"))
            user_count = result.scalar()
            print(f"👥 Found {user_count} users in database")
            
            if tool_count == 0:
                print("⚠️  No tools found in database. You may need to run the seed script.")
            
        except Exception as e:
            print(f"❌ Database check failed: {e}")
            raise
        finally:
            await db.close()

if __name__ == "__main__":
    asyncio.run(check_database()) 