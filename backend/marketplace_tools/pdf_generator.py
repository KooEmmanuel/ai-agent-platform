"""
PDF Generator Tool
Generates professional PDF files from markdown content with various templates and styling options.
"""

import io
import base64
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
import json
from reportlab.lib.pagesizes import letter, A4, legal
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
import markdown
from markdown.extensions import codehilite, tables, toc
import re
import os

class PDFGeneratorTool:
    def __init__(self):
        self.name = "pdf_generator"
        self.description = "Generate professional PDF files from markdown content with various templates and styling"
        self.category = "Document Generation"
        self.tool_type = "pdf_generator"
        
    def get_config_schema(self) -> Dict[str, Any]:
        """Get the configuration schema for this tool"""
        return {
            "name": "PDF Generator",
            "description": "Generate professional PDF files from markdown content",
            "parameters": {
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
                    "description": "Base font size",
                    "default": 12
                },
                "line_spacing": {
                    "type": "number",
                    "description": "Line spacing multiplier",
                    "default": 1.2
                },
                "margins": {
                    "type": "object",
                    "properties": {
                        "top": {"type": "number", "default": 1.0},
                        "bottom": {"type": "number", "default": 1.0},
                        "left": {"type": "number", "default": 1.0},
                        "right": {"type": "number", "default": 1.0}
                    },
                    "default": {"top": 1.0, "bottom": 1.0, "left": 1.0, "right": 1.0}
                },
                "include_header": {
                    "type": "boolean",
                    "description": "Include header with title and date",
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

    def _get_page_size(self, size_name: str):
        """Get page size dimensions"""
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
            textColor=colors.black
        )
        
        styles = {
            "Normal": normal_style,
            "Heading1": ParagraphStyle(
                "Heading1",
                parent=normal_style,
                fontName=font_family + "-Bold",
                fontSize=base_font_size + 8,
                leading=(base_font_size + 8) * line_spacing,
                spaceAfter=12,
                spaceBefore=12,
                textColor=HexColor(primary_color),
                alignment=TA_LEFT
            ),
            "Heading2": ParagraphStyle(
                "Heading2",
                parent=normal_style,
                fontName=font_family + "-Bold",
                fontSize=base_font_size + 4,
                leading=(base_font_size + 4) * line_spacing,
                spaceAfter=10,
                spaceBefore=10,
                textColor=HexColor(primary_color),
                alignment=TA_LEFT
            ),
            "Heading3": ParagraphStyle(
                "Heading3",
                parent=normal_style,
                fontName=font_family + "-Bold",
                fontSize=base_font_size + 2,
                leading=(base_font_size + 2) * line_spacing,
                spaceAfter=8,
                spaceBefore=8,
                textColor=HexColor(secondary_color),
                alignment=TA_LEFT
            ),
            "Code": ParagraphStyle(
                "Code",
                parent=normal_style,
                fontName="Courier",
                fontSize=base_font_size - 1,
                leading=(base_font_size - 1) * line_spacing,
                spaceAfter=6,
                spaceBefore=6,
                leftIndent=20,
                backColor=colors.lightgrey
            ),
            "Quote": ParagraphStyle(
                "Quote",
                parent=normal_style,
                leftIndent=20,
                rightIndent=20,
                spaceAfter=6,
                spaceBefore=6,
                fontStyle="italic",
                textColor=HexColor(secondary_color)
            )
        }
        
        return styles

    def _parse_markdown_to_elements(self, markdown_content: str, styles: Dict[str, ParagraphStyle]) -> List:
        """Parse markdown content into ReportLab elements"""
        elements = []
        
        # Convert markdown to HTML
        md = markdown.Markdown(extensions=['codehilite', 'tables', 'toc'])
        html_content = md.convert(markdown_content)
        
        # Split into lines for processing
        lines = html_content.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                elements.append(Spacer(1, 6))
                continue
                
            # Handle different HTML tags
            if line.startswith('<h1>'):
                text = re.sub(r'<h1>(.*?)</h1>', r'\1', line)
                elements.append(Paragraph(text, styles["Heading1"]))
            elif line.startswith('<h2>'):
                text = re.sub(r'<h2>(.*?)</h2>', r'\1', line)
                elements.append(Paragraph(text, styles["Heading2"]))
            elif line.startswith('<h3>'):
                text = re.sub(r'<h3>(.*?)</h3>', r'\1', line)
                elements.append(Paragraph(text, styles["Heading3"]))
            elif line.startswith('<p><code>') or line.startswith('<pre>'):
                # Handle code blocks
                text = re.sub(r'<p><code>(.*?)</code></p>', r'\1', line)
                text = re.sub(r'<pre><code>(.*?)</code></pre>', r'\1', line, flags=re.DOTALL)
                elements.append(Paragraph(text, styles["Code"]))
            elif line.startswith('<blockquote>'):
                text = re.sub(r'<blockquote><p>(.*?)</p></blockquote>', r'\1', line)
                elements.append(Paragraph(text, styles["Quote"]))
            elif line.startswith('<ul>') or line.startswith('<ol>'):
                # Handle lists
                list_items = re.findall(r'<li>(.*?)</li>', line)
                for item in list_items:
                    elements.append(Paragraph(f"• {item}", styles["Normal"]))
            elif line.startswith('<table>'):
                # Handle tables (simplified)
                elements.append(Paragraph("Table content", styles["Normal"]))
            else:
                # Regular paragraph
                text = re.sub(r'<p>(.*?)</p>', r'\1', line)
                if text:
                    elements.append(Paragraph(text, styles["Normal"]))
        
        return elements

    def _create_header_footer(self, canvas_obj, doc, config: Dict[str, Any], title: str = ""):
        """Create header and footer for the PDF"""
        page_width, page_height = doc.pagesize
        
        # Header
        if config.get("include_header", True):
            canvas_obj.setFont("Helvetica-Bold", 12)
            canvas_obj.setFillColor(HexColor(config.get("custom_styles", {}).get("primary_color", "#2563eb")))
            canvas_obj.drawString(doc.leftMargin, page_height - doc.topMargin + 20, title)
            
            canvas_obj.setFont("Helvetica", 10)
            canvas_obj.setFillColor(colors.grey)
            canvas_obj.drawString(doc.leftMargin, page_height - doc.topMargin + 5, 
                                datetime.now().strftime("%B %d, %Y"))
        
        # Footer
        if config.get("include_footer", True):
            canvas_obj.setFont("Helvetica", 8)
            canvas_obj.setFillColor(colors.grey)
            canvas_obj.drawCentredString(page_width / 2, doc.bottomMargin - 20, 
                                       f"Page {doc.page}")

    def _apply_template_styling(self, config: Dict[str, Any], template: str) -> Dict[str, Any]:
        """Apply template-specific styling"""
        template_configs = {
            "resume": {
                "font_size": 10,
                "line_spacing": 1.1,
                "margins": {"top": 0.5, "bottom": 0.5, "left": 0.75, "right": 0.75},
                "custom_styles": {
                    "primary_color": "#1e40af",
                    "secondary_color": "#374151",
                    "font_family": "Helvetica"
                }
            },
            "report": {
                "font_size": 11,
                "line_spacing": 1.3,
                "margins": {"top": 1.0, "bottom": 1.0, "left": 1.0, "right": 1.0},
                "custom_styles": {
                    "primary_color": "#059669",
                    "secondary_color": "#6b7280",
                    "font_family": "Times-Roman"
                }
            },
            "letter": {
                "font_size": 12,
                "line_spacing": 1.2,
                "margins": {"top": 1.5, "bottom": 1.0, "left": 1.0, "right": 1.0},
                "custom_styles": {
                    "primary_color": "#7c3aed",
                    "secondary_color": "#4b5563",
                    "font_family": "Times-Roman"
                }
            },
            "minimal": {
                "font_size": 11,
                "line_spacing": 1.4,
                "margins": {"top": 1.5, "bottom": 1.5, "left": 1.5, "right": 1.5},
                "custom_styles": {
                    "primary_color": "#000000",
                    "secondary_color": "#666666",
                    "font_family": "Helvetica"
                }
            }
        }
        
        # Ensure we have a default template if none specified
        if "professional" not in template_configs:
            template_configs["professional"] = {
                "font_size": 12,
                "line_spacing": 1.2,
                "margins": {"top": 1.0, "bottom": 1.0, "left": 1.0, "right": 1.0},
                "custom_styles": {
                    "primary_color": "#2563eb",
                    "secondary_color": "#64748b",
                    "font_family": "Helvetica"
                }
            }
        
        # Apply template config
        template_config = template_configs.get(template, template_configs["professional"])
        for key, value in template_config.items():
            if key not in config:
                config[key] = value
        
        return config

    async def generate_pdf(self, config: Dict[str, Any], markdown_content: str, filename: str = "document.pdf") -> Dict[str, Any]:
        """Generate PDF from markdown content"""
        try:
            # Apply template styling
            template = config.get("template", "professional")
            config = self._apply_template_styling(config, template)
            
            # Get page size
            page_size = self._get_page_size(config.get("page_size", "A4"))
            
            # Get margins
            margins = config.get("margins", {"top": 1.0, "bottom": 1.0, "left": 1.0, "right": 1.0})
            
            # Create PDF buffer
            buffer = io.BytesIO()
            
            # Create PDF document
            doc = SimpleDocTemplate(
                buffer,
                pagesize=page_size,
                topMargin=margins["top"] * inch,
                bottomMargin=margins["bottom"] * inch,
                leftMargin=margins["left"] * inch,
                rightMargin=margins["right"] * inch
            )
            
            # Create custom styles
            styles = self._create_custom_styles(config)
            
            # Parse markdown content
            elements = self._parse_markdown_to_elements(markdown_content, styles)
            
            # Build PDF
            doc.build(elements, onFirstPage=lambda canvas, doc: self._create_header_footer(
                canvas, doc, config, filename.replace('.pdf', '')
            ), onLaterPages=lambda canvas, doc: self._create_header_footer(
                canvas, doc, config, filename.replace('.pdf', '')
            ))
            
            # Get PDF content
            pdf_content = buffer.getvalue()
            buffer.close()
            
            # Encode to base64 for download
            pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
            
            return {
                "success": True,
                "filename": filename,
                "pdf_base64": pdf_base64,
                "file_size": len(pdf_content),
                "pages": len(elements) // 20 + 1,  # Rough estimate
                "template": template,
                "download_url": f"data:application/pdf;base64,{pdf_base64}"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error generating PDF: {str(e)}"
            }

    async def generate_resume_pdf(self, config: Dict[str, Any], resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a professional resume PDF"""
        try:
            # Create resume markdown content
            markdown_content = self._create_resume_markdown(resume_data)
            
            # Set resume template
            config["template"] = "resume"
            
            # Generate PDF
            return await self.generate_pdf(config, markdown_content, "resume.pdf")
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error generating resume PDF: {str(e)}"
            }

    def _create_resume_markdown(self, resume_data: Dict[str, Any]) -> str:
        """Create markdown content for resume"""
        markdown_content = []
        
        # Header
        name = resume_data.get("name", "Your Name")
        title = resume_data.get("title", "Professional Title")
        email = resume_data.get("email", "email@example.com")
        phone = resume_data.get("phone", "+1 (555) 123-4567")
        location = resume_data.get("location", "City, State")
        
        markdown_content.append(f"# {name}")
        markdown_content.append(f"## {title}")
        markdown_content.append(f"📧 {email} | 📱 {phone} | 📍 {location}")
        markdown_content.append("")
        
        # Summary
        if resume_data.get("summary"):
            markdown_content.append("## Professional Summary")
            markdown_content.append(resume_data["summary"])
            markdown_content.append("")
        
        # Experience
        if resume_data.get("experience"):
            markdown_content.append("## Professional Experience")
            for exp in resume_data["experience"]:
                markdown_content.append(f"### {exp.get('title', 'Job Title')}")
                markdown_content.append(f"**{exp.get('company', 'Company')}** | {exp.get('duration', 'Duration')}")
                markdown_content.append("")
                for achievement in exp.get("achievements", []):
                    markdown_content.append(f"• {achievement}")
                markdown_content.append("")
        
        # Education
        if resume_data.get("education"):
            markdown_content.append("## Education")
            for edu in resume_data["education"]:
                markdown_content.append(f"### {edu.get('degree', 'Degree')}")
                markdown_content.append(f"**{edu.get('institution', 'Institution')}** | {edu.get('year', 'Year')}")
                markdown_content.append("")
        
        # Skills
        if resume_data.get("skills"):
            markdown_content.append("## Skills")
            skills_text = ", ".join(resume_data["skills"])
            markdown_content.append(skills_text)
            markdown_content.append("")
        
        return "\n".join(markdown_content)

    async def generate_report_pdf(self, config: Dict[str, Any], report_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a professional report PDF"""
        try:
            # Create report markdown content
            markdown_content = self._create_report_markdown(report_data)
            
            # Set report template
            config["template"] = "report"
            
            # Generate PDF
            return await self.generate_pdf(config, markdown_content, "report.pdf")
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error generating report PDF: {str(e)}"
            }

    def _create_report_markdown(self, report_data: Dict[str, Any]) -> str:
        """Create markdown content for report"""
        markdown_content = []
        
        # Title
        title = report_data.get("title", "Report Title")
        author = report_data.get("author", "Author Name")
        date = report_data.get("date", datetime.now().strftime("%B %d, %Y"))
        
        markdown_content.append(f"# {title}")
        markdown_content.append(f"**Author:** {author}  ")
        markdown_content.append(f"**Date:** {date}")
        markdown_content.append("")
        
        # Executive Summary
        if report_data.get("executive_summary"):
            markdown_content.append("## Executive Summary")
            markdown_content.append(report_data["executive_summary"])
            markdown_content.append("")
        
        # Table of Contents (placeholder)
        markdown_content.append("## Table of Contents")
        markdown_content.append("1. Introduction")
        markdown_content.append("2. Methodology")
        markdown_content.append("3. Findings")
        markdown_content.append("4. Conclusions")
        markdown_content.append("5. Recommendations")
        markdown_content.append("")
        
        # Sections
        for section in report_data.get("sections", []):
            markdown_content.append(f"## {section.get('title', 'Section Title')}")
            markdown_content.append(section.get("content", ""))
            markdown_content.append("")
        
        return "\n".join(markdown_content)

    async def execute(self, config: Dict[str, Any], content: str, document_type: str = "general", filename: str = "document.pdf") -> Dict[str, Any]:
        """Execute the PDF generator tool"""
        try:
            if document_type == "resume":
                # Parse resume data from content
                try:
                    resume_data = json.loads(content)
                    return await self.generate_resume_pdf(config, resume_data)
                except:
                    # If not JSON, treat as markdown
                    config["template"] = "resume"
                    return await self.generate_pdf(config, content, filename)
            
            elif document_type == "report":
                # Parse report data from content
                try:
                    report_data = json.loads(content)
                    return await self.generate_report_pdf(config, report_data)
                except:
                    # If not JSON, treat as markdown
                    config["template"] = "report"
                    return await self.generate_pdf(config, content, filename)
            
            else:
                # General document
                return await self.generate_pdf(config, content, filename)
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Error executing PDF generator: {str(e)}"
            }

# Create tool instance
pdf_generator = PDFGeneratorTool() 