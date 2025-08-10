"""
Conversation management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.core.auth import get_current_user
from app.core.database import get_db, User, Conversation, Agent

router = APIRouter()

# Pydantic models
class ConversationResponse(BaseModel):
    id: int
    user_id: int
    agent_id: int
    session_id: Optional[str]
    title: Optional[str]
    context_summary: Optional[str]
    memory_metadata: Optional[Dict[str, Any]]
    retention_policy: Optional[Dict[str, Any]]
    created_at: str
    updated_at: Optional[str]

class ConversationCreate(BaseModel):
    agent_id: int
    session_id: Optional[str] = None
    title: Optional[str] = None
    context_summary: Optional[str] = None
    memory_metadata: Optional[Dict[str, Any]] = None
    retention_policy: Optional[Dict[str, Any]] = None

class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    context_summary: Optional[str] = None
    memory_metadata: Optional[Dict[str, Any]] = None
    retention_policy: Optional[Dict[str, Any]] = None

@router.get("/", response_model=List[ConversationResponse])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all conversations for the current user"""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()
    
    return [
        ConversationResponse(
            id=conv.id,
            user_id=conv.user_id,
            agent_id=conv.agent_id,
            session_id=conv.session_id,
            title=conv.title,
            context_summary=conv.context_summary,
            memory_metadata=conv.memory_metadata,
            retention_policy=conv.retention_policy,
            created_at=conv.created_at.isoformat(),
            updated_at=conv.updated_at.isoformat() if conv.updated_at else None
        )
        for conv in conversations
    ]

@router.post("/", response_model=ConversationResponse)
async def create_conversation(
    conversation_data: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new conversation"""
    # Verify agent exists and belongs to user
    agent_result = await db.execute(
        select(Agent).where(
            Agent.id == conversation_data.agent_id,
            Agent.user_id == current_user.id
        )
    )
    agent = agent_result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Create new conversation
    new_conversation = Conversation(
        user_id=current_user.id,
        agent_id=conversation_data.agent_id,
        session_id=conversation_data.session_id,
        title=conversation_data.title,
        context_summary=conversation_data.context_summary,
        memory_metadata=conversation_data.memory_metadata,
        retention_policy=conversation_data.retention_policy
    )
    
    db.add(new_conversation)
    await db.commit()
    await db.refresh(new_conversation)
    
    return ConversationResponse(
        id=new_conversation.id,
        user_id=new_conversation.user_id,
        agent_id=new_conversation.agent_id,
        session_id=new_conversation.session_id,
        title=new_conversation.title,
        context_summary=new_conversation.context_summary,
        memory_metadata=new_conversation.memory_metadata,
        retention_policy=new_conversation.retention_policy,
        created_at=new_conversation.created_at.isoformat(),
        updated_at=new_conversation.updated_at.isoformat() if new_conversation.updated_at else None
    )

@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific conversation"""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return ConversationResponse(
        id=conversation.id,
        user_id=conversation.user_id,
        agent_id=conversation.agent_id,
        session_id=conversation.session_id,
        title=conversation.title,
        context_summary=conversation.context_summary,
        memory_metadata=conversation.memory_metadata,
        retention_policy=conversation.retention_policy,
        created_at=conversation.created_at.isoformat(),
        updated_at=conversation.updated_at.isoformat() if conversation.updated_at else None
    )

@router.put("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: int,
    conversation_data: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a conversation"""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Update fields
    if conversation_data.title is not None:
        conversation.title = conversation_data.title
    if conversation_data.context_summary is not None:
        conversation.context_summary = conversation_data.context_summary
    if conversation_data.memory_metadata is not None:
        conversation.memory_metadata = conversation_data.memory_metadata
    if conversation_data.retention_policy is not None:
        conversation.retention_policy = conversation_data.retention_policy
    
    conversation.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(conversation)
    
    return ConversationResponse(
        id=conversation.id,
        user_id=conversation.user_id,
        agent_id=conversation.agent_id,
        session_id=conversation.session_id,
        title=conversation.title,
        context_summary=conversation.context_summary,
        memory_metadata=conversation.memory_metadata,
        retention_policy=conversation.retention_policy,
        created_at=conversation.created_at.isoformat(),
        updated_at=conversation.updated_at.isoformat() if conversation.updated_at else None
    )

@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a conversation"""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    await db.delete(conversation)
    await db.commit()
    
    return {"message": "Conversation deleted successfully"} 