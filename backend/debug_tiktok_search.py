#!/usr/bin/env python3
"""
Debug script for TikTok search to understand what's happening
"""

import asyncio
import sys
import os
import json

# Add the current directory to the path
sys.path.append(os.path.dirname(__file__))

# Import the tool properly
from marketplace_tools.web_search import WebSearchTool

async def debug_tiktok_search():
    """Debug the TikTok search to see what's happening"""
    
    # Initialize the web search tool
    config = {
        'max_results': 10,
        'safe_search': True,
        'timeout': 30
    }
    
    web_search_tool = WebSearchTool(config)
    
    print("🔍 Debugging TikTok Search")
    print("=" * 50)
    
    # Test with broader queries first
    test_queries = [
        "salon tiktok",  # Broader search
        "hair salon tiktok",  # More specific
        "beauty tiktok",  # Even broader
        "tiktok salon",  # Different order
        "salon Kumasi tiktok"  # Original query
    ]
    
    for query in test_queries:
        print(f"\n🔎 Testing query: '{query}'")
        print("-" * 30)
        
        try:
            # Test regular web search first
            print("📱 Testing regular web search...")
            web_result = await web_search_tool.execute(
                query=query,
                result_type="web",
                max_results=3
            )
            
            if web_result.get('success'):
                web_results = web_result.get('result', [])
                print(f"✅ Web search found {len(web_results)} results")
                for i, res in enumerate(web_results[:2], 1):
                    print(f"  {i}. {res.get('title', 'No title')[:50]}...")
                    print(f"     URL: {res.get('url', 'No URL')[:60]}...")
            else:
                print(f"❌ Web search failed: {web_result.get('error', 'Unknown error')}")
            
            # Test social media search
            print("\n📱 Testing social media search...")
            social_result = await web_search_tool.execute(
                query=query,
                result_type="social_media",
                max_results=3
            )
            
            if social_result.get('success'):
                social_results = social_result.get('result', [])
                print(f"✅ Social media search found {len(social_results)} results")
                for i, res in enumerate(social_results, 1):
                    print(f"  {i}. {res.get('title', 'No title')[:50]}...")
                    print(f"     Platform: {res.get('platform', 'Unknown')}")
                    print(f"     URL: {res.get('url', 'No URL')[:60]}...")
            else:
                print(f"❌ Social media search failed: {social_result.get('error', 'Unknown error')}")
                
        except Exception as e:
            print(f"❌ Error testing query '{query}': {str(e)}")
        
        print("\n" + "="*50)

if __name__ == "__main__":
    asyncio.run(debug_tiktok_search())
