#!/usr/bin/env python3
"""
Test script for the three new tools:
1. Multi-Link Web Scraper
2. ChromaDB Tool
3. MongoDB Advanced Tool
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

async def test_multi_link_scraper():
    """Test the Multi-Link Web Scraper tool"""
    print("🧪 Testing Multi-Link Web Scraper...")
    
    try:
        from marketplace_tools.multi_link_scraper import multi_link_scraper
        
        # Test configuration
        config = {
            "links": [
                {
                    "url": "https://httpbin.org/html",
                    "description": "Test HTML page for scraping",
                    "tags": ["test", "html", "scraping"]
                }
            ],
            "max_content_length": 2000,
            "relevance_threshold": 0.1
        }
        
        # Test query
        query = "test scraping content"
        
        # Execute tool
        result = await multi_link_scraper.execute(config, query)
        
        print(f"✅ Multi-Link Scraper Test Result:")
        print(f"   Success: {result.get('success', False)}")
        if result.get('success'):
            print(f"   Results: {result.get('total_results', 0)}")
            print(f"   Summary: {result.get('summary', 'N/A')}")
        else:
            print(f"   Error: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ Multi-Link Scraper Test Failed: {str(e)}")

async def test_chromadb_tool():
    """Test the ChromaDB Tool"""
    print("\n🧪 Testing ChromaDB Tool...")
    
    try:
        from marketplace_tools.chromadb_tool import chromadb_tool
        
        # Test configuration
        config = {
            "collection_name": "test_collection",
            "chunk_size": 500,
            "chunk_overlap": 100,
            "persist_directory": "./test_chroma_db"
        }
        
        # Test collection stats
        stats_result = await chromadb_tool.get_collection_stats(config)
        
        print(f"✅ ChromaDB Tool Test Result:")
        print(f"   Success: {stats_result.get('success', False)}")
        if stats_result.get('success'):
            print(f"   Collection: {stats_result.get('collection_name', 'N/A')}")
            print(f"   Total Documents: {stats_result.get('total_documents', 0)}")
            print(f"   Total Chunks: {stats_result.get('total_chunks', 0)}")
        else:
            print(f"   Error: {stats_result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ ChromaDB Tool Test Failed: {str(e)}")

async def test_mongodb_advanced():
    """Test the MongoDB Advanced Tool"""
    print("\n🧪 Testing MongoDB Advanced Tool...")
    
    try:
        from marketplace_tools.mongodb_advanced import mongodb_advanced
        
        # Test configuration (using a mock connection string)
        config = {
            "connection_string": "mongodb://localhost:27017/test",
            "database_name": "test",
            "max_query_time": 5,
            "max_results": 10
        }
        
        # Test connection (this will fail but we can test the tool structure)
        connection_result = mongodb_advanced._test_connection(config)
        
        print(f"✅ MongoDB Advanced Tool Test Result:")
        print(f"   Success: {connection_result.get('success', False)}")
        if not connection_result.get('success'):
            print(f"   Expected Error: {connection_result.get('error', 'Unknown error')}")
            print("   (This is expected since we don't have MongoDB running)")
            
    except Exception as e:
        print(f"❌ MongoDB Advanced Tool Test Failed: {str(e)}")

async def test_tool_imports():
    """Test that all tools can be imported correctly"""
    print("🧪 Testing Tool Imports...")
    
    try:
        # Test imports
        from marketplace_tools.multi_link_scraper import multi_link_scraper
        from marketplace_tools.chromadb_tool import chromadb_tool
        from marketplace_tools.mongodb_advanced import mongodb_advanced
        
        print("✅ All tools imported successfully!")
        
        # Test tool properties
        print(f"   Multi-Link Scraper: {multi_link_scraper.name} - {multi_link_scraper.description}")
        print(f"   ChromaDB Tool: {chromadb_tool.name} - {chromadb_tool.description}")
        print(f"   MongoDB Advanced: {mongodb_advanced.name} - {mongodb_advanced.description}")
        
        return True
        
    except Exception as e:
        print(f"❌ Tool Import Test Failed: {str(e)}")
        return False

async def main():
    """Run all tests"""
    print("🚀 Testing New AI Agent Tools")
    print("=" * 50)
    
    # Test imports first
    imports_ok = await test_tool_imports()
    
    if imports_ok:
        # Test individual tools
        await test_multi_link_scraper()
        await test_chromadb_tool()
        await test_mongodb_advanced()
    
    print("\n" + "=" * 50)
    print("🎉 Testing Complete!")

if __name__ == "__main__":
    asyncio.run(main()) 