"""
Admin endpoints for user management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from sqlalchemy import delete
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta

from app.core.database import get_db, User, UserCredits, Agent, Integration, CreditTransaction, Admin, Conversation
from app.core.config import settings
from app.api.v1.endpoints.admin_auth import get_current_admin

router = APIRouter()

# Pydantic models
class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    picture: Optional[str] = None
    is_verified: bool
    created_at: str
    firebase_uid: Optional[str] = None
    hashed_password: Optional[str] = None
    credits: Optional[dict] = None
    subscription: Optional[dict] = None
    agents_count: int = 0
    integrations_count: int = 0

class AdminStats(BaseModel):
    total_users: int
    active_users: int
    total_credits_used: int
    total_agents: int
    total_integrations: int

class UserVerificationUpdate(BaseModel):
    is_verified: bool

# Helper function to check if user is admin
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

@router.get("/users", response_model=dict)
async def get_all_users(
    current_admin: Admin = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all users with their details"""
    try:
        # Get all users with their credits
        result = await db.execute(
            select(User)
            .options(selectinload(User.credits))
            .order_by(User.created_at.desc())
        )
        users = result.scalars().all()
        
        user_responses = []
        for user in users:
            # Get agents count
            agents_result = await db.execute(
                select(func.count(Agent.id)).where(Agent.user_id == user.id)
            )
            agents_count = agents_result.scalar() or 0
            
            # Get integrations count
            integrations_result = await db.execute(
                select(func.count(Integration.id)).where(Integration.user_id == user.id)
            )
            integrations_count = integrations_result.scalar() or 0
            
            user_data = {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "picture": user.picture,
                "is_verified": user.is_verified,
                "created_at": user.created_at.isoformat(),
                "firebase_uid": user.firebase_uid,
                "hashed_password": "***" if user.hashed_password else None,
                "agents_count": agents_count,
                "integrations_count": integrations_count
            }
            
            # Add credits info if available
            if user.credits:
                user_data["credits"] = {
                    "total_credits": float(user.credits.total_credits),
                    "used_credits": float(user.credits.used_credits),
                    "available_credits": float(user.credits.available_credits)
                }
            
            user_responses.append(user_data)
        
        return {"users": user_responses}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch users: {str(e)}"
        )

