"""
File Upload Notification Service

Sends email notifications when files are uploaded to the platform.
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional, Dict, Any
from datetime import datetime
from jinja2 import Template
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import User, FileUploadNotification

logger = logging.getLogger(__name__)

class FileUploadNotificationService:
    """Service for sending email notifications about file uploads"""
    
    def __init__(self):
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME
        
        # Check if notifications are enabled
        self.notifications_enabled = settings.FILE_UPLOAD_NOTIFICATION_ENABLED
        self.notification_emails = self._parse_notification_emails(settings.FILE_UPLOAD_NOTIFICATION_EMAILS)
    
    def _parse_notification_emails(self, email_string: str) -> List[str]:
        """Parse comma-separated email addresses"""
        if not email_string:
            return []
        
        emails = [email.strip() for email in email_string.split(',')]
        return [email for email in emails if email and '@' in email]
    
    async def send_file_upload_notification(
        self,
        uploaded_by: User,
        file_info: Dict[str, Any],
        upload_context: Optional[str] = None
    ) -> bool:
        """
        Send email notification about file upload
        
        Args:
            uploaded_by: User who uploaded the file
            file_info: Dictionary containing file details (filename, size, type, etc.)
            upload_context: Optional context about where the file was uploaded (e.g., "Project Management", "Knowledge Base")
        
        Returns:
            bool: True if notification was sent successfully, False otherwise
        """
        
        if not self.notifications_enabled:
            logger.info("File upload notifications are disabled")
            return False
        
        if not self.notification_emails:
            logger.warning("No notification emails configured")
            return False
        
        if not self.smtp_username or not self.smtp_password:
            logger.error("SMTP credentials not configured")
            return False
        
        try:
            # Prepare email content
            subject = f"📁 New File Uploaded: {file_info.get('filename', 'Unknown')}"
            
            html_content = self._generate_email_html(uploaded_by, file_info, upload_context)
            text_content = self._generate_email_text(uploaded_by, file_info, upload_context)
            
            # Send to all configured notification emails
            success_count = 0
            for email in self.notification_emails:
                if await self._send_email(email, subject, html_content, text_content):
                    success_count += 1
                    logger.info(f"📧 File upload notification sent to {email}")
                else:
                    logger.error(f"❌ Failed to send notification to {email}")
            
            return success_count > 0
            
        except Exception as e:
            logger.error(f"❌ Error sending file upload notification: {str(e)}")
            return False
    
    def _generate_email_html(
        self, 
        uploaded_by: User, 
        file_info: Dict[str, Any], 
        upload_context: Optional[str] = None
    ) -> str:
        """Generate HTML email content"""
        
        file_size = self._format_file_size(file_info.get('file_size', 0))
        upload_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>File Upload Notification</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                .file-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
                .user-info { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
                .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
                .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
                .file-icon { font-size: 24px; margin-right: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📁 New File Uploaded</h1>
                    <p>A new file has been uploaded to the platform</p>
                </div>
                
                <div class="content">
                    <div class="file-info">
                        <h3><span class="file-icon">📄</span>File Details</h3>
                        <p><strong>Filename:</strong> {{ file_info.filename }}</p>
                        <p><strong>Size:</strong> {{ file_size }}</p>
                        <p><strong>Type:</strong> <span class="badge">{{ file_info.file_type }}</span></p>
                        {% if upload_context %}
                        <p><strong>Context:</strong> {{ upload_context }}</p>
                        {% endif %}
                        <p><strong>Uploaded:</strong> {{ upload_time }}</p>
                    </div>
                    
                    <div class="user-info">
                        <h3>👤 Uploaded By</h3>
                        <p><strong>Name:</strong> {{ uploaded_by.name }}</p>
                        <p><strong>Email:</strong> {{ uploaded_by.email }}</p>
                        {% if uploaded_by.organization %}
                        <p><strong>Organization:</strong> {{ uploaded_by.organization.name }}</p>
                        {% endif %}
                    </div>
                    
                    <p>This notification was sent because file upload notifications are enabled for your platform.</p>
                    
                    <p><em>You can manage notification settings in your platform configuration.</em></p>
                </div>
                
                <div class="footer">
                    <p>This notification was sent by {{ from_name }}</p>
                    <p>Generated on {{ upload_time }}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        template = Template(html_template)
        return template.render(
            uploaded_by=uploaded_by,
            file_info=file_info,
            file_size=file_size,
            upload_context=upload_context,
            upload_time=upload_time,
            from_name=self.from_name
        )
    
    def _generate_email_text(
        self, 
        uploaded_by: User, 
        file_info: Dict[str, Any], 
        upload_context: Optional[str] = None
    ) -> str:
        """Generate plain text email content"""
        
        file_size = self._format_file_size(file_info.get('file_size', 0))
        upload_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        text_content = f"""
