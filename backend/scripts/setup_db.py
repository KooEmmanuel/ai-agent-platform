#!/usr/bin/env python3
"""
Simple database setup script for the AI Agent Platform
"""

import asyncio
import sys
import os

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine, Base
from app.core.config import settings

async def setup_database():
    """Create all database tables"""
    print("Setting up database...")
    
    try:
        # Create all tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        print("✅ Database setup completed successfully!")
        print(f"Database file: {settings.DATABASE_URL}")
        
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        return False
    
    return True

async def main():
    """Main function"""
    print("🚀 AI Agent Platform Database Setup")
    print("=" * 40)
    
    success = await setup_database()
    
    if success:
        print("\n🎉 Database is ready!")
        print("You can now start the backend server.")
    else:
        print("\n💥 Database setup failed!")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 