"""
Playground endpoints for testing agents
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio

from app.core.auth import get_current_user
from app.core.database import get_db, User, Agent, Tool, Conversation, Message

router = APIRouter()

# Pydantic models
class PlaygroundMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class PlaygroundResponse(BaseModel):
    response: str
    session_id: str
    agent_id: str
    tools_used: List[str] = []
    execution_time: float

class ConversationHistory(BaseModel):
    id: str
    messages: List[Dict[str, Any]]
    created_at: str

@router.post("/{agent_id}/chat", response_model=PlaygroundResponse)
async def chat_with_agent(
    agent_id: int,
    message_data: PlaygroundMessage,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Chat with an agent in the playground"""
    import time
    start_time = time.time()
    
    # Get agent
    result = await db.execute(
        select(Agent).where(
            Agent.id == agent_id,
            Agent.user_id == current_user.id
        )
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    if not agent.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Agent is not active"
        )
    
    # Get or create conversation
    session_id = message_data.session_id or f"playground_{agent_id}_{current_user.id}"
    
    result = await db.execute(
        select(Conversation).where(
            Conversation.agent_id == agent_id,
            Conversation.session_id == session_id
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        conversation = Conversation(
            agent_id=agent_id,
            user_id=current_user.id,
            session_id=session_id,
            title=f"Playground Session - {agent.name}"
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
    
    # Save user message
    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=message_data.message
    )
    db.add(user_message)
    
    # Execute agent with real AI model
    from app.services.agent_service import AgentService
    agent_service = AgentService(db)
    
    # Get conversation history for context
    conversation_history = await agent_service.get_conversation_history(conversation.id)
    
    # Execute the agent
    agent_response, tools_used, cost = await agent_service.execute_agent(
        agent=agent,
        user_message=message_data.message,
        conversation_history=conversation_history,
        session_id=session_id
    )
    
    # Save agent response
    assistant_message = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=agent_response
    )
    db.add(assistant_message)
    
    # Consume credits for AI usage (using new billing service)
    from app.services.billing_service import BillingService, CreditRates
    billing_service = BillingService(db)
    
    # Calculate credit consumption based on new rates
    credit_amount = CreditRates.AGENT_MESSAGE  # 2 credits per AI response
    if tools_used:
        # Add credits for tool usage
        for tool in tools_used:
            credit_amount += CreditRates.TOOL_EXECUTION  # 5 credits per tool
    
    # Consume credits
    credit_result = await billing_service.consume_credits(
        user_id=current_user.id,
        amount=credit_amount,
        description=f"AI conversation with {agent.name}",
        agent_id=agent.id,
        conversation_id=conversation.id,
        tool_used="ai_conversation"
    )
    
    # Check if credit consumption failed
    if not credit_result['success']:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient credits: {credit_result.get('error', 'Unknown error')}"
        )
    
    await db.commit()
    
    execution_time = time.time() - start_time
    
    return PlaygroundResponse(
        response=agent_response,
        session_id=session_id,
        agent_id=str(agent_id),
        tools_used=tools_used,
        execution_time=execution_time
    )

@router.get("/{agent_id}/conversations", response_model=List[ConversationHistory])
async def get_playground_conversations(
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get playground conversation history for an agent"""
    # Verify agent belongs to user
    result = await db.execute(
        select(Agent).where(
            Agent.id == agent_id,
            Agent.user_id == current_user.id
        )
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Get conversations
    result = await db.execute(
        select(Conversation).where(
            Conversation.agent_id == agent_id
        ).order_by(Conversation.created_at.desc())
    )
    conversations = result.scalars().all()
    
    conversation_histories = []
    for conv in conversations:
        # Get messages for this conversation
        result = await db.execute(
            select(Message).where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.asc())
        )
        messages = result.scalars().all()
        
        conversation_histories.append(ConversationHistory(
            id=str(conv.id),
            messages=[
                {
                    "role": msg.role,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat()
                }
                for msg in messages
            ],
            created_at=conv.created_at.isoformat()
        ))
    
    return conversation_histories

@router.get("/{agent_id}/conversations/{conversation_id}")
async def get_conversation_messages(
    agent_id: int,
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get messages for a specific conversation"""
    # Verify agent belongs to user
    result = await db.execute(
        select(Agent).where(
            Agent.id == agent_id,
            Agent.user_id == current_user.id
        )
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Get conversation
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.agent_id == agent_id
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Get messages
    result = await db.execute(
        select(Message).where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()
    
    return {
        "conversation_id": conversation_id,
        "agent_id": agent_id,
        "messages": [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
                "metadata": msg.meta_data
            }
            for msg in messages
        ]
    }

@router.delete("/{agent_id}/conversations/{conversation_id}")
async def delete_conversation(
    agent_id: int,
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a playground conversation"""
    # Verify agent belongs to user
    result = await db.execute(
        select(Agent).where(
            Agent.id == agent_id,
            Agent.user_id == current_user.id
        )
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Get conversation
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.agent_id == agent_id
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

@router.get("/{agent_id}/tools")
async def get_agent_tools(
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get tools assigned to an agent"""
    # Verify agent belongs to user
    result = await db.execute(
        select(Agent).where(
            Agent.id == agent_id,
            Agent.user_id == current_user.id
        )
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Get agent tools
    result = await db.execute(
        select(Tool).where(
            Tool.agent_id == agent_id
        ).order_by(Tool.order)
    )
    agent_tools = result.all()
    
    return {
        "agent_id": agent_id,
        "tools": [
            {
                "id": tool.id,
                "name": tool.name,
                "description": tool.description,
                "category": tool.category,
                "tool_type": tool.tool_type,
                "config": tool.config,
                "order": tool.order,
                "is_active": tool.is_active
            }
            for tool in agent_tools
        ]
    } 