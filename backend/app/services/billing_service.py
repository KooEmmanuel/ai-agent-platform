"""
Billing and Subscription Service
Handles plan limitations, credit consumption, and subscription management
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload

from app.core.database import (
    User, UserCredits, CreditTransaction, UserSubscription, 
    SubscriptionPlan, BillingHistory, Agent, Tool
)


# Credit consumption rates
class CreditRates:
    AGENT_MESSAGE = 2  # Per AI response
    TOOL_EXECUTION = 5  # Per marketplace tool use
    CUSTOM_TOOL_EXECUTION = 10  # Per custom tool use (higher cost)
    INTEGRATION_MESSAGE = 1  # Per integration message


# Plan limits and features
PLAN_LIMITS = {
    'free': {
        'max_agents': 3,
        'max_custom_tools': 0,
        'monthly_credits': 1000,
        'support_level': 'community',
        'custom_branding': False,
        'api_access': False,
        'features': [
            'Up to 3 AI agents',
            'All marketplace tools',
            'Basic integrations',
            'Community support',
            '1,000 credits/month'
        ]
    },
    'starter': {
        'max_agents': 10,
        'max_custom_tools': 5,
        'monthly_credits': 10000,
        'support_level': 'email',
        'custom_branding': True,
        'api_access': False,
        'features': [
            'Up to 10 AI agents',
            'All marketplace tools',
            'Custom tool creation (5 tools)',
            'Remove branding',
            'Email support',
            '10,000 credits/month'
        ]
    },
    'pro': {
        'max_agents': -1,  # unlimited
        'max_custom_tools': -1,  # unlimited
        'monthly_credits': 50000,
        'support_level': 'priority',
        'custom_branding': True,
        'api_access': True,
        'features': [
            'Unlimited AI agents',
            'All marketplace tools',
            'Unlimited custom tools',
            'API access',
            'Priority support',
            'Advanced analytics',
            '50,000 credits/month'
        ]
    }
}


class BillingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_subscription(self, user_id: int) -> Optional[UserSubscription]:
        """Get user's current active subscription"""
        result = await self.db.execute(
            select(UserSubscription)
            .options(selectinload(UserSubscription.plan))
            .where(
                and_(
                    UserSubscription.user_id == user_id,
                    UserSubscription.status == 'active'
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_user_plan(self, user_id: int) -> str:
        """Get user's current plan name (defaults to 'free')"""
        subscription = await self.get_user_subscription(user_id)
        if subscription and subscription.plan:
            return subscription.plan.name
        return 'free'

    async def get_plan_limits(self, user_id: int) -> Dict[str, Any]:
        """Get current plan limits for user"""
        plan_name = await self.get_user_plan(user_id)
        return PLAN_LIMITS.get(plan_name, PLAN_LIMITS['free'])

    async def check_agent_limit(self, user_id: int) -> Dict[str, Any]:
        """Check if user can create more agents"""
        limits = await self.get_plan_limits(user_id)
        max_agents = limits['max_agents']
        
        # Count current agents
        result = await self.db.execute(
            select(func.count(Agent.id)).where(
                and_(Agent.user_id == user_id, Agent.is_active == True)
            )
        )
        current_agents = result.scalar() or 0
        
        can_create = max_agents == -1 or current_agents < max_agents
        
        return {
            'can_create': can_create,
            'current_count': current_agents,
            'max_allowed': max_agents,
            'limit_reached': not can_create
        }

    async def check_custom_tool_limit(self, user_id: int) -> Dict[str, Any]:
        """Check if user can create more custom tools"""
        limits = await self.get_plan_limits(user_id)
        max_tools = limits['max_custom_tools']
        
        # Count current custom tools
        result = await self.db.execute(
            select(func.count(Tool.id)).where(
                and_(
                    Tool.user_id == user_id,
                    Tool.is_active == True,
                    Tool.category == 'custom'  # Assuming custom tools have category 'custom'
                )
            )
        )
        current_tools = result.scalar() or 0
        
        can_create = max_tools == -1 or current_tools < max_tools
        
        return {
            'can_create': can_create,
            'current_count': current_tools,
            'max_allowed': max_tools,
            'limit_reached': not can_create
        }

    async def get_user_credits(self, user_id: int) -> Optional[UserCredits]:
        """Get user's current credit balance"""
        result = await self.db.execute(
            select(UserCredits).where(UserCredits.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def consume_credits(
        self, 
        user_id: int, 
        amount: float, 
        description: str,
        agent_id: Optional[int] = None,
        conversation_id: Optional[int] = None,
        tool_used: Optional[str] = None
    ) -> Dict[str, Any]:
        """Consume credits for user actions"""
        
        # Get user credits
        user_credits = await self.get_user_credits(user_id)
        if not user_credits:
            return {
                'success': False,
                'error': 'User credits not found',
                'credits_remaining': 0
            }
        
        # Check if user has enough credits
        if user_credits.available_credits < amount:
            return {
                'success': False,
                'error': 'Insufficient credits',
                'credits_remaining': user_credits.available_credits,
                'credits_needed': amount
            }
        
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
            meta_data={'consumed_at': datetime.utcnow().isoformat()}
        )
        
        self.db.add(transaction)
        await self.db.commit()
        
        return {
            'success': True,
            'credits_consumed': amount,
            'credits_remaining': user_credits.available_credits
        }

    async def add_credits(
        self, 
        user_id: int, 
        amount: float, 
        description: str,
        transaction_type: str = 'purchase'
    ) -> Dict[str, Any]:
        """Add credits to user account"""
        
        # Get user credits
        user_credits = await self.get_user_credits(user_id)
        if not user_credits:
            return {
                'success': False,
                'error': 'User credits not found'
            }
        
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
            meta_data={'added_at': datetime.utcnow().isoformat()}
        )
        
        self.db.add(transaction)
        await self.db.commit()
        
        return {
            'success': True,
            'credits_added': amount,
            'credits_total': user_credits.available_credits
        }

    async def reset_monthly_credits(self, user_id: int) -> Dict[str, Any]:
        """Reset user's monthly credits based on their plan"""
        
        subscription = await self.get_user_subscription(user_id)
        plan_limits = await self.get_plan_limits(user_id)
        monthly_credits = plan_limits['monthly_credits']
        
        # Get user credits
        user_credits = await self.get_user_credits(user_id)
        if not user_credits:
            return {
                'success': False,
                'error': 'User credits not found'
            }
        
        # Reset credits to monthly allowance
        user_credits.total_credits = monthly_credits
        user_credits.used_credits = 0
        user_credits.available_credits = monthly_credits
        user_credits.updated_at = datetime.utcnow()
        
        # Update subscription credits tracking
        if subscription:
            subscription.credits_reset_at = datetime.utcnow()
            subscription.credits_used_this_period = 0
        
        # Create transaction record
        transaction = CreditTransaction(
            user_id=user_id,
            transaction_type='reset',
            amount=monthly_credits,
            description=f'Monthly credits reset - {plan_limits.get("plan_name", "Free")} plan',
            meta_data={'reset_at': datetime.utcnow().isoformat()}
        )
        
        self.db.add(transaction)
        await self.db.commit()
        
        return {
            'success': True,
            'credits_reset_to': monthly_credits,
            'plan': await self.get_user_plan(user_id)
        }

    async def get_usage_stats(self, user_id: int, days: int = 30) -> Dict[str, Any]:
        """Get user's usage statistics"""
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get credit transactions
        result = await self.db.execute(
            select(CreditTransaction).where(
                and_(
                    CreditTransaction.user_id == user_id,
                    CreditTransaction.created_at >= start_date,
                    CreditTransaction.transaction_type == 'usage'
                )
            )
        )
        transactions = result.scalars().all()
        
        # Calculate stats
        total_usage = sum(abs(t.amount) for t in transactions)
        agent_usage = sum(abs(t.amount) for t in transactions if t.agent_id)
        tool_usage = sum(abs(t.amount) for t in transactions if t.tool_used)
        
        # Get current credits
        user_credits = await self.get_user_credits(user_id)
        
        return {
            'period_days': days,
            'total_credits_used': total_usage,
            'agent_credits_used': agent_usage,
            'tool_credits_used': tool_usage,
            'current_available_credits': user_credits.available_credits if user_credits else 0,
            'current_total_credits': user_credits.total_credits if user_credits else 0,
            'transaction_count': len(transactions)
        }

    async def get_all_plans(self) -> List[SubscriptionPlan]:
        """Get all available subscription plans"""
        result = await self.db.execute(
            select(SubscriptionPlan).where(SubscriptionPlan.is_active == True)
            .order_by(SubscriptionPlan.price)
        )
        return result.scalars().all()

    async def create_default_plans(self):
        """Create default subscription plans if they don't exist"""
        
        for plan_name, limits in PLAN_LIMITS.items():
            # Check if plan exists
            result = await self.db.execute(
                select(SubscriptionPlan).where(SubscriptionPlan.name == plan_name)
            )
            existing_plan = result.scalar_one_or_none()
            
            if not existing_plan:
                # Create plan
                plan = SubscriptionPlan(
                    name=plan_name,
                    display_name=f"{plan_name.title()} Plan",
                    description=f"Perfect for {plan_name} users",
                    price=0.0 if plan_name == 'free' else (29.0 if plan_name == 'starter' else 99.0),
                    monthly_credits=limits['monthly_credits'],
                    max_agents=limits['max_agents'],
                    max_custom_tools=limits['max_custom_tools'],
                    max_integrations=-1,  # Unlimited for all plans
                    features=limits['features'],
                    support_level=limits['support_level'],
                    custom_branding=limits['custom_branding'],
                    api_access=limits['api_access']
                )
                
                self.db.add(plan)
        
        await self.db.commit()

    async def assign_free_plan(self, user_id: int):
        """Assign free plan to new user"""
        
        # Get free plan
        result = await self.db.execute(
            select(SubscriptionPlan).where(SubscriptionPlan.name == 'free')
        )
        free_plan = result.scalar_one_or_none()
        
        if not free_plan:
            # Create free plan if it doesn't exist
            await self.create_default_plans()
            result = await self.db.execute(
                select(SubscriptionPlan).where(SubscriptionPlan.name == 'free')
            )
            free_plan = result.scalar_one_or_none()
        
        if free_plan:
            # Create subscription
            subscription = UserSubscription(
                user_id=user_id,
                plan_id=free_plan.id,
                status='active',
                current_period_start=datetime.utcnow(),
                current_period_end=datetime.utcnow() + timedelta(days=30),
                credits_reset_at=datetime.utcnow(),
                credits_used_this_period=0
            )
            
            self.db.add(subscription)
            await self.db.commit()