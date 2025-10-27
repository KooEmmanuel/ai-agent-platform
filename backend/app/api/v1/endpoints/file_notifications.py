"""
File Upload Notification Management API

Endpoints for managing file upload notification settings.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.database import User
from app.services.file_upload_notification_service import file_upload_notification_service
from app.core.config import settings

router = APIRouter()

class NotificationStatusResponse(BaseModel):
    enabled: bool
    smtp_configured: bool
    notification_emails: List[str]
    smtp_server: str
    smtp_port: int
    from_email: str
    from_name: str

class NotificationTestRequest(BaseModel):
    test_email: str
    test_filename: str = "test-document.pdf"
    test_context: str = "Test Upload"

class TeamMemberNotificationRequest(BaseModel):
    file_info: Dict[str, Any]
    team_member_ids: List[int]
    message: Optional[str] = None
    upload_context: Optional[str] = None

@router.get("/status", response_model=NotificationStatusResponse)
async def get_notification_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current file upload notification configuration status"""
    try:
        status_info = file_upload_notification_service.get_notification_status()
        return NotificationStatusResponse(**status_info)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get notification status: {str(e)}"
        )

@router.post("/test")
async def test_notification(
    test_request: NotificationTestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a test file upload notification"""
    try:
        # Create test file info
        file_info = {
            "filename": test_request.test_filename,
            "file_size": 1024,  # 1KB test file
            "file_type": "application/pdf",
            "url": "https://example.com/test-file.pdf"
        }
        
        # Send test notification
        success = await file_upload_notification_service.send_file_upload_notification(
            uploaded_by=current_user,
            file_info=file_info,
            upload_context=test_request.test_context
        )
        
        if success:
            return {
                "success": True,
                "message": f"Test notification sent successfully to configured emails"
            }
        else:
            return {
                "success": False,
                "message": "Failed to send test notification. Check SMTP configuration and notification emails."
            }
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send test notification: {str(e)}"
        )

@router.post("/team-members")
async def send_team_member_notifications(
    request: TeamMemberNotificationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send notifications to specific team members about file upload"""
    try:
        result = await file_upload_notification_service.send_team_member_notifications(
            uploaded_by=current_user,
            file_info=request.file_info,
            team_member_ids=request.team_member_ids,
            message=request.message,
            upload_context=request.upload_context,
            db=db
        )
        
        return result
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send team member notifications: {str(e)}"
        )

@router.get("/config")
async def get_notification_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get notification configuration (for admin purposes)"""
    try:
        return {
            "file_upload_notification_enabled": settings.FILE_UPLOAD_NOTIFICATION_ENABLED,
            "file_upload_notification_emails": settings.FILE_UPLOAD_NOTIFICATION_EMAILS,
            "smtp_server": settings.SMTP_SERVER,
            "smtp_port": settings.SMTP_PORT,
            "smtp_username_configured": bool(settings.SMTP_USERNAME),
            "smtp_password_configured": bool(settings.SMTP_PASSWORD),
            "from_email": settings.SMTP_FROM_EMAIL,
            "from_name": settings.SMTP_FROM_NAME
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get configuration: {str(e)}"
        )
