"""
Image Processor Tool

A tool for processing images including resizing, filtering, format conversion,
image analysis, and various image manipulation operations.
"""

import asyncio
import json
import logging
import os
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance, ImageOps

# Optional OpenCV import for advanced features
try:
    import cv2
    import numpy as np
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False
    cv2 = None
    np = None
from io import BytesIO

from .base import BaseTool

logger = logging.getLogger(__name__)

class ImageProcessorTool(BaseTool):
    """
    Image Processor Tool for handling image operations.
    
    Features:
    - Image resizing and cropping
    - Image filtering and enhancement
    - Format conversion
    - Image analysis and metadata
    - Batch image processing
    - Image effects and transformations
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.supported_formats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff']
        self.max_file_size = config.get('max_file_size', 50 * 1024 * 1024)  # 50MB
        self.quality = config.get('quality', 85)
        
    async def execute(self, operation: str, input_path: str, 
                     output_path: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """
        Execute image processing operation.
        
        Args:
            operation: Type of operation (resize, filter, convert, etc.)
            input_path: Path to input image
            output_path: Path to output image (for operations that create new files)
            **kwargs: Additional operation-specific parameters
            
        Returns:
            Processing result
        """
        if not operation or not input_path:
            return self._format_error("Operation and input path are required")
        
        try:
            if operation == "resize":
                return await self._resize_image(input_path, output_path, **kwargs)
            elif operation == "crop":
                return await self._crop_image(input_path, output_path, **kwargs)
            elif operation == "filter":
                return await self._apply_filter(input_path, output_path, **kwargs)
            elif operation == "convert":
                return await self._convert_format(input_path, output_path, **kwargs)
            elif operation == "analyze":
                return await self._analyze_image(input_path, **kwargs)
            elif operation == "enhance":
                return await self._enhance_image(input_path, output_path, **kwargs)
            elif operation == "batch_process":
                return await self._batch_process_images(input_path, **kwargs)
            else:
                return self._format_error(f"Unsupported operation: {operation}")
                
        except Exception as e:
            logger.error(f"Image processing error: {str(e)}")
            return self._format_error(f"Image processing failed: {str(e)}")
    
    async def _resize_image(self, input_path: str, output_path: str,
                          width: Optional[int] = None, height: Optional[int] = None,
                          maintain_aspect_ratio: bool = True, **kwargs) -> Dict[str, Any]:
        """Resize image to specified dimensions."""
        try:
            path = Path(input_path)
            if not path.exists():
                return self._format_error(f"Input image not found: {input_path}")
            
            # Open image
            with Image.open(input_path) as img:
                original_size = img.size
                
                # Calculate new size
                if width and height:
                    new_size = (width, height)
                elif width:
                    if maintain_aspect_ratio:
                        ratio = width / original_size[0]
                        height = int(original_size[1] * ratio)
                    new_size = (width, height)
                elif height:
                    if maintain_aspect_ratio:
                        ratio = height / original_size[1]
                        width = int(original_size[0] * ratio)
                    new_size = (width, height)
                else:
                    return self._format_error("Either width or height must be specified")
                
                # Resize image
                resized_img = img.resize(new_size, Image.Resampling.LANCZOS)
                
                # Save resized image
                if not output_path:
                    output_path = str(path.parent / f"resized_{path.name}")
                
                resized_img.save(output_path, quality=self.quality)
                
                # Get output file info
                output_path_obj = Path(output_path)
                output_size = output_path_obj.stat().st_size if output_path_obj.exists() else 0
                
                resize_data = {
                    'input_path': input_path,
                    'output_path': output_path,
                    'original_size': original_size,
                    'new_size': new_size,
                    'maintain_aspect_ratio': maintain_aspect_ratio,
                    'output_size_bytes': output_size
                }
                
                metadata = {
                    'operation': 'resize',
                    'original_size': original_size,
                    'new_size': new_size
                }
                
                return self._format_success(resize_data, metadata)
                
        except Exception as e:
            raise Exception(f"Image resize error: {str(e)}")
    
    async def _crop_image(self, input_path: str, output_path: str,
                         left: int, top: int, right: int, bottom: int,
                         **kwargs) -> Dict[str, Any]:
        """Crop image to specified region."""
        try:
            path = Path(input_path)
            if not path.exists():
                return self._format_error(f"Input image not found: {input_path}")
            
            # Open image
            with Image.open(input_path) as img:
                original_size = img.size
                
                # Validate crop coordinates
                if left < 0 or top < 0 or right > original_size[0] or bottom > original_size[1]:
                    return self._format_error("Crop coordinates are out of bounds")
                
                if left >= right or top >= bottom:
                    return self._format_error("Invalid crop coordinates")
                
                # Crop image
                cropped_img = img.crop((left, top, right, bottom))
                crop_size = cropped_img.size
                
                # Save cropped image
                if not output_path:
                    output_path = str(path.parent / f"cropped_{path.name}")
                
                cropped_img.save(output_path, quality=self.quality)
                
                # Get output file info
                output_path_obj = Path(output_path)
                output_size = output_path_obj.stat().st_size if output_path_obj.exists() else 0
                
                crop_data = {
                    'input_path': input_path,
                    'output_path': output_path,
                    'original_size': original_size,
                    'crop_coordinates': (left, top, right, bottom),
                    'crop_size': crop_size,
                    'output_size_bytes': output_size
                }
                
                metadata = {
                    'operation': 'crop',
                    'original_size': original_size,
                    'crop_size': crop_size
                }
                
                return self._format_success(crop_data, metadata)
                
        except Exception as e:
            raise Exception(f"Image crop error: {str(e)}")
    
    async def _apply_filter(self, input_path: str, output_path: str,
                          filter_type: str, **kwargs) -> Dict[str, Any]:
        """Apply filter to image."""
        try:
            path = Path(input_path)
            if not path.exists():
                return self._format_error(f"Input image not found: {input_path}")
            
            # Open image
            with Image.open(input_path) as img:
                original_size = img.size
                
                # Apply filter based on type
                if filter_type == "blur":
                    filtered_img = img.filter(ImageFilter.BLUR)
                elif filter_type == "sharpen":
                    filtered_img = img.filter(ImageFilter.SHARPEN)
                elif filter_type == "emboss":
                    filtered_img = img.filter(ImageFilter.EMBOSS)
                elif filter_type == "edge_enhance":
                    filtered_img = img.filter(ImageFilter.EDGE_ENHANCE)
                elif filter_type == "find_edges":
                    filtered_img = img.filter(ImageFilter.FIND_EDGES)
                elif filter_type == "contour":
                    filtered_img = img.filter(ImageFilter.CONTOUR)
                elif filter_type == "smooth":
                    filtered_img = img.filter(ImageFilter.SMOOTH)
                else:
                    return self._format_error(f"Unsupported filter type: {filter_type}")
                
                # Save filtered image
                if not output_path:
                    output_path = str(path.parent / f"{filter_type}_{path.name}")
                
                filtered_img.save(output_path, quality=self.quality)
                
                # Get output file info
                output_path_obj = Path(output_path)
                output_size = output_path_obj.stat().st_size if output_path_obj.exists() else 0
                
                filter_data = {
                    'input_path': input_path,
                    'output_path': output_path,
                    'filter_type': filter_type,
                    'original_size': original_size,
                    'output_size_bytes': output_size
                }
                
                metadata = {
                    'operation': 'filter',
                    'filter_type': filter_type,
                    'original_size': original_size
                }
                
                return self._format_success(filter_data, metadata)
                
        except Exception as e:
            raise Exception(f"Image filter error: {str(e)}")
    
    async def _convert_format(self, input_path: str, output_path: str,
                            target_format: str, **kwargs) -> Dict[str, Any]:
        """Convert image to different format."""
        try:
            path = Path(input_path)
            if not path.exists():
                return self._format_error(f"Input image not found: {input_path}")
            
            # Validate target format
            if target_format.lower() not in self.supported_formats:
                return self._format_error(f"Unsupported target format: {target_format}")
            
            # Open image
            with Image.open(input_path) as img:
                original_format = img.format
                original_size = img.size
                
                # Convert to RGB if necessary
                if target_format.lower() in ['jpg', 'jpeg'] and img.mode in ['RGBA', 'LA']:
                    # Create white background
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                
                # Save in new format
                if not output_path:
                    output_path = str(path.parent / f"{path.stem}.{target_format.lower()}")
                
                img.save(output_path, format=target_format.upper(), quality=self.quality)
                
                # Get output file info
                output_path_obj = Path(output_path)
                output_size = output_path_obj.stat().st_size if output_path_obj.exists() else 0
                
                convert_data = {
                    'input_path': input_path,
                    'output_path': output_path,
                    'original_format': original_format,
                    'target_format': target_format,
                    'original_size': original_size,
                    'output_size_bytes': output_size
                }
                
                metadata = {
                    'operation': 'convert',
                    'original_format': original_format,
                    'target_format': target_format
                }
                
                return self._format_success(convert_data, metadata)
                
        except Exception as e:
            raise Exception(f"Image format conversion error: {str(e)}")
    
    async def _analyze_image(self, input_path: str, **kwargs) -> Dict[str, Any]:
        """Analyze image and extract metadata."""
        try:
            path = Path(input_path)
            if not path.exists():
                return self._format_error(f"Input image not found: {input_path}")
            
            # Open image
            with Image.open(input_path) as img:
                # Get basic information
                size = img.size
                mode = img.mode
                format = img.format
                file_size = path.stat().st_size
                
                # Get color information
                color_stats = None
                if mode in ['RGB', 'RGBA'] and OPENCV_AVAILABLE and np is not None:
                    try:
                        # Convert to numpy array for analysis
                        img_array = np.array(img)
                        
                        # Calculate color statistics
                        if len(img_array.shape) == 3:
                            red_channel = img_array[:, :, 0]
                            green_channel = img_array[:, :, 1]
                            blue_channel = img_array[:, :, 2]
                            
                            color_stats = {
                                'red': {
                                    'mean': float(np.mean(red_channel)),
                                    'std': float(np.std(red_channel)),
                                    'min': int(np.min(red_channel)),
                                    'max': int(np.max(red_channel))
                                },
                                'green': {
                                    'mean': float(np.mean(green_channel)),
                                    'std': float(np.std(green_channel)),
                                    'min': int(np.min(green_channel)),
                                    'max': int(np.max(green_channel))
                                },
                                'blue': {
                                    'mean': float(np.mean(blue_channel)),
                                    'std': float(np.std(blue_channel)),
                                    'min': int(np.min(blue_channel)),
                                    'max': int(np.max(blue_channel))
                                }
                            }
                    except Exception as e:
                        logger.warning(f"Color analysis failed (OpenCV not available): {str(e)}")
                        color_stats = None
                
                # Get EXIF data if available
                exif_data = {}
                if hasattr(img, '_getexif') and img._getexif():
                    exif = img._getexif()
                    for tag_id, value in exif.items():
                        tag = Image.TAGS.get(tag_id, tag_id)
                        exif_data[tag] = str(value)
                
                analysis_data = {
                    'file_path': input_path,
                    'file_size': file_size,
                    'file_size_mb': round(file_size / (1024 * 1024), 2),
                    'dimensions': size,
                    'width': size[0],
                    'height': size[1],
                    'aspect_ratio': round(size[0] / size[1], 2),
                    'mode': mode,
                    'format': format,
                    'color_stats': color_stats,
                    'exif_data': exif_data
                }
                
                metadata = {
                    'operation': 'analyze',
                    'file_size': file_size,
                    'dimensions': size
                }
                
                return self._format_success(analysis_data, metadata)
                
        except Exception as e:
            raise Exception(f"Image analysis error: {str(e)}")
    
    async def _enhance_image(self, input_path: str, output_path: str,
                           brightness: Optional[float] = None,
                           contrast: Optional[float] = None,
                           saturation: Optional[float] = None,
                           sharpness: Optional[float] = None,
                           **kwargs) -> Dict[str, Any]:
        """Enhance image with various adjustments."""
        try:
            path = Path(input_path)
            if not path.exists():
                return self._format_error(f"Input image not found: {input_path}")
            
            # Open image
            with Image.open(input_path) as img:
                original_size = img.size
                enhanced_img = img
                
                # Apply enhancements
                if brightness is not None:
                    enhancer = ImageEnhance.Brightness(enhanced_img)
                    enhanced_img = enhancer.enhance(brightness)
                
                if contrast is not None:
                    enhancer = ImageEnhance.Contrast(enhanced_img)
                    enhanced_img = enhancer.enhance(contrast)
                
                if saturation is not None:
                    enhancer = ImageEnhance.Color(enhanced_img)
                    enhanced_img = enhancer.enhance(saturation)
                
                if sharpness is not None:
                    enhancer = ImageEnhance.Sharpness(enhanced_img)
                    enhanced_img = enhancer.enhance(sharpness)
                
                # Save enhanced image
                if not output_path:
                    output_path = str(path.parent / f"enhanced_{path.name}")
                
                enhanced_img.save(output_path, quality=self.quality)
                
                # Get output file info
                output_path_obj = Path(output_path)
                output_size = output_path_obj.stat().st_size if output_path_obj.exists() else 0
                
                enhancement_data = {
                    'input_path': input_path,
                    'output_path': output_path,
                    'original_size': original_size,
                    'enhancements': {
                        'brightness': brightness,
                        'contrast': contrast,
                        'saturation': saturation,
                        'sharpness': sharpness
                    },
                    'output_size_bytes': output_size
                }
                
                metadata = {
                    'operation': 'enhance',
                    'original_size': original_size,
                    'enhancements_applied': sum(1 for v in [brightness, contrast, saturation, sharpness] if v is not None)
                }
                
                return self._format_success(enhancement_data, metadata)
                
        except Exception as e:
            raise Exception(f"Image enhancement error: {str(e)}")
    
    async def _batch_process_images(self, input_directory: str, operation: str,
                                  output_directory: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """Process multiple images in batch."""
        try:
            input_path = Path(input_directory)
            if not input_path.exists() or not input_path.is_dir():
                return self._format_error(f"Input directory not found: {input_directory}")
            
            # Find all image files
            image_extensions = [f'.{ext}' for ext in self.supported_formats]
            image_files = []
            
            for ext in image_extensions:
                image_files.extend(input_path.glob(f'*{ext}'))
                image_files.extend(input_path.glob(f'*{ext.upper()}'))
            
            if not image_files:
                return self._format_error("No image files found in directory")
            
            # Create output directory if specified
            if output_directory:
                output_path = Path(output_directory)
                output_path.mkdir(parents=True, exist_ok=True)
            else:
                output_path = input_path / "processed"
                output_path.mkdir(exist_ok=True)
            
            # Process each image
            results = []
            for image_file in image_files:
                try:
                    # Determine output path
                    if output_directory:
                        output_file = output_path / image_file.name
                    else:
                        output_file = output_path / image_file.name
                    
                    # Process image based on operation
                    if operation == "resize":
                        result = await self._resize_image(str(image_file), str(output_file), **kwargs)
                    elif operation == "convert":
                        result = await self._convert_format(str(image_file), str(output_file), **kwargs)
                    elif operation == "enhance":
                        result = await self._enhance_image(str(image_file), str(output_file), **kwargs)
                    else:
                        result = self._format_error(f"Unsupported batch operation: {operation}")
                    
                    results.append({
                        'input_file': str(image_file),
                        'output_file': str(output_file),
                        'success': result['success'],
                        'data': result.get('result', {}),
                        'error': result.get('error', '')
                    })
                    
                except Exception as e:
                    results.append({
                        'input_file': str(image_file),
                        'output_file': '',
                        'success': False,
                        'data': {},
                        'error': str(e)
                    })
            
            # Calculate statistics
            successful = sum(1 for r in results if r['success'])
            failed = len(results) - successful
            
            batch_data = {
                'input_directory': input_directory,
                'output_directory': str(output_path),
                'operation': operation,
                'total_files': len(image_files),
                'successful': successful,
                'failed': failed,
                'success_rate': round(successful / len(image_files) * 100, 2) if image_files else 0,
                'results': results
            }
            
            metadata = {
                'operation': 'batch_process',
                'batch_operation': operation,
                'total_files': len(image_files)
            }
            
            return self._format_success(batch_data, metadata)
            
        except Exception as e:
            raise Exception(f"Batch processing error: {str(e)}")
    
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
                'Image resizing and cropping',
                'Image filtering and effects',
                'Format conversion',
                'Image analysis and metadata',
                'Image enhancement',
                'Batch image processing',
                'Color analysis'
            ],
            'supported_formats': self.supported_formats,
            'supported_operations': [
                'resize',
                'crop',
                'filter',
                'convert',
                'analyze',
                'enhance',
                'batch_process'
            ],
            'supported_filters': [
                'blur',
                'sharpen',
                'emboss',
                'edge_enhance',
                'find_edges',
                'contour',
                'smooth'
            ],
            'parameters': {
                'operation': 'Type of image operation (required)',
                'input_path': 'Path to input image (required)',
                'output_path': 'Path to output image (for operations that create new files)',
                'width': 'Target width for resize operations',
                'height': 'Target height for resize operations',
                'filter_type': 'Type of filter to apply',
                'target_format': 'Target format for conversion'
            }
        } 