#!/usr/bin/env python3
"""
Test script for Google Meet integration with Calendar Manager
"""

import asyncio
import json
from marketplace_tools.calendar_manager import CalendarManagerTool

async def test_google_meet_integration():
    """Test creating calendar events with Google Meet links."""
    
    # Test configuration
    config = {
        'credentials_path': 'credentials/1/None_20250810_220715.json',
        'calendar_id': 'nyatefeemmanuel@gmail.com'
    }
    
    try:
        # Initialize Calendar Manager
        calendar_tool = CalendarManagerTool(config)
        
        print("🧪 Testing Google Meet integration...")
        
        # Test 1: Create event with Meet link
        print("\n📅 Test 1: Creating event with Google Meet link")
        result = await calendar_tool.execute(
            operation='create_event',
            summary='Test Meeting with Google Meet',
            start_time='2025-08-12T14:00:00Z',
            end_time='2025-08-12T15:00:00Z',
            description='This is a test meeting with Google Meet integration',
            attendees=['nyatefeemmanuel2@gmail.com'],
            add_meet_link=True
        )
        
        print(f"✅ Result: {json.dumps(result, indent=2)}")
        
        if result.get('success') and 'meet_link' in result.get('data', {}):
            print("🎉 SUCCESS: Google Meet link was created!")
            print(f"🔗 Meet Link: {result['data']['meet_link']}")
        else:
            print("❌ FAILED: No Meet link in response")
        
        # Test 2: Create event without Meet link
        print("\n📅 Test 2: Creating event without Google Meet link")
        result2 = await calendar_tool.execute(
            operation='create_event',
            summary='Test Meeting without Meet',
            start_time='2025-08-12T16:00:00Z',
            end_time='2025-08-12T17:00:00Z',
            description='This is a test meeting without Google Meet',
            add_meet_link=False
        )
        
        print(f"✅ Result: {json.dumps(result2, indent=2)}")
        
        if result2.get('success') and 'meet_link' not in result2.get('data', {}):
            print("🎉 SUCCESS: Event created without Meet link as expected!")
        else:
            print("❌ FAILED: Unexpected Meet link in response")
            
    except Exception as e:
        print(f"❌ Error during testing: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_google_meet_integration()) 