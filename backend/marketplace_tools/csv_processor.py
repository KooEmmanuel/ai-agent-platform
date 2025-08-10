"""
CSV Processor Tool

This tool provides functionality to process and analyze CSV data.
It supports reading, writing, filtering, transforming, and analyzing CSV files.
"""

import asyncio
import csv
import io
import json
import logging
import pandas as pd
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
import numpy as np

from .base import BaseTool

logger = logging.getLogger(__name__)

class CSVProcessorTool(BaseTool):
    """
    Tool for processing and analyzing CSV data.
    
    Features:
    - Read and write CSV files
    - Filter and sort data
    - Data transformation and cleaning
    - Statistical analysis
    - Data validation
    - Export to various formats
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = "CSV Processor"
        self.description = "Process and analyze CSV data"
        self.category = "Data"
        self.tool_type = "Function"
        
        # Configuration
        self.default_encoding = config.get('encoding', 'utf-8')
        self.default_delimiter = config.get('delimiter', ',')
        self.max_file_size = config.get('max_file_size', 100 * 1024 * 1024)  # 100MB
        self.max_rows = config.get('max_rows', 100000)
        
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute CSV processing operation with given parameters.
        
        Args:
            action: Operation to perform (read, write, filter, sort, analyze, etc.)
            file_path: Path to CSV file (for file operations)
            data: CSV data as string (for in-memory operations)
            output_path: Output file path (for write operations)
            delimiter: CSV delimiter (default: comma)
            encoding: File encoding (default: utf-8)
            columns: List of columns to include/exclude
            filters: Dictionary of column filters
            sort_by: Column to sort by
            sort_order: Sort order (asc, desc)
            operation: Specific operation (head, tail, describe, etc.)
            
        Returns:
            Dictionary containing operation result
        """
        action = kwargs.get('action', 'read')
        
        try:
            if action == 'read':
                return await self._read_csv(kwargs)
            elif action == 'write':
                return await self._write_csv(kwargs)
            elif action == 'filter':
                return await self._filter_csv(kwargs)
            elif action == 'sort':
                return await self._sort_csv(kwargs)
            elif action == 'analyze':
                return await self._analyze_csv(kwargs)
            elif action == 'transform':
                return await self._transform_csv(kwargs)
            elif action == 'validate':
                return await self._validate_csv(kwargs)
            elif action == 'merge':
                return await self._merge_csv(kwargs)
            elif action == 'sample':
                return await self._sample_csv(kwargs)
            elif action == 'clean':
                return await self._clean_csv(kwargs)
            else:
                return self._format_error(f"Unknown action: {action}")
                
        except Exception as e:
            logger.error(f"Error in CSV operation: {str(e)}")
            return self._format_error(f"CSV operation failed: {str(e)}")
    
    async def _read_csv(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Read and parse CSV data."""
        file_path = params.get('file_path', '')
        data = params.get('data', '')
        delimiter = params.get('delimiter', self.default_delimiter)
        encoding = params.get('encoding', self.default_encoding)
        nrows = min(params.get('nrows', self.max_rows), self.max_rows)
        
        if not file_path and not data:
            return self._format_error("Either file_path or data is required")
        
        try:
            if file_path:
                # Read from file
                df = pd.read_csv(
                    file_path,
                    delimiter=delimiter,
                    encoding=encoding,
                    nrows=nrows
                )
            else:
                # Read from string data
                df = pd.read_csv(
                    io.StringIO(data),
                    delimiter=delimiter,
                    nrows=nrows
                )
            
            return self._format_success({
                'data': df.to_dict('records'),
                'columns': df.columns.tolist(),
                'shape': df.shape,
                'dtypes': df.dtypes.to_dict(),
                'info': {
                    'total_rows': len(df),
                    'total_columns': len(df.columns),
                    'memory_usage': df.memory_usage(deep=True).sum(),
                    'null_counts': df.isnull().sum().to_dict()
                }
            })
            
        except Exception as e:
            return self._format_error(f"Error reading CSV: {str(e)}")
    
    async def _write_csv(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Write data to CSV file."""
        data = params.get('data', [])
        output_path = params.get('output_path', '')
        delimiter = params.get('delimiter', self.default_delimiter)
        encoding = params.get('encoding', self.default_encoding)
        index = params.get('index', False)
        
        if not data:
            return self._format_error("Data is required")
        
        if not output_path:
            return self._format_error("Output path is required")
        
        try:
            df = pd.DataFrame(data)
            df.to_csv(
                output_path,
                delimiter=delimiter,
                encoding=encoding,
                index=index
            )
            
            return self._format_success({
                'message': f"CSV file written successfully to {output_path}",
                'file_path': output_path,
                'rows_written': len(df),
                'columns_written': len(df.columns)
            })
            
        except Exception as e:
            return self._format_error(f"Error writing CSV: {str(e)}")
    
    async def _filter_csv(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Filter CSV data based on conditions."""
        data = params.get('data', [])
        filters = params.get('filters', {})
        columns = params.get('columns', [])
        
        if not data:
            return self._format_error("Data is required")
        
        try:
            df = pd.DataFrame(data)
            
            # Apply column selection
            if columns:
                df = df[columns]
            
            # Apply filters
            for column, condition in filters.items():
                if column in df.columns:
                    if isinstance(condition, dict):
                        # Complex filter (e.g., {'operator': '>', 'value': 10})
                        operator = condition.get('operator', '==')
                        value = condition.get('value')
                        
                        if operator == '>':
                            df = df[df[column] > value]
                        elif operator == '<':
                            df = df[df[column] < value]
                        elif operator == '>=':
                            df = df[df[column] >= value]
                        elif operator == '<=':
                            df = df[df[column] <= value]
                        elif operator == '!=':
                            df = df[df[column] != value]
                        elif operator == 'in':
                            df = df[df[column].isin(value)]
                        elif operator == 'contains':
                            df = df[df[column].str.contains(value, na=False)]
                        else:
                            df = df[df[column] == value]
                    else:
                        # Simple equality filter
                        df = df[df[column] == condition]
            
            return self._format_success({
                'data': df.to_dict('records'),
                'columns': df.columns.tolist(),
                'shape': df.shape,
                'filters_applied': filters,
                'rows_filtered': len(df)
            })
            
        except Exception as e:
            return self._format_error(f"Error filtering CSV: {str(e)}")
    
    async def _sort_csv(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Sort CSV data by specified columns."""
        data = params.get('data', [])
        sort_by = params.get('sort_by', [])
        sort_order = params.get('sort_order', 'asc')
        ascending = sort_order.lower() != 'desc'
        
        if not data:
            return self._format_error("Data is required")
        
        if not sort_by:
            return self._format_error("Sort columns are required")
        
        try:
            df = pd.DataFrame(data)
            
            # Convert single column to list
            if isinstance(sort_by, str):
                sort_by = [sort_by]
            
            # Validate columns exist
            missing_cols = [col for col in sort_by if col not in df.columns]
            if missing_cols:
                return self._format_error(f"Columns not found: {missing_cols}")
            
            # Sort data
            df_sorted = df.sort_values(by=sort_by, ascending=ascending)
            
            return self._format_success({
                'data': df_sorted.to_dict('records'),
                'columns': df_sorted.columns.tolist(),
                'shape': df_sorted.shape,
                'sort_by': sort_by,
                'sort_order': sort_order
            })
            
        except Exception as e:
            return self._format_error(f"Error sorting CSV: {str(e)}")
    
    async def _analyze_csv(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze CSV data and provide statistics."""
        data = params.get('data', [])
        operation = params.get('operation', 'describe')
        columns = params.get('columns', [])
        
        if not data:
            return self._format_error("Data is required")
        
        try:
            df = pd.DataFrame(data)
            
            # Select specific columns if provided
            if columns:
                df = df[columns]
            
            if operation == 'describe':
                # Basic statistics
                result = {
                    'basic_stats': df.describe().to_dict(),
                    'info': {
                        'total_rows': len(df),
                        'total_columns': len(df.columns),
                        'memory_usage': df.memory_usage(deep=True).sum(),
                        'null_counts': df.isnull().sum().to_dict(),
                        'duplicate_rows': df.duplicated().sum()
                    }
                }
                
                # Data type analysis
                result['dtypes'] = df.dtypes.to_dict()
                
                # Unique value counts for categorical columns
                categorical_cols = df.select_dtypes(include=['object']).columns
                result['unique_counts'] = {}
                for col in categorical_cols:
                    result['unique_counts'][col] = df[col].nunique()
                
            elif operation == 'correlation':
                # Correlation analysis for numerical columns
                numerical_cols = df.select_dtypes(include=[np.number]).columns
                if len(numerical_cols) > 1:
                    result = {
                        'correlation_matrix': df[numerical_cols].corr().to_dict()
                    }
                else:
                    result = {'message': 'Not enough numerical columns for correlation analysis'}
                    
            elif operation == 'missing_analysis':
                # Missing value analysis
                missing_data = df.isnull().sum()
                missing_percent = (missing_data / len(df)) * 100
                
                result = {
                    'missing_counts': missing_data.to_dict(),
                    'missing_percentages': missing_percent.to_dict(),
                    'columns_with_missing': missing_data[missing_data > 0].index.tolist()
                }
                
            elif operation == 'outlier_analysis':
                # Outlier analysis for numerical columns
                numerical_cols = df.select_dtypes(include=[np.number]).columns
                outliers = {}
                
                for col in numerical_cols:
                    Q1 = df[col].quantile(0.25)
                    Q3 = df[col].quantile(0.75)
                    IQR = Q3 - Q1
                    lower_bound = Q1 - 1.5 * IQR
                    upper_bound = Q3 + 1.5 * IQR
                    
                    outliers[col] = {
                        'lower_bound': lower_bound,
                        'upper_bound': upper_bound,
                        'outlier_count': len(df[(df[col] < lower_bound) | (df[col] > upper_bound)]),
                        'outlier_percentage': (len(df[(df[col] < lower_bound) | (df[col] > upper_bound)]) / len(df)) * 100
                    }
                
                result = {'outliers': outliers}
                
            else:
                return self._format_error(f"Unknown analysis operation: {operation}")
            
            return self._format_success(result)
            
        except Exception as e:
            return self._format_error(f"Error analyzing CSV: {str(e)}")
    
    async def _transform_csv(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Transform CSV data."""
        data = params.get('data', [])
        transformations = params.get('transformations', [])
        
        if not data:
            return self._format_error("Data is required")
        
        if not transformations:
            return self._format_error("Transformations are required")
        
        try:
            df = pd.DataFrame(data)
            
            for transform in transformations:
                transform_type = transform.get('type', '')
                column = transform.get('column', '')
                
                if transform_type == 'rename':
                    new_name = transform.get('new_name', '')
                    if column in df.columns and new_name:
                        df = df.rename(columns={column: new_name})
                        
                elif transform_type == 'drop':
                    if column in df.columns:
                        df = df.drop(columns=[column])
                        
                elif transform_type == 'fill_na':
                    value = transform.get('value', '')
                    method = transform.get('method', 'value')
                    
                    if method == 'value':
                        df[column] = df[column].fillna(value)
                    elif method == 'forward':
                        df[column] = df[column].fillna(method='ffill')
                    elif method == 'backward':
                        df[column] = df[column].fillna(method='bfill')
                    elif method == 'mean':
                        df[column] = df[column].fillna(df[column].mean())
                    elif method == 'median':
                        df[column] = df[column].fillna(df[column].median())
                        
                elif transform_type == 'convert_type':
                    target_type = transform.get('target_type', '')
                    
                    if target_type == 'int':
                        df[column] = pd.to_numeric(df[column], errors='coerce').astype('Int64')
                    elif target_type == 'float':
                        df[column] = pd.to_numeric(df[column], errors='coerce')
                    elif target_type == 'string':
                        df[column] = df[column].astype(str)
                    elif target_type == 'datetime':
                        df[column] = pd.to_datetime(df[column], errors='coerce')
                        
                elif transform_type == 'apply_function':
                    function_name = transform.get('function', '')
                    
                    if function_name == 'uppercase':
                        df[column] = df[column].str.upper()
                    elif function_name == 'lowercase':
                        df[column] = df[column].str.lower()
                    elif function_name == 'title':
                        df[column] = df[column].str.title()
                    elif function_name == 'strip':
                        df[column] = df[column].str.strip()
                    elif function_name == 'abs':
                        df[column] = df[column].abs()
                    elif function_name == 'round':
                        decimals = transform.get('decimals', 2)
                        df[column] = df[column].round(decimals)
            
            return self._format_success({
                'data': df.to_dict('records'),
                'columns': df.columns.tolist(),
                'shape': df.shape,
                'transformations_applied': len(transformations)
            })
            
        except Exception as e:
            return self._format_error(f"Error transforming CSV: {str(e)}")
    
    async def _validate_csv(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Validate CSV data structure and content."""
        data = params.get('data', [])
        schema = params.get('schema', {})
        
        if not data:
            return self._format_error("Data is required")
        
        try:
            df = pd.DataFrame(data)
            validation_results = {
                'is_valid': True,
                'errors': [],
                'warnings': []
            }
            
            # Check required columns
            if 'required_columns' in schema:
                required_cols = schema['required_columns']
                missing_cols = [col for col in required_cols if col not in df.columns]
                if missing_cols:
                    validation_results['is_valid'] = False
                    validation_results['errors'].append(f"Missing required columns: {missing_cols}")
            
            # Check data types
            if 'column_types' in schema:
                for col, expected_type in schema['column_types'].items():
                    if col in df.columns:
                        actual_type = str(df[col].dtype)
                        if expected_type not in actual_type:
                            validation_results['warnings'].append(
                                f"Column '{col}' has type '{actual_type}', expected '{expected_type}'"
                            )
            
            # Check for null values in required fields
            if 'not_null_columns' in schema:
                for col in schema['not_null_columns']:
                    if col in df.columns and df[col].isnull().any():
                        null_count = df[col].isnull().sum()
                        validation_results['warnings'].append(
                            f"Column '{col}' has {null_count} null values"
                        )
            
            # Check value ranges
            if 'value_ranges' in schema:
                for col, range_info in schema['value_ranges'].items():
                    if col in df.columns:
                        min_val = range_info.get('min')
                        max_val = range_info.get('max')
                        
                        if min_val is not None and df[col].min() < min_val:
                            validation_results['warnings'].append(
                                f"Column '{col}' has values below minimum {min_val}"
                            )
                        
                        if max_val is not None and df[col].max() > max_val:
                            validation_results['warnings'].append(
                                f"Column '{col}' has values above maximum {max_val}"
                            )
            
            # Check unique constraints
            if 'unique_columns' in schema:
                for col in schema['unique_columns']:
                    if col in df.columns and not df[col].is_unique:
                        duplicate_count = df[col].duplicated().sum()
                        validation_results['warnings'].append(
                            f"Column '{col}' has {duplicate_count} duplicate values"
                        )
            
            return self._format_success(validation_results)
            
        except Exception as e:
            return self._format_error(f"Error validating CSV: {str(e)}")
    
    async def _merge_csv(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Merge multiple CSV datasets."""
        datasets = params.get('datasets', [])
        merge_type = params.get('merge_type', 'inner')  # inner, outer, left, right
        on_columns = params.get('on_columns', [])
        
        if len(datasets) < 2:
            return self._format_error("At least 2 datasets are required for merging")
        
        try:
            dataframes = []
            for dataset in datasets:
                if isinstance(dataset, list):
                    df = pd.DataFrame(dataset)
                else:
                    df = pd.DataFrame([dataset])
                dataframes.append(df)
            
            # Merge dataframes
            if on_columns:
                result_df = dataframes[0]
                for df in dataframes[1:]:
                    result_df = result_df.merge(
                        df, 
                        on=on_columns, 
                        how=merge_type
                    )
            else:
                # Concatenate if no merge columns specified
                result_df = pd.concat(dataframes, ignore_index=True)
            
            return self._format_success({
                'data': result_df.to_dict('records'),
                'columns': result_df.columns.tolist(),
                'shape': result_df.shape,
                'merge_type': merge_type,
                'datasets_merged': len(datasets)
            })
            
        except Exception as e:
            return self._format_error(f"Error merging CSV: {str(e)}")
    
    async def _sample_csv(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Sample data from CSV."""
        data = params.get('data', [])
        sample_size = params.get('sample_size', 100)
        sample_type = params.get('sample_type', 'random')  # random, head, tail
        random_state = params.get('random_state', None)
        
        if not data:
            return self._format_error("Data is required")
        
        try:
            df = pd.DataFrame(data)
            
            if sample_type == 'random':
                sampled_df = df.sample(n=min(sample_size, len(df)), random_state=random_state)
            elif sample_type == 'head':
                sampled_df = df.head(sample_size)
            elif sample_type == 'tail':
                sampled_df = df.tail(sample_size)
            else:
                return self._format_error(f"Unknown sample type: {sample_type}")
            
            return self._format_success({
                'data': sampled_df.to_dict('records'),
                'columns': sampled_df.columns.tolist(),
                'shape': sampled_df.shape,
                'sample_type': sample_type,
                'sample_size': len(sampled_df)
            })
            
        except Exception as e:
            return self._format_error(f"Error sampling CSV: {str(e)}")
    
    async def _clean_csv(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Clean CSV data by removing duplicates, handling missing values, etc."""
        data = params.get('data', [])
        remove_duplicates = params.get('remove_duplicates', True)
        handle_missing = params.get('handle_missing', True)
        missing_strategy = params.get('missing_strategy', 'drop')  # drop, fill, interpolate
        fill_value = params.get('fill_value', '')
        
        if not data:
            return self._format_error("Data is required")
        
        try:
            df = pd.DataFrame(data)
            original_shape = df.shape
            
            # Remove duplicates
            if remove_duplicates:
                df = df.drop_duplicates()
            
            # Handle missing values
            if handle_missing:
                if missing_strategy == 'drop':
                    df = df.dropna()
                elif missing_strategy == 'fill':
                    df = df.fillna(fill_value)
                elif missing_strategy == 'interpolate':
                    df = df.interpolate()
            
            return self._format_success({
                'data': df.to_dict('records'),
                'columns': df.columns.tolist(),
                'shape': df.shape,
                'original_shape': original_shape,
                'rows_removed': original_shape[0] - df.shape[0],
                'cleaning_applied': {
                    'duplicates_removed': remove_duplicates,
                    'missing_handled': handle_missing,
                    'missing_strategy': missing_strategy
                }
            })
            
        except Exception as e:
            return self._format_error(f"Error cleaning CSV: {str(e)}") 