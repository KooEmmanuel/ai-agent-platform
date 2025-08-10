"""
Notification Service for Email, Push, and Weekly Reports
"""

import smtplib
import json
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from jinja2 import Template

from app.core.database import (
    User, NotificationPreference, NotificationHistory, 
    EmailTemplate, PushSubscription, Agent, Integration
)
from app.core.config import settings


class EmailService:
    """Email notification service using SMTP"""
    
    def __init__(self):
        # Email configuration - these should be in your .env file
        self.smtp_server = getattr(settings, 'SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
        self.smtp_username = getattr(settings, 'SMTP_USERNAME', '')
        self.smtp_password = getattr(settings, 'SMTP_PASSWORD', '')
        self.from_email = getattr(settings, 'FROM_EMAIL', 'noreply@yourdomain.com')
        self.from_name = getattr(settings, 'FROM_NAME', 'KooAgent Platform')
    
    async def send_email(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str, 
        text_content: str = None,
        user_id: int = None,
        db: AsyncSession = None
    ) -> bool:
        """Send an email and log the result"""
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            
            # Add text and HTML parts
            if text_content:
                text_part = MIMEText(text_content, 'plain', 'utf-8')
                msg.attach(text_part)
            
            html_part = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            # Log success
            if db and user_id:
                await self._log_notification(
                    db, user_id, 'email', subject, 
                    html_content, 'sent'
                )
            
            return True
            
        except Exception as e:
            print(f"Failed to send email to {to_email}: {str(e)}")
            
            # Log failure
            if db and user_id:
                await self._log_notification(
                    db, user_id, 'email', subject, 
                    html_content, 'failed', str(e)
                )
            
            return False
    
    async def _log_notification(
        self,
        db: AsyncSession,
        user_id: int,
        notification_type: str,
        subject: str,
        content: str,
        status: str,
        error_message: str = None
    ):
        """Log notification to database"""
        try:
            notification = NotificationHistory(
                user_id=user_id,
                notification_type=notification_type,
                subject=subject,
                content=content,
                status=status,
                error_message=error_message
            )
            db.add(notification)
            await db.commit()
        except Exception as e:
            print(f"Failed to log notification: {str(e)}")


class PushNotificationService:
    """Web Push notification service"""
    
    def __init__(self):
        # These should be in your .env file
        self.vapid_private_key = getattr(settings, 'VAPID_PRIVATE_KEY', '')
        self.vapid_public_key = getattr(settings, 'VAPID_PUBLIC_KEY', '')
        self.vapid_claims = {
            'sub': getattr(settings, 'VAPID_SUB', 'mailto:admin@yourdomain.com')
        }
    
    async def send_push_notification(
        self,
        subscription_info: Dict[str, Any],
        title: str,
        body: str,
        icon: str = None,
        url: str = None,
        user_id: int = None,
        db: AsyncSession = None
    ) -> bool:
        """Send push notification to a subscription"""
        try:
            # This would require the 'pywebpush' library
            # For now, we'll simulate sending
            
            payload = {
                'title': title,
                'body': body,
                'icon': icon or '/icon-192x192.png',
                'url': url or '/',
                'timestamp': datetime.now().isoformat()
            }
            
            # TODO: Implement actual web push sending with pywebpush
            # from pywebpush import webpush
            # webpush(
            #     subscription_info=subscription_info,
            #     data=json.dumps(payload),
            #     vapid_private_key=self.vapid_private_key,
            #     vapid_claims=self.vapid_claims
            # )
            
            print(f"Push notification sent: {title} - {body}")
            
            # Log success
            if db and user_id:
                await self._log_notification(
                    db, user_id, 'push', title, 
                    json.dumps(payload), 'sent'
                )
            
            return True
            
        except Exception as e:
            print(f"Failed to send push notification: {str(e)}")
            
            # Log failure
            if db and user_id:
                await self._log_notification(
                    db, user_id, 'push', title, 
                    json.dumps(payload), 'failed', str(e)
                )
            
            return False
    
    async def _log_notification(
        self,
        db: AsyncSession,
        user_id: int,
        notification_type: str,
        subject: str,
        content: str,
        status: str,
        error_message: str = None
    ):
        """Log notification to database"""
        try:
            notification = NotificationHistory(
                user_id=user_id,
                notification_type=notification_type,
                subject=subject,
                content=content,
                status=status,
                error_message=error_message
            )
            db.add(notification)
            await db.commit()
        except Exception as e:
            print(f"Failed to log notification: {str(e)}")


class WeeklyReportService:
    """Weekly report generation and sending"""
    
    def __init__(self):
        self.email_service = EmailService()
    
    async def generate_weekly_report(
        self, 
        user: User, 
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Generate weekly report data for a user"""
        try:
            # Get date range for last week
            end_date = datetime.now()
            start_date = end_date - timedelta(days=7)
            
            # Get user's agents
            agents_result = await db.execute(
                select(Agent).where(Agent.user_id == user.id)
            )
            agents = agents_result.scalars().all()
            
            # Get user's integrations
            integrations_result = await db.execute(
                select(Integration).where(
                    Integration.agent_id.in_([a.id for a in agents])
                )
            )
            integrations = integrations_result.scalars().all()
            
            # Get credit usage for the week (if we have transaction history)
            # TODO: Implement actual weekly metrics
            
            report_data = {
                'user_name': user.name,
                'week_start': start_date.strftime('%B %d, %Y'),
                'week_end': end_date.strftime('%B %d, %Y'),
                'total_agents': len(agents),
                'active_agents': len([a for a in agents if a.is_active]),
                'total_integrations': len(integrations),
                'active_integrations': len([i for i in integrations if i.is_active]),
                'conversations_count': 0,  # TODO: Implement when we track conversations
                'tool_executions': 0,      # TODO: Implement when we track tool usage
                'credits_used': 0,         # TODO: Get from credit transactions
                'top_agents': [],          # TODO: Implement performance tracking
                'generated_at': datetime.now().isoformat()
            }
            
            return report_data
            
        except Exception as e:
            print(f"Failed to generate weekly report for user {user.id}: {str(e)}")
            return None
    
    async def send_weekly_report(
        self, 
        user: User, 
        report_data: Dict[str, Any], 
        db: AsyncSession
    ) -> bool:
        """Send weekly report email to user"""
        try:
            # Generate HTML content
            html_template = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Weekly Report - KooAgent</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .metric { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #667eea; }
                    .metric h3 { margin: 0 0 10px 0; color: #667eea; }
                    .metric .value { font-size: 24px; font-weight: bold; color: #333; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📊 Weekly Report</h1>
                        <p>{{ week_start }} - {{ week_end }}</p>
                    </div>
                    <div class="content">
                        <h2>Hi {{ user_name }}! 👋</h2>
                        <p>Here's your weekly summary of AI agent activity:</p>
                        
                        <div class="metric">
                            <h3>🤖 AI Agents</h3>
                            <div class="value">{{ active_agents }}/{{ total_agents }}</div>
                            <small>Active agents this week</small>
                        </div>
                        
                        <div class="metric">
                            <h3>🔗 Integrations</h3>
                            <div class="value">{{ active_integrations }}/{{ total_integrations }}</div>
                            <small>Active integrations</small>
                        </div>
                        
                        <div class="metric">
                            <h3>💬 Conversations</h3>
                            <div class="value">{{ conversations_count }}</div>
                            <small>Total conversations</small>
                        </div>
                        
                        <div class="metric">
                            <h3>⚡ Tool Executions</h3>
                            <div class="value">{{ tool_executions }}</div>
                            <small>Tools used this week</small>
                        </div>
                        
                        <div class="metric">
                            <h3>🪙 Credits Used</h3>
                            <div class="value">{{ credits_used }}</div>
                            <small>Credits consumed</small>
                        </div>
                        
                        <p style="margin-top: 30px;">
                            <a href="https://yourdomain.com/dashboard" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                                View Dashboard →
                            </a>
                        </p>
                    </div>
                    <div class="footer">
                        <p>KooAgent Platform - AI Agent Management</p>
                        <p>You're receiving this because you have weekly reports enabled.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Render template with data
            template = Template(html_template)
            html_content = template.render(**report_data)
            
            # Send email
            success = await self.email_service.send_email(
                to_email=user.email,
                subject=f"📊 Weekly Report - {report_data['week_start']} to {report_data['week_end']}",
                html_content=html_content,
                user_id=user.id,
                db=db
            )
            
            return success
            
        except Exception as e:
            print(f"Failed to send weekly report to {user.email}: {str(e)}")
            return False


class NotificationService:
    """Main notification service orchestrator"""
    
    def __init__(self):
        self.email_service = EmailService()
        self.push_service = PushNotificationService()
        self.weekly_report_service = WeeklyReportService()
    
    async def send_agent_alert(
        self, 
        user: User, 
        agent_name: str, 
        message: str, 
        db: AsyncSession
    ):
        """Send alert about agent activity"""
        # Check user preferences
        prefs_result = await db.execute(
            select(NotificationPreference).where(
                NotificationPreference.user_id == user.id
            )
        )
        prefs = prefs_result.scalar_one_or_none()
        
        if not prefs or not prefs.agent_alerts:
            return
        
        subject = f"🤖 Agent Alert: {agent_name}"
        
        # Send email if enabled
        if prefs.email_notifications:
            html_content = f"""
            <h2>Agent Alert</h2>
            <p>Hi {user.name},</p>
            <p>Your AI agent <strong>{agent_name}</strong> has an update:</p>
            <p><em>{message}</em></p>
            <p>View your <a href="https://yourdomain.com/dashboard/agents">agent dashboard</a> for more details.</p>
            """
            
            await self.email_service.send_email(
                to_email=user.email,
                subject=subject,
                html_content=html_content,
                user_id=user.id,
                db=db
            )
        
        # Send push notification if enabled
        if prefs.push_notifications:
            # Get user's push subscriptions
            subs_result = await db.execute(
                select(PushSubscription).where(
                    and_(
                        PushSubscription.user_id == user.id,
                        PushSubscription.is_active == True
                    )
                )
            )
            subscriptions = subs_result.scalars().all()
            
            for sub in subscriptions:
                subscription_info = {
                    'endpoint': sub.endpoint,
                    'keys': {
                        'p256dh': sub.p256dh_key,
                        'auth': sub.auth_key
                    }
                }
                
                await self.push_service.send_push_notification(
                    subscription_info=subscription_info,
                    title=f"Agent Alert: {agent_name}",
                    body=message,
                    user_id=user.id,
                    db=db
                )
    
    async def send_credit_alert(
        self, 
        user: User, 
        credits_remaining: int, 
        percentage_used: float, 
        db: AsyncSession
    ):
        """Send alert about credit usage"""
        # Check user preferences
        prefs_result = await db.execute(
            select(NotificationPreference).where(
                NotificationPreference.user_id == user.id
            )
        )
        prefs = prefs_result.scalar_one_or_none()
        
        if not prefs or not prefs.credit_alerts:
            return
        
        if percentage_used >= 90:
            urgency = "🚨 Critical"
            message = f"You have only {credits_remaining} credits remaining ({percentage_used:.1f}% used)!"
        elif percentage_used >= 75:
            urgency = "⚠️ Warning"
            message = f"You have {credits_remaining} credits remaining ({percentage_used:.1f}% used)."
        else:
            return  # No alert needed
        
        subject = f"{urgency}: Low Credit Balance"
        
        # Send email if enabled
        if prefs.email_notifications:
            html_content = f"""
            <h2>Credit Balance Alert</h2>
            <p>Hi {user.name},</p>
            <p>{message}</p>
            <p>Consider purchasing more credits to continue using your AI agents without interruption.</p>
            <p><a href="https://yourdomain.com/dashboard/billing">Manage Credits →</a></p>
            """
            
            await self.email_service.send_email(
                to_email=user.email,
                subject=subject,
                html_content=html_content,
                user_id=user.id,
                db=db
            )
    
    async def send_weekly_reports(self, db: AsyncSession):
        """Send weekly reports to all users who have them enabled"""
        try:
            # Get all users with weekly reports enabled
            result = await db.execute(
                select(User, NotificationPreference).join(
                    NotificationPreference,
                    User.id == NotificationPreference.user_id
                ).where(
                    NotificationPreference.weekly_reports == True
                )
            )
            
            users_with_prefs = result.all()
            
            for user, prefs in users_with_prefs:
                try:
                    # Generate report data
                    report_data = await self.weekly_report_service.generate_weekly_report(user, db)
                    
                    if report_data:
                        # Send the report
                        await self.weekly_report_service.send_weekly_report(user, report_data, db)
                        print(f"Weekly report sent to {user.email}")
                    
                except Exception as e:
                    print(f"Failed to send weekly report to {user.email}: {str(e)}")
            
        except Exception as e:
            print(f"Failed to send weekly reports: {str(e)}")


# Global notification service instance
notification_service = NotificationService()