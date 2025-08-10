"""
File Processor Tool

A tool for processing various file types including text, CSV, JSON, images,
and other common formats with operations like reading, writing, converting, and analyzing.
"""

import asyncio
import json
import logging
import csv
import os
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
from pathlib import Path
import pandas as pd
from PIL import Image
import io

from .base import BaseTool

logger = logging.getLogger(__name__)

class FileProcessorTool(BaseTool):
    """
    File Processor Tool for handling various file operations.
    
    Features:
    - Read/write text, CSV, JSON files
    - Image processing and conversion
    - File format conversion
    - File analysis and statistics
    - Batch file operations
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.supported_formats = config.get('supported_formats', [
            'txt', 'csv', 'json', 'xml', 'yaml', 'yml',
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp',
            'pdf', 'docx', 'xlsx'
        ])
        self.max_file_size = config.get('max_file_size', 10 * 1024 * 1024)  # 10MB
        self.working_directory = config.get('working_directory', '/tmp')
        
    async def execute(self, operation: str, file_path: str, 
                     output_path: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """
        Execute file processing operation.
        
        Args:
            operation: Type of operation (read, write, convert, analyze, etc.)
            file_path: Path to input file
            output_path: Path to output file (for write/convert operations)
            **kwargs: Additional operation-specific parameters
            
        Returns:
            Operation result
        """
        if not operation or not file_path:
            return self._format_error("Operation and file path are required")
        
        try:
            if operation == "read":
                return await self._read_file(file_path, **kwargs)
            elif operation == "write":
                return await self._write_file(file_path, **kwargs)
            elif operation == "convert":
                return await self._convert_file(file_path, output_path, **kwargs)
            elif operation == "analyze":
                return await self._analyze_file(file_path, **kwargs)
            elif operation == "process_csv":
                return await self._process_csv(file_path, **kwargs)
            elif operation == "process_image":
                return await self._process_image(file_path, **kwargs)
            else:
                return self._format_error(f"Unsupported operation: {operation}")
                
        except Exception as e:
            logger.error(f"File processing error: {str(e)}")
            return self._format_error(f"File processing failed: {str(e)}")
    
    async def _read_file(self, file_path: str, encoding: str = 'utf-8') -> Dict[str, Any]:
        """Read file content."""
        try:
            path = Path(file_path)
            if not path.exists():
                return self._format_error(f"File not found: {file_path}")
            
            if path.stat().st_size > self.max_file_size:
                return self._format_error(f"File too large: {path.stat().st_size} bytes")
            
            file_extension = path.suffix.lower()[1:]
            
            if file_extension == 'json':
                with open(file_path, 'r', encoding=encoding) as f:
                    content = json.load(f)
            elif file_extension == 'csv':
                content = await self._read_csv(file_path, encoding)
            elif file_extension in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']:
                content = await self._read_image_info(file_path)
            else:
                with open(file_path, 'r', encoding=encoding) as f:
                    content = f.read()
            
            metadata = {
                'file_path': file_path,
                'file_size': path.stat().st_size,
                'file_extension': file_extension,
                'last_modified': datetime.fromtimestamp(path.stat().st_mtime).isoformat()
            }
            
            return self._format_success(content, metadata)
            
        except Exception as e:
            raise Exception(f"Error reading file: {str(e)}")
    
    async def _write_file(self, file_path: str, content: Any, 
                         file_format: str = 'auto', encoding: str = 'utf-8') -> Dict[str, Any]:
        """Write content to file."""
        try:
            path = Path(file_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            
            if file_format == 'json' or path.suffix.lower() == '.json':
                with open(file_path, 'w', encoding=encoding) as f:
                    json.dump(content, f, indent=2, ensure_ascii=False)
            elif file_format == 'csv' or path.suffix.lower() == '.csv':
                await self._write_csv(file_path, content, encoding)
            else:
                with open(file_path, 'w', encoding=encoding) as f:
                    f.write(str(content))
            
            metadata = {
                'file_path': file_path,
                'file_size': path.stat().st_size,
                'file_format': file_format
            }
            
            return self._format_success({
                'message': f'File written successfully: {file_path}',
                'file_size': path.stat().st_size
            }, metadata)
            
        except Exception as e:
            raise Exception(f"Error writing file: {str(e)}")
    
    async def _convert_file(self, input_path: str, output_path: str, 
                           conversion_type: str, **kwargs) -> Dict[str, Any]:
        """Convert file from one format to another."""
        try:
            input_path = Path(input_path)
            output_path = Path(output_path)
            
            if not input_path.exists():
                return self._format_error(f"Input file not found: {input_path}")
            
            if conversion_type == "image":
                await self._convert_image(input_path, output_path, **kwargs)
            elif conversion_type == "csv_to_json":
                await self._convert_csv_to_json(input_path, output_path, **kwargs)
            elif conversion_type == "json_to_csv":
                await self._convert_json_to_csv(input_path, output_path, **kwargs)
            else:
                return self._format_error(f"Unsupported conversion type: {conversion_type}")
            
            metadata = {
                'input_path': str(input_path),
                'output_path': str(output_path),
                'conversion_type': conversion_type
            }
            
            return self._format_success({
                'message': f'File converted successfully: {output_path}',
                'output_size': output_path.stat().st_size
            }, metadata)
            
        except Exception as e:
            raise Exception(f"Error converting file: {str(e)}")
    
    async def _analyze_file(self, file_path: str) -> Dict[str, Any]:
        """Analyze file and provide statistics."""
        try:
            path = Path(file_path)
            if not path.exists():
                return self._format_error(f"File not found: {file_path}")
            
            file_extension = path.suffix.lower()[1:]
            stats = path.stat()
            
            analysis = {
                'file_info': {
                    'name': path.name,
                    'extension': file_extension,
                    'size_bytes': stats.st_size,
                    'size_mb': round(stats.st_size / (1024 * 1024), 2),
                    'created': datetime.fromtimestamp(stats.st_ctime).isoformat(),
                    'modified': datetime.fromtimestamp(stats.st_mtime).isoformat(),
                    'accessed': datetime.fromtimestamp(stats.st_atime).isoformat()
                }
            }
            
            # File type specific analysis
            if file_extension == 'txt':
                analysis.update(await self._analyze_text_file(file_path))
            elif file_extension == 'csv':
                analysis.update(await self._analyze_csv_file(file_path))
            elif file_extension == 'json':
                analysis.update(await self._analyze_json_file(file_path))
            elif file_extension in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']:
                analysis.update(await self._analyze_image_file(file_path))
            
            return self._format_success(analysis)
            
        except Exception as e:
            raise Exception(f"Error analyzing file: {str(e)}")
    
    async def _read_csv(self, file_path: str, encoding: str = 'utf-8') -> Dict[str, Any]:
        """Read CSV file with pandas."""
        try:
            df = pd.read_csv(file_path, encoding=encoding)
            return {
                'data': df.to_dict('records'),
                'columns': df.columns.tolist(),
                'shape': df.shape,
                'dtypes': df.dtypes.to_dict()
            }
        except Exception as e:
            raise Exception(f"Error reading CSV: {str(e)}")
    
    async def _write_csv(self, file_path: str, data: List[Dict[str, Any]], 
                        encoding: str = 'utf-8') -> None:
        """Write data to CSV file."""
        try:
            df = pd.DataFrame(data)
            df.to_csv(file_path, index=False, encoding=encoding)
        except Exception as e:
            raise Exception(f"Error writing CSV: {str(e)}")
    
    async def _read_image_info(self, file_path: str) -> Dict[str, Any]:
        """Read image file information."""
        try:
            with Image.open(file_path) as img:
                return {
                    'format': img.format,
                    'mode': img.mode,
                    'size': img.size,
                    'width': img.width,
                    'height': img.height,
                    'info': img.info
                }
        except Exception as e:
            raise Exception(f"Error reading image: {str(e)}")
    
    async def _convert_image(self, input_path: Path, output_path: Path, 
                           format: str = 'PNG', resize: Optional[tuple] = None) -> None:
        """Convert image format and optionally resize."""
        try:
            with Image.open(input_path) as img:
                if resize:
                    img = img.resize(resize, Image.Resampling.LANCZOS)
                img.save(output_path, format=format)
        except Exception as e:
            raise Exception(f"Error converting image: {str(e)}")
    
    async def _convert_csv_to_json(self, input_path: Path, output_path: Path) -> None:
        """Convert CSV to JSON."""
        try:
            df = pd.read_csv(input_path)
            with open(output_path, 'w') as f:
                json.dump(df.to_dict('records'), f, indent=2)
        except Exception as e:
            raise Exception(f"Error converting CSV to JSON: {str(e)}")
    
    async def _convert_json_to_csv(self, input_path: Path, output_path: Path) -> None:
        """Convert JSON to CSV."""
        try:
            with open(input_path, 'r') as f:
                data = json.load(f)
            df = pd.DataFrame(data)
            df.to_csv(output_path, index=False)
        except Exception as e:
            raise Exception(f"Error converting JSON to CSV: {str(e)}")
    
    async def _analyze_text_file(self, file_path: str) -> Dict[str, Any]:
        """Analyze text file content."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            lines = content.split('\n')
            words = content.split()
            
            return {
                'text_analysis': {
                    'characters': len(content),
                    'words': len(words),
                    'lines': len(lines),
                    'non_empty_lines': len([line for line in lines if line.strip()]),
                    'average_words_per_line': round(len(words) / len(lines), 2) if lines else 0
                }
            }
        except Exception as e:
            raise Exception(f"Error analyzing text file: {str(e)}")
    
    async def _analyze_csv_file(self, file_path: str) -> Dict[str, Any]:
        """Analyze CSV file content."""
        try:
            df = pd.read_csv(file_path)
            
            return {
                'csv_analysis': {
                    'rows': len(df),
                    'columns': len(df.columns),
                    'column_names': df.columns.tolist(),
                    'data_types': df.dtypes.to_dict(),
                    'missing_values': df.isnull().sum().to_dict(),
                    'memory_usage': df.memory_usage(deep=True).sum()
                }
            }
        except Exception as e:
            raise Exception(f"Error analyzing CSV file: {str(e)}")
    
    async def _analyze_json_file(self, file_path: str) -> Dict[str, Any]:
        """Analyze JSON file content."""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            def count_items(obj):
                if isinstance(obj, dict):
                    return 1 + sum(count_items(v) for v in obj.values())
                elif isinstance(obj, list):
                    return 1 + sum(count_items(item) for item in obj)
                else:
                    return 1
            
            return {
                'json_analysis': {
                    'type': type(data).__name__,
                    'total_items': count_items(data),
                    'depth': self._get_json_depth(data)
                }
            }
        except Exception as e:
            raise Exception(f"Error analyzing JSON file: {str(e)}")
    
    async def _analyze_image_file(self, file_path: str) -> Dict[str, Any]:
        """Analyze image file content."""
        try:
            with Image.open(file_path) as img:
                return {
                    'image_analysis': {
                        'format': img.format,
                        'mode': img.mode,
                        'size': img.size,
                        'width': img.width,
                        'height': img.height,
                        'aspect_ratio': round(img.width / img.height, 2),
                        'file_size_mb': round(Path(file_path).stat().st_size / (1024 * 1024), 2)
                    }
                }
        except Exception as e:
            raise Exception(f"Error analyzing image file: {str(e)}")
    
    def _get_json_depth(self, obj, depth=0):
        """Get the maximum depth of a JSON object."""
        if isinstance(obj, dict):
            return max(self._get_json_depth(v, depth + 1) for v in obj.values()) if obj else depth
        elif isinstance(obj, list):
            return max(self._get_json_depth(item, depth + 1) for item in obj) if obj else depth
        else:
            return depth
    
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
                'Read text, CSV, JSON files',
                'Write files in various formats',
                'Convert between file formats',
                'Image processing and conversion',
                'File analysis and statistics',
                'Batch file operations'
            ],
            'supported_formats': self.supported_formats,
            'parameters': {
                'operation': 'Type of operation (read, write, convert, analyze)',
                'file_path': 'Path to input file (required)',
                'output_path': 'Path to output file (for write/convert operations)',
                'encoding': 'File encoding (default: utf-8)'
            }
        } 