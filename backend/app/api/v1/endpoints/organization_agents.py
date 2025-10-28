"""
Organization Agents endpoints (CRUD)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.core.auth import get_current_user
from app.core.database import get_db, User, OrganizationAgent
from app.api.v1.endpoints.organizations import check_organization_permission

router = APIRouter()


class OrganizationAgentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    instructions: str
    model: Optional[str] = "gpt-4o-mini"
    tools: Optional[List[Dict[str, Any]]] = None
    context_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = True


class OrganizationAgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    model: Optional[str] = None
    tools: Optional[List[Dict[str, Any]]] = None
    context_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class OrganizationAgentResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    description: Optional[str]
    instructions: str
    model: str
    tools: Optional[List[Dict[str, Any]]]
    context_config: Optional[Dict[str, Any]]
    is_active: bool
    created_by_id: int
    created_at: str
    updated_at: Optional[str]


def to_response(agent: OrganizationAgent) -> OrganizationAgentResponse:
    return OrganizationAgentResponse(
        id=agent.id,
        organization_id=agent.organization_id,
        name=agent.name,
        description=agent.description,
        instructions=agent.instructions,
        model=agent.model,
        tools=agent.tools,
        context_config=agent.context_config,
        is_active=agent.is_active,
        created_by_id=agent.created_by_id,
        created_at=agent.created_at.isoformat() if agent.created_at else None,
        updated_at=agent.updated_at.isoformat() if agent.updated_at else None,
    )


@router.post("/organizations/{organization_id}/agents", response_model=OrganizationAgentResponse)
async def create_organization_agent(
    organization_id: int,
    body: OrganizationAgentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Owners/Admins can create
    if not await check_organization_permission(organization_id, current_user.id, "admin", db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    agent = OrganizationAgent(
        organization_id=organization_id,
        name=body.name,
        description=body.description,
        instructions=body.instructions,
        model=body.model or "gpt-4o-mini",
        tools=body.tools or [],
        context_config=body.context_config,
        is_active=True if body.is_active is None else body.is_active,
        created_by_id=current_user.id,
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return to_response(agent)


@router.get("/organizations/{organization_id}/agents", response_model=List[OrganizationAgentResponse])
async def list_organization_agents(
    organization_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Any member can view
    if not await check_organization_permission(organization_id, current_user.id, "member", db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    result = await db.execute(
        select(OrganizationAgent).where(OrganizationAgent.organization_id == organization_id)
    )
    agents = result.scalars().all()
    return [to_response(a) for a in agents]


@router.get("/organizations/{organization_id}/agents/{agent_id}", response_model=OrganizationAgentResponse)
async def get_organization_agent(
    organization_id: int,
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await check_organization_permission(organization_id, current_user.id, "member", db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    result = await db.execute(
        select(OrganizationAgent).where(
            and_(
                OrganizationAgent.id == agent_id,
                OrganizationAgent.organization_id == organization_id,
            )
        )
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return to_response(agent)


@router.put("/organizations/{organization_id}/agents/{agent_id}", response_model=OrganizationAgentResponse)
async def update_organization_agent(
    organization_id: int,
    agent_id: int,
    body: OrganizationAgentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Owners/Admins can update
    if not await check_organization_permission(organization_id, current_user.id, "admin", db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    result = await db.execute(
        select(OrganizationAgent).where(
            and_(
                OrganizationAgent.id == agent_id,
                OrganizationAgent.organization_id == organization_id,
            )
        )
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    if body.name is not None:
        agent.name = body.name
    if body.description is not None:
        agent.description = body.description
    if body.instructions is not None:
        agent.instructions = body.instructions
    if body.model is not None:
        agent.model = body.model
    if body.tools is not None:
        agent.tools = body.tools
    if body.context_config is not None:
        agent.context_config = body.context_config
    if body.is_active is not None:
        agent.is_active = body.is_active

    await db.commit()
    await db.refresh(agent)
    return to_response(agent)


@router.delete("/organizations/{organization_id}/agents/{agent_id}")
async def delete_organization_agent(
    organization_id: int,
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Admins can delete
    if not await check_organization_permission(organization_id, current_user.id, "admin", db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    result = await db.execute(
        select(OrganizationAgent).where(
            and_(
                OrganizationAgent.id == agent_id,
                OrganizationAgent.organization_id == organization_id,
            )
        )
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    await db.delete(agent)
    await db.commit()
    return {"message": "Agent deleted successfully"}


