"""
Website Knowledge Base Tool

Modified to work with pre-built collections instead of crawling websites.
"""

import asyncio
import json
import logging
import hashlib
import os
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse, urljoin
import aiohttp
from bs4 import BeautifulSoup
import chromadb
from chromadb.config import Settings

from .base import BaseTool

logger = logging.getLogger(__name__)

class WebsiteKnowledgeBaseTool(BaseTool):
    """Knowledge Base Tool for querying pre-built collections."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.chroma_client = chromadb.PersistentClient(path="./chroma_db")
        self.retrieval_config = config.get('retrieval', {
            'top_k': 5,
            'similarity_threshold': 0.7,
            'max_tokens': 2000
        })
    
    async def execute(self, operation: str = "query_knowledge_base", query: str = None, **kwargs) -> Dict[str, Any]:
        """Execute knowledge base operations."""
        try:
            # Handle the case where query is passed directly without operation
            if query and not kwargs.get('query'):
                kwargs['query'] = query
            
            if operation == "query_knowledge_base":
                return await self._query_knowledge_base(**kwargs)
            elif operation == "list_collections":
                return await self._list_collections(**kwargs)
            elif operation == "get_collection_stats":
                return await self._get_collection_stats(**kwargs)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported operation: {operation}"
                }
        except Exception as e:
            logger.error(f"Error in WebsiteKnowledgeBaseTool: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _query_knowledge_base(self, collection_name: str = None, query: str = None, top_k: int = None, **kwargs) -> Dict[str, Any]:
        """Query a knowledge base collection."""
        try:
            # If collection_name is not provided, try to get it from the tool configuration
            if not collection_name:
                collection_name = self.config.get('collection_name')
            
            if not collection_name:
                return {
                    "success": False,
                    "error": "Collection name is required"
                }
            
            if not query:
                return {
                    "success": False,
                    "error": "Query is required"
                }
            
            top_k = top_k or self.retrieval_config.get('top_k', 5)
            
            logger.info(f"🔍 Querying collection '{collection_name}' with query: {query}")
            logger.info(f"📊 Retrieval config: top_k={top_k}, similarity_threshold={self.retrieval_config.get('similarity_threshold', 0.7)}")
            
            # Get collection
            try:
                collection = self.chroma_client.get_collection(collection_name)
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Collection '{collection_name}' not found: {str(e)}"
                }
            
            # Query the collection
            results = collection.query(
                query_texts=[query],
                n_results=top_k
            )
            
            logger.info(f"🔍 Raw query results: {results}")
            logger.info(f"📊 Results structure - documents: {type(results.get('documents'))}, length: {len(results.get('documents', []))}")
            if results.get('documents'):
                logger.info(f"📄 First document array: {type(results['documents'][0])}, length: {len(results['documents'][0]) if results['documents'][0] else 0}")
            
            # Format results
            formatted_results = []
            if results['documents'] and results['documents'][0]:
                for i, doc in enumerate(results['documents'][0]):
                    formatted_results.append({
                        'content': doc,
                        'metadata': results['metadatas'][0][i] if results['metadatas'] and results['metadatas'][0] else {},
                        'distance': results['distances'][0][i] if results['distances'] and results['distances'][0] else 0
                    })
                    
                    # Log each retrieved document
                    metadata = results['metadatas'][0][i] if results['metadatas'] and results['metadatas'][0] else {}
                    distance = results['distances'][0][i] if results['distances'] and results['distances'][0] else 0
                    source_url = metadata.get('source_url', 'Unknown source')
                    title = metadata.get('title', 'No title')
                    
                    logger.info(f"📄 Document {i+1}:")
                    logger.info(f"   Title: {title}")
                    logger.info(f"   Source: {source_url}")
                    logger.info(f"   Similarity Score: {1 - distance:.3f}")
                    logger.info(f"   Content Preview: {doc[:200]}...")
                    logger.info(f"   Content Length: {len(doc)} characters")
                    logger.info("   " + "-" * 50)
            
            # Assemble context
            context = self._assemble_context(formatted_results)
            
            logger.info(f"✅ Found {len(formatted_results)} relevant documents")
            logger.info(f"📝 Total context length: {len(context)} characters")
            
            if context:
                logger.info(f"📋 Context Preview: {context[:500]}...")
            
            return self._format_success({
                "collection_name": collection_name,
                "query": query,
                "results": formatted_results,
                "context": context,
                "total_results": len(formatted_results)
            })
            
        except Exception as e:
            logger.error(f"Error querying knowledge base: {str(e)}")
            return self._format_error(f"Failed to query knowledge base: {str(e)}")
    
    async def _list_collections(self) -> Dict[str, Any]:
        """List all available collections."""
        try:
            collections = self.chroma_client.list_collections()
            
            collection_data = []
            for collection in collections:
                try:
                    # Get collection metadata
                    metadata = collection.metadata or {}
                    
                    # Get document count
                    count = collection.count()
                    
                    # Create a user-friendly name
                    display_name = metadata.get('collection_name', collection.name)
                    if display_name == collection.name:
                        # If no friendly name in metadata, use the collection name directly
                        # The collection name is now exactly what the user provided
                        display_name = collection.name
                    
                    collection_data.append({
                        'name': collection.name,
                        'display_name': display_name,
                        'count': count,
                        'metadata': metadata
                    })
                except Exception as e:
                    logger.warning(f"Failed to get info for collection {collection.name}: {str(e)}")
                    collection_data.append({
                        'name': collection.name,
                        'display_name': collection.name,
                        'count': 0,
                        'metadata': {}
                    })
            
            return self._format_success({
                "collections": collection_data,
                "total_collections": len(collection_data)
            })
            
        except Exception as e:
            logger.error(f"Error listing collections: {str(e)}")
            return self._format_error(f"Failed to list collections: {str(e)}")
    
    async def _get_collection_stats(self, collection_name: str) -> Dict[str, Any]:
        """Get statistics for a specific collection."""
        try:
            if not collection_name:
                return {
                    "success": False,
                    "error": "Collection name is required"
                }
            
            collection = self.chroma_client.get_collection(collection_name)
            
            # Get collection info
            count = collection.count()
            metadata = collection.metadata or {}
            
            return self._format_success({
                "collection_name": collection_name,
                "document_count": count,
                "metadata": metadata
            })
            
        except Exception as e:
            logger.error(f"Error getting collection stats: {str(e)}")
            return self._format_error(f"Failed to get collection stats: {str(e)}")
    
    def _assemble_context(self, results: List[Dict[str, Any]]) -> str:
        """Assemble context from query results."""
        if not results:
            return ""
        
        context_parts = []
        max_tokens = self.retrieval_config.get('max_tokens', 2000)
        current_tokens = 0
        
        for result in results:
            content = result.get('content', '')
            metadata = result.get('metadata', {})
            
            # Estimate tokens (rough approximation)
            estimated_tokens = len(content.split()) * 1.3
            
            if current_tokens + estimated_tokens > max_tokens:
                break
            
            # Add source information if available
            source_info = ""
            if metadata.get('source_url'):
                source_info = f" [Source: {metadata['source_url']}]"
            elif metadata.get('title'):
                source_info = f" [Source: {metadata['title']}]"
            
            context_parts.append(f"{content}{source_info}")
            current_tokens += estimated_tokens
        
        return "\n\n".join(context_parts)
    
    def get_tool_info(self) -> Dict[str, Any]:
        """Get tool information."""
        return {
            "name": "Website Knowledge Base",
            "description": "Query pre-built knowledge base collections for relevant information",
            "operations": [
                "query_knowledge_base",
                "list_collections", 
                "get_collection_stats"
            ],
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query for knowledge base retrieval"
                    },
                    "operation": {
                        "type": "string",
                        "description": "Type of operation to perform",
                        "enum": ["query_knowledge_base", "list_collections", "get_collection_stats"],
                        "default": "query_knowledge_base"
                    },
                    "collection_name": {
                        "type": "string",
                        "description": "ChromaDB collection name for querying existing knowledge base"
                    },
                    "top_k": {
                        "type": "integer",
                        "description": "Number of top results to return",
                        "default": 5
                    }
                },
                "required": ["query"]
            }
        }
    
    def get_available_collections(self) -> List[Dict[str, Any]]:
        """Get available collections for frontend dropdown."""
        try:
            collections = self.chroma_client.list_collections()
            
            collection_options = []
            for collection in collections:
                try:
                    metadata = collection.metadata or {}
                    count = collection.count()
                    
                    # Create a user-friendly name
                    display_name = metadata.get('collection_name', collection.name)
                    if display_name == collection.name:
                        # If no friendly name in metadata, use the collection name directly
                        # The collection name is now exactly what the user provided
                        display_name = collection.name
                    
                    # Keep the original ChromaDB name as value for tool execution
                    collection_options.append({
                        'value': collection.name,
                        'label': f"{display_name} ({count} documents)"
                    })
                except Exception as e:
                    logger.warning(f"Failed to get info for collection {collection.name}: {str(e)}")
                    collection_options.append({
                        'value': collection.name,
                        'label': collection.name
                    })
            
            return collection_options
            
        except Exception as e:
            logger.error(f"Error getting available collections: {str(e)}")
            return [] 