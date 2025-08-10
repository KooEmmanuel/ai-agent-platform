#!/usr/bin/env python3
"""
Comprehensive demo of the three new tools with real examples
"""

import asyncio
import sys
import os
import json

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

async def demo_multi_link_scraper():
    """Demo the Multi-Link Web Scraper with multiple links"""
    print("🌐 Multi-Link Web Scraper Demo")
    print("-" * 40)
    
    try:
        from marketplace_tools.multi_link_scraper import multi_link_scraper
        
        # Configure multiple links
        config = {
            "links": [
                {
                    "url": "https://httpbin.org/html",
                    "description": "Test HTML page with sample content",
                    "tags": ["test", "html", "sample"]
                },
                {
                    "url": "https://httpbin.org/json",
                    "description": "JSON API endpoint with data",
                    "tags": ["api", "json", "data"]
                },
                {
                    "url": "https://httpbin.org/user-agent",
                    "description": "User agent information endpoint",
                    "tags": ["api", "user-agent", "info"]
                }
            ],
            "max_content_length": 1000,
            "relevance_threshold": 0.1
        }
        
        # Test different queries
        queries = [
            "HTML content and structure",
            "JSON data and API information",
            "user agent and browser details"
        ]
        
        for query in queries:
            print(f"\n🔍 Query: '{query}'")
            result = await multi_link_scraper.execute(config, query)
            
            if result.get('success'):
                print(f"   ✅ Found {result.get('total_results', 0)} relevant results")
                for i, res in enumerate(result.get('results', [])[:2]):  # Show first 2 results
                    print(f"   📄 Result {i+1}: {res.get('title', 'No title')}")
                    print(f"      URL: {res.get('url')}")
                    print(f"      Relevance: {res.get('relevance_score', 0):.2f}")
                    print(f"      Content: {res.get('content', '')[:100]}...")
            else:
                print(f"   ❌ Error: {result.get('error')}")
                
    except Exception as e:
        print(f"❌ Demo failed: {str(e)}")

async def demo_chromadb_tool():
    """Demo the ChromaDB Tool with sample text"""
    print("\n📚 ChromaDB Tool Demo")
    print("-" * 40)
    
    try:
        from marketplace_tools.chromadb_tool import chromadb_tool
        
        config = {
            "collection_name": "demo_collection",
            "chunk_size": 300,
            "chunk_overlap": 50,
            "persist_directory": "./demo_chroma_db"
        }
        
        # Create sample text content
        sample_text = """
        Artificial Intelligence (AI) is a branch of computer science that aims to create intelligent machines.
        These machines can perform tasks that typically require human intelligence, such as visual perception,
        speech recognition, decision-making, and language translation. Machine learning is a subset of AI that
        enables computers to learn and improve from experience without being explicitly programmed.
        
        Deep learning is a type of machine learning that uses neural networks with multiple layers to model
        and understand complex patterns in data. It has been particularly successful in areas like image
        recognition, natural language processing, and speech recognition.
        
        Natural Language Processing (NLP) is a field of AI that focuses on the interaction between computers
        and human language. It enables machines to understand, interpret, and generate human language in a
        meaningful way. Applications include chatbots, language translation, sentiment analysis, and text
        summarization.
        """
        
        # Simulate file upload (we'll create a text file)
        file_content = sample_text.encode('utf-8')
        file_name = "ai_concepts.txt"
        
        print(f"📤 Uploading file: {file_name}")
        upload_result = await chromadb_tool.upload_file(config, file_content, file_name)
        
        if upload_result.get('success'):
            print(f"   ✅ Upload successful!")
            print(f"   📊 Chunks created: {upload_result.get('chunks_created', 0)}")
            
            # Test queries
            queries = [
                "What is artificial intelligence?",
                "Explain machine learning",
                "How does deep learning work?",
                "What is natural language processing?"
            ]
            
            for query in queries:
                print(f"\n🔍 Query: '{query}'")
                query_result = await chromadb_tool.query_documents(config, query, n_results=2)
                
                if query_result.get('success'):
                    print(f"   ✅ Found {query_result.get('total_results', 0)} relevant chunks")
                    for i, res in enumerate(query_result.get('results', [])[:1]):  # Show first result
                        print(f"   📄 Chunk {i+1}:")
                        print(f"      Similarity: {res.get('similarity_score', 0):.3f}")
                        print(f"      Content: {res.get('content', '')[:150]}...")
                else:
                    print(f"   ❌ Error: {query_result.get('error')}")
        else:
            print(f"   ❌ Upload failed: {upload_result.get('error')}")
            
    except Exception as e:
        print(f"❌ Demo failed: {str(e)}")

async def demo_mongodb_advanced():
    """Demo the MongoDB Advanced Tool structure"""
    print("\n🗄️ MongoDB Advanced Tool Demo")
    print("-" * 40)
    
    try:
        from marketplace_tools.mongodb_advanced import mongodb_advanced
        
        # Show tool capabilities
        print("🔧 Tool Capabilities:")
        print("   • Natural language query parsing")
        print("   • Connection management with credentials")
        print("   • Support for find, count, and aggregate operations")
        print("   • Schema analysis and collection exploration")
        
        # Show example queries
        print("\n📝 Example Natural Language Queries:")
        example_queries = [
            "Find all users with age > 25",
            "Count documents in collection 'products'",
            "Show me the first 10 records from 'orders'",
            "Group users by department and count them"
        ]
        
        for query in example_queries:
            print(f"   • '{query}'")
        
        # Show configuration example
        print("\n⚙️ Configuration Example:")
        config_example = {
            "connection_string": "mongodb://username:password@host:port/database",
            "database_name": "my_database",
            "max_query_time": 30,
            "max_results": 100
        }
        print(f"   {json.dumps(config_example, indent=2)}")
        
        # Test tool structure
        print("\n🧪 Testing Tool Structure:")
        schema = mongodb_advanced.get_config_schema()
        print(f"   ✅ Configuration schema loaded")
        print(f"   📋 Required fields: {schema.get('parameters', {}).get('required', [])}")
        
    except Exception as e:
        print(f"❌ Demo failed: {str(e)}")

async def main():
    """Run comprehensive demo"""
    print("🚀 AI Agent Tools Comprehensive Demo")
    print("=" * 60)
    
    # Run demos
    await demo_multi_link_scraper()
    await demo_chromadb_tool()
    await demo_mongodb_advanced()
    
    print("\n" + "=" * 60)
    print("🎉 Demo Complete!")
    print("\n💡 Next Steps:")
    print("   1. Add these tools to your agents in the marketplace")
    print("   2. Configure them with your specific data sources")
    print("   3. Test them with real queries in the playground")
    print("   4. Monitor their performance and adjust settings")

if __name__ == "__main__":
    asyncio.run(main()) 