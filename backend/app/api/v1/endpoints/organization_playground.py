"""
Organization Playground API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func, delete
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.core.auth import get_current_user
from app.core.database import get_db, User, OrganizationConversation, OrganizationMessage, OrganizationAttachment, OrganizationAgent, OrganizationPlaygroundPolicy
from app.api.v1.endpoints.organizations import check_organization_permission

router = APIRouter()

# Pydantic models for request/response
class OrganizationConversationCreate(BaseModel):
    agent_id: int
    first_user_message: str

class OrganizationConversationUpdate(BaseModel):
    title: str

class OrganizationConversationResponse(BaseModel):
    id: int
    organization_id: int
    agent_id: int
    title: Optional[str]
    title_status: str
    title_generated_at: Optional[str]
    title_generation_method: str
    created_by_id: int
    created_at: str
    updated_at: Optional[str]
    last_message_at: Optional[str]
    message_count: int
    meta_data: Optional[Dict[str, Any]]

    @classmethod
    def from_orm(cls, obj):
        """Custom from_orm method to handle datetime conversion"""
        data = {
            "id": obj.id,
            "organization_id": obj.organization_id,
            "agent_id": obj.agent_id,
            "title": obj.title,
            "title_status": obj.title_status,
            "title_generated_at": obj.title_generated_at.isoformat() if obj.title_generated_at else None,
            "title_generation_method": obj.title_generation_method,
            "created_by_id": obj.created_by_id,
            "created_at": obj.created_at.isoformat() if obj.created_at else None,
            "updated_at": obj.updated_at.isoformat() if obj.updated_at else None,
            "last_message_at": obj.last_message_at.isoformat() if obj.last_message_at else None,
            "message_count": obj.message_count,
            "meta_data": obj.meta_data
        }
        return cls(**data)

    class Config:
        from_attributes = True

class OrganizationMessageCreate(BaseModel):
    content: str
    attachments: Optional[List[Dict[str, Any]]] = []

class OrganizationMessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    created_by_id: Optional[int]
    created_at: str
    meta_data: Optional[Dict[str, Any]]
    tool_calls: Optional[Dict[str, Any]]
    parent_message_id: Optional[int]
    token_count: Optional[int]
    cost_cents: Optional[int]
    attachments: Optional[List[Dict[str, Any]]] = []

    @classmethod
    def from_orm(cls, obj):
        """Custom from_orm method to handle datetime conversion"""
        data = {
            "id": obj.id,
            "conversation_id": obj.conversation_id,
            "role": obj.role,
            "content": obj.content,
            "created_by_id": obj.created_by_id,
            "created_at": obj.created_at.isoformat() if obj.created_at else None,
            "meta_data": obj.meta_data,
            "tool_calls": obj.tool_calls,
            "parent_message_id": obj.parent_message_id,
            "token_count": obj.token_count,
            "cost_cents": obj.cost_cents,
            "attachments": []  # We'll load attachments separately if needed
        }
        return cls(**data)

    class Config:
        from_attributes = True

class OrganizationAgentResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    description: Optional[str]
    instructions: str
    model: str
    is_active: bool
    tools: List[Dict[str, Any]]
    context_config: Optional[Dict[str, Any]]
    created_by_id: int
    created_at: str
    updated_at: Optional[str]

    class Config:
        from_attributes = True

# Helper function to generate provisional title
def generate_provisional_title(message: str) -> str:
    """Generate a provisional title from the first user message"""
    # Clean the message
    cleaned = message.strip()
    
    # Remove common prefixes
    prefixes_to_remove = ["help me", "can you", "please", "i need", "how do i", "what is", "explain"]
    for prefix in prefixes_to_remove:
        if cleaned.lower().startswith(prefix.lower()):
            cleaned = cleaned[len(prefix):].strip()
    
    # Remove punctuation and extra spaces
    cleaned = cleaned.replace("?", "").replace("!", "").replace(".", "").strip()
    
    # Take first 40 characters
    if len(cleaned) > 40:
        cleaned = cleaned[:40] + "..."
    
    return cleaned.title() if cleaned else "New Conversation"

@router.get("/organizations/{organization_id}/agents", response_model=List[OrganizationAgentResponse])
async def get_organization_playground_agents(
    organization_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all active organization agents for playground"""
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this organization's playground"
        )
    
    result = await db.execute(
        select(OrganizationAgent).where(
            and_(
                OrganizationAgent.organization_id == organization_id,
                OrganizationAgent.is_active == True
            )
        )
    )
    agents = result.scalars().all()
    
    return [OrganizationAgentResponse.from_orm(agent) for agent in agents]

