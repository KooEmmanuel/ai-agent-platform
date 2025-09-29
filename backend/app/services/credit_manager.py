"""
Unified Credit Management Service
Consolidates credit operations from CreditService and BillingService
"""

from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import UserCredits, CreditTransaction, User, Agent, Conversation


class CreditRates:
    """Centralized credit consumption rates"""
    AGENT_MESSAGE = 2  # Per AI response
    TOOL_EXECUTION = 5  # Per marketplace tool use
    CUSTOM_TOOL_EXECUTION = 10  # Per custom tool use (higher cost)
    INTEGRATION_MESSAGE = 1  # Per integration message
    FILE_UPLOAD = 5  # Per file upload
    IMAGE_GENERATION = 20  # Per image generation
    CODE_EXECUTION = 15  # Per code execution


class CreditManager:
    """Unified credit management service"""
    
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

    async def check_credit_balance(self, user_id: int, required_amount: float) -> Dict[str, Any]:
        """Check if user has sufficient credits before operation"""
        user_credits = await self.get_user_credits(user_id)
        
        if not user_credits:
            # Initialize credits if not exists
            user_credits = await self.initialize_user_credits(user_id)
        
        has_sufficient = user_credits.available_credits >= required_amount
        
        return {
            'has_sufficient_credits': has_sufficient,
            'available_credits': user_credits.available_credits,
            'required_credits': required_amount,
            'deficit': max(0, required_amount - user_credits.available_credits)
        }

    async def consume_credits(
        self, 
        user_id: int, 
        amount: float, 
        description: str,
        agent_id: Optional[int] = None,
        conversation_id: Optional[int] = None,
        tool_used: Optional[str] = None,
        meta_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Consume credits with comprehensive error handling"""
        
        # Get user credits
        user_credits = await self.get_user_credits(user_id)
        if not user_credits:
            # Initialize credits if not exists
            user_credits = await self.initialize_user_credits(user_id)
        
        # Check if user has enough credits
        if user_credits.available_credits < amount:
            return {
                'success': False,
                'error': 'Insufficient credits',
                'credits_remaining': user_credits.available_credits,
                'credits_needed': amount,
                'deficit': amount - user_credits.available_credits
            }
        
        try:
            # Consume credits
            user_credits.used_credits += amount
            user_credits.available_credits -= amount
            user_credits.updated_at = datetime.utcnow()
            
            # Create transaction record
            transaction = CreditTransaction(
                user_id=user_id,
                transaction_type='usage',
                amount=-amount,  # Negative for usage
                description=description,
                agent_id=agent_id,
                conversation_id=conversation_id,
                tool_used=tool_used,
                meta_data={
                    'consumed_at': datetime.utcnow().isoformat(),
                    **(meta_data or {})
                }
            )
            
            self.db.add(transaction)
            await self.db.commit()
            await self.db.refresh(user_credits)
            
            return {
                'success': True,
                'credits_consumed': amount,
                'credits_remaining': user_credits.available_credits,
                'transaction_id': transaction.id
            }
            
        except Exception as e:
            await self.db.rollback()
            return {
                'success': False,
                'error': f'Credit consumption failed: {str(e)}',
                'credits_remaining': user_credits.available_credits
            }

    async def add_credits(
        self, 
        user_id: int, 
        amount: float, 
        description: str,
        transaction_type: str = 'purchase',
        meta_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Add credits to user account"""
        
        user_credits = await self.get_user_credits(user_id)
        if not user_credits:
            # Initialize credits if not exists
            user_credits = await self.initialize_user_credits(user_id)
        
        try:
            # Add credits
            user_credits.total_credits += amount
            user_credits.available_credits += amount
            user_credits.updated_at = datetime.utcnow()
            
            # Create transaction record
            transaction = CreditTransaction(
                user_id=user_id,
                transaction_type=transaction_type,
                amount=amount,  # Positive for addition
                description=description,
                meta_data={
                    'added_at': datetime.utcnow().isoformat(),
                    **(meta_data or {})
                }
            )
            
            self.db.add(transaction)
            await self.db.commit()
            await self.db.refresh(user_credits)
            
            return {
                'success': True,
                'credits_added': amount,
                'total_credits': user_credits.total_credits,
                'available_credits': user_credits.available_credits,
                'transaction_id': transaction.id
            }
            
        except Exception as e:
            await self.db.rollback()
            return {
                'success': False,
                'error': f'Credit addition failed: {str(e)}'
            }

    async def calculate_usage_cost(
        self, 
        tool_name: str, 
        input_tokens: int = 0, 
        output_tokens: int = 0,
        api_calls: int = 1,
        is_custom_tool: bool = False
    ) -> float:
        """Calculate credit cost for tool usage with unified rates"""
        
        # Base cost per tool type
        if tool_name == "openai_chat":
            # Calculate based on tokens
            total_tokens = input_tokens + output_tokens
            return CreditRates.AGENT_MESSAGE * (total_tokens / 1000)  # Scale by tokens
        elif tool_name in ["web_search", "job_search"]:
            return CreditRates.TOOL_EXECUTION * api_calls
        elif tool_name == "image_generation":
            return CreditRates.IMAGE_GENERATION * api_calls
        elif tool_name == "code_execution":
            return CreditRates.CODE_EXECUTION * api_calls
        elif tool_name == "file_upload":
            return CreditRates.FILE_UPLOAD * api_calls
        else:
            # Use custom tool rate if specified, otherwise default
            base_rate = CreditRates.CUSTOM_TOOL_EXECUTION if is_custom_tool else CreditRates.TOOL_EXECUTION
            return base_rate * api_calls

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
        
        usage_percentage = (user_credits.used_credits / user_credits.total_credits) * 100 if user_credits.total_credits > 0 else 0
        
        return {
            "total_credits": user_credits.total_credits,
            "used_credits": user_credits.used_credits,
            "available_credits": user_credits.available_credits,
            "usage_percentage": round(usage_percentage, 2)
        }

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

    async def estimate_operation_cost(
        self,
        operation_type: str,
        tool_name: Optional[str] = None,
        expected_tokens: int = 0,
        is_custom_tool: bool = False
    ) -> Dict[str, Any]:
        """Estimate credit cost for an operation before execution"""
        
        if operation_type == "agent_conversation":
            base_cost = CreditRates.AGENT_MESSAGE
            if tool_name:
                tool_cost = await self.calculate_usage_cost(tool_name, is_custom_tool=is_custom_tool)
                return {
                    'estimated_cost': base_cost + tool_cost,
                    'base_cost': base_cost,
                    'tool_cost': tool_cost,
                    'operation': 'agent_conversation'
                }
            return {
                'estimated_cost': base_cost,
                'base_cost': base_cost,
                'tool_cost': 0,
                'operation': 'agent_conversation'
            }
        
        elif operation_type == "tool_execution":
            tool_cost = await self.calculate_usage_cost(tool_name or "unknown", is_custom_tool=is_custom_tool)
            return {
                'estimated_cost': tool_cost,
                'base_cost': 0,
                'tool_cost': tool_cost,
                'operation': 'tool_execution'
            }
        
        elif operation_type == "integration_message":
            base_cost = CreditRates.INTEGRATION_MESSAGE
            if tool_name:
                tool_cost = await self.calculate_usage_cost(tool_name, is_custom_tool=is_custom_tool)
                return {
                    'estimated_cost': base_cost + tool_cost,
                    'base_cost': base_cost,
                    'tool_cost': tool_cost,
                    'operation': 'integration_message'
                }
            return {
                'estimated_cost': base_cost,
                'base_cost': base_cost,
                'tool_cost': 0,
                'operation': 'integration_message'
            }
        
        return {
            'estimated_cost': 0,
            'base_cost': 0,
            'tool_cost': 0,
            'operation': 'unknown'
        }