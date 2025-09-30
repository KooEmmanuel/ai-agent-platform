from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.database import User
from app.services.credit_manager import CreditManager

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

class CreditEstimateRequest(BaseModel):
    operation_type: str  # "agent_conversation", "tool_execution", "integration_message"
    tool_name: Optional[str] = None
    expected_tokens: Optional[int] = 0
    is_custom_tool: Optional[bool] = False

class CreditEstimateResponse(BaseModel):
    estimated_cost: float
    base_cost: float
    tool_cost: float
    operation: str
    has_sufficient_credits: bool

@router.get("/balance", response_model=CreditBalanceResponse)
async def get_credit_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's current credit balance"""
    credit_manager = CreditManager(db)
    balance = await credit_manager.get_usage_summary(current_user.id)
    return CreditBalanceResponse(**balance)

@router.get("/transactions", response_model=List[CreditTransactionResponse])
async def get_credit_transactions(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's credit transaction history"""
    credit_manager = CreditManager(db)
    transactions = await credit_manager.get_credit_transactions(
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
    credit_manager = CreditManager(db)
    
    cost = await credit_manager.calculate_usage_cost(
        request.tool_name,
        request.input_tokens,
        request.output_tokens,
        request.api_calls
    )
    
    credit_check = await credit_manager.check_credit_balance(
        current_user.id, cost
    )
    has_sufficient_credits = credit_check['has_sufficient_credits']
    
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
    credit_manager = CreditManager(db)
    
    credit_result = await credit_manager.consume_credits(
        current_user.id,
        amount,
        description,
        agent_id,
        conversation_id,
        tool_used
    )
    success = credit_result['success']
    
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
    credit_manager = CreditManager(db)
    user_credits = await credit_manager.initialize_user_credits(current_user.id)
    
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
    credit_manager = CreditManager(db)
    summary = await credit_manager.get_usage_summary(current_user.id)
    
    # Get recent transactions
    recent_transactions = await credit_manager.get_credit_transactions(
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

@router.post("/estimate", response_model=CreditEstimateResponse)
async def estimate_operation_cost(
    request: CreditEstimateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Estimate credit cost for an operation before execution"""
    credit_manager = CreditManager(db)
    
    estimate = await credit_manager.estimate_operation_cost(
        operation_type=request.operation_type,
        tool_name=request.tool_name,
        expected_tokens=request.expected_tokens,
        is_custom_tool=request.is_custom_tool
    )
    
    # Check if user has sufficient credits
    credit_check = await credit_manager.check_credit_balance(
        current_user.id, estimate['estimated_cost']
    )
    
    return CreditEstimateResponse(
        estimated_cost=estimate['estimated_cost'],
        base_cost=estimate['base_cost'],
        tool_cost=estimate['tool_cost'],
        operation=estimate['operation'],
        has_sufficient_credits=credit_check['has_sufficient_credits']
    ) 