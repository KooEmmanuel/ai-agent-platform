#!/usr/bin/env python3
"""
Script to check the status of a Sora2 video generation job and retrieve it when ready.
"""

import asyncio
import os
import sys
from dotenv import load_dotenv
from marketplace_tools.sora2_tool import Sora2Tool

# Load environment variables
load_dotenv()

async def check_and_retrieve_video(video_id: str):
    """Check video status and retrieve when ready"""
    tool = Sora2Tool()
    
    print(f"🔍 Checking status of video: {video_id}")
    
    # Check status
    status_result = await tool._check_video_status(video_id)
    
    if not status_result.get('success'):
        print(f"❌ Error checking status: {status_result.get('error')}")
        return
    
    print(f"📊 Video Status: {status_result.get('status')}")
    print(f"📈 Progress: {status_result.get('progress', 0)}%")
    
    if status_result.get('status') == 'completed':
        print("✅ Video is completed! Retrieving...")
        
        # Get the completed video
        video_result = await tool._get_completed_video(video_id)
        
        if video_result.get('success'):
            print(f"🎉 Video retrieved successfully!")
            print(f"📁 Filename: {video_result.get('filename')}")
            print(f"🔗 Blob URL: {video_result.get('video_url')}")
            print(f"📏 Size: {video_result.get('size')} bytes")
        else:
            print(f"❌ Error retrieving video: {video_result.get('error')}")
    else:
        print(f"⏳ Video is still processing. Status: {status_result.get('status')}")
        print("💡 Run this script again in a few minutes to check again.")

async def main():
    if len(sys.argv) != 2:
        print("Usage: python check_video_status.py <video_id>")
        print("Example: python check_video_status.py video_68f1cf28173c81908ee6b000f8c7e3c307eaf6d79cfadc02")
        sys.exit(1)
    
    video_id = sys.argv[1]
    await check_and_retrieve_video(video_id)

if __name__ == "__main__":
    asyncio.run(main())