@router.get("/agents", response_model=dict)
async def get_all_agents(
    current_admin: Admin = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all agents with user information"""
    try:
        # Query agents with user information
        result = await db.execute(
            select(Agent, User)
            .join(User, Agent.user_id == User.id)
            .options(selectinload(Agent.user))
        )
        agents_with_users = result.all()
        
        agents_data = []
        for agent, user in agents_with_users:
            # Get conversation count for this agent
            conv_result = await db.execute(
                select(func.count(Conversation.id))
                .where(Conversation.agent_id == agent.id)
            )
            conversation_count = conv_result.scalar() or 0
            
            # Get credits used for this agent
            credits_result = await db.execute(
                select(func.sum(CreditTransaction.amount))
                .where(CreditTransaction.user_id == agent.user_id)
                .where(CreditTransaction.amount < 0)  # Negative amounts are usage
            )
            credits_used = abs(credits_result.scalar() or 0)
            
            agents_data.append({
                "id": agent.id,
                "name": agent.name,
                "description": agent.description or "AI assistant",
                "is_active": agent.is_active,
                "user_id": agent.user_id,
                "user_name": user.name or user.email,
                "user_email": user.email,
                "conversations_count": conversation_count,
                "credits_used": credits_used,
                "last_active": agent.updated_at.isoformat() if agent.updated_at else agent.created_at.isoformat(),
                "created_at": agent.created_at.isoformat()
            })
        
        return {"agents": agents_data}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch agents: {str(e)}"
        )

@router.get("/system-info", response_model=dict)
async def get_system_info(
    current_admin: Admin = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get real system information"""
    try:
        # Get database connection status
        await db.execute(select(1))  # Simple query to test connection
        db_status = "Connected"
        db_healthy = True
    except Exception:
        db_status = "Disconnected"
        db_healthy = False
    
    # Get total users count
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0
    
    # Get total agents count
    total_agents_result = await db.execute(select(func.count(Agent.id)))
    total_agents = total_agents_result.scalar() or 0
    
    # Get total integrations count
    total_integrations_result = await db.execute(select(func.count(Integration.id)))
    total_integrations = total_integrations_result.scalar() or 0
    
    return {
        "database": {
            "status": db_status,
            "healthy": db_healthy,
            "type": "PostgreSQL"
        },
        "platform": {
            "total_users": total_users,
            "total_agents": total_agents,
            "total_integrations": total_integrations
        }
    }

@router.get("/billing", response_model=dict)
async def get_billing_data(
    current_admin: Admin = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get real billing data including user plans"""
    try:
        # Get all users with their subscription plans
        users_result = await db.execute(
            select(User, UserCredits)
            .join(UserCredits, User.id == UserCredits.user_id)
        )
        users_with_credits = users_result.all()
        
        # Calculate billing metrics
        total_users = len(users_with_credits)
        paying_customers = 0
        total_revenue = 0
        user_plans = []
        
        for user, credits in users_with_credits:
            # Determine plan based on credits
            if credits.total_credits >= 50000:
                plan = "Pro"
                plan_price = 99
                paying_customers += 1
                total_revenue += plan_price
            elif credits.total_credits >= 10000:
                plan = "Starter"
                plan_price = 29
                paying_customers += 1
                total_revenue += plan_price
            else:
                plan = "Free"
                plan_price = 0
            
            user_plans.append({
                "user_id": user.id,
                "user_name": user.name or user.email,
                "user_email": user.email,
                "plan": plan,
                "plan_price": plan_price,
                "total_credits": credits.total_credits,
                "used_credits": credits.used_credits,
                "remaining_credits": credits.total_credits - credits.used_credits,
                "created_at": user.created_at.isoformat()
            })
        
        # Calculate growth rate (mock for now - would need historical data)
        growth_rate = 18.2
        
        return {
            "monthly_revenue": total_revenue,
            "paying_customers": paying_customers,
            "total_users": total_users,
            "growth_rate": growth_rate,
            "avg_revenue_per_user": total_revenue / max(paying_customers, 1),
            "user_plans": user_plans
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch billing data: {str(e)}"
        )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_admin: Admin = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a user and handle Google Auth cleanup"""
    try:
        # Get the user first
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # If user has Firebase UID, we should disable them in Firebase
        # Note: In production, you'd want to call Firebase Admin SDK to disable the user
        if user.firebase_uid:
            # TODO: Implement Firebase user deletion/disable
            # For now, we'll just log it
            print(f"User {user.email} has Firebase UID {user.firebase_uid} - should be disabled in Firebase")
        
        # Delete user's related data first (to avoid foreign key constraints)
        # Delete user's agents
        await db.execute(delete(Agent).where(Agent.user_id == user_id))
        
        # Delete user's integrations
        await db.execute(delete(Integration).where(Integration.user_id == user_id))
        
        # Delete user's conversations
        await db.execute(delete(Conversation).where(Conversation.user_id == user_id))
        
        # Delete user's credit transactions
        await db.execute(delete(CreditTransaction).where(CreditTransaction.user_id == user_id))
        
        # Delete user's credits
        await db.execute(delete(UserCredits).where(UserCredits.user_id == user_id))
        
        # Finally delete the user
        await db.execute(delete(User).where(User.id == user_id))
        await db.commit()
        
        return {"message": f"User {user.email} deleted successfully"}
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )

@router.put("/users/{user_id}/toggle-status")
async def toggle_user_status(
    user_id: int,
    current_admin: Admin = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Toggle user active status"""
    try:
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Toggle the user's verification status (we'll use is_verified as active status)
        user.is_verified = not user.is_verified
        await db.commit()
        
        status_text = "activated" if user.is_verified else "deactivated"
        return {"message": f"User {user.email} {status_text} successfully"}
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle user status: {str(e)}"
        )

@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    current_admin: Admin = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get admin dashboard statistics"""
    try:
        # Total users
        total_users_result = await db.execute(select(func.count(User.id)))
        total_users = total_users_result.scalar() or 0
        
        # Active users (verified)
        active_users_result = await db.execute(
            select(func.count(User.id)).where(User.is_verified == True)
        )
        active_users = active_users_result.scalar() or 0
        
        # Total credits used
        credits_result = await db.execute(
            select(func.sum(UserCredits.used_credits))
        )
        total_credits_used = float(credits_result.scalar() or 0)
        
        # Total agents
        agents_result = await db.execute(select(func.count(Agent.id)))
        total_agents = agents_result.scalar() or 0
        
        # Total integrations
        integrations_result = await db.execute(select(func.count(Integration.id)))
        total_integrations = integrations_result.scalar() or 0
        
        return AdminStats(
            total_users=total_users,
            active_users=active_users,
            total_credits_used=total_credits_used,
            total_agents=total_agents,
            total_integrations=total_integrations
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch stats: {str(e)}"
        )

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user_details(
    user_id: int,
    current_admin: Admin = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed information about a specific user"""
    try:
        result = await db.execute(
            select(User)
            .options(selectinload(User.credits))
            .where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get agents count
        agents_result = await db.execute(
            select(func.count(Agent.id)).where(Agent.user_id == user.id)
        )
        agents_count = agents_result.scalar() or 0
        
        # Get integrations count
        integrations_result = await db.execute(
            select(func.count(Integration.id)).where(Integration.user_id == user.id)
        )
        integrations_count = integrations_result.scalar() or 0
        
        user_data = {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "picture": user.picture,
            "is_verified": user.is_verified,
            "created_at": user.created_at.isoformat(),
            "firebase_uid": user.firebase_uid,
            "hashed_password": "***" if user.hashed_password else None,
            "agents_count": agents_count,
            "integrations_count": integrations_count
        }
        
        # Add credits info if available
        if user.credits:
            user_data["credits"] = {
                "total_credits": float(user.credits.total_credits),
                "used_credits": float(user.credits.used_credits),
                "available_credits": float(user.credits.available_credits)
            }
        
        return user_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user details: {str(e)}"
        )

@router.patch("/users/{user_id}/verify")
async def update_user_verification(
    user_id: int,
    verification_data: UserVerificationUpdate,
    current_admin: Admin = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user verification status"""
    try:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.is_verified = verification_data.is_verified
        await db.commit()
        
        return {"message": f"User verification status updated to {verification_data.is_verified}"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user verification: {str(e)}"
        )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_admin: Admin = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a user and all related data"""
    try:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent deleting the current admin user
        if user.id == current_admin.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )
        
        # Delete user and all related data (cascade should handle this)
        await db.delete(user)
        await db.commit()
        
        return {"message": "User and all related data deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )

@router.get("/users/{user_id}/activity")
async def get_user_activity(
    user_id: int,
    current_admin: Admin = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user activity and usage statistics"""
    try:
        # Check if user exists
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get recent credit transactions
        transactions_result = await db.execute(
            select(CreditTransaction)
            .where(CreditTransaction.user_id == user_id)
            .order_by(CreditTransaction.created_at.desc())
            .limit(10)
        )
        transactions = transactions_result.scalars().all()
        
        # Get agents created in last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_agents_result = await db.execute(
            select(func.count(Agent.id))
            .where(and_(Agent.user_id == user_id, Agent.created_at >= thirty_days_ago))
        )
        recent_agents = recent_agents_result.scalar() or 0
        
        # Get integrations created in last 30 days
        recent_integrations_result = await db.execute(
            select(func.count(Integration.id))
            .where(and_(Integration.user_id == user_id, Integration.created_at >= thirty_days_ago))
        )
        recent_integrations = recent_integrations_result.scalar() or 0
        
        return {
            "user_id": user_id,
            "recent_agents": recent_agents,
            "recent_integrations": recent_integrations,
            "recent_transactions": [
                {
                    "id": t.id,
                    "type": t.transaction_type,
                    "amount": float(t.amount),
                    "description": t.description,
                    "created_at": t.created_at.isoformat()
                }
                for t in transactions
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user activity: {str(e)}"
        )

class CreateUserRequest(BaseModel):
    name: str
    email: str
    password: str
    is_verified: bool = True

@router.post("/users", response_model=dict)
async def create_user(
    request: CreateUserRequest,
    current_admin: Admin = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new user"""
    try:
        # Check if user already exists
        existing_user_result = await db.execute(select(User).where(User.email == request.email))
        existing_user = existing_user_result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Hash the password
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed_password = pwd_context.hash(request.password)
        
        # Create new user
        new_user = User(
            email=request.email,
            name=request.name,
            hashed_password=hashed_password,
            is_verified=request.is_verified,
            firebase_uid=None  # This is a manually created user, not Google auth
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        # Create user credits record
        from app.core.database import UserCredits
        user_credits = UserCredits(
            user_id=new_user.id,
            total_credits=1000,  # Default credits for new users
            used_credits=0
        )
        
        db.add(user_credits)
        await db.commit()
        
        return {
            "message": f"User {new_user.email} created successfully",
            "user_id": new_user.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )
