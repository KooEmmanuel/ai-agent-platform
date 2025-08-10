"""
Authentication endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import jwt

from app.core.database import get_db, User
from app.core.firebase import verify_firebase_token
from app.core.auth import get_current_user
from app.services.credit_service import CreditService
from app.core.config import settings

router = APIRouter()

# Pydantic models
class FirebaseAuthRequest(BaseModel):
    id_token: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

@router.post("/firebase", response_model=AuthResponse)
async def firebase_auth(
    request: FirebaseAuthRequest,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user with Firebase ID token"""
    try:
        # Verify Firebase token
        user_info = verify_firebase_token(request.id_token)
        
        # Check if user exists in database
        result = await db.execute(
            select(User).where(User.firebase_uid == user_info["uid"])
        )
        user = result.scalar_one_or_none()
        
        if not user:
            # Create new user
            user = User(
                firebase_uid=user_info["uid"],
                email=user_info["email"],
                name=user_info["name"],
                picture=user_info["picture"],
                is_verified=user_info["email_verified"]
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            
            # Initialize user credits
            credit_service = CreditService(db)
            await credit_service.initialize_user_credits(user.id)
        
        # Create JWT token
        access_token_expires = timedelta(hours=24)
        access_token = create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )
        
        return AuthResponse(
            access_token=access_token,
            token_type="bearer",
            user={
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "picture": user.picture,
                "is_verified": user.is_verified,
                "created_at": user.created_at.isoformat()
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

@router.get("/me", response_model=dict)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "picture": current_user.picture,
        "is_verified": current_user.is_verified,
        "created_at": current_user.created_at.isoformat()
    }

@router.get("/test")
async def test_auth():
    """Test endpoint to check if authentication is working"""
    return {"message": "Auth endpoint is working", "status": "ok"}

@router.get("/debug")
async def debug_auth(
    current_user: User = Depends(get_current_user)
):
    """Debug endpoint to check current user"""
    return {
        "message": "Authentication successful",
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.name,
            "is_verified": current_user.is_verified
        }
    } 