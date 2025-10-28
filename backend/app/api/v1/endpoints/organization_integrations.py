"""
Organization Integration endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.core.auth import get_current_user
from app.core.database import get_db, User, OrganizationIntegration, Agent, OrganizationMember
from app.api.v1.endpoints.organizations import check_organization_permission

router = APIRouter()

# Pydantic models
class OrganizationIntegrationCreate(BaseModel):
    agent_id: int
    platform: str  # whatsapp, telegram, discord, etc.
    config: Dict[str, Any]
    webhook_url: Optional[str] = None

class OrganizationIntegrationUpdate(BaseModel):
    config: Optional[Dict[str, Any]] = None
    webhook_url: Optional[str] = None
    is_active: Optional[bool] = None

class OrganizationIntegrationResponse(BaseModel):
    id: int
    organization_id: int
    agent_id: int
    platform: str
    config: Dict[str, Any]
    webhook_url: Optional[str]
    is_active: bool
    created_by_id: int
    created_at: str
    updated_at: Optional[str]

@router.post("/organizations/{organization_id}/integrations", response_model=OrganizationIntegrationResponse)
async def create_organization_integration(
    organization_id: int,
    integration_data: OrganizationIntegrationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new organization integration"""
    # Check if user has permission to create integrations (member level)
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create integrations for this organization"
        )
    
    # Check if agent exists and belongs to organization (we'll need to create organization agents later)
    # For now, let's check if agent exists
    result = await db.execute(
        select(Agent).where(Agent.id == integration_data.agent_id)
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Check if integration already exists for this agent and platform
    result = await db.execute(
        select(OrganizationIntegration).where(
            and_(
                OrganizationIntegration.organization_id == organization_id,
                OrganizationIntegration.agent_id == integration_data.agent_id,
                OrganizationIntegration.platform == integration_data.platform
            )
        )
    )
    existing_integration = result.scalar_one_or_none()
    
    if existing_integration:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Integration for {integration_data.platform} already exists for this agent"
        )
    
    # Create new integration
    new_integration = OrganizationIntegration(
        organization_id=organization_id,
        agent_id=integration_data.agent_id,
        platform=integration_data.platform,
        config=integration_data.config,
        webhook_url=integration_data.webhook_url,
        created_by_id=current_user.id
    )
    
    db.add(new_integration)
    await db.commit()
    await db.refresh(new_integration)
    
    return OrganizationIntegrationResponse(
        id=new_integration.id,
        organization_id=new_integration.organization_id,
        agent_id=new_integration.agent_id,
        platform=new_integration.platform,
        config=new_integration.config,
        webhook_url=new_integration.webhook_url,
        is_active=new_integration.is_active,
        created_by_id=new_integration.created_by_id,
        created_at=new_integration.created_at.isoformat(),
        updated_at=new_integration.updated_at.isoformat() if new_integration.updated_at else None
    )

@router.get("/organizations/{organization_id}/integrations", response_model=List[OrganizationIntegrationResponse])
async def list_organization_integrations(
    organization_id: int,
    agent_id: Optional[int] = None,
    platform: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all integrations for an organization"""
    # Check if user has access to organization
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this organization"
        )
    
    query = select(OrganizationIntegration).where(
        OrganizationIntegration.organization_id == organization_id
    )
    
    if agent_id:
        query = query.where(OrganizationIntegration.agent_id == agent_id)
    if platform:
        query = query.where(OrganizationIntegration.platform == platform)
    
    result = await db.execute(query)
    integrations = result.scalars().all()
    
    return [
        OrganizationIntegrationResponse(
            id=integration.id,
            organization_id=integration.organization_id,
            agent_id=integration.agent_id,
            platform=integration.platform,
            config=integration.config,
            webhook_url=integration.webhook_url,
            is_active=integration.is_active,
            created_by_id=integration.created_by_id,
            created_at=integration.created_at.isoformat(),
            updated_at=integration.updated_at.isoformat() if integration.updated_at else None
        )
        for integration in integrations
    ]

@router.get("/organizations/{organization_id}/integrations/{integration_id}", response_model=OrganizationIntegrationResponse)
async def get_organization_integration(
    organization_id: int,
    integration_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific organization integration"""
    # Check if user has access to organization
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this organization"
        )
    
    result = await db.execute(
        select(OrganizationIntegration).where(
            and_(
                OrganizationIntegration.id == integration_id,
                OrganizationIntegration.organization_id == organization_id
            )
        )
    )
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found"
        )
    
    return OrganizationIntegrationResponse(
        id=integration.id,
        organization_id=integration.organization_id,
        agent_id=integration.agent_id,
        platform=integration.platform,
        config=integration.config,
        webhook_url=integration.webhook_url,
        is_active=integration.is_active,
        created_by_id=integration.created_by_id,
        created_at=integration.created_at.isoformat(),
        updated_at=integration.updated_at.isoformat() if integration.updated_at else None
    )

@router.put("/organizations/{organization_id}/integrations/{integration_id}", response_model=OrganizationIntegrationResponse)
async def update_organization_integration(
    organization_id: int,
    integration_id: int,
    integration_data: OrganizationIntegrationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an organization integration"""
    # Check if user has permission to update integrations (member level)
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update integrations for this organization"
        )
    
    result = await db.execute(
        select(OrganizationIntegration).where(
            and_(
                OrganizationIntegration.id == integration_id,
                OrganizationIntegration.organization_id == organization_id
            )
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
    
    return OrganizationIntegrationResponse(
        id=integration.id,
        organization_id=integration.organization_id,
        agent_id=integration.agent_id,
        platform=integration.platform,
        config=integration.config,
        webhook_url=integration.webhook_url,
        is_active=integration.is_active,
        created_by_id=integration.created_by_id,
        created_at=integration.created_at.isoformat(),
        updated_at=integration.updated_at.isoformat() if integration.updated_at else None
    )

@router.delete("/organizations/{organization_id}/integrations/{integration_id}")
async def delete_organization_integration(
    organization_id: int,
    integration_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an organization integration"""
    # Check if user has permission to delete integrations (admin level)
    if not await check_organization_permission(organization_id, current_user.id, 'admin', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete integrations for this organization"
        )
    
    result = await db.execute(
        select(OrganizationIntegration).where(
            and_(
                OrganizationIntegration.id == integration_id,
                OrganizationIntegration.organization_id == organization_id
            )
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
