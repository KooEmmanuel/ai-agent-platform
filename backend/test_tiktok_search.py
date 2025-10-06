#!/usr/bin/env python3
"""
Test script for enhanced TikTok business search
"""

import asyncio
import sys
import os
import json

# Add the current directory to the path
sys.path.append(os.path.dirname(__file__))

# Import the tool properly
from marketplace_tools.web_search import WebSearchTool

async def test_tiktok_search():
    """Test the enhanced TikTok business search functionality"""
    
    # Initialize the web search tool
    config = {
        'max_results': 10,
        'safe_search': True,
        'timeout': 30
    }
    
    web_search_tool = WebSearchTool(config)
    
    print("🔍 Testing Enhanced TikTok Business Search")
    print("=" * 50)
    
    # Test queries for salon businesses in Kumasi
    test_queries = [
        "salon Kumasi tiktok",
        "salon tiktok Kumasi",
        "hair salon tiktok Kumasi",
        "beauty salon tiktok Kumasi"
    ]
    
    for query in test_queries:
        print(f"\n🔎 Testing query: '{query}'")
        print("-" * 30)
        
        try:
            # Test the social media search
            result = await web_search_tool.execute(
                query=query,
                result_type="social_media",
                max_results=5
            )
            
            print(f"✅ Search completed")
            print(f"📊 Results found: {len(result.get('result', []))}")
            
            if result.get('success'):
                results = result.get('result', [])
                metadata = result.get('metadata', {})
                
                print(f"📈 Metadata: {json.dumps(metadata, indent=2)}")
                
                if results:
                    print(f"\n📋 Found {len(results)} results:")
                    for i, res in enumerate(results, 1):
                        print(f"\n{i}. {res.get('title', 'No title')}")
                        print(f"   URL: {res.get('url', 'No URL')}")
                        print(f"   Platform: {res.get('platform', 'Unknown')}")
                        print(f"   Username: {res.get('username', 'No username')}")
                        print(f"   Business Account: {res.get('is_business_account', False)}")
                        print(f"   Snippet: {res.get('snippet', 'No snippet')[:100]}...")
                        
                        if res.get('engagement_indicators'):
                            indicators = res.get('engagement_indicators', {})
                            print(f"   Engagement: {json.dumps(indicators, indent=6)}")
                else:
                    print("❌ No results found")
            else:
                print(f"❌ Search failed: {result.get('error', 'Unknown error')}")
                
        except Exception as e:
            print(f"❌ Error testing query '{query}': {str(e)}")
        
        print("\n" + "="*50)

if __name__ == "__main__":
    asyncio.run(test_tiktok_search())
