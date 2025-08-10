#!/usr/bin/env python3
"""
Script to run the seed script on Railway
This will populate the database with default tools
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from seed_default_tools import seed_default_tools

async def main():
    """Main function to run the seed script"""
    print("🌱 Starting to seed default tools...")
    try:
        await seed_default_tools()
        print("✅ Seed completed successfully!")
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 