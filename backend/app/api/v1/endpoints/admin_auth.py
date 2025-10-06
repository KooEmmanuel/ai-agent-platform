"""
Admin Authentication endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext

from app.core.database import get_db, Admin
from app.core.config import settings

router = APIRouter()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydantic models
class AdminLoginRequest(BaseModel):
    email: str
    password: str

class AdminAuthResponse(BaseModel):
    access_token: str
    token_type: str
    admin: dict

# Helper functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def create_admin_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT token for admin authentication"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=8)  # Admin tokens last 8 hours
    
    to_encode.update({"exp": expire, "type": "admin"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_admin(credentials: str, db: AsyncSession) -> Admin:
    """Get current admin from JWT token"""
    try:
        # Decode JWT token
        payload = jwt.decode(credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        # Check if it's an admin token
        if payload.get("type") != "admin":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid admin token"
            )
        
        admin_id = payload.get("sub")
        if admin_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid admin token"
            )
        
        # Get admin from database
        result = await db.execute(select(Admin).where(Admin.id == int(admin_id)))
        admin = result.scalar_one_or_none()
        
        if admin is None or not admin.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Admin not found or inactive"
            )
        
        return admin
        
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin token"
        )

@router.post("/login", response_model=AdminAuthResponse)
async def admin_login(
    request: AdminLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Admin login endpoint"""
    try:
        # Find admin by email
        result = await db.execute(
            select(Admin).where(Admin.email == request.email)
        )
        admin = result.scalar_one_or_none()
        
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        if not admin.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Admin account is inactive"
            )
        
        # Verify password
        if not verify_password(request.password, admin.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Update last login
        admin.last_login = datetime.utcnow()
        await db.commit()
        
        # Create JWT token
        access_token_expires = timedelta(hours=8)
        access_token = create_admin_access_token(
            data={"sub": str(admin.id)}, expires_delta=access_token_expires
        )
        
        return AdminAuthResponse(
            access_token=access_token,
            token_type="bearer",
            admin={
                "id": admin.id,
                "email": admin.email,
                "name": admin.name,
                "is_super_admin": admin.is_super_admin,
                "is_active": admin.is_active,
                "last_login": admin.last_login.isoformat() if admin.last_login else None,
                "created_at": admin.created_at.isoformat()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Admin login failed: {str(e)}"
        )

@router.get("/me")
async def get_admin_info(
    credentials: str = Depends(lambda: None),  # Will be set by middleware
    db: AsyncSession = Depends(get_db)
):
    """Get current admin information"""
    # This will be handled by middleware that extracts the token
    pass

@router.post("/logout")
async def admin_logout():
    """Admin logout endpoint"""
    return {"message": "Admin logged out successfully"}

@router.get("/test")
async def test_admin_auth():
    """Test endpoint to check if admin auth is working"""
    return {"message": "Admin auth endpoint is working", "status": "ok"}
