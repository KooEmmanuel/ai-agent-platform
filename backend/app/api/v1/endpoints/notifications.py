"""
Notification management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from app.core.auth import get_current_user
from app.core.database import (
    get_db, User, NotificationPreference, 
    NotificationHistory, PushSubscription
)
from app.services.notification_service import notification_service

router = APIRouter()

# Pydantic models
class NotificationPreferenceUpdate(BaseModel):
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    weekly_reports: Optional[bool] = None
    marketing_emails: Optional[bool] = None
    agent_alerts: Optional[bool] = None
    integration_alerts: Optional[bool] = None
    credit_alerts: Optional[bool] = None

class NotificationPreferenceResponse(BaseModel):
    id: int
    email_notifications: bool
    push_notifications: bool
    weekly_reports: bool
    marketing_emails: bool
    agent_alerts: bool
    integration_alerts: bool
    credit_alerts: bool

class PushSubscriptionCreate(BaseModel):
    endpoint: str
    p256dh_key: str
    auth_key: str
    user_agent: Optional[str] = None

class PushSubscriptionResponse(BaseModel):
    id: int
    endpoint: str
    is_active: bool
    created_at: str

class NotificationHistoryResponse(BaseModel):
    id: int
    notification_type: str
    subject: Optional[str]
    status: str
    created_at: str

class TestNotificationRequest(BaseModel):
    type: str  # 'email', 'push', 'agent_alert', 'credit_alert'
    message: Optional[str] = "This is a test notification"

@router.get("/preferences", response_model=NotificationPreferenceResponse)
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's notification preferences"""
    try:
        result = await db.execute(
            select(NotificationPreference).where(
                NotificationPreference.user_id == current_user.id
            )
        )
        preferences = result.scalar_one_or_none()
        
        if not preferences:
            # Create default preferences
            preferences = NotificationPreference(
                user_id=current_user.id,
                email_notifications=True,
                push_notifications=False,
                weekly_reports=True,
                marketing_emails=False,
                agent_alerts=True,
                integration_alerts=True,
                credit_alerts=True
            )
            db.add(preferences)
            await db.commit()
            await db.refresh(preferences)
        
        return NotificationPreferenceResponse(
            id=preferences.id,
            email_notifications=preferences.email_notifications,
            push_notifications=preferences.push_notifications,
            weekly_reports=preferences.weekly_reports,
            marketing_emails=preferences.marketing_emails,
            agent_alerts=preferences.agent_alerts,
            integration_alerts=preferences.integration_alerts,
            credit_alerts=preferences.credit_alerts
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch notification preferences: {str(e)}"
        )

