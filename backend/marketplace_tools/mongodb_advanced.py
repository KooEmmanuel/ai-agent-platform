"""
MongoDB Advanced Tool
Allows connecting to MongoDB with credentials and querying data for agent use.
"""

import pymongo
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError, OperationFailure
import json
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
import re
from bson import ObjectId, json_util
import asyncio
from urllib.parse import quote_plus

class MongoDBAdvancedTool:
    def __init__(self):
        self.name = "mongodb_advanced"
        self.description = "Connect to MongoDB with credentials and query data for agent use"
        self.category = "Database"
        self.tool_type = "database"
        
    def get_config_schema(self) -> Dict[str, Any]:
        """Get the configuration schema for this tool"""
        return {
            "name": "MongoDB Advanced",
            "description": "Connect to MongoDB and execute queries",
            "parameters": {
                "connection_string": {
                    "type": "string",
                    "description": "MongoDB connection string (mongodb://username:password@host:port/database)",
                    "sensitive": True
                },
                "database_name": {
                    "type": "string",
                    "description": "Name of the database to connect to"
                },
                "max_query_time": {
                    "type": "integer",
                    "description": "Maximum query execution time in seconds",
                    "default": 30
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results to return",
                    "default": 100
                },
                "enable_logging": {
                    "type": "boolean",
                    "description": "Enable query logging",
                    "default": False
                }
            },
            "required": ["connection_string", "database_name"]
        }

    def _get_client(self, config: Dict[str, Any]) -> MongoClient:
        """Get MongoDB client"""
        connection_string = config.get("connection_string")
        max_query_time = config.get("max_query_time", 30)
        
        # Parse connection string and add timeout options
        if "?" in connection_string:
            connection_string += f"&serverSelectionTimeoutMS={max_query_time * 1000}&socketTimeoutMS={max_query_time * 1000}"
        else:
            connection_string += f"?serverSelectionTimeoutMS={max_query_time * 1000}&socketTimeoutMS={max_query_time * 1000}"
        
        return MongoClient(connection_string)

    def _get_database(self, config: Dict[str, Any]):
        """Get MongoDB database"""
        client = self._get_client(config)
        database_name = config.get("database_name")
        return client[database_name]

    def _test_connection(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Test MongoDB connection"""
        try:
            client = self._get_client(config)
            # Test connection by listing databases
            client.admin.command('ping')
            
            # Get database info
            db = self._get_database(config)
            collections = db.list_collection_names()
            
            return {
                "success": True,
                "message": "Connection successful",
                "database": config.get("database_name"),
                "collections": collections,
                "total_collections": len(collections)
            }
            
        except ConnectionFailure as e:
            return {
                "success": False,
                "error": f"Connection failed: {str(e)}"
            }
        except ServerSelectionTimeoutError as e:
            return {
                "success": False,
                "error": f"Server selection timeout: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Connection error: {str(e)}"
            }

    def _parse_query(self, query: str) -> Dict[str, Any]:
        """Parse natural language query into MongoDB query"""
        query_lower = query.lower()
        
        # Basic query parsing
        if "find" in query_lower or "get" in query_lower or "show" in query_lower:
            return self._parse_find_query(query)
        elif "count" in query_lower:
            return self._parse_count_query(query)
        elif "aggregate" in query_lower or "group" in query_lower:
            return self._parse_aggregate_query(query)
        else:
            # Default to find query
            return self._parse_find_query(query)

    def _parse_find_query(self, query: str) -> Dict[str, Any]:
        """Parse find query from natural language"""
        # Extract collection name
        collection_match = re.search(r'(?:from|in|collection)\s+(\w+)', query, re.IGNORECASE)
        collection = collection_match.group(1) if collection_match else None
        
        # Extract filter conditions
        filter_conditions = {}
        
        # Look for field-value pairs
        field_value_patterns = [
            r'(\w+)\s*=\s*["\']([^"\']+)["\']',  # field = "value"
            r'(\w+)\s*is\s*["\']([^"\']+)["\']',  # field is "value"
            r'(\w+)\s*equals\s*["\']([^"\']+)["\']',  # field equals "value"
        ]
        
        for pattern in field_value_patterns:
            matches = re.findall(pattern, query, re.IGNORECASE)
            for field, value in matches:
                filter_conditions[field] = value
        
        # Look for numeric values
        numeric_patterns = [
            r'(\w+)\s*>\s*(\d+)',  # field > number
            r'(\w+)\s*<\s*(\d+)',  # field < number
            r'(\w+)\s*>=\s*(\d+)',  # field >= number
            r'(\w+)\s*<=\s*(\d+)',  # field <= number
        ]
        
        for pattern in numeric_patterns:
            matches = re.findall(pattern, query, re.IGNORECASE)
            for field, value in matches:
                operator = pattern.split(r'\s*')[1]
                if operator == '>':
                    filter_conditions[field] = {"$gt": int(value)}
                elif operator == '<':
                    filter_conditions[field] = {"$lt": int(value)}
                elif operator == '>=':
                    filter_conditions[field] = {"$gte": int(value)}
                elif operator == '<=':
                    filter_conditions[field] = {"$lte": int(value)}
        
        # Extract limit
        limit_match = re.search(r'(?:limit|first|top)\s+(\d+)', query, re.IGNORECASE)
        limit = int(limit_match.group(1)) if limit_match else None
        
        # Extract sort
        sort_field = None
        sort_order = 1  # 1 for ascending, -1 for descending
        
        if "sort" in query_lower or "order" in query_lower:
            if "desc" in query_lower or "descending" in query_lower:
                sort_order = -1
            
            # Find field to sort by
            sort_match = re.search(r'(?:sort|order)\s+(?:by\s+)?(\w+)', query, re.IGNORECASE)
            if sort_match:
                sort_field = sort_match.group(1)
        
        return {
            "operation": "find",
            "collection": collection,
            "filter": filter_conditions,
            "limit": limit,
            "sort": {sort_field: sort_order} if sort_field else None
        }

    def _parse_count_query(self, query: str) -> Dict[str, Any]:
        """Parse count query from natural language"""
        collection_match = re.search(r'(?:from|in|collection)\s+(\w+)', query, re.IGNORECASE)
        collection = collection_match.group(1) if collection_match else None
        
        return {
            "operation": "count",
            "collection": collection,
            "filter": {}
        }

    def _parse_aggregate_query(self, query: str) -> Dict[str, Any]:
        """Parse aggregate query from natural language"""
        collection_match = re.search(r'(?:from|in|collection)\s+(\w+)', query, re.IGNORECASE)
        collection = collection_match.group(1) if collection_match else None
        
        # Basic aggregation pipeline
        pipeline = []
        
        # Look for group by
        group_match = re.search(r'(?:group|grouped)\s+(?:by\s+)?(\w+)', query, re.IGNORECASE)
        if group_match:
            group_field = group_match.group(1)
            pipeline.append({
                "$group": {
                    "_id": f"${group_field}",
                    "count": {"$sum": 1}
                }
            })
        
        return {
            "operation": "aggregate",
            "collection": collection,
            "pipeline": pipeline
        }

    async def execute_query(self, config: Dict[str, Any], query: str) -> Dict[str, Any]:
        """Execute a natural language query on MongoDB"""
        try:
            # Test connection first
            connection_test = self._test_connection(config)
            if not connection_test["success"]:
                return connection_test
            
            # Parse query
            parsed_query = self._parse_query(query)
            
            if not parsed_query.get("collection"):
                return {
                    "success": False,
                    "error": "Could not determine collection name from query. Please specify collection explicitly."
                }
            
            # Get database and collection
            db = self._get_database(config)
            collection = db[parsed_query["collection"]]
            
            # Execute query based on operation
            operation = parsed_query["operation"]
            max_results = config.get("max_results", 100)
            
            if operation == "find":
                # Build find query
                filter_conditions = parsed_query.get("filter", {})
                limit = min(parsed_query.get("limit", max_results), max_results)
                sort = parsed_query.get("sort")
                
                # Execute find
                cursor = collection.find(filter_conditions)
                
                if sort:
                    cursor = cursor.sort(list(sort.items()))
                
                if limit:
                    cursor = cursor.limit(limit)
                
                # Convert cursor to list and handle ObjectId serialization
                results = []
                for doc in cursor:
                    # Convert ObjectId to string for JSON serialization
                    doc = json.loads(json_util.dumps(doc))
                    results.append(doc)
                
                return {
                    "success": True,
                    "operation": "find",
                    "collection": parsed_query["collection"],
                    "filter": filter_conditions,
                    "results": results,
                    "total_results": len(results),
                    "query": query
                }
            
            elif operation == "count":
                filter_conditions = parsed_query.get("filter", {})
                count = collection.count_documents(filter_conditions)
                
                return {
                    "success": True,
                    "operation": "count",
                    "collection": parsed_query["collection"],
                    "filter": filter_conditions,
                    "count": count,
                    "query": query
                }
            
            elif operation == "aggregate":
                pipeline = parsed_query.get("pipeline", [])
                
                # Add limit to pipeline if specified
                limit = min(parsed_query.get("limit", max_results), max_results)
                if limit:
                    pipeline.append({"$limit": limit})
                
                cursor = collection.aggregate(pipeline)
                
                # Convert cursor to list
                results = []
                for doc in cursor:
                    doc = json.loads(json_util.dumps(doc))
                    results.append(doc)
                
                return {
                    "success": True,
                    "operation": "aggregate",
                    "collection": parsed_query["collection"],
                    "pipeline": pipeline,
                    "results": results,
                    "total_results": len(results),
                    "query": query
                }
            
            else:
                return {
                    "success": False,
                    "error": f"Unsupported operation: {operation}"
                }
                
        except OperationFailure as e:
            return {
                "success": False,
                "error": f"MongoDB operation failed: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Query execution error: {str(e)}"
            }

    async def list_collections(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """List all collections in the database"""
        try:
            connection_test = self._test_connection(config)
            if not connection_test["success"]:
                return connection_test
            
            db = self._get_database(config)
            collections = db.list_collection_names()
            
            # Get collection stats
            collection_stats = []
            for collection_name in collections:
                collection = db[collection_name]
                try:
                    count = collection.count_documents({})
                    collection_stats.append({
                        "name": collection_name,
                        "document_count": count
                    })
                except:
                    collection_stats.append({
                        "name": collection_name,
                        "document_count": "Unknown"
                    })
            
            return {
                "success": True,
                "database": config.get("database_name"),
                "collections": collection_stats,
                "total_collections": len(collections)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error listing collections: {str(e)}"
            }

    async def get_collection_schema(self, config: Dict[str, Any], collection_name: str) -> Dict[str, Any]:
        """Get schema information for a collection"""
        try:
            connection_test = self._test_connection(config)
            if not connection_test["success"]:
                return connection_test
            
            db = self._get_database(config)
            collection = db[collection_name]
            
            # Get a sample document to understand schema
            sample_doc = collection.find_one()
            
            if not sample_doc:
                return {
                    "success": True,
                    "collection": collection_name,
                    "schema": {},
                    "message": "Collection is empty"
                }
            
            # Analyze schema
            schema = self._analyze_document_schema(sample_doc)
            
            return {
                "success": True,
                "collection": collection_name,
                "schema": schema,
                "sample_document": json.loads(json_util.dumps(sample_doc))
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error getting collection schema: {str(e)}"
            }

    def _analyze_document_schema(self, doc: Dict[str, Any], prefix: str = "") -> Dict[str, Any]:
        """Analyze document schema recursively"""
        schema = {}
        
        for key, value in doc.items():
            field_name = f"{prefix}.{key}" if prefix else key
            
            if isinstance(value, dict):
                schema[field_name] = {
                    "type": "object",
                    "fields": self._analyze_document_schema(value, field_name)
                }
            elif isinstance(value, list):
                if value and isinstance(value[0], dict):
                    schema[field_name] = {
                        "type": "array",
                        "item_type": "object",
                        "fields": self._analyze_document_schema(value[0], f"{field_name}[0]")
                    }
                else:
                    schema[field_name] = {
                        "type": "array",
                        "item_type": type(value[0]).__name__ if value else "unknown"
                    }
            else:
                schema[field_name] = {
                    "type": type(value).__name__
                }
        
        return schema

    async def execute_raw_query(self, config: Dict[str, Any], operation: str, collection_name: str, query_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a raw MongoDB query"""
        try:
            connection_test = self._test_connection(config)
            if not connection_test["success"]:
                return connection_test
            
            db = self._get_database(config)
            collection = db[collection_name]
            max_results = config.get("max_results", 100)
            
            if operation == "find":
                filter_conditions = query_data.get("filter", {})
                limit = min(query_data.get("limit", max_results), max_results)
                sort = query_data.get("sort")
                
                cursor = collection.find(filter_conditions)
                
                if sort:
                    cursor = cursor.sort(list(sort.items()))
                
                if limit:
                    cursor = cursor.limit(limit)
                
                results = []
                for doc in cursor:
                    doc = json.loads(json_util.dumps(doc))
                    results.append(doc)
                
                return {
                    "success": True,
                    "operation": "find",
                    "collection": collection_name,
                    "results": results,
                    "total_results": len(results)
                }
            
            elif operation == "aggregate":
                pipeline = query_data.get("pipeline", [])
                
                if len(pipeline) > max_results:
                    pipeline.append({"$limit": max_results})
                
                cursor = collection.aggregate(pipeline)
                
                results = []
                for doc in cursor:
                    doc = json.loads(json_util.dumps(doc))
                    results.append(doc)
                
                return {
                    "success": True,
                    "operation": "aggregate",
                    "collection": collection_name,
                    "results": results,
                    "total_results": len(results)
                }
            
            else:
                return {
                    "success": False,
                    "error": f"Unsupported operation: {operation}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Raw query execution error: {str(e)}"
            }

# Create tool instance
mongodb_advanced = MongoDBAdvancedTool() 