@router.get("/organizations/{organization_id}/conversations", response_model=List[OrganizationConversationResponse])
async def get_organization_conversations(
    organization_id: int,
    agent_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get organization conversations, optionally filtered by agent"""
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this organization's conversations"
        )
    
    query = select(OrganizationConversation).where(
        OrganizationConversation.organization_id == organization_id
    )
    
    if agent_id:
        query = query.where(OrganizationConversation.agent_id == agent_id)
    
    query = query.order_by(desc(OrganizationConversation.last_message_at))
    
    result = await db.execute(query)
    conversations = result.scalars().all()
    
    return [OrganizationConversationResponse.from_orm(conv) for conv in conversations]

@router.post("/organizations/{organization_id}/conversations", response_model=OrganizationConversationResponse)
async def create_organization_conversation(
    organization_id: int,
    conversation_data: OrganizationConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new organization conversation"""
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create conversations for this organization"
        )
    
    # Verify agent exists and belongs to organization
    agent_result = await db.execute(
        select(OrganizationAgent).where(
            and_(
                OrganizationAgent.id == conversation_data.agent_id,
                OrganizationAgent.organization_id == organization_id,
                OrganizationAgent.is_active == True
            )
        )
    )
    agent = agent_result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization agent not found"
        )
    
    # Generate provisional title
    provisional_title = generate_provisional_title(conversation_data.first_user_message)
    
    # Create conversation
    new_conversation = OrganizationConversation(
        organization_id=organization_id,
        agent_id=conversation_data.agent_id,
        title=provisional_title,
        title_status="provisional",
        created_by_id=current_user.id,
        message_count=0
    )
    
    db.add(new_conversation)
    await db.commit()
    await db.refresh(new_conversation)
    
    # Create the first user message
    first_message = OrganizationMessage(
        conversation_id=new_conversation.id,
        role="user",
        content=conversation_data.first_user_message,
        created_by_id=current_user.id
    )
    
    db.add(first_message)
    
    # Update conversation message count and last message time
    new_conversation.message_count = 1
    new_conversation.last_message_at = func.now()
    
    await db.commit()
    await db.refresh(new_conversation)
    
    return OrganizationConversationResponse.from_orm(new_conversation)

