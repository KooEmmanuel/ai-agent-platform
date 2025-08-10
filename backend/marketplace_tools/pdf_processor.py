"""
PDF Processor Tool

A tool for processing PDF files including text extraction, image extraction,
metadata extraction, and PDF creation from various sources.
"""

import asyncio
import json
import logging
import os
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
from pathlib import Path
import PyPDF2
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.units import inch
import fitz  # PyMuPDF
import io

from .base import BaseTool

logger = logging.getLogger(__name__)

class PDFProcessorTool(BaseTool):
    """
    PDF Processor Tool for handling PDF operations.
    
    Features:
    - Extract text from PDF files
    - Extract images from PDF files
    - Extract PDF metadata
    - Create PDFs from text/content
    - PDF page manipulation
    - PDF analysis and statistics
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.max_file_size = config.get('max_file_size', 50 * 1024 * 1024)  # 50MB
        self.supported_formats = ['pdf']
        self.default_page_size = config.get('default_page_size', 'A4')
        
    async def execute(self, operation: str, file_path: str, 
                     output_path: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """
        Execute PDF processing operation.
        
        Args:
            operation: Type of operation (extract_text, extract_images, etc.)
            file_path: Path to input PDF file
            output_path: Path to output file (for create operations)
            **kwargs: Additional operation-specific parameters
            
        Returns:
            Processing result
        """
        if not operation or not file_path:
            return self._format_error("Operation and file path are required")
        
        try:
            if operation == "extract_text":
                return await self._extract_text(file_path, **kwargs)
            elif operation == "extract_images":
                return await self._extract_images(file_path, **kwargs)
            elif operation == "extract_metadata":
                return await self._extract_metadata(file_path, **kwargs)
            elif operation == "create_pdf":
                return await self._create_pdf(file_path, **kwargs)
            elif operation == "analyze_pdf":
                return await self._analyze_pdf(file_path, **kwargs)
            elif operation == "merge_pdfs":
                return await self._merge_pdfs(file_path, output_path, **kwargs)
            else:
                return self._format_error(f"Unsupported operation: {operation}")
                
        except Exception as e:
            logger.error(f"PDF processing error: {str(e)}")
            return self._format_error(f"PDF processing failed: {str(e)}")
    
    async def _extract_text(self, file_path: str, pages: Optional[List[int]] = None,
                           include_coordinates: bool = False) -> Dict[str, Any]:
        """Extract text from PDF file."""
        try:
            path = Path(file_path)
            if not path.exists():
                return self._format_error(f"PDF file not found: {file_path}")
            
            if path.stat().st_size > self.max_file_size:
                return self._format_error(f"PDF file too large: {path.stat().st_size} bytes")
            
            # Open PDF with PyMuPDF for better text extraction
            doc = fitz.open(file_path)
            
            extracted_text = []
            total_pages = len(doc)
            
            # Determine pages to extract
            if pages is None:
                pages_to_extract = range(total_pages)
            else:
                pages_to_extract = [p for p in pages if 0 <= p < total_pages]
            
            for page_num in pages_to_extract:
                page = doc[page_num]
                
                if include_coordinates:
                    # Extract text with coordinates
                    text_blocks = page.get_text("dict")
                    page_text = []
                    
                    for block in text_blocks["blocks"]:
                        if "lines" in block:
                            for line in block["lines"]:
                                for span in line["spans"]:
                                    page_text.append({
                                        'text': span['text'],
                                        'bbox': span['bbox'],
                                        'font': span['font'],
                                        'size': span['size']
                                    })
                else:
                    # Extract plain text
                    page_text = page.get_text()
                
                extracted_text.append({
                    'page': page_num + 1,
                    'content': page_text
                })
            
            doc.close()
            
            # Calculate statistics
            total_text_length = sum(len(str(page['content'])) for page in extracted_text)
            
            extraction_data = {
                'file_path': file_path,
                'total_pages': total_pages,
                'extracted_pages': len(pages_to_extract),
                'pages': extracted_text,
                'total_text_length': total_text_length,
                'include_coordinates': include_coordinates
            }
            
            metadata = {
                'operation': 'extract_text',
                'file_size': path.stat().st_size,
                'pages_requested': pages,
                'pages_extracted': len(pages_to_extract)
            }
            
            return self._format_success(extraction_data, metadata)
            
        except Exception as e:
            raise Exception(f"Text extraction error: {str(e)}")
    
    async def _extract_images(self, file_path: str, pages: Optional[List[int]] = None,
                            output_dir: Optional[str] = None) -> Dict[str, Any]:
        """Extract images from PDF file."""
        try:
            path = Path(file_path)
            if not path.exists():
                return self._format_error(f"PDF file not found: {file_path}")
            
            # Open PDF with PyMuPDF
            doc = fitz.open(file_path)
            
            extracted_images = []
            total_pages = len(doc)
            
            # Determine pages to extract
            if pages is None:
                pages_to_extract = range(total_pages)
            else:
                pages_to_extract = [p for p in pages if 0 <= p < total_pages]
            
            # Create output directory if specified
            if output_dir:
                output_path = Path(output_dir)
                output_path.mkdir(parents=True, exist_ok=True)
            
            for page_num in pages_to_extract:
                page = doc[page_num]
                
                # Get image list for this page
                image_list = page.get_images()
                
                for img_index, img in enumerate(image_list):
                    try:
                        # Get image data
                        xref = img[0]
                        pix = fitz.Pixmap(doc, xref)
                        
                        if pix.n - pix.alpha < 4:  # GRAY or RGB
                            img_data = pix.tobytes("png")
                        else:  # CMYK: convert to RGB first
                            pix1 = fitz.Pixmap(fitz.csRGB, pix)
                            img_data = pix1.tobytes("png")
                            pix1 = None
                        
                        # Save image if output directory is specified
                        image_filename = None
                        if output_dir:
                            image_filename = f"page_{page_num + 1}_image_{img_index + 1}.png"
                            image_path = output_path / image_filename
                            
                            with open(image_path, "wb") as img_file:
                                img_file.write(img_data)
                        
                        extracted_images.append({
                            'page': page_num + 1,
                            'image_index': img_index + 1,
                            'width': pix.width,
                            'height': pix.height,
                            'colorspace': pix.colorspace.name,
                            'size_bytes': len(img_data),
                            'filename': image_filename
                        })
                        
                        pix = None
                        
                    except Exception as e:
                        logger.warning(f"Failed to extract image {img_index} from page {page_num}: {str(e)}")
                        continue
            
            doc.close()
            
            extraction_data = {
                'file_path': file_path,
                'total_pages': total_pages,
                'extracted_pages': len(pages_to_extract),
                'images': extracted_images,
                'total_images': len(extracted_images),
                'output_directory': output_dir
            }
            
            metadata = {
                'operation': 'extract_images',
                'file_size': path.stat().st_size,
                'pages_requested': pages,
                'pages_extracted': len(pages_to_extract)
            }
            
            return self._format_success(extraction_data, metadata)
            
        except Exception as e:
            raise Exception(f"Image extraction error: {str(e)}")
    
    async def _extract_metadata(self, file_path: str) -> Dict[str, Any]:
        """Extract metadata from PDF file."""
        try:
            path = Path(file_path)
            if not path.exists():
                return self._format_error(f"PDF file not found: {file_path}")
            
            # Open PDF with PyPDF2 for metadata
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                # Get document info
                info = pdf_reader.metadata
                
                # Get page count
                page_count = len(pdf_reader.pages)
                
                # Get page dimensions
                first_page = pdf_reader.pages[0]
                page_width = float(first_page.mediabox.width)
                page_height = float(first_page.mediabox.height)
                
                metadata_data = {
                    'file_path': file_path,
                    'file_size': path.stat().st_size,
                    'page_count': page_count,
                    'page_width': page_width,
                    'page_height': page_height,
                    'document_info': {
                        'title': info.get('/Title', ''),
                        'author': info.get('/Author', ''),
                        'subject': info.get('/Subject', ''),
                        'creator': info.get('/Creator', ''),
                        'producer': info.get('/Producer', ''),
                        'creation_date': info.get('/CreationDate', ''),
                        'modification_date': info.get('/ModDate', '')
                    }
                }
            
            metadata = {
                'operation': 'extract_metadata',
                'file_size': path.stat().st_size
            }
            
            return self._format_success(metadata_data, metadata)
            
        except Exception as e:
            raise Exception(f"Metadata extraction error: {str(e)}")
    
    async def _create_pdf(self, output_path: str, content: Union[str, List[Dict[str, Any]]],
                         title: Optional[str] = None, author: Optional[str] = None,
                         page_size: str = "A4") -> Dict[str, Any]:
        """Create PDF from content."""
        try:
            # Determine page size
            if page_size.upper() == "A4":
                pagesize = A4
            elif page_size.upper() == "LETTER":
                pagesize = letter
            else:
                pagesize = A4
            
            # Create PDF document
            doc = SimpleDocTemplate(output_path, pagesize=pagesize)
            story = []
            
            # Get styles
            styles = getSampleStyleSheet()
            normal_style = styles['Normal']
            title_style = styles['Title']
            
            # Add title if provided
            if title:
                story.append(Paragraph(title, title_style))
                story.append(Spacer(1, 12))
            
            # Add content
            if isinstance(content, str):
                # Simple text content
                paragraphs = content.split('\n\n')
                for para in paragraphs:
                    if para.strip():
                        story.append(Paragraph(para.strip(), normal_style))
                        story.append(Spacer(1, 6))
            elif isinstance(content, list):
                # Structured content
                for item in content:
                    if isinstance(item, dict):
                        if 'title' in item:
                            story.append(Paragraph(item['title'], title_style))
                            story.append(Spacer(1, 6))
                        
                        if 'text' in item:
                            story.append(Paragraph(item['text'], normal_style))
                            story.append(Spacer(1, 6))
                        
                        if 'spacer' in item:
                            story.append(Spacer(1, item['spacer']))
            
            # Build PDF
            doc.build(story)
            
            # Get file info
            path = Path(output_path)
            file_size = path.stat().st_size if path.exists() else 0
            
            creation_data = {
                'output_path': output_path,
                'file_size': file_size,
                'page_size': page_size,
                'title': title,
                'author': author,
                'content_type': type(content).__name__
            }
            
            metadata = {
                'operation': 'create_pdf',
                'output_path': output_path,
                'page_size': page_size
            }
            
            return self._format_success(creation_data, metadata)
            
        except Exception as e:
            raise Exception(f"PDF creation error: {str(e)}")
    
    async def _analyze_pdf(self, file_path: str) -> Dict[str, Any]:
        """Analyze PDF file and provide comprehensive statistics."""
        try:
            path = Path(file_path)
            if not path.exists():
                return self._format_error(f"PDF file not found: {file_path}")
            
            # Open PDF with PyMuPDF for analysis
            doc = fitz.open(file_path)
            
            analysis_data = {
                'file_path': file_path,
                'file_size': path.stat().st_size,
                'file_size_mb': round(path.stat().st_size / (1024 * 1024), 2),
                'page_count': len(doc),
                'pages': []
            }
            
            total_text_length = 0
            total_images = 0
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # Get page dimensions
                rect = page.rect
                page_width = rect.width
                page_height = rect.height
                
                # Get text statistics
                text = page.get_text()
                text_length = len(text)
                word_count = len(text.split())
                
                # Get image count
                image_list = page.get_images()
                image_count = len(image_list)
                
                page_data = {
                    'page_number': page_num + 1,
                    'width': page_width,
                    'height': page_height,
                    'text_length': text_length,
                    'word_count': word_count,
                    'image_count': image_count,
                    'rotation': page.rotation
                }
                
                analysis_data['pages'].append(page_data)
                total_text_length += text_length
                total_images += image_count
            
            doc.close()
            
            # Add summary statistics
            analysis_data.update({
                'total_text_length': total_text_length,
                'total_word_count': sum(page['word_count'] for page in analysis_data['pages']),
                'total_images': total_images,
                'average_text_per_page': round(total_text_length / len(analysis_data['pages']), 2) if analysis_data['pages'] else 0,
                'average_images_per_page': round(total_images / len(analysis_data['pages']), 2) if analysis_data['pages'] else 0
            })
            
            metadata = {
                'operation': 'analyze_pdf',
                'file_size': path.stat().st_size
            }
            
            return self._format_success(analysis_data, metadata)
            
        except Exception as e:
            raise Exception(f"PDF analysis error: {str(e)}")
    
    async def _merge_pdfs(self, input_files: Union[str, List[str]], output_path: str) -> Dict[str, Any]:
        """Merge multiple PDF files into one."""
        try:
            if isinstance(input_files, str):
                input_files = [input_files]
            
            if not input_files:
                return self._format_error("No input files provided")
            
            # Validate input files
            for file_path in input_files:
                path = Path(file_path)
                if not path.exists():
                    return self._format_error(f"Input file not found: {file_path}")
            
            # Create PDF merger
            merger = PyPDF2.PdfMerger()
            
            # Add each PDF to the merger
            for file_path in input_files:
                with open(file_path, 'rb') as file:
                    merger.append(file)
            
            # Write merged PDF
            with open(output_path, 'wb') as output_file:
                merger.write(output_file)
            
            merger.close()
            
            # Get output file info
            output_path_obj = Path(output_path)
            file_size = output_path_obj.stat().st_size if output_path_obj.exists() else 0
            
            merge_data = {
                'input_files': input_files,
                'output_path': output_path,
                'input_count': len(input_files),
                'output_size': file_size,
                'output_size_mb': round(file_size / (1024 * 1024), 2)
            }
            
            metadata = {
                'operation': 'merge_pdfs',
                'input_files_count': len(input_files),
                'output_path': output_path
            }
            
            return self._format_success(merge_data, metadata)
            
        except Exception as e:
            raise Exception(f"PDF merge error: {str(e)}")
    
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
                'Extract text from PDF files',
                'Extract images from PDF files',
                'Extract PDF metadata',
                'Create PDFs from text/content',
                'Analyze PDF structure and statistics',
                'Merge multiple PDF files',
                'PDF page manipulation'
            ],
            'supported_operations': [
                'extract_text',
                'extract_images',
                'extract_metadata',
                'create_pdf',
                'analyze_pdf',
                'merge_pdfs'
            ],
            'parameters': {
                'operation': 'Type of PDF operation (required)',
                'file_path': 'Path to input PDF file (required)',
                'output_path': 'Path to output file (for create/merge operations)',
                'pages': 'List of page numbers to process (optional)',
                'content': 'Content to include in new PDF (for create operation)'
            }
        } 