@router.put("/preferences", response_model=NotificationPreferenceResponse)
async def update_notification_preferences(
    preferences_data: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user's notification preferences"""
    try:
        result = await db.execute(
            select(NotificationPreference).where(
                NotificationPreference.user_id == current_user.id
            )
        )
        preferences = result.scalar_one_or_none()
        
        if not preferences:
            # Create new preferences
            preferences = NotificationPreference(user_id=current_user.id)
            db.add(preferences)
        
        # Update fields that were provided
        update_data = preferences_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(preferences, field, value)
        
        await db.commit()
        await db.refresh(preferences)
        
        return NotificationPreferenceResponse(
            id=preferences.id,
            email_notifications=preferences.email_notifications,
            push_notifications=preferences.push_notifications,
            weekly_reports=preferences.weekly_reports,
            marketing_emails=preferences.marketing_emails,
            agent_alerts=preferences.agent_alerts,
            integration_alerts=preferences.integration_alerts,
            credit_alerts=preferences.credit_alerts
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update notification preferences: {str(e)}"
        )

@router.post("/push-subscription", response_model=PushSubscriptionResponse)
async def create_push_subscription(
    subscription_data: PushSubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create or update push notification subscription"""
    try:
        # Check if subscription already exists
        result = await db.execute(
            select(PushSubscription).where(
                PushSubscription.user_id == current_user.id,
                PushSubscription.endpoint == subscription_data.endpoint
            )
        )
        existing_sub = result.scalar_one_or_none()
        
        if existing_sub:
            # Update existing subscription
            existing_sub.p256dh_key = subscription_data.p256dh_key
            existing_sub.auth_key = subscription_data.auth_key
            existing_sub.user_agent = subscription_data.user_agent
            existing_sub.is_active = True
            subscription = existing_sub
        else:
            # Create new subscription
            subscription = PushSubscription(
                user_id=current_user.id,
                endpoint=subscription_data.endpoint,
                p256dh_key=subscription_data.p256dh_key,
                auth_key=subscription_data.auth_key,
                user_agent=subscription_data.user_agent
            )
            db.add(subscription)
        
        await db.commit()
        await db.refresh(subscription)
        
        return PushSubscriptionResponse(
            id=subscription.id,
            endpoint=subscription.endpoint,
            is_active=subscription.is_active,
            created_at=subscription.created_at.isoformat()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create push subscription: {str(e)}"
        )

@router.delete("/push-subscription/{subscription_id}")
async def delete_push_subscription(
    subscription_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete push notification subscription"""
    try:
        result = await db.execute(
            select(PushSubscription).where(
                PushSubscription.id == subscription_id,
                PushSubscription.user_id == current_user.id
            )
        )
        subscription = result.scalar_one_or_none()
        
        if not subscription:
            raise HTTPException(
                status_code=404,
                detail="Push subscription not found"
            )
        
        subscription.is_active = False
        await db.commit()
        
        return {"message": "Push subscription deactivated"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete push subscription: {str(e)}"
        )

@router.get("/history", response_model=List[NotificationHistoryResponse])
async def get_notification_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50
):
    """Get user's notification history"""
    try:
        result = await db.execute(
            select(NotificationHistory)
            .where(NotificationHistory.user_id == current_user.id)
            .order_by(NotificationHistory.created_at.desc())
            .limit(limit)
        )
        history = result.scalars().all()
        
        return [
            NotificationHistoryResponse(
                id=item.id,
                notification_type=item.notification_type,
                subject=item.subject,
                status=item.status,
                created_at=item.created_at.isoformat()
            )
            for item in history
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch notification history: {str(e)}"
        )

@router.post("/test")
async def send_test_notification(
    test_request: TestNotificationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a test notification"""
    try:
        if test_request.type == "email":
            success = await notification_service.email_service.send_email(
                to_email=current_user.email,
                subject="🧪 Test Email Notification",
                html_content=f"""
                <h2>Test Email</h2>
                <p>Hi {current_user.name},</p>
                <p>{test_request.message}</p>
                <p>If you received this, your email notifications are working correctly! ✅</p>
                """,
                user_id=current_user.id,
                db=db
            )
            
        elif test_request.type == "agent_alert":
            await notification_service.send_agent_alert(
                user=current_user,
                agent_name="Test Agent",
                message=test_request.message,
                db=db
            )
            success = True
            
        elif test_request.type == "credit_alert":
            await notification_service.send_credit_alert(
                user=current_user,
                credits_remaining=100,
                percentage_used=85.0,
                db=db
            )
            success = True
            
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid notification type"
            )
        
        if success:
            return {"message": f"Test {test_request.type} notification sent successfully"}
        else:
            return {"message": f"Failed to send test {test_request.type} notification"}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send test notification: {str(e)}"
        )

@router.post("/weekly-report")
async def send_weekly_report_now(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send weekly report immediately (for testing)"""
    try:
        # Generate and send report
        report_data = await notification_service.weekly_report_service.generate_weekly_report(
            current_user, db
        )
        
        if report_data:
            success = await notification_service.weekly_report_service.send_weekly_report(
                current_user, report_data, db
            )
            
            if success:
                return {"message": "Weekly report sent successfully"}
            else:
                return {"message": "Failed to send weekly report"}
        else:
            return {"message": "Failed to generate weekly report"}
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send weekly report: {str(e)}"
        )