@router.patch("/organizations/{organization_id}/conversations/{conversation_id}", response_model=Dict[str, str])
async def update_organization_conversation(
    organization_id: int,
    conversation_id: int,
    conversation_data: OrganizationConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update organization conversation title (manual rename)"""
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this organization's conversations"
        )
    
    # Get conversation
    result = await db.execute(
        select(OrganizationConversation).where(
            and_(
                OrganizationConversation.id == conversation_id,
                OrganizationConversation.organization_id == organization_id
            )
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Update title and mark as custom
    conversation.title = conversation_data.title
    conversation.title_status = "custom"
    conversation.title_generation_method = "manual"
    
    await db.commit()
    
    return {"message": "Conversation updated successfully"}

@router.delete("/organizations/{organization_id}/conversations/{conversation_id}")
async def delete_organization_conversation(
    organization_id: int,
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete organization conversation"""
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this organization's conversations"
        )
    
    # Get conversation
    result = await db.execute(
        select(OrganizationConversation).where(
            and_(
                OrganizationConversation.id == conversation_id,
                OrganizationConversation.organization_id == organization_id
            )
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Check if user can delete (creator or admin+)
    can_delete = (
        conversation.created_by_id == current_user.id or
        await check_organization_permission(organization_id, current_user.id, 'admin', db)
    )
    
    if not can_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete conversations you created"
        )
    
    # Delete all messages first
    await db.execute(
        delete(OrganizationMessage).where(
            OrganizationMessage.conversation_id == conversation_id
        )
    )
    
    # Delete all attachments
    await db.execute(
        delete(OrganizationAttachment).where(
            OrganizationAttachment.conversation_id == conversation_id
        )
    )
    
    # Delete conversation
    await db.delete(conversation)
    await db.commit()
    
    return {"message": "Conversation deleted successfully"}

@router.get("/organizations/{organization_id}/conversations/{conversation_id}/messages", response_model=List[OrganizationMessageResponse])
async def get_organization_conversation_messages(
    organization_id: int,
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get messages for an organization conversation"""
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this organization's conversations"
        )
    
    # Verify conversation exists and belongs to organization
    result = await db.execute(
        select(OrganizationConversation).where(
            and_(
                OrganizationConversation.id == conversation_id,
                OrganizationConversation.organization_id == organization_id
            )
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
        select(OrganizationMessage).where(
            OrganizationMessage.conversation_id == conversation_id
        ).order_by(OrganizationMessage.created_at)
    )
    messages = result.scalars().all()
    
    # Get attachments for each message
    message_responses = []
    for message in messages:
        # Get attachments for this message
        attachments_result = await db.execute(
            select(OrganizationAttachment).where(
                OrganizationAttachment.message_id == message.id
            )
        )
        attachments = attachments_result.scalars().all()
        
        message_dict = OrganizationMessageResponse.from_orm(message).dict()
        message_dict['attachments'] = [
            {
                'id': att.id,
                'blob_key': att.blob_key,
                'blob_url': att.blob_url,
                'filename': att.filename,
                'file_size': att.file_size,
                'mime_type': att.mime_type
            }
            for att in attachments
        ]
        message_responses.append(OrganizationMessageResponse(**message_dict))
    
    return message_responses

@router.post("/organizations/{organization_id}/conversations/{conversation_id}/messages", response_model=Dict[str, Any])
async def send_organization_message(
    organization_id: int,
    conversation_id: int,
    message_data: OrganizationMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a message to an organization conversation"""
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to send messages to this organization"
        )
    
    # Verify conversation exists and belongs to organization
    result = await db.execute(
        select(OrganizationConversation).where(
            and_(
                OrganizationConversation.id == conversation_id,
                OrganizationConversation.organization_id == organization_id
            )
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Create user message
    user_message = OrganizationMessage(
        conversation_id=conversation_id,
        role="user",
        content=message_data.content,
        created_by_id=current_user.id
    )
    
    db.add(user_message)
    await db.commit()
    await db.refresh(user_message)
    
    # Handle attachments if provided
    if message_data.attachments:
        for attachment_data in message_data.attachments:
            attachment = OrganizationAttachment(
                conversation_id=conversation_id,
                message_id=user_message.id,
                blob_key=attachment_data['blob_key'],
                blob_url=attachment_data['blob_url'],
                filename=attachment_data['filename'],
                file_size=attachment_data.get('file_size'),
                mime_type=attachment_data.get('mime_type'),
                created_by_id=current_user.id
            )
            db.add(attachment)
    
    # Update conversation
    conversation.message_count += 1
    conversation.last_message_at = func.now()
    
    await db.commit()
    
    # TODO: Generate assistant response and create assistant message
    # For now, return the user message
    return {
        "message": OrganizationMessageResponse.from_orm(user_message).dict(),
        "assistant": {
            "id": None,
            "stream": True
        }
    }

@router.post("/organizations/{organization_id}/conversations/{conversation_id}/messages/stream")
async def stream_organization_message(
    organization_id: int,
    conversation_id: int,
    message_data: OrganizationMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Stream a message to an organization conversation"""
    from fastapi.responses import StreamingResponse
    from app.services.agent_service import AgentService
    import json
    import asyncio
    
    # Check organization permission
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this organization's conversations"
        )
    
    # Get conversation and agent
    result = await db.execute(
        select(OrganizationConversation, OrganizationAgent)
        .join(OrganizationAgent, OrganizationConversation.agent_id == OrganizationAgent.id)
        .where(
            and_(
                OrganizationConversation.id == conversation_id,
                OrganizationConversation.organization_id == organization_id
            )
        )
    )
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation or agent not found"
        )
    
    conversation, agent = row
    
    # Create user message
    user_message = OrganizationMessage(
        conversation_id=conversation_id,
        role='user',
        content=message_data.content,
        created_by_id=current_user.id
    )
    
    db.add(user_message)
    await db.commit()
    await db.refresh(user_message)
    
    # Update conversation
    conversation.message_count += 1
    conversation.last_message_at = func.now()
    await db.commit()
    
    # Get conversation history for context
    messages_result = await db.execute(
        select(OrganizationMessage)
        .where(OrganizationMessage.conversation_id == conversation_id)
        .order_by(OrganizationMessage.created_at)
        .limit(20)  # Last 20 messages for context
    )
    history_messages = messages_result.scalars().all()
    
    # Convert to agent service format
    agent_messages = []
    for msg in history_messages:
        agent_messages.append({
            "role": msg.role,
            "content": msg.content
        })
    
    # Create assistant message placeholder
    assistant_message = OrganizationMessage(
        conversation_id=conversation_id,
        role='assistant',
        content='',
        created_by_id=None  # System generated
    )
    
    db.add(assistant_message)
    await db.commit()
    await db.refresh(assistant_message)
    
    async def generate_stream():
        try:
            import time
            start_time = time.time()
            print(f"🚀 Organization streaming started at {time.strftime('%H:%M:%S')}.{int((start_time % 1) * 1000):03d}")
            
            # Initialize agent service
            agent_service = AgentService(db)
            agent_init_time = time.time()
            print(f"⚙️ Agent service initialized at {time.strftime('%H:%M:%S')}.{int((agent_init_time % 1) * 1000):03d} (took {(agent_init_time - start_time)*1000:.1f}ms)")
            
            # Process streaming response
            full_response = ""
            tools_used = []
            
            stream_start_time = time.time()
            print(f"📡 Starting agent stream at {time.strftime('%H:%M:%S')}.{int((stream_start_time % 1) * 1000):03d}")
            
            # Stream the response with immediate content streaming
            async for chunk in agent_service.execute_agent_stream(
                agent=agent,
                user_message=message_data.content,
                conversation_history=agent_messages,
                session_id=None,  # Organization conversations don't use session_id
                user_id=current_user.id,
                integration_id=None  # Organization conversations don't use integration_id
            ):
                chunk_received_time = time.time()
                chunk_type = chunk.get("type")
                content = chunk.get("content", "")
                
                print(f"📦 Chunk received at {time.strftime('%H:%M:%S')}.{int((chunk_received_time % 1) * 1000):03d} - Type: {chunk_type}, Content length: {len(content) if content else 0}")
                
                # Stream content immediately as it comes
                if chunk_type == "content":
                    content_start_time = time.time()
                    # Update assistant message with new content
                    assistant_message.content += content
                    full_response += content
                    await db.commit()
                    db_commit_time = time.time()
                    
                    # Send content chunk immediately
                    yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
                    content_sent_time = time.time()
                    
                    print(f"  📝 Content processed: DB commit took {(db_commit_time - content_start_time)*1000:.1f}ms, Send took {(content_sent_time - db_commit_time)*1000:.1f}ms")
                
                # Stream status updates
                elif chunk_type == "status":
                    status_time = time.time()
                    yield f"data: {json.dumps({'type': 'status', 'content': content})}\n\n"
                    print(f"  📊 Status sent at {time.strftime('%H:%M:%S')}.{int((status_time % 1) * 1000):03d}: {content}")
                
                # Handle completion
                elif chunk_type == "complete":
                    complete_time = time.time()
                    tools_used = chunk.get("tools_used", [])
                    # Send completion with the full response content
                    yield f"data: {json.dumps({'type': 'complete', 'content': chunk.get('content', full_response), 'tools_used': tools_used})}\n\n"
                    print(f"  ✅ Completion sent at {time.strftime('%H:%M:%S')}.{int((complete_time % 1) * 1000):03d} - Total time: {(complete_time - start_time)*1000:.1f}ms")
                    break
                
                # Handle errors
                elif chunk_type == "error":
                    error_time = time.time()
                    print(f"❌ Organization stream error at {time.strftime('%H:%M:%S')}.{int((error_time % 1) * 1000):03d}: {content}")
                    yield f"data: {json.dumps({'type': 'error', 'content': content})}\n\n"
                    break
            
        except Exception as e:
            # Send error
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )

@router.post("/organizations/{organization_id}/conversations/{conversation_id}/generate-title")
async def generate_conversation_title(
    organization_id: int,
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate a title for an organization conversation"""
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this organization's conversations"
        )
    
    # Get conversation
    result = await db.execute(
        select(OrganizationConversation).where(
            and_(
                OrganizationConversation.id == conversation_id,
                OrganizationConversation.organization_id == organization_id
            )
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Don't regenerate if already custom
    if conversation.title_status == "custom":
        return {"message": "Title is already custom, not regenerating"}
    
    # Get first user and assistant messages
    result = await db.execute(
        select(OrganizationMessage).where(
            OrganizationMessage.conversation_id == conversation_id
        ).order_by(OrganizationMessage.created_at).limit(2)
    )
    messages = result.scalars().all()
    
    if len(messages) < 2:
        return {"message": "Not enough messages to generate title"}
    
    # Generate AI title using OpenAI
    first_user_message = messages[0].content
    first_assistant_message = messages[1].content
    
    try:
        # Import OpenAI here to avoid circular imports
        from openai import AsyncOpenAI
        import os
        
        # Initialize OpenAI client
        openai_client = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        # Create a prompt for title generation
        title_prompt = f"""Generate a concise, descriptive title for this conversation based on the first exchange:

User: {first_user_message[:200]}
Assistant: {first_assistant_message[:200]}

The title should:
- Be 3-8 words maximum
- Capture the main topic or question
- Be clear and professional
- Not include quotes or special characters

Title:"""

        # Generate title using OpenAI
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that generates concise, descriptive titles for conversations."},
                {"role": "user", "content": title_prompt}
            ],
            max_tokens=20,
            temperature=0.3
        )
        
        generated_title = response.choices[0].message.content.strip()
        
        # Clean up the title
        generated_title = generated_title.replace('"', '').replace("'", '').strip()
        
        # Fallback to provisional title if AI generation fails
        if not generated_title or len(generated_title) > 100:
            generated_title = generate_provisional_title(first_user_message)
            
    except Exception as e:
        # Fallback to provisional title if AI generation fails
        generated_title = generate_provisional_title(first_user_message)
    
    # Update conversation
    conversation.title = generated_title
    conversation.title_status = "final"
    conversation.title_generated_at = func.now()
    
    await db.commit()
    
    return {"message": "Title generated successfully", "title": generated_title}

@router.patch("/organizations/{organization_id}/conversations/{conversation_id}/rename")
async def rename_organization_conversation(
    organization_id: int,
    conversation_id: int,
    title_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Rename a conversation"""
    new_title = title_data.get("title")
    if not new_title or not new_title.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title is required"
        )
    
    # Check organization permission
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this organization's conversations"
        )
    
    # Get conversation
    result = await db.execute(
        select(OrganizationConversation).where(
            and_(
                OrganizationConversation.id == conversation_id,
                OrganizationConversation.organization_id == organization_id
            )
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Update title
    conversation.title = new_title.strip()
    conversation.title_status = 'custom'  # Mark as custom since user renamed it
    conversation.title_generated_at = func.now()
    conversation.title_generation_method = 'user_renamed'
    
    await db.commit()
    
    return {"message": "Conversation renamed successfully"}
