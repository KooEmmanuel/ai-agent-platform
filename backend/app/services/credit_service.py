from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from typing import Optional, Dict, Any
from app.core.database import User, UserCredits, CreditTransaction, Agent, Conversation
from app.core.config import settings

class CreditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def initialize_user_credits(self, user_id: int) -> UserCredits:
        """Initialize user with 1000 free credits"""
        # Check if user already has credits
        existing_credits = await self.db.execute(
            select(UserCredits).where(UserCredits.user_id == user_id)
        )
        existing_credits = existing_credits.scalar_one_or_none()
        
        if existing_credits:
            return existing_credits
        
        # Create new credit record
        user_credits = UserCredits(
            user_id=user_id,
            total_credits=1000.0,
            used_credits=0.0,
            available_credits=1000.0
        )
        
        self.db.add(user_credits)
        await self.db.commit()
        await self.db.refresh(user_credits)
        
        # Create initial bonus transaction
        bonus_transaction = CreditTransaction(
            user_id=user_id,
            transaction_type="bonus",
            amount=1000.0,
            description="Welcome bonus - 1000 free credits"
        )
        
        self.db.add(bonus_transaction)
        await self.db.commit()
        
        return user_credits

    async def get_user_credits(self, user_id: int) -> Optional[UserCredits]:
        """Get user's current credit balance"""
        result = await self.db.execute(
            select(UserCredits).where(UserCredits.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def deduct_credits(
        self, 
        user_id: int, 
        amount: float, 
        description: str,
        agent_id: Optional[int] = None,
        conversation_id: Optional[int] = None,
        tool_used: Optional[str] = None,
        meta_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Deduct credits from user account"""
        user_credits = await self.get_user_credits(user_id)
        
        if not user_credits:
            # Initialize credits if not exists
            user_credits = await self.initialize_user_credits(user_id)
        
        if user_credits.available_credits < amount:
            return False  # Insufficient credits
        
        # Update credit balance
        user_credits.used_credits += amount
        user_credits.available_credits -= amount
        
        # Create transaction record
        transaction = CreditTransaction(
            user_id=user_id,
            transaction_type="usage",
            amount=-amount,  # Negative for usage
            description=description,
            agent_id=agent_id,
            conversation_id=conversation_id,
            tool_used=tool_used,
            meta_data=meta_data
        )
        
        self.db.add(transaction)
        await self.db.commit()
        await self.db.refresh(user_credits)
        
        return True

    async def add_credits(
        self, 
        user_id: int, 
        amount: float, 
        description: str,
        transaction_type: str = "purchase",
        meta_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Add credits to user account"""
        user_credits = await self.get_user_credits(user_id)
        
        if not user_credits:
            # Initialize credits if not exists
            user_credits = await self.initialize_user_credits(user_id)
        
        # Update credit balance
        user_credits.total_credits += amount
        user_credits.available_credits += amount
        
        # Create transaction record
        transaction = CreditTransaction(
            user_id=user_id,
            transaction_type=transaction_type,
            amount=amount,  # Positive for addition
            description=description,
            meta_data=meta_data
        )
        
        self.db.add(transaction)
        await self.db.commit()
        await self.db.refresh(user_credits)
        
        return True

    async def get_credit_transactions(
        self, 
        user_id: int, 
        limit: int = 50, 
        offset: int = 0
    ) -> list[CreditTransaction]:
        """Get user's credit transaction history"""
        result = await self.db.execute(
            select(CreditTransaction)
            .where(CreditTransaction.user_id == user_id)
            .order_by(CreditTransaction.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()

    async def calculate_usage_cost(
        self, 
        tool_name: str, 
        input_tokens: int = 0, 
        output_tokens: int = 0,
        api_calls: int = 1
    ) -> float:
        """Calculate credit cost for tool usage"""
        # Define credit costs for different tools
        tool_costs = {
            "web_search": 5.0,  # 5 credits per search
            "job_search": 10.0,  # 10 credits per job search
            "reminder_set": 2.0,  # 2 credits per reminder
            "schedule_event": 3.0,  # 3 credits per event
            "openai_chat": 0.1,  # 0.1 credits per token (input + output)
            "file_upload": 5.0,  # 5 credits per file upload
            "image_generation": 20.0,  # 20 credits per image
            "code_execution": 15.0,  # 15 credits per code execution
        }
        
        base_cost = tool_costs.get(tool_name, 1.0)  # Default 1 credit
        
        if tool_name == "openai_chat":
            # Calculate based on tokens
            total_tokens = input_tokens + output_tokens
            return base_cost * total_tokens
        else:
            # Fixed cost per API call
            return base_cost * api_calls

    async def check_credit_balance(self, user_id: int, required_amount: float) -> bool:
        """Check if user has sufficient credits"""
        user_credits = await self.get_user_credits(user_id)
        if not user_credits:
            return False
        return user_credits.available_credits >= required_amount

    async def get_usage_summary(self, user_id: int) -> Dict[str, Any]:
        """Get user's credit usage summary"""
        user_credits = await self.get_user_credits(user_id)
        if not user_credits:
            return {
                "total_credits": 0,
                "used_credits": 0,
                "available_credits": 0,
                "usage_percentage": 0
            }
        
        usage_percentage = (user_credits.used_credits / user_credits.total_credits) * 100
        
        return {
            "total_credits": user_credits.total_credits,
            "used_credits": user_credits.used_credits,
            "available_credits": user_credits.available_credits,
            "usage_percentage": round(usage_percentage, 2)
        } 