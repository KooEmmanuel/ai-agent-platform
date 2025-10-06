"""
Authentication endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext

from app.core.database import get_db, User
from app.core.firebase import verify_firebase_token
from app.core.auth import get_current_user
from app.services.credit_service import CreditService
from app.core.config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter()

# Pydantic models
class FirebaseAuthRequest(BaseModel):
    id_token: str

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str

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

# Helper functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

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

@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user with email and password"""
    try:
        # Find user by email - handle case where hashed_password column doesn't exist yet
        try:
            result = await db.execute(
                select(User).where(User.email == request.email)
            )
            user = result.scalar_one_or_none()
        except Exception as db_error:
            # If database error due to missing column, check if user exists with basic query
            if "hashed_password" in str(db_error):
                # Try to find user without the hashed_password field
                result = await db.execute(
                    select(User.id, User.email, User.name, User.picture, User.is_verified, User.created_at, User.updated_at)
                    .where(User.email == request.email)
                )
                user_data = result.first()
                if user_data:
                    # User exists but is likely a Google-only user
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="This account was created with Google sign-in. Please use Google sign-in to access your account."
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="User not found. Please check your email or create a new account."
                    )
            else:
                raise db_error
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found. Please check your email or create a new account."
            )
        
        # Check if user has a password (not Firebase-only user)
        if not hasattr(user, 'hashed_password') or not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This account was created with Google sign-in. Please use Google sign-in to access your account."
            )
        
        # Verify password
        if not verify_password(request.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
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
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.post("/forgot-password")
async def forgot_password(request: dict, db: AsyncSession = Depends(get_db)):
    """Send password reset email"""
    email = request.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required"
        )
    
    # Check if user exists
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        # Don't reveal if user exists or not for security
        return {"message": "If an account with that email exists, a password reset link has been sent."}
    
    # Generate reset token (in production, use a proper JWT or random token)
    import secrets
    reset_token = secrets.token_urlsafe(32)
    
    # Store reset token in user record (you might want a separate table for this)
    # For now, we'll use a simple approach
    user.reset_token = reset_token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)  # 1 hour expiry
    await db.commit()
    
    # In production, send actual email here
    # For now, we'll just return success
    reset_url = f"{settings.FRONTEND_URL}/auth/reset-password?token={reset_token}"
    
    # TODO: Send actual email with reset_url
    print(f"Password reset link for {email}: {reset_url}")
    
    return {"message": "If an account with that email exists, a password reset link has been sent."}

@router.post("/validate-reset-token")
async def validate_reset_token(request: dict, db: AsyncSession = Depends(get_db)):
    """Validate password reset token"""
    token = request.get("token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token is required"
        )
    
    # Check if token exists and is not expired
    result = await db.execute(
        select(User).where(
            and_(
                User.reset_token == token,
                User.reset_token_expires > datetime.utcnow()
            )
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    return {"message": "Token is valid"}

@router.post("/reset-password")
async def reset_password(request: dict, db: AsyncSession = Depends(get_db)):
    """Reset user password"""
    token = request.get("token")
    new_password = request.get("new_password")
    
    if not token or not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token and new password are required"
        )
    
    # Validate token
    result = await db.execute(
        select(User).where(
            and_(
                User.reset_token == token,
                User.reset_token_expires > datetime.utcnow()
            )
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Update password
    user.hashed_password = get_password_hash(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    await db.commit()
    
    return {"message": "Password has been reset successfully"}

@router.post("/register", response_model=AuthResponse)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user with email and password"""
    try:
        # Check if user already exists - handle missing column gracefully
        try:
            result = await db.execute(
                select(User).where(User.email == request.email)
            )
            existing_user = result.scalar_one_or_none()
        except Exception as db_error:
            if "hashed_password" in str(db_error):
                # Try to find user without the hashed_password field
                result = await db.execute(
                    select(User.id, User.email).where(User.email == request.email)
                )
                user_data = result.first()
                if user_data:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already registered. Please use Google sign-in or try a different email."
                    )
                # If no user found, we can proceed with registration
                existing_user = None
            else:
                raise db_error
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered. Please use Google sign-in or try a different email."
            )
        
        # Check if database has the hashed_password column
        try:
            # Try to create user with hashed_password
            hashed_password = get_password_hash(request.password)
            user = User(
                email=request.email,
                name=request.full_name,
                hashed_password=hashed_password,
                is_verified=False  # Email verification can be added later
            )
        except Exception as db_error:
            if "hashed_password" in str(db_error):
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Registration temporarily unavailable. Please use Google sign-in for now."
                )
            else:
                raise db_error
        
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
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        ) 