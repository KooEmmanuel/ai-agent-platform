"""
Email Integration Service for AI Agents
Handles email integration and message routing
"""

import asyncio
import imaplib
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional
from sqlalchemy import select
from app.core.config import settings
from app.services.agent_service import AgentService
from app.core.database import get_db, Integration, Agent
from sqlalchemy.ext.asyncio import AsyncSession

class EmailIntegrationService:
    """
    Email integration service
    Handles incoming emails and routes them to agents
    """
    
    def __init__(self):
        self.agent_service = AgentService()
    
    async def process_incoming_email(self, email_data: Dict[str, Any], db: AsyncSession):
        """Process incoming email and route to appropriate agent"""
        try:
            # Extract email details
            to_email = email_data.get('to', '')
            from_email = email_data.get('from', '')
            subject = email_data.get('subject', '')
            body = email_data.get('body', '')
            
            # Find integration by email address
            integration = await self._get_integration_by_email(to_email, db)
            if not integration:
                print(f"No integration found for email: {to_email}")
                return
            
            # Get the associated agent
            result = await db.execute(
                select(Agent).where(Agent.id == integration.agent_id)
            )
            agent = result.scalar_one_or_none()
            
            if not agent:
                print(f"No agent found for integration: {integration.id}")
                return
            
            # Process email with agent
            response = await self.agent_service.process_message(
                agent_id=agent.id,
                message=f"Email from {from_email}\nSubject: {subject}\n\n{body}",
                user_id=integration.user_id,
                db=db
            )
            
            # Send response email
            if response:
                await self._send_response_email(
                    to_email=from_email,
                    from_email=to_email,
                    subject=f"Re: {subject}",
                    body=response,
                    integration_config=integration.config
                )
                
        except Exception as e:
            print(f"Error processing email: {e}")
    
    async def _get_integration_by_email(self, email_address: str, db: AsyncSession):
        """Get email integration by email address"""
        try:
            result = await db.execute(
                select(Integration).where(
                    Integration.platform == "email",
                    Integration.is_active == True
                ).filter(
                    Integration.config["email"].astext == email_address
                )
            )
            return result.scalar_one_or_none()
        except Exception as e:
            print(f"Error getting integration: {e}")
            return None
    
    async def _send_response_email(
        self, 
        to_email: str, 
        from_email: str, 
        subject: str, 
        body: str,
        integration_config: Dict[str, Any]
    ):
        """Send response email using SMTP"""
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            # Get SMTP configuration
            smtp_server = integration_config.get('smtp_server', 'smtp.gmail.com')
            smtp_port = integration_config.get('smtp_port', 587)
            username = integration_config.get('username', from_email)
            password = integration_config.get('password', '')
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add body
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(username, password)
            server.send_message(msg)
            server.quit()
            
            print(f"Response email sent to {to_email}")
            
        except Exception as e:
            print(f"Error sending email: {e}")
    
    async def setup_email_monitoring(self, integration_config: Dict[str, Any]):
        """Set up email monitoring for incoming messages"""
        try:
            # This would typically use IMAP to monitor for new emails
            # For now, this is a placeholder for the monitoring setup
            imap_server = integration_config.get('imap_server', 'imap.gmail.com')
            imap_port = integration_config.get('imap_port', 993)
            username = integration_config.get('username', '')
            password = integration_config.get('password', '')
            
            print(f"Email monitoring setup for {username} on {imap_server}")
            
            # In a real implementation, you would:
            # 1. Connect to IMAP server
            # 2. Monitor for new emails
            # 3. Process them through process_incoming_email
            # 4. This could be done with a background task or webhook
            
        except Exception as e:
            print(f"Error setting up email monitoring: {e}")
    
    def validate_email_config(self, config: Dict[str, Any]) -> bool:
        """Validate email integration configuration"""
        required_fields = ['email', 'smtp_server', 'username', 'password']
        
        for field in required_fields:
            if not config.get(field):
                return False
        
        # Additional validation
        email_address = config.get('email', '')
        if '@' not in email_address:
            return False
        
        return True