NEW FILE UPLOADED

File Details:
- Filename: {file_info.get('filename', 'Unknown')}
- Size: {file_size}
- Type: {file_info.get('file_type', 'Unknown')}
- Uploaded: {upload_time}
"""
        
        if upload_context:
            text_content += f"- Context: {upload_context}\n"
        
        text_content += f"""
Uploaded By:
- Name: {uploaded_by.name}
- Email: {uploaded_by.email}
"""
        
        if hasattr(uploaded_by, 'organization') and uploaded_by.organization:
            text_content += f"- Organization: {uploaded_by.organization.name}\n"
        
        text_content += f"""
This notification was sent because file upload notifications are enabled for your platform.

You can manage notification settings in your platform configuration.

---
Generated by {self.from_name} on {upload_time}
"""
        
        return text_content
    
    def _format_file_size(self, size_bytes: int) -> str:
        """Format file size in human readable format"""
        if size_bytes == 0:
            return "0 Bytes"
        
        size_names = ["Bytes", "KB", "MB", "GB", "TB"]
        i = 0
        while size_bytes >= 1024 and i < len(size_names) - 1:
            size_bytes /= 1024.0
            i += 1
        
        return f"{size_bytes:.2f} {size_names[i]}"
    
    async def _send_email(self, to_email: str, subject: str, html_content: str, text_content: str) -> bool:
        """Send email using SMTP"""
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            
            # Add text and HTML parts
            text_part = MIMEText(text_content, 'plain', 'utf-8')
            html_part = MIMEText(html_content, 'html', 'utf-8')
            
            msg.attach(text_part)
            msg.attach(html_part)
            
            # Send email
            if self.smtp_port == 465:
                # Use SSL for port 465
                with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port) as server:
                    server.login(self.smtp_username, self.smtp_password)
                    server.send_message(msg)
            else:
                # Use STARTTLS for other ports
                with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                    server.starttls()
                    server.login(self.smtp_username, self.smtp_password)
                    server.send_message(msg)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    async def send_team_member_notifications(
        self,
        uploaded_by: User,
        file_info: Dict[str, Any],
        team_member_ids: List[int],
        message: Optional[str] = None,
        upload_context: Optional[str] = None,
        db: AsyncSession = None
    ) -> Dict[str, Any]:
        """
        Send notifications to specific team members about file upload
        
        Args:
            uploaded_by: User who uploaded the file
            file_info: Dictionary containing file details (filename, size, type, etc.)
            team_member_ids: List of user IDs to notify
            message: Optional custom message
            upload_context: Optional context about where the file was uploaded
            db: Database session for storing notification records
        
        Returns:
            Dict with success status and details
        """
        
        if not self.notifications_enabled:
            logger.info("File upload notifications are disabled")
            return {"success": False, "message": "Notifications are disabled"}
        
        if not self.smtp_username or not self.smtp_password:
            logger.error("SMTP credentials not configured")
            return {"success": False, "message": "SMTP not configured"}
        
        if not team_member_ids:
            return {"success": False, "message": "No team members selected"}
        
        try:
            # Get team member users from database
            if db:
                result = await db.execute(
                    select(User).where(User.id.in_(team_member_ids))
                )
                team_members = result.scalars().all()
            else:
                # Fallback - create mock users for testing
                team_members = [
                    User(id=user_id, name=f"User {user_id}", email=f"user{user_id}@example.com")
                    for user_id in team_member_ids
                ]
            
            if not team_members:
                return {"success": False, "message": "No valid team members found"}
            
            # Prepare email content
            subject = f"📁 New File Uploaded: {file_info.get('filename', 'Unknown')}"
            
            html_content = self._generate_team_notification_html(
                uploaded_by, file_info, message, upload_context
            )
            text_content = self._generate_team_notification_text(
                uploaded_by, file_info, message, upload_context
            )
            
            # Send notifications and track results
            success_count = 0
            failed_emails = []
            notification_records = []
            
            for team_member in team_members:
                try:
                    # Send email
                    email_sent = await self._send_email(
                        team_member.email, subject, html_content, text_content
                    )
                    
                    if email_sent:
                        success_count += 1
                        logger.info(f"📧 Team notification sent to {team_member.email}")
                        
                        # Create notification record
                        if db:
                            notification_record = FileUploadNotification(
                                file_id=file_info.get('url', file_info.get('filename', 'unknown')),
                                filename=file_info.get('filename', 'Unknown'),
                                uploaded_by_id=uploaded_by.id,
                                notified_user_id=team_member.id,
                                message=message,
                                upload_context=upload_context,
                                notification_type='team_member'
                            )
                            notification_records.append(notification_record)
                    else:
                        failed_emails.append(team_member.email)
                        logger.error(f"❌ Failed to send notification to {team_member.email}")
                        
                except Exception as e:
                    failed_emails.append(team_member.email)
                    logger.error(f"❌ Error sending notification to {team_member.email}: {str(e)}")
            
            # Save notification records to database
            if db and notification_records:
                try:
                    db.add_all(notification_records)
                    await db.commit()
                except Exception as e:
                    logger.error(f"Failed to save notification records: {str(e)}")
            
            return {
                "success": success_count > 0,
                "success_count": success_count,
                "total_count": len(team_members),
                "failed_emails": failed_emails,
                "message": f"Sent {success_count}/{len(team_members)} notifications successfully"
            }
            
        except Exception as e:
            logger.error(f"❌ Error sending team member notifications: {str(e)}")
            return {"success": False, "message": f"Error: {str(e)}"}
    
    def _generate_team_notification_html(
        self, 
        uploaded_by: User, 
        file_info: Dict[str, Any], 
        message: Optional[str] = None,
        upload_context: Optional[str] = None
    ) -> str:
        """Generate HTML email content for team member notifications"""
        
        file_size = self._format_file_size(file_info.get('file_size', 0))
        upload_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>File Upload Notification</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                .file-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
                .user-info { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
                .message-box { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }
                .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
                .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
                .file-icon { font-size: 24px; margin-right: 10px; }
                .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📁 New File Shared</h1>
                    <p>A team member has uploaded a new file</p>
                </div>
                
                <div class="content">
                    <div class="file-info">
                        <h3><span class="file-icon">📄</span>File Details</h3>
                        <p><strong>Filename:</strong> {{ file_info.filename }}</p>
                        <p><strong>Size:</strong> {{ file_size }}</p>
                        <p><strong>Type:</strong> <span class="badge">{{ file_info.file_type }}</span></p>
                        {% if upload_context %}
                        <p><strong>Context:</strong> {{ upload_context }}</p>
                        {% endif %}
                        <p><strong>Uploaded:</strong> {{ upload_time }}</p>
                    </div>
                    
                    <div class="user-info">
                        <h3>👤 Shared By</h3>
                        <p><strong>Name:</strong> {{ uploaded_by.name }}</p>
                        <p><strong>Email:</strong> {{ uploaded_by.email }}</p>
                    </div>
                    
                    {% if message %}
                    <div class="message-box">
                        <h3>💬 Message</h3>
                        <p>{{ message }}</p>
                    </div>
                    {% endif %}
                    
                    <p>This file has been shared with you by a team member. You can access it through your platform dashboard.</p>
                    
                    <p><em>This notification was sent because you were selected to be notified about this file upload.</em></p>
                </div>
                
                <div class="footer">
                    <p>This notification was sent by {{ from_name }}</p>
                    <p>Generated on {{ upload_time }}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        template = Template(html_template)
        return template.render(
            uploaded_by=uploaded_by,
            file_info=file_info,
            file_size=file_size,
            message=message,
            upload_context=upload_context,
            upload_time=upload_time,
            from_name=self.from_name
        )
    
    def _generate_team_notification_text(
        self, 
        uploaded_by: User, 
        file_info: Dict[str, Any], 
        message: Optional[str] = None,
        upload_context: Optional[str] = None
    ) -> str:
        """Generate plain text email content for team member notifications"""
        
        file_size = self._format_file_size(file_info.get('file_size', 0))
        upload_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        text_content = f"""
NEW FILE SHARED WITH YOU

File Details:
- Filename: {file_info.get('filename', 'Unknown')}
- Size: {file_size}
- Type: {file_info.get('file_type', 'Unknown')}
- Uploaded: {upload_time}
"""
        
        if upload_context:
            text_content += f"- Context: {upload_context}\n"
        
        text_content += f"""
Shared By:
- Name: {uploaded_by.name}
- Email: {uploaded_by.email}
"""
        
        if message:
            text_content += f"""
Message:
{message}
"""
        
        text_content += f"""
This file has been shared with you by a team member. You can access it through your platform dashboard.

This notification was sent because you were selected to be notified about this file upload.

---
Generated by {self.from_name} on {upload_time}
"""
        
        return text_content

    def get_notification_status(self) -> Dict[str, Any]:
        """Get current notification configuration status"""
        return {
            "enabled": self.notifications_enabled,
            "smtp_configured": bool(self.smtp_username and self.smtp_password),
            "notification_emails": self.notification_emails,
            "smtp_server": self.smtp_server,
            "smtp_port": self.smtp_port,
            "from_email": self.from_email,
            "from_name": self.from_name
        }

# Global instance
file_upload_notification_service = FileUploadNotificationService()
