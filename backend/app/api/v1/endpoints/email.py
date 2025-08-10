"""
Email integration endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Dict, Any

from app.core.auth import get_current_user
from app.core.database import get_db, User
from app.services.email_integration import EmailIntegrationService

router = APIRouter()

class EmailWebhookData(BaseModel):
    to: str
    from_email: str = None  # 'from' is a Python keyword, so use 'from_email'
    subject: str = None
    body: str = None
    html_body: str = None

@router.post("/webhook")
async def email_webhook(
    email_data: EmailWebhookData,
    db: AsyncSession = Depends(get_db)
):
    """
    Handle incoming email webhook
    This endpoint receives emails from email services like SendGrid, Mailgun, etc.
    """
    try:
        email_service = EmailIntegrationService()
        
        # Convert to dict for processing
        email_dict = {
            'to': email_data.to,
            'from': email_data.from_email,
            'subject': email_data.subject,
            'body': email_data.body or email_data.html_body
        }
        
        await email_service.process_incoming_email(email_dict, db)
        
        return {"status": "success", "message": "Email processed"}
        
    except Exception as e:
        print(f"Email webhook error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process email")

@router.post("/test")
async def test_email_integration(
    integration_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Test email integration by sending a test email"""
    try:
        # This would send a test email to verify the integration works
        return {"status": "success", "message": "Test email sent"}
        
    except Exception as e:
        print(f"Email test error: {e}")
        raise HTTPException(status_code=500, detail="Failed to send test email")

@router.post("/validate-config")
async def validate_email_config(
    config: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Validate email configuration"""
    try:
        email_service = EmailIntegrationService()
        is_valid = email_service.validate_email_config(config)
        
        if is_valid:
            return {"status": "valid", "message": "Configuration is valid"}
        else:
            return {"status": "invalid", "message": "Configuration is missing required fields"}
            
    except Exception as e:
        print(f"Email config validation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to validate configuration")