"""
Database Query Tool

A tool for executing database queries safely with parameterized queries,
result formatting, and query validation.
"""

import asyncio
import json
import logging
import re
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
import sqlite3
import psycopg2
import mysql.connector
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError

from .base import BaseTool

logger = logging.getLogger(__name__)

class DatabaseQueryTool(BaseTool):
    """
    Database Query Tool for executing SQL queries safely.
    
    Features:
    - Support for multiple database types (SQLite, PostgreSQL, MySQL)
    - Parameterized queries for security
    - Query validation and sanitization
    - Result formatting and pagination
    - Connection pooling
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.db_type = config.get('db_type', 'sqlite')
        self.connection_string = config.get('connection_string', '')
        self.max_results = config.get('max_results', 1000)
        self.timeout = config.get('timeout', 30)
        self.allowed_operations = config.get('allowed_operations', ['SELECT'])
        
        # Initialize database connection
        self.engine = None
        self._init_connection()
    
    def _init_connection(self):
        """Initialize database connection based on configuration."""
        try:
            if self.db_type == 'sqlite':
                if not self.connection_string:
                    self.connection_string = ':memory:'  # Default to in-memory SQLite
                self.engine = create_engine(f"sqlite:///{self.connection_string}")
            elif self.db_type == 'postgresql':
                self.engine = create_engine(self.connection_string)
            elif self.db_type == 'mysql':
                self.engine = create_engine(self.connection_string)
            else:
                raise ValueError(f"Unsupported database type: {self.db_type}")
                
        except Exception as e:
            logger.error(f"Failed to initialize database connection: {str(e)}")
            self.engine = None
    
    async def execute(self, query: str, params: Optional[Dict[str, Any]] = None, 
                     operation: str = "SELECT", limit: Optional[int] = None) -> Dict[str, Any]:
        """
        Execute a database query.
        
        Args:
            query: SQL query to execute
            params: Query parameters for parameterized queries
            operation: Type of operation (SELECT, INSERT, UPDATE, DELETE)
            limit: Maximum number of results to return
            
        Returns:
            Query results with metadata
        """
        if not query or not query.strip():
            return self._format_error("Query is required")
        
        if not self.engine:
            return self._format_error("Database connection not available")
        
        # Validate operation
        operation = operation.upper()
        if operation not in self.allowed_operations:
            return self._format_error(f"Operation '{operation}' is not allowed")
        
        # Validate and sanitize query
        validation_result = self._validate_query(query, operation)
        if not validation_result['valid']:
            return self._format_error(f"Query validation failed: {validation_result['error']}")
        
        limit = limit or self.max_results
        
        try:
            if operation == "SELECT":
                result = await self._execute_select(query, params, limit)
            elif operation == "INSERT":
                result = await self._execute_insert(query, params)
            elif operation == "UPDATE":
                result = await self._execute_update(query, params)
            elif operation == "DELETE":
                result = await self._execute_delete(query, params)
            else:
                return self._format_error(f"Unsupported operation: {operation}")
            
            return result
            
        except Exception as e:
            logger.error(f"Database query error: {str(e)}")
            return self._format_error(f"Query execution failed: {str(e)}")
    
    def _validate_query(self, query: str, operation: str) -> Dict[str, Any]:
        """
        Validate and sanitize SQL query.
        
        Args:
            query: SQL query to validate
            operation: Type of operation
            
        Returns:
            Validation result
        """
        # Check for dangerous patterns
        dangerous_patterns = [
            r'\bDROP\b',
            r'\bTRUNCATE\b',
            r'\bALTER\b',
            r'\bCREATE\b',
            r'\bGRANT\b',
            r'\bREVOKE\b',
            r'--',  # SQL comments
            r'/\*.*?\*/',  # Multi-line comments
            r';\s*$',  # Multiple statements
        ]
        
        query_upper = query.upper()
        
        # Check for dangerous patterns
        for pattern in dangerous_patterns:
            if re.search(pattern, query_upper, re.IGNORECASE | re.DOTALL):
                return {
                    'valid': False,
                    'error': f"Query contains dangerous pattern: {pattern}"
                }
        
        # Check for operation consistency
        if not query_upper.strip().startswith(operation):
            return {
                'valid': False,
                'error': f"Query must start with {operation}"
            }
        
        # Check for multiple statements
        if query.count(';') > 1:
            return {
                'valid': False,
                'error': "Multiple statements not allowed"
            }
        
        return {'valid': True}
    
    async def _execute_select(self, query: str, params: Optional[Dict[str, Any]], limit: int) -> Dict[str, Any]:
        """Execute SELECT query."""
        try:
            with self.engine.connect() as connection:
                # Add LIMIT if not present
                if 'LIMIT' not in query.upper():
                    query = f"{query} LIMIT {limit}"
                
                result = connection.execute(text(query), params or {})
                rows = result.fetchall()
                
                # Convert rows to dictionaries
                columns = result.keys()
                results = []
                for row in rows:
                    row_dict = {}
                    for i, column in enumerate(columns):
                        # Handle datetime objects
                        if isinstance(row[i], datetime):
                            row_dict[column] = row[i].isoformat()
                        else:
                            row_dict[column] = row[i]
                    results.append(row_dict)
                
                metadata = {
                    'operation': 'SELECT',
                    'rows_returned': len(results),
                    'limit': limit,
                    'query': query
                }
                
                return self._format_success(results, metadata)
                
        except SQLAlchemyError as e:
            raise Exception(f"Database error: {str(e)}")
    
    async def _execute_insert(self, query: str, params: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute INSERT query."""
        try:
            with self.engine.connect() as connection:
                result = connection.execute(text(query), params or {})
                connection.commit()
                
                metadata = {
                    'operation': 'INSERT',
                    'rows_affected': result.rowcount,
                    'query': query
                }
                
                return self._format_success({
                    'rows_affected': result.rowcount,
                    'message': f"Successfully inserted {result.rowcount} row(s)"
                }, metadata)
                
        except SQLAlchemyError as e:
            raise Exception(f"Database error: {str(e)}")
    
    async def _execute_update(self, query: str, params: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute UPDATE query."""
        try:
            with self.engine.connect() as connection:
                result = connection.execute(text(query), params or {})
                connection.commit()
                
                metadata = {
                    'operation': 'UPDATE',
                    'rows_affected': result.rowcount,
                    'query': query
                }
                
                return self._format_success({
                    'rows_affected': result.rowcount,
                    'message': f"Successfully updated {result.rowcount} row(s)"
                }, metadata)
                
        except SQLAlchemyError as e:
            raise Exception(f"Database error: {str(e)}")
    
    async def _execute_delete(self, query: str, params: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute DELETE query."""
        try:
            with self.engine.connect() as connection:
                result = connection.execute(text(query), params or {})
                connection.commit()
                
                metadata = {
                    'operation': 'DELETE',
                    'rows_affected': result.rowcount,
                    'query': query
                }
                
                return self._format_success({
                    'rows_affected': result.rowcount,
                    'message': f"Successfully deleted {result.rowcount} row(s)"
                }, metadata)
                
        except SQLAlchemyError as e:
            raise Exception(f"Database error: {str(e)}")
    
    async def get_table_info(self, table_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Get information about database tables.
        
        Args:
            table_name: Specific table name (optional)
            
        Returns:
            Table information
        """
        if not self.engine:
            return self._format_error("Database connection not available")
        
        try:
            inspector = inspect(self.engine)
            
            if table_name:
                # Get specific table info
                columns = inspector.get_columns(table_name)
                indexes = inspector.get_indexes(table_name)
                foreign_keys = inspector.get_foreign_keys(table_name)
                
                table_info = {
                    'name': table_name,
                    'columns': columns,
                    'indexes': indexes,
                    'foreign_keys': foreign_keys
                }
                
                return self._format_success(table_info)
            else:
                # Get all tables
                tables = inspector.get_table_names()
                table_list = []
                
                for table in tables:
                    columns = inspector.get_columns(table)
                    table_list.append({
                        'name': table,
                        'column_count': len(columns)
                    })
                
                return self._format_success(table_list, {'total_tables': len(tables)})
                
        except Exception as e:
            logger.error(f"Error getting table info: {str(e)}")
            return self._format_error(f"Failed to get table info: {str(e)}")
    
    async def test_connection(self) -> Dict[str, Any]:
        """
        Test database connection.
        
        Returns:
            Connection test result
        """
        if not self.engine:
            return self._format_error("Database connection not available")
        
        try:
            with self.engine.connect() as connection:
                # Try a simple query
                if self.db_type == 'sqlite':
                    result = connection.execute(text("SELECT 1"))
                elif self.db_type == 'postgresql':
                    result = connection.execute(text("SELECT 1"))
                elif self.db_type == 'mysql':
                    result = connection.execute(text("SELECT 1"))
                
                result.fetchone()
                
                return self._format_success({
                    'status': 'connected',
                    'database_type': self.db_type,
                    'message': 'Database connection successful'
                })
                
        except Exception as e:
            logger.error(f"Connection test failed: {str(e)}")
            return self._format_error(f"Connection test failed: {str(e)}")
    
    def get_tool_info(self) -> Dict[str, Any]:
        """
        Get information about this tool.
        
        Returns:
            Tool information dictionary
        """
        return {
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'tool_type': self.tool_type,
            'capabilities': [
                'Execute SELECT queries',
                'Execute INSERT queries',
                'Execute UPDATE queries', 
                'Execute DELETE queries',
                'Parameterized queries',
                'Query validation',
                'Table information',
                'Connection testing'
            ],
            'supported_databases': ['SQLite', 'PostgreSQL', 'MySQL'],
            'parameters': {
                'query': 'SQL query to execute (required)',
                'params': 'Query parameters (optional)',
                'operation': 'Type of operation (SELECT, INSERT, UPDATE, DELETE)',
                'limit': 'Maximum number of results for SELECT queries'
            }
        } 