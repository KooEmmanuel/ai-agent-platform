"""
Email service for sending organization invitations and notifications
"""
import os
from typing import List, Optional
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from jinja2 import Template
import logging

logger = logging.getLogger(__name__)

# Email configuration
email_config = ConnectionConfig(
    MAIL_USERNAME=os.getenv("SMTP_USERNAME", ""),
    MAIL_PASSWORD=os.getenv("SMTP_PASSWORD", ""),
    MAIL_FROM=os.getenv("SMTP_FROM_EMAIL", "noreply@kooagent.com"),
    MAIL_PORT=int(os.getenv("SMTP_PORT", "587")),
    MAIL_SERVER=os.getenv("SMTP_SERVER", "smtp.gmail.com"),
    MAIL_FROM_NAME=os.getenv("SMTP_FROM_NAME", "KooAgent Platform"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

# Initialize FastMail
fastmail = FastMail(email_config)

# Email templates
INVITATION_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Organization Invitation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #2563eb; }
        .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
        .organization-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .role-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏢 Organization Invitation</h1>
            <p>You've been invited to join an organization on KooAgent Platform</p>
        </div>
        
        <div class="content">
            <h2>Hello!</h2>
            <p><strong>{{ inviter_name }}</strong> has invited you to join <strong>{{ organization_name }}</strong> on the KooAgent Platform.</p>
            
            <div class="organization-info">
                <h3>Organization Details</h3>
                <p><strong>Name:</strong> {{ organization_name }}</p>
                <p><strong>Your Role:</strong> <span class="role-badge">{{ role }}</span></p>
                <p><strong>Invited by:</strong> {{ inviter_name }}</p>
            </div>
            
            <p>Click the button below to accept this invitation and start collaborating:</p>
            
            <div style="text-align: center;">
                <a href="{{ invitation_url }}" class="button">Accept Invitation</a>
            </div>
            
            <p><strong>What happens next?</strong></p>
            <ul>
                <li>You'll be added to the organization with {{ role }} permissions</li>
                <li>You'll have access to all organization projects and resources</li>
                <li>You can start collaborating with your team immediately</li>
            </ul>
            
            <p><em>This invitation will expire on {{ expires_at }}. If you don't want to join this organization, you can simply ignore this email.</em></p>
        </div>
        
        <div class="footer">
            <p>This invitation was sent by {{ inviter_name }} via KooAgent Platform</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>
"""

class EmailService:
    def __init__(self):
        self.fastmail = fastmail
    
    async def send_organization_invitation(
        self,
        to_email: str,
        organization_name: str,
        inviter_name: str,
        role: str,
        invitation_url: str,
        expires_at: str
    ) -> bool:
        """Send organization invitation email"""
        try:
            # Render email template
            template = Template(INVITATION_EMAIL_TEMPLATE)
            html_content = template.render(
                organization_name=organization_name,
                inviter_name=inviter_name,
                role=role,
                invitation_url=invitation_url,
                expires_at=expires_at
            )
            
            # Create message
            message = MessageSchema(
                subject=f"Invitation to join {organization_name} on KooAgent",
                recipients=[to_email],
                body=html_content,
                subtype="html"
            )
            
            # Send email
            await self.fastmail.send_message(message)
            logger.info(f"📧 Invitation email sent to {to_email} for organization {organization_name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to send invitation email to {to_email}: {str(e)}")
            return False
    
    async def send_welcome_email(
        self,
        to_email: str,
        organization_name: str,
        user_name: str,
        role: str
    ) -> bool:
        """Send welcome email after joining organization"""
        try:
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Welcome to {organization_name}</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .content {{ background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }}
                    .button {{ display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Welcome to {organization_name}!</h1>
                        <p>You've successfully joined the organization</p>
                    </div>
                    
                    <div class="content">
                        <h2>Hello {user_name}!</h2>
                        <p>Welcome to <strong>{organization_name}</strong>! You've been added as a <strong>{role}</strong>.</p>
                        
                        <p>You can now:</p>
                        <ul>
                            <li>Access all organization projects and resources</li>
                            <li>Collaborate with your team members</li>
                            <li>Create and manage projects within the organization</li>
                            <li>Use organization-specific tools and integrations</li>
                        </ul>
                        
                        <div style="text-align: center;">
                            <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/dashboard" class="button">Go to Dashboard</a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """
            
            message = MessageSchema(
                subject=f"Welcome to {organization_name}!",
                recipients=[to_email],
                body=html_content,
                subtype="html"
            )
            
            await self.fastmail.send_message(message)
            logger.info(f"📧 Welcome email sent to {to_email} for organization {organization_name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to send welcome email to {to_email}: {str(e)}")
            return False

# Global email service instance
email_service = EmailService()
