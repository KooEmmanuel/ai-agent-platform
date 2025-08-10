"""
Email Sender Tool

A tool for sending emails using SMTP with support for multiple email providers,
HTML content, attachments, and email templates.
"""

import asyncio
import json
import logging
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
import aiosmtplib
from pathlib import Path

from .base import BaseTool

logger = logging.getLogger(__name__)

class EmailSenderTool(BaseTool):
    """
    Email Sender Tool using SMTP.
    
    Features:
    - Support for multiple email providers (Gmail, Outlook, custom SMTP)
    - HTML and plain text email support
    - File attachments
    - Email templates
    - Bulk email sending
    - Email validation
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.smtp_server = config.get('smtp_server', '')
        self.smtp_port = config.get('smtp_port', 587)
        self.username = config.get('username', '')
        self.password = config.get('password', '')
        self.use_tls = config.get('use_tls', True)
        self.use_ssl = config.get('use_ssl', False)
        self.from_email = config.get('from_email', '')
        self.from_name = config.get('from_name', '')
        
        # Email provider presets
        self.provider_presets = {
            'gmail': {
                'smtp_server': 'smtp.gmail.com',
                'smtp_port': 587,
                'use_tls': True,
                'use_ssl': False
            },
            'outlook': {
                'smtp_server': 'smtp-mail.outlook.com',
                'smtp_port': 587,
                'use_tls': True,
                'use_ssl': False
            },
            'yahoo': {
                'smtp_server': 'smtp.mail.yahoo.com',
                'smtp_port': 587,
                'use_tls': True,
                'use_ssl': False
            }
        }
        
        # Apply provider preset if specified
        provider = config.get('provider')
        if provider and provider in self.provider_presets:
            preset = self.provider_presets[provider]
            self.smtp_server = preset['smtp_server']
            self.smtp_port = preset['smtp_port']
            self.use_tls = preset['use_tls']
            self.use_ssl = preset['use_ssl']
    
    async def execute(self, to_emails: Union[str, List[str]], subject: str, 
                     body: str, html_body: Optional[str] = None, 
                     attachments: Optional[List[str]] = None,
                     cc_emails: Optional[Union[str, List[str]]] = None,
                     bcc_emails: Optional[Union[str, List[str]]] = None) -> Dict[str, Any]:
        """
        Send an email.
        
        Args:
            to_emails: Recipient email(s)
            subject: Email subject
            body: Email body (plain text)
            html_body: HTML email body (optional)
            attachments: List of file paths to attach
            cc_emails: CC recipient(s)
            bcc_emails: BCC recipient(s)
            
        Returns:
            Email sending result
        """
        if not to_emails:
            return self._format_error("Recipient email is required")
        
        if not subject or not body:
            return self._format_error("Subject and body are required")
        
        # Validate email configuration
        if not self._validate_config():
            return self._format_error("Email configuration is incomplete")
        
        # Validate and format email addresses
        to_emails = self._format_email_list(to_emails)
        cc_emails = self._format_email_list(cc_emails) if cc_emails else []
        bcc_emails = self._format_email_list(bcc_emails) if bcc_emails else []
        
        # Validate email addresses
        validation_result = self._validate_emails(to_emails + cc_emails + bcc_emails)
        if not validation_result['valid']:
            return self._format_error(f"Invalid email addresses: {validation_result['invalid_emails']}")
        
        try:
            result = await self._send_email(
                to_emails=to_emails,
                subject=subject,
                body=body,
                html_body=html_body,
                attachments=attachments,
                cc_emails=cc_emails,
                bcc_emails=bcc_emails
            )
            
            metadata = {
                'to_emails': to_emails,
                'cc_emails': cc_emails,
                'bcc_emails': bcc_emails,
                'subject': subject,
                'attachments_count': len(attachments) if attachments else 0,
                'smtp_server': self.smtp_server
            }
            
            return self._format_success(result, metadata)
            
        except Exception as e:
            logger.error(f"Email sending error: {str(e)}")
            return self._format_error(f"Failed to send email: {str(e)}")
    
    def _validate_config(self) -> bool:
        """Validate email configuration."""
        required_fields = ['smtp_server', 'username', 'password', 'from_email']
        return all(getattr(self, field) for field in required_fields)
    
    def _format_email_list(self, emails: Union[str, List[str]]) -> List[str]:
        """Format email addresses into a list."""
        if isinstance(emails, str):
            return [email.strip() for email in emails.split(',') if email.strip()]
        elif isinstance(emails, list):
            return [email.strip() for email in emails if email.strip()]
        return []
    
    def _validate_emails(self, emails: List[str]) -> Dict[str, Any]:
        """Validate email addresses."""
        import re
        
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        invalid_emails = []
        
        for email in emails:
            if not re.match(email_pattern, email):
                invalid_emails.append(email)
        
        return {
            'valid': len(invalid_emails) == 0,
            'invalid_emails': invalid_emails
        }
    
    async def _send_email(self, to_emails: List[str], subject: str, body: str,
                         html_body: Optional[str] = None, attachments: Optional[List[str]] = None,
                         cc_emails: List[str] = None, bcc_emails: List[str] = None) -> Dict[str, Any]:
        """Send email using aiosmtplib."""
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = f"{self.from_name} <{self.from_email}>" if self.from_name else self.from_email
        msg['To'] = ', '.join(to_emails)
        msg['Subject'] = subject
        
        if cc_emails:
            msg['Cc'] = ', '.join(cc_emails)
        
        # Add plain text body
        text_part = MIMEText(body, 'plain', 'utf-8')
        msg.attach(text_part)
        
        # Add HTML body if provided
        if html_body:
            html_part = MIMEText(html_body, 'html', 'utf-8')
            msg.attach(html_part)
        
        # Add attachments
        if attachments:
            for attachment_path in attachments:
                await self._add_attachment(msg, attachment_path)
        
        # Send email
        try:
            await aiosmtplib.send(
                msg,
                hostname=self.smtp_server,
                port=self.smtp_port,
                username=self.username,
                password=self.password,
                use_tls=self.use_tls,
                start_tls=self.use_tls and not self.use_ssl
            )
            
            return {
                'message': 'Email sent successfully',
                'recipients': len(to_emails + (cc_emails or []) + (bcc_emails or [])),
                'attachments': len(attachments) if attachments else 0
            }
            
        except Exception as e:
            raise Exception(f"SMTP error: {str(e)}")
    
    async def _add_attachment(self, msg: MIMEMultipart, file_path: str):
        """Add file attachment to email."""
        try:
            path = Path(file_path)
            if not path.exists():
                raise FileNotFoundError(f"Attachment file not found: {file_path}")
            
            with open(file_path, 'rb') as attachment:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(attachment.read())
            
            encoders.encode_base64(part)
            part.add_header(
                'Content-Disposition',
                f'attachment; filename= {path.name}'
            )
            msg.attach(part)
            
        except Exception as e:
            logger.error(f"Error adding attachment {file_path}: {str(e)}")
            raise
    
    async def send_template_email(self, template_name: str, to_emails: Union[str, List[str]],
                                 template_data: Dict[str, Any], subject: Optional[str] = None) -> Dict[str, Any]:
        """
        Send email using a template.
        
        Args:
            template_name: Name of the email template
            to_emails: Recipient email(s)
            template_data: Data to populate template
            subject: Email subject (optional, can be in template)
            
        Returns:
            Email sending result
        """
        # This is a simplified template system
        # In a real implementation, you'd load templates from files or database
        
        templates = {
            'welcome': {
                'subject': 'Welcome to our platform!',
                'body': 'Hello {name},\n\nWelcome to our platform! We\'re excited to have you on board.\n\nBest regards,\nThe Team',
                'html_body': '''
                <html>
                <body>
                    <h2>Welcome to our platform!</h2>
                    <p>Hello {name},</p>
                    <p>Welcome to our platform! We're excited to have you on board.</p>
                    <p>Best regards,<br>The Team</p>
                </body>
                </html>
                '''
            },
            'notification': {
                'subject': 'Notification: {title}',
                'body': 'Hello {name},\n\n{message}\n\nBest regards,\nThe Team',
                'html_body': '''
                <html>
                <body>
                    <h2>Notification: {title}</h2>
                    <p>Hello {name},</p>
                    <p>{message}</p>
                    <p>Best regards,<br>The Team</p>
                </body>
                </html>
                '''
            }
        }
        
        if template_name not in templates:
            return self._format_error(f"Template '{template_name}' not found")
        
        template = templates[template_name]
        
        # Format template with data
        try:
            formatted_subject = template['subject'].format(**template_data)
            formatted_body = template['body'].format(**template_data)
            formatted_html = template['html_body'].format(**template_data)
            
            # Use provided subject if available
            if subject:
                formatted_subject = subject
            
            return await self.execute(
                to_emails=to_emails,
                subject=formatted_subject,
                body=formatted_body,
                html_body=formatted_html
            )
            
        except KeyError as e:
            return self._format_error(f"Missing template data: {str(e)}")
    
    async def test_connection(self) -> Dict[str, Any]:
        """
        Test SMTP connection.
        
        Returns:
            Connection test result
        """
        if not self._validate_config():
            return self._format_error("Email configuration is incomplete")
        
        try:
            await aiosmtplib.send(
                MIMEText('Test email'),
                hostname=self.smtp_server,
                port=self.smtp_port,
                username=self.username,
                password=self.password,
                use_tls=self.use_tls,
                start_tls=self.use_tls and not self.use_ssl
            )
            
            return self._format_success({
                'status': 'connected',
                'smtp_server': self.smtp_server,
                'message': 'SMTP connection successful'
            })
            
        except Exception as e:
            logger.error(f"SMTP connection test failed: {str(e)}")
            return self._format_error(f"SMTP connection failed: {str(e)}")
    
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
                'Send plain text emails',
                'Send HTML emails',
                'File attachments',
                'Email templates',
                'CC and BCC support',
                'Multiple recipients',
                'SMTP connection testing'
            ],
            'supported_providers': ['Gmail', 'Outlook', 'Yahoo', 'Custom SMTP'],
            'parameters': {
                'to_emails': 'Recipient email(s) (required)',
                'subject': 'Email subject (required)',
                'body': 'Email body (required)',
                'html_body': 'HTML email body (optional)',
                'attachments': 'List of file paths to attach (optional)',
                'cc_emails': 'CC recipient(s) (optional)',
                'bcc_emails': 'BCC recipient(s) (optional)'
            }
        } 