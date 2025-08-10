"""
Platform integration endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.core.auth import get_current_user
from app.core.database import get_db, User, Integration, Agent

router = APIRouter()

# Pydantic models
class IntegrationCreate(BaseModel):
    agent_id: int
    platform: str  # whatsapp, telegram, discord, etc.
    config: Dict[str, Any]
    webhook_url: Optional[str] = None

class IntegrationUpdate(BaseModel):
    config: Optional[Dict[str, Any]] = None
    webhook_url: Optional[str] = None
    is_active: Optional[bool] = None

class IntegrationResponse(BaseModel):
    id: int
    agent_id: int
    platform: str
    config: Dict[str, Any]
    webhook_url: Optional[str]
    is_active: bool
    created_at: str
    updated_at: Optional[str]

@router.post("/", response_model=IntegrationResponse)
async def create_integration(
    integration_data: IntegrationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new platform integration"""
    # Check if agent exists and belongs to user
    result = await db.execute(
        select(Agent).where(
            Agent.id == integration_data.agent_id,
            Agent.user_id == current_user.id
        )
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Check if integration already exists for this agent and platform
    result = await db.execute(
        select(Integration).where(
            Integration.agent_id == integration_data.agent_id,
            Integration.platform == integration_data.platform
        )
    )
    existing_integration = result.scalar_one_or_none()
    
    if existing_integration:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Integration for {integration_data.platform} already exists for this agent"
        )
    
    # Create new integration
    new_integration = Integration(
        user_id=current_user.id,
        agent_id=integration_data.agent_id,
        platform=integration_data.platform,
        config=integration_data.config,
        webhook_url=integration_data.webhook_url
    )
    
    db.add(new_integration)
    await db.commit()
    await db.refresh(new_integration)
    
    return IntegrationResponse(
        id=new_integration.id,
        agent_id=new_integration.agent_id,
        platform=new_integration.platform,
        config=new_integration.config,
        webhook_url=new_integration.webhook_url,
        is_active=new_integration.is_active,
        created_at=new_integration.created_at.isoformat(),
        updated_at=new_integration.updated_at.isoformat() if new_integration.updated_at else None
    )

@router.get("/", response_model=List[IntegrationResponse])
async def list_integrations(
    agent_id: Optional[int] = None,
    platform: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List integrations for the current user"""
    query = select(Integration).where(Integration.user_id == current_user.id)
    
    if agent_id:
        query = query.where(Integration.agent_id == agent_id)
    if platform:
        query = query.where(Integration.platform == platform)
    
    result = await db.execute(query)
    integrations = result.scalars().all()
    
    return [
        IntegrationResponse(
            id=integration.id,
            agent_id=integration.agent_id,
            platform=integration.platform,
            config=integration.config,
            webhook_url=integration.webhook_url,
            is_active=integration.is_active,
            created_at=integration.created_at.isoformat(),
            updated_at=integration.updated_at.isoformat() if integration.updated_at else None
        )
        for integration in integrations
    ]

@router.get("/{integration_id}", response_model=IntegrationResponse)
async def get_integration(
    integration_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific integration"""
    result = await db.execute(
        select(Integration).where(
            Integration.id == integration_id,
            Integration.user_id == current_user.id
        )
    )
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    return IntegrationResponse(
        id=integration.id,
        agent_id=integration.agent_id,
        platform=integration.platform,
        config=integration.config,
        webhook_url=integration.webhook_url,
        is_active=integration.is_active,
        created_at=integration.created_at.isoformat(),
        updated_at=integration.updated_at.isoformat() if integration.updated_at else None
    )

@router.put("/{integration_id}", response_model=IntegrationResponse)
async def update_integration(
    integration_id: int,
    integration_data: IntegrationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an integration"""
    result = await db.execute(
        select(Integration).where(
            Integration.id == integration_id,
            Integration.user_id == current_user.id
        )
    )
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    # Update fields
    if integration_data.config is not None:
        integration.config = integration_data.config
    if integration_data.webhook_url is not None:
        integration.webhook_url = integration_data.webhook_url
    if integration_data.is_active is not None:
        integration.is_active = integration_data.is_active
    
    await db.commit()
    await db.refresh(integration)
    
    return IntegrationResponse(
        id=integration.id,
        agent_id=integration.agent_id,
        platform=integration.platform,
        config=integration.config,
        webhook_url=integration.webhook_url,
        is_active=integration.is_active,
        created_at=integration.created_at.isoformat(),
        updated_at=integration.updated_at.isoformat() if integration.updated_at else None
    )

@router.delete("/{integration_id}")
async def delete_integration(
    integration_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an integration"""
    result = await db.execute(
        select(Integration).where(
            Integration.id == integration_id,
            Integration.user_id == current_user.id
        )
    )
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    await db.delete(integration)
    await db.commit()
    
    return {"message": "Integration deleted successfully"}

@router.get("/platforms/list")
async def get_supported_platforms():
    """Get list of supported platforms"""
    return {
        "platforms": [
            {
                "id": "whatsapp",
                "name": "WhatsApp",
                "description": "Connect your agent to WhatsApp Business",
                "icon": "whatsapp",
                "status": "available"
            },
            {
                "id": "telegram",
                "name": "Telegram",
                "description": "Create a Telegram bot for your agent",
                "icon": "telegram",
                "status": "coming_soon"
            },
            {
                "id": "discord",
                "name": "Discord",
                "description": "Integrate with Discord servers",
                "icon": "discord",
                "status": "coming_soon"
            },
            {
                "id": "slack",
                "name": "Slack",
                "description": "Connect to Slack workspaces",
                "icon": "slack",
                "status": "coming_soon"
            }
        ]
    }

# Webhook endpoints for platform integrations
@router.post("/webhooks/whatsapp")
async def whatsapp_webhook(
    request: Dict[str, Any]
):
    """Handle WhatsApp webhook events"""
    # TODO: Implement WhatsApp webhook handling
    return {"status": "received"}

# Telegram webhook moved to /api/v1/telegram/webhook 