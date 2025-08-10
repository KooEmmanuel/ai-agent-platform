"""
User management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.core.auth import get_current_user
from app.core.database import get_db, User

router = APIRouter()

# Pydantic models
class UserUpdate(BaseModel):
    name: Optional[str] = None
    picture: Optional[str] = None

class UserProfile(BaseModel):
    id: int
    email: str
    name: str
    picture: Optional[str]
    is_verified: bool
    created_at: str

@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user profile"""
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        picture=current_user.picture,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at.isoformat()
    )

@router.put("/me", response_model=UserProfile)
async def update_current_user_profile(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile"""
    if user_data.name is not None:
        current_user.name = user_data.name
    if user_data.picture is not None:
        current_user.picture = user_data.picture
    
    await db.commit()
    await db.refresh(current_user)
    
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        picture=current_user.picture,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at.isoformat()
    )

@router.delete("/me")
async def delete_current_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete current user account"""
    await db.delete(current_user)
    await db.commit()
    
    return {"message": "User account deleted successfully"} 