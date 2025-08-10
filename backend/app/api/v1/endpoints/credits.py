from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.database import User
from app.services.credit_service import CreditService

router = APIRouter()

class CreditBalanceResponse(BaseModel):
    total_credits: float
    used_credits: float
    available_credits: float
    usage_percentage: float

class CreditTransactionResponse(BaseModel):
    id: int
    transaction_type: str
    amount: float
    description: str
    tool_used: Optional[str] = None
    created_at: datetime

class UsageCostRequest(BaseModel):
    tool_name: str
    input_tokens: Optional[int] = 0
    output_tokens: Optional[int] = 0
    api_calls: Optional[int] = 1

class UsageCostResponse(BaseModel):
    tool_name: str
    cost: float
    has_sufficient_credits: bool

@router.get("/balance", response_model=CreditBalanceResponse)
async def get_credit_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's current credit balance"""
    credit_service = CreditService(db)
    balance = await credit_service.get_usage_summary(current_user.id)
    return CreditBalanceResponse(**balance)

@router.get("/transactions", response_model=List[CreditTransactionResponse])
async def get_credit_transactions(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's credit transaction history"""
    credit_service = CreditService(db)
    transactions = await credit_service.get_credit_transactions(
        current_user.id, limit, offset
    )
    
    return [
        CreditTransactionResponse(
            id=t.id,
            transaction_type=t.transaction_type,
            amount=t.amount,
            description=t.description,
            tool_used=t.tool_used,
            created_at=t.created_at
        )
        for t in transactions
    ]

@router.post("/calculate-cost", response_model=UsageCostResponse)
async def calculate_usage_cost(
    request: UsageCostRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Calculate cost for a specific tool usage"""
    credit_service = CreditService(db)
    
    cost = await credit_service.calculate_usage_cost(
        request.tool_name,
        request.input_tokens,
        request.output_tokens,
        request.api_calls
    )
    
    has_sufficient_credits = await credit_service.check_credit_balance(
        current_user.id, cost
    )
    
    return UsageCostResponse(
        tool_name=request.tool_name,
        cost=cost,
        has_sufficient_credits=has_sufficient_credits
    )

@router.post("/deduct")
async def deduct_credits(
    amount: float,
    description: str,
    agent_id: Optional[int] = None,
    conversation_id: Optional[int] = None,
    tool_used: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Deduct credits from user account (for internal use)"""
    credit_service = CreditService(db)
    
    success = await credit_service.deduct_credits(
        current_user.id,
        amount,
        description,
        agent_id,
        conversation_id,
        tool_used
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient credits"
        )
    
    return {"message": "Credits deducted successfully", "amount": amount}

@router.post("/initialize")
async def initialize_credits(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Initialize user with free credits (for new users)"""
    credit_service = CreditService(db)
    user_credits = await credit_service.initialize_user_credits(current_user.id)
    
    return {
        "message": "Credits initialized successfully",
        "total_credits": user_credits.total_credits,
        "available_credits": user_credits.available_credits
    }

@router.get("/usage-summary")
async def get_usage_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed usage summary"""
    credit_service = CreditService(db)
    summary = await credit_service.get_usage_summary(current_user.id)
    
    # Get recent transactions
    recent_transactions = await credit_service.get_credit_transactions(
        current_user.id, limit=10
    )
    
    return {
        "summary": summary,
        "recent_transactions": [
            {
                "type": t.transaction_type,
                "amount": t.amount,
                "description": t.description,
                "created_at": t.created_at.isoformat()
            }
            for t in recent_transactions
        ]
    } 