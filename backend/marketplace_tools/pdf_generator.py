#!/usr/bin/env python3
"""
PDF Generator Tool - Generate professional PDF documents from markdown content
"""

import asyncio
import base64
import json
import markdown
import os
import tempfile
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional, Union
from bs4 import BeautifulSoup
from app.core.config import settings

# ReportLab imports for PDF generation
from reportlab.lib.pagesizes import letter, A4, legal
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT


class PDFGeneratorTool:
    def __init__(self, config: Dict[str, Any] = None):
        self.name = "pdf_generator"
        self.description = "Generate professional PDF files from markdown content with various templates and styling"
        self.category = "Document Generation"
        self.tool_type = "pdf_generator"
        self.config = config or {}
        
        self.schema = {
            "type": "object",
            "properties": {
                "content": {
                    "type": "string",
                    "description": "The markdown content to convert to PDF"
                },
                "document_type": {
                    "type": "string",
                    "description": "Type of document being generated",
                    "enum": ["report", "invoice", "letter", "resume", "presentation", "manual", "other"],
                    "default": "report"
                },
                "filename": {
                    "type": "string",
                    "description": "Output filename for the PDF",
                    "default": "document.pdf"
                },
                "page_size": {
                    "type": "string",
                    "description": "Page size for the PDF",
                    "enum": ["letter", "A4", "legal"],
                    "default": "A4"
                },
                "template": {
                    "type": "string",
                    "description": "Document template to use",
                    "enum": ["professional", "resume", "report", "letter", "minimal"],
                    "default": "professional"
                },
                "font_size": {
                    "type": "integer",
                    "description": "Base font size in points",
                    "default": 12
                },
                "line_spacing": {
                    "type": "number",
                    "description": "Line spacing multiplier",
                    "default": 1.2
                },
                "margins": {
                    "type": "object",
                    "description": "Page margins in inches",
                    "properties": {
                        "top": {"type": "number", "default": 1.0},
                        "bottom": {"type": "number", "default": 1.0},
                        "left": {"type": "number", "default": 1.0},
                        "right": {"type": "number", "default": 1.0}
                    }
                },
                "include_header": {
                    "type": "boolean",
                    "description": "Include header with generation date",
                    "default": True
                },
                "include_footer": {
                    "type": "boolean",
                    "description": "Include footer with page numbers",
                    "default": True
                },
                "custom_styles": {
                    "type": "object",
                    "description": "Custom styling options",
                    "properties": {
                        "primary_color": {"type": "string", "default": "#2563eb"},
                        "secondary_color": {"type": "string", "default": "#64748b"},
                        "font_family": {"type": "string", "default": "Helvetica"}
                    }
                }
            },
            "required": []
        }

    def _get_template_config(self, template: str) -> Dict[str, Any]:
        """Get configuration for specific templates"""
        templates = {
            "professional": {
                "margins": {"top": 1.0, "bottom": 1.0, "left": 1.0, "right": 1.0},
                "font_size": 12,
                "line_spacing": 1.2,
                "custom_styles": {
                    "primary_color": "#2563eb",
                    "secondary_color": "#64748b",
                    "font_family": "Helvetica"
                }
            },
            "resume": {
                "margins": {"top": 0.5, "bottom": 0.5, "left": 0.5, "right": 0.5},
                "font_size": 10,
                "line_spacing": 1.1,
                "custom_styles": {
                    "primary_color": "#1f2937",
                    "secondary_color": "#6b7280",
                    "font_family": "Helvetica"
                }
            },
            "report": {
                "margins": {"top": 1.0, "bottom": 1.0, "left": 1.0, "right": 1.0},
                "font_size": 11,
                "line_spacing": 1.3,
                "custom_styles": {
                    "primary_color": "#dc2626",
                    "secondary_color": "#6b7280",
                    "font_family": "Times-Roman"
                }
            },
            "letter": {
                "margins": {"top": 1.0, "bottom": 1.0, "left": 1.0, "right": 1.0},
                "font_size": 12,
                "line_spacing": 1.2,
                "custom_styles": {
                    "primary_color": "#1f2937",
                    "secondary_color": "#6b7280",
                    "font_family": "Times-Roman"
                }
            },
            "minimal": {
                "margins": {"top": 0.5, "bottom": 0.5, "left": 0.5, "right": 0.5},
                "font_size": 10,
                "line_spacing": 1.0,
                "custom_styles": {
                    "primary_color": "#000000",
                    "secondary_color": "#666666",
                    "font_family": "Helvetica"
                }
            }
        }
        return templates.get(template, templates["professional"])

    def _get_page_size(self, size_name: str):
        """Get ReportLab page size object"""
        sizes = {
            "letter": letter,
            "A4": A4,
            "legal": legal
        }
        return sizes.get(size_name, A4)

    def _create_custom_styles(self, config: Dict[str, Any]) -> Dict[str, ParagraphStyle]:
        """Create custom paragraph styles based on configuration"""
        base_font_size = config.get("font_size", 12)
        line_spacing = config.get("line_spacing", 1.2)
        custom_styles = config.get("custom_styles", {})
        primary_color = custom_styles.get("primary_color", "#2563eb")
        secondary_color = custom_styles.get("secondary_color", "#64748b")
        font_family = custom_styles.get("font_family", "Helvetica")
        
        # Create base normal style first
        normal_style = ParagraphStyle(
            "Normal",
            fontName=font_family,
            fontSize=base_font_size,
            leading=base_font_size * line_spacing,
            spaceAfter=6,
            textColor=colors.black,
            alignment=TA_LEFT
        )
        
        styles = {
            "Normal": normal_style,
            "Heading1": ParagraphStyle(
                "Heading1",
                parent=normal_style,
                fontName=font_family,
                fontSize=base_font_size + 8,
                leading=(base_font_size + 8) * line_spacing,
                textColor=colors.HexColor(primary_color),
                spaceAfter=12,
                spaceBefore=20,
                alignment=TA_LEFT
            ),
            "Heading2": ParagraphStyle(
                "Heading2",
                parent=normal_style,
                fontName=font_family,
                fontSize=base_font_size + 4,
                leading=(base_font_size + 4) * line_spacing,
                textColor=colors.HexColor(primary_color),
                spaceAfter=8,
                spaceBefore=15,
                alignment=TA_LEFT
            ),
            "Heading3": ParagraphStyle(
                "Heading3",
                parent=normal_style,
                fontName=font_family,
                fontSize=base_font_size + 2,
                leading=(base_font_size + 2) * line_spacing,
                textColor=colors.HexColor(secondary_color),
                spaceAfter=6,
                spaceBefore=10,
                alignment=TA_LEFT
            ),
            "Code": ParagraphStyle(
                "Code",
                parent=normal_style,
                fontName="Courier",
                fontSize=base_font_size - 1,
                leading=base_font_size * line_spacing,
                textColor=colors.black,
                backColor=colors.lightgrey,
                leftIndent=10,
                rightIndent=10,
                spaceAfter=6,
                spaceBefore=6
            ),
            "Quote": ParagraphStyle(
                "Quote",
                parent=normal_style,
                fontName=font_family,
                fontSize=base_font_size,
                leading=base_font_size * line_spacing,
                textColor=colors.HexColor(secondary_color),
                leftIndent=20,
                rightIndent=20,
                spaceAfter=8,
                spaceBefore=8
            )
        }
        
        return styles

    def _parse_markdown_to_elements(self, markdown_content: str, styles: Dict[str, ParagraphStyle]) -> List:
        """Parse markdown content into ReportLab elements"""
        elements = []
        
        # Convert markdown to HTML first
        html_content = markdown.markdown(markdown_content, extensions=['codehilite', 'fenced_code'])
        
        # Parse HTML and convert to ReportLab elements
        soup = BeautifulSoup(html_content, 'html.parser')
        
        for element in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'blockquote', 'pre', 'code']):
            if element.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                # Map h4, h5, h6 to h3 style for now
                level = min(int(element.name[1]), 3)
                style_name = f"Heading{level}"
                text = element.get_text().strip()
                if text:
                    elements.append(Paragraph(text, styles[style_name]))
                    elements.append(Spacer(1, 6))
            elif element.name == 'p':
                text = element.get_text().strip()
                if text:
                    elements.append(Paragraph(text, styles["Normal"]))
                    elements.append(Spacer(1, 6))
            elif element.name in ['ul', 'ol']:
                list_items = element.find_all('li')
                for i, li in enumerate(list_items, 1):
                    text = li.get_text().strip()
                    if text:
                        if element.name == 'ul':
                            bullet = "• "
                        else:  # ol - ordered list
                            bullet = f"{i}. "
                        elements.append(Paragraph(bullet + text, styles["Normal"]))
                elements.append(Spacer(1, 6))
            elif element.name == 'blockquote':
                text = element.get_text().strip()
                if text:
                    elements.append(Paragraph(text, styles["Quote"]))
                    elements.append(Spacer(1, 6))
            elif element.name in ['pre', 'code']:
                text = element.get_text().strip()
                if text:
                    elements.append(Paragraph(text, styles["Code"]))
                    elements.append(Spacer(1, 6))
        
        return elements

    def _create_header_footer(self, canvas_obj, doc):
        """Create header and footer for the document"""
        canvas_obj.saveState()
        
        # Footer with date and page number
        canvas_obj.setFont("Helvetica", 8)
        canvas_obj.setFillColor(colors.grey)
        
        # Date on the left
        canvas_obj.drawString(doc.leftMargin, 20, f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        
        # Page number on the right
        canvas_obj.drawRightString(doc.width + doc.leftMargin, 20, f"Page {doc.page}")
        
        canvas_obj.restoreState()

    def generate_pdf(self, content: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate PDF from markdown content using ReportLab"""
        try:
            if not content or not content.strip():
                content = "This document was generated but no content was provided."
            
            # Get template configuration
            template = config.get("template", "professional")
            template_config = self._get_template_config(template)
            
            # Merge template config with provided config
            final_config = {**template_config, **config}
            
            # Get page size
            page_size = config.get("page_size", "A4")
            pagesize = self._get_page_size(page_size)
            
            # Create styles
            styles = self._create_custom_styles(final_config)
            
            # Parse markdown content
            elements = self._parse_markdown_to_elements(content, styles)
            
            if not elements:
                elements = [Paragraph("No content to display", styles["Normal"])]
            
            # Create PDF document in memory
            from io import BytesIO
            buffer = BytesIO()
            
            margins = final_config.get("margins", {"top": 1.0, "bottom": 1.0, "left": 1.0, "right": 1.0})
            
            doc = SimpleDocTemplate(
                buffer,
                pagesize=pagesize,
                rightMargin=margins["right"] * inch,
                leftMargin=margins["left"] * inch,
                topMargin=margins["top"] * inch,
                bottomMargin=margins["bottom"] * inch
            )
            
            # Store elements count before build (build() consumes the elements list)
            elements_count = len(elements)
            
            # Build PDF
            doc.build(elements, onFirstPage=self._create_header_footer, onLaterPages=self._create_header_footer)
            
            # Get PDF content
            pdf_content = buffer.getvalue()
            buffer.close()
            
            if len(pdf_content) < 1000:  # PDF should be at least 1KB
                return {
                    "success": False,
                    "error": "Generated PDF appears to be empty or corrupted",
                    "method": "reportlab"
                }
            
            # Return PDF content for blob storage
            return {
                "success": True,
                "method": "reportlab",
                "pdf_content": pdf_content,
                "file_size": len(pdf_content),
                "page_size": page_size,
                "template": template,
                "elements_count": elements_count
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to generate PDF: {str(e)}",
                "method": "reportlab"
            }

    def _format_success(self, data: Dict[str, Any], metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Format successful response"""
        response = {
            "success": True,
            "data": data,
            "metadata": metadata or {}
        }
        
        # Add download URL if we have file
        if "file_url" in data:
            response["download_url"] = data["file_url"]
        elif "pdf_content" in data:
            # For blob storage, we'll handle this in the agent service
            response["download_url"] = f"data:application/pdf;base64,{data['pdf_content']}"
        elif "html_content" in data:
            response["download_url"] = f"data:text/html;base64,{data['html_content']}"
        
        return response

    def _format_error(self, error_message: str) -> Dict[str, Any]:
        """Format error response"""
        return {
            "success": False,
            "error": error_message,
            "data": None
        }

    async def execute(self, **kwargs) -> Dict[str, Any]:
        """Execute the PDF generator tool"""
        try:
            content = kwargs.get('content', '')
            document_type = kwargs.get('document_type', 'general')
            filename = kwargs.get('filename', 'document.pdf')
            user_id = kwargs.get('user_id')  # Get user_id from kwargs
            
            config = self.config.copy()
            config.update({
                'page_size': kwargs.get('page_size', 'A4'),
                'template': kwargs.get('template', 'professional'),
                'font_size': kwargs.get('font_size', 12),
                'line_spacing': kwargs.get('line_spacing', 1.2),
                'margins': kwargs.get('margins', {'top': 1.0, 'bottom': 1.0, 'left': 1.0, 'right': 1.0}),
                'include_header': kwargs.get('include_header', True),
                'include_footer': kwargs.get('include_footer', True),
                'custom_styles': kwargs.get('custom_styles', {
                    'primary_color': '#2563eb',
                    'secondary_color': '#64748b',
                    'font_family': 'Helvetica'
                })
            })
            
            if not content:
                return self._format_error("No content provided for PDF generation")
            
            # Generate PDF
            result = self.generate_pdf(content, config)
            
            if result["success"]:
                # Add filename to result
                result["filename"] = filename
                
                # Try to upload to Vercel Blob if user_id is provided
                if user_id and 'pdf_content' in result:
                    try:
                        from app.services.file_management_service import file_management_service
                        
                        # Upload PDF to Vercel Blob
                        upload_result = await file_management_service.upload_file(
                            file_content=result['pdf_content'],
                            filename=filename,
                            user_id=user_id,
                            folder_path="generated_pdfs"
                        )
                        
                        if upload_result.get('success'):
                            # Replace base64 content with Vercel Blob URL
                            result['file_url'] = upload_result['blob_url']
                            result['download_url'] = upload_result['blob_url']
                            result['blob_url'] = upload_result['blob_url']
                            result['uploaded_to_blob'] = True
                            
                            # Remove the large base64 content to save space
                            if 'pdf_content' in result:
                                del result['pdf_content']
                        else:
                            # Fallback to base64 if upload fails
                            result['upload_error'] = upload_result.get('error', 'Upload failed')
                            result['download_url'] = f"data:application/pdf;base64,{base64.b64encode(result['pdf_content']).decode()}"
                    except Exception as upload_error:
                        # Fallback to base64 if upload fails
                        result['upload_error'] = str(upload_error)
                        result['download_url'] = f"data:application/pdf;base64,{base64.b64encode(result['pdf_content']).decode()}"
                else:
                    # No user_id provided, use base64 fallback
                    result['download_url'] = f"data:application/pdf;base64,{base64.b64encode(result['pdf_content']).decode()}"
                
                return self._format_success(result)
            else:
                return self._format_error(result.get("error", "PDF generation failed"))
                
        except Exception as e:
            return self._format_error(f"PDF generation failed: {str(e)}")

    def get_schema(self) -> Dict[str, Any]:
        """Get the tool schema"""
        return self.schema

    def get_description(self) -> str:
        """Get tool description"""
        return self.description

    def get_name(self) -> str:
        """Get tool name"""
        return self.name

    def get_category(self) -> str:
        """Get tool category"""
        return self.category