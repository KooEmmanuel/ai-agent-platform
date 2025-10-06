"""
Support ticket endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db, User, Admin, SupportTicket, SupportMessage
from app.api.v1.endpoints.admin_auth import get_current_admin
from fastapi import Header

router = APIRouter()

# Dependency function for admin authentication
async def get_admin_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> Admin:
    """Check if current user is admin"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )

    token = authorization.split(" ")[1]
    return await get_current_admin(token, db)

# Pydantic models
class CreateTicketRequest(BaseModel):
    user_email: str
    user_name: Optional[str] = None
    subject: str
    description: str
    category: str  # 'auth', 'billing', 'technical', 'general'
    priority: str = 'medium'  # 'low', 'medium', 'high', 'urgent'

class UpdateTicketRequest(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[int] = None
    admin_notes: Optional[str] = None
    resolution: Optional[str] = None

class AddMessageRequest(BaseModel):
    message: str
    is_internal: bool = False

class TicketResponse(BaseModel):
    id: int
    user_id: Optional[int]
    user_email: str
    user_name: Optional[str]
    subject: str
    description: str
    category: str
    priority: str
    status: str
    assigned_to: Optional[int]
    admin_notes: Optional[str]
    resolution: Optional[str]
    created_at: str
    updated_at: str
    resolved_at: Optional[str]
    assigned_admin_name: Optional[str]
    message_count: int

class MessageResponse(BaseModel):
    id: int
    ticket_id: int
    sender_type: str
    sender_name: str
    sender_email: str
    message: str
    is_internal: bool
    created_at: str

@router.post("/tickets", response_model=dict)
async def create_support_ticket(
    request: CreateTicketRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new support ticket"""
    try:
        # Check if user exists
        user_result = await db.execute(
            select(User).where(User.email == request.user_email)
        )
        user = user_result.scalar_one_or_none()
        
        # Create ticket
        ticket = SupportTicket(
            user_id=user.id if user else None,
            user_email=request.user_email,
            user_name=request.user_name or (user.name if user else None),
            subject=request.subject,
            description=request.description,
            category=request.category,
            priority=request.priority,
            status='open'
        )
        
        db.add(ticket)
        await db.commit()
        await db.refresh(ticket)
        
        # Create initial message from user
        initial_message = SupportMessage(
            ticket_id=ticket.id,
            sender_type='user',
            sender_id=user.id if user else None,
            sender_name=request.user_name or (user.name if user else 'Unknown User'),
            sender_email=request.user_email,
            message=request.description,
            is_internal=False
        )
        
        db.add(initial_message)
        await db.commit()
        
        return {
            "message": "Support ticket created successfully",
            "ticket_id": ticket.id,
            "status": "open"
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create support ticket: {str(e)}"
        )

@router.get("/tickets")
async def get_support_tickets(
    current_admin: Admin = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = None,
    priority_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """Get all support tickets with filtering and pagination"""
    try:
        # Build query
        query = select(SupportTicket).options(
            selectinload(SupportTicket.assigned_admin),
            selectinload(SupportTicket.messages)
        )
        
        # Apply filters
        filters = []
        if status_filter:
            filters.append(SupportTicket.status == status_filter)
        if priority_filter:
            filters.append(SupportTicket.priority == priority_filter)
        if category_filter:
            filters.append(SupportTicket.category == category_filter)
        
        if filters:
            query = query.where(and_(*filters))
        
        # Order by created_at desc
        query = query.order_by(desc(SupportTicket.created_at))
        
        # Pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        
        result = await db.execute(query)
        tickets = result.scalars().all()
        
        # Get total count for pagination
        count_query = select(func.count(SupportTicket.id))
        if filters:
            count_query = count_query.where(and_(*filters))
        
        total_result = await db.execute(count_query)
        total_count = total_result.scalar()
        
        # Format response
        tickets_data = []
        for ticket in tickets:
            tickets_data.append({
                "id": ticket.id,
                "user_id": ticket.user_id,
                "user_email": ticket.user_email,
                "user_name": ticket.user_name,
                "subject": ticket.subject,
                "description": ticket.description,
                "category": ticket.category,
                "priority": ticket.priority,
                "status": ticket.status,
                "assigned_to": ticket.assigned_to,
                "admin_notes": ticket.admin_notes,
                "resolution": ticket.resolution,
                "created_at": ticket.created_at.isoformat(),
                "updated_at": ticket.updated_at.isoformat(),
                "resolved_at": ticket.resolved_at.isoformat() if ticket.resolved_at else None,
                "assigned_admin_name": ticket.assigned_admin.name if ticket.assigned_admin else None,
                "message_count": len(ticket.messages)
            })
        
        return {
            "tickets": tickets_data,
            "total": total_count,
            "page": page,
            "limit": limit,
            "total_pages": (total_count + limit - 1) // limit
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch support tickets: {str(e)}"
        )

@router.get("/tickets/{ticket_id}")
async def get_support_ticket(
    ticket_id: int,
    current_admin: Admin = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific support ticket with messages"""
    try:
        result = await db.execute(
            select(SupportTicket)
            .options(
                selectinload(SupportTicket.assigned_admin),
                selectinload(SupportTicket.messages)
            )
            .where(SupportTicket.id == ticket_id)
        )
        ticket = result.scalar_one_or_none()
        
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Support ticket not found"
            )
        
        # Format messages
        messages_data = []
        for message in ticket.messages:
            messages_data.append({
                "id": message.id,
                "ticket_id": message.ticket_id,
                "sender_type": message.sender_type,
                "sender_name": message.sender_name,
                "sender_email": message.sender_email,
                "message": message.message,
                "is_internal": message.is_internal,
                "created_at": message.created_at.isoformat()
            })
        
        return {
            "ticket": {
                "id": ticket.id,
                "user_id": ticket.user_id,
                "user_email": ticket.user_email,
                "user_name": ticket.user_name,
                "subject": ticket.subject,
                "description": ticket.description,
                "category": ticket.category,
                "priority": ticket.priority,
                "status": ticket.status,
                "assigned_to": ticket.assigned_to,
                "admin_notes": ticket.admin_notes,
                "resolution": ticket.resolution,
                "created_at": ticket.created_at.isoformat(),
                "updated_at": ticket.updated_at.isoformat(),
                "resolved_at": ticket.resolved_at.isoformat() if ticket.resolved_at else None,
                "assigned_admin_name": ticket.assigned_admin.name if ticket.assigned_admin else None
            },
            "messages": messages_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch support ticket: {str(e)}"
        )

@router.put("/tickets/{ticket_id}")
async def update_support_ticket(
    ticket_id: int,
    request: UpdateTicketRequest,
    current_admin: Admin = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a support ticket"""
    try:
        result = await db.execute(
            select(SupportTicket).where(SupportTicket.id == ticket_id)
        )
        ticket = result.scalar_one_or_none()
        
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Support ticket not found"
            )
        
        # Update fields
        if request.status is not None:
            ticket.status = request.status
            if request.status == 'resolved' and not ticket.resolved_at:
                ticket.resolved_at = datetime.utcnow()
        
        if request.priority is not None:
            ticket.priority = request.priority
        
        if request.assigned_to is not None:
            ticket.assigned_to = request.assigned_to
        
        if request.admin_notes is not None:
            ticket.admin_notes = request.admin_notes
        
        if request.resolution is not None:
            ticket.resolution = request.resolution
        
        await db.commit()
        
        return {"message": "Support ticket updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update support ticket: {str(e)}"
        )

@router.post("/tickets/{ticket_id}/messages")
async def add_ticket_message(
    ticket_id: int,
    request: AddMessageRequest,
    current_admin: Admin = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a message to a support ticket"""
    try:
        # Check if ticket exists
        result = await db.execute(
            select(SupportTicket).where(SupportTicket.id == ticket_id)
        )
        ticket = result.scalar_one_or_none()
        
        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Support ticket not found"
            )
        
        # Create message
        message = SupportMessage(
            ticket_id=ticket_id,
            sender_type='admin',
            sender_id=current_admin.id,
            sender_name=current_admin.name,
            sender_email=current_admin.email,
            message=request.message,
            is_internal=request.is_internal
        )
        
        db.add(message)
        
        # Update ticket status if it was open
        if ticket.status == 'open':
            ticket.status = 'in_progress'
        
        await db.commit()
        
        return {"message": "Message added successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add message: {str(e)}"
        )

@router.get("/tickets/stats")
async def get_support_stats(
    current_admin: Admin = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get support ticket statistics"""
    try:
        # Total tickets
        total_result = await db.execute(select(func.count(SupportTicket.id)))
        total_tickets = total_result.scalar()
        
        # Open tickets
        open_result = await db.execute(
            select(func.count(SupportTicket.id)).where(SupportTicket.status == 'open')
        )
        open_tickets = open_result.scalar()
        
        # In progress tickets
        in_progress_result = await db.execute(
            select(func.count(SupportTicket.id)).where(SupportTicket.status == 'in_progress')
        )
        in_progress_tickets = in_progress_result.scalar()
        
        # Resolved tickets
        resolved_result = await db.execute(
            select(func.count(SupportTicket.id)).where(SupportTicket.status == 'resolved')
        )
        resolved_tickets = resolved_result.scalar()
        
        # High priority tickets
        high_priority_result = await db.execute(
            select(func.count(SupportTicket.id)).where(SupportTicket.priority == 'high')
        )
        high_priority_tickets = high_priority_result.scalar()
        
        # Urgent tickets
        urgent_result = await db.execute(
            select(func.count(SupportTicket.id)).where(SupportTicket.priority == 'urgent')
        )
        urgent_tickets = urgent_result.scalar()
        
        # Tickets by category
        category_result = await db.execute(
            select(SupportTicket.category, func.count(SupportTicket.id))
            .group_by(SupportTicket.category)
        )
        tickets_by_category = {row[0]: row[1] for row in category_result.fetchall()}
        
        return {
            "total_tickets": total_tickets,
            "open_tickets": open_tickets,
            "in_progress_tickets": in_progress_tickets,
            "resolved_tickets": resolved_tickets,
            "high_priority_tickets": high_priority_tickets,
            "urgent_tickets": urgent_tickets,
            "tickets_by_category": tickets_by_category
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch support stats: {str(e)}"
        )
