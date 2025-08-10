"""
Billing and subscription endpoints
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import stripe
import json
import logging

from app.core.database import get_db, User
from app.core.auth import get_current_user
from app.services.billing_service import BillingService
from app.services.subscription_plans_service import subscription_plans_service
from app.core.config import settings

# Set up logging
logger = logging.getLogger(__name__)

# Configure Stripe
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY


router = APIRouter(tags=["billing"])


class PlanInfo(BaseModel):
    id: int
    name: str
    display_name: str
    description: str
    price: float
    currency: str
    monthly_credits: int
    max_agents: int
    max_custom_tools: int
    features: List[str]
    support_level: str
    custom_branding: bool
    api_access: bool
    is_current: bool = False


class SubscriptionStatus(BaseModel):
    plan_name: str
    display_name: str
    status: str
    current_period_end: str
    credits_remaining: float
    credits_total: float
    can_create_agents: bool
    can_create_custom_tools: bool
    agents_count: int
    agents_limit: int
    custom_tools_count: int
    custom_tools_limit: int


class UsageStats(BaseModel):
    period_days: int
    total_credits_used: float
    agent_credits_used: float
    tool_credits_used: float
    current_available_credits: float
    current_total_credits: float
    transaction_count: int


@router.get("/plans", response_model=List[PlanInfo])
async def get_plans(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all available subscription plans from JSON"""
    try:
        billing_service = BillingService(db)
        
        # Get all active plans from JSON
        plans_data = subscription_plans_service.get_active_plans()
        
        # Get user's current plan
        current_plan_name = await billing_service.get_user_plan(current_user.id)
        
        plan_list = []
        for plan_data in plans_data:
            plan_info = PlanInfo(
                id=plan_data.get('id'),
                name=plan_data.get('name'),
                display_name=plan_data.get('display_name'),
                description=plan_data.get('description', ''),
                price=plan_data.get('price', 0.0),
                currency=plan_data.get('currency', 'USD'),
                monthly_credits=plan_data.get('monthly_credits', 1000),
                max_agents=plan_data.get('max_agents', 3),
                max_custom_tools=plan_data.get('max_custom_tools', 0),
                features=plan_data.get('features', []),
                support_level=plan_data.get('support_level', 'community'),
                custom_branding=plan_data.get('custom_branding', False),
                api_access=plan_data.get('api_access', False),
                is_current=(plan_data.get('name') == current_plan_name)
            )
            plan_list.append(plan_info)
        
        return plan_list
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch subscription plans: {str(e)}"
        )


@router.get("/subscription", response_model=SubscriptionStatus)
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's current subscription status"""
    billing_service = BillingService(db)
    
    # Get subscription and plan info
    subscription = await billing_service.get_user_subscription(current_user.id)
    plan_name = await billing_service.get_user_plan(current_user.id)
    limits = await billing_service.get_plan_limits(current_user.id)
    
    # Get credits
    user_credits = await billing_service.get_user_credits(current_user.id)
    
    # Get agent limits
    agent_check = await billing_service.check_agent_limit(current_user.id)
    
    # Get custom tool limits
    tool_check = await billing_service.check_custom_tool_limit(current_user.id)
    
    return SubscriptionStatus(
        plan_name=plan_name,
        display_name=f"{plan_name.title()} Plan",
        status=subscription.status if subscription else 'active',
        current_period_end=subscription.current_period_end.isoformat() if subscription and subscription.current_period_end else "",
        credits_remaining=user_credits.available_credits if user_credits else 0,
        credits_total=user_credits.total_credits if user_credits else 0,
        can_create_agents=agent_check['can_create'],
        can_create_custom_tools=tool_check['can_create'],
        agents_count=agent_check['current_count'],
        agents_limit=agent_check['max_allowed'],
        custom_tools_count=tool_check['current_count'],
        custom_tools_limit=tool_check['max_allowed']
    )


@router.get("/usage", response_model=UsageStats)
async def get_usage_stats(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's usage statistics"""
    billing_service = BillingService(db)
    
    stats = await billing_service.get_usage_stats(current_user.id, days)
    
    return UsageStats(**stats)


@router.post("/credits/add")
async def add_credits(
    amount: float,
    description: str = "Manual credit addition",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add credits to user account (admin function)"""
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive"
        )
    
    billing_service = BillingService(db)
    
    result = await billing_service.add_credits(
        current_user.id,
        amount,
        description,
        'bonus'
    )
    
    if not result['success']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result['error']
        )
    
    return {
        "message": f"Added {amount} credits successfully",
        "credits_total": result['credits_total']
    }


@router.post("/credits/reset")
async def reset_monthly_credits(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Reset user's monthly credits (admin function)"""
    billing_service = BillingService(db)
    
    result = await billing_service.reset_monthly_credits(current_user.id)
    
    if not result['success']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result['error']
        )
    
    return {
        "message": "Monthly credits reset successfully",
        "credits_reset_to": result['credits_reset_to'],
        "plan": result['plan']
    }


@router.get("/limits")
async def get_plan_limits(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current plan limits and usage"""
    billing_service = BillingService(db)
    
    # Get plan limits
    limits = await billing_service.get_plan_limits(current_user.id)
    
    # Get current usage
    agent_check = await billing_service.check_agent_limit(current_user.id)
    tool_check = await billing_service.check_custom_tool_limit(current_user.id)
    user_credits = await billing_service.get_user_credits(current_user.id)
    
    return {
        "plan": await billing_service.get_user_plan(current_user.id),
        "limits": limits,
        "usage": {
            "agents": {
                "current": agent_check['current_count'],
                "limit": agent_check['max_allowed'],
                "can_create": agent_check['can_create']
            },
            "custom_tools": {
                "current": tool_check['current_count'],
                "limit": tool_check['max_allowed'],
                "can_create": tool_check['can_create']
            },
            "credits": {
                "available": user_credits.available_credits if user_credits else 0,
                "total": user_credits.total_credits if user_credits else 0,
                "used": user_credits.used_credits if user_credits else 0
            }
        }
    }


@router.post("/setup-default-plans")
async def setup_default_plans(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Setup default subscription plans (admin function)"""
    billing_service = BillingService(db)
    
    await billing_service.create_default_plans()
    
    return {"message": "Default plans created successfully"}


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle Stripe webhook events"""
    
    if not settings.STRIPE_WEBHOOK_SECRET:
        logger.warning("Stripe webhook secret not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook secret not configured"
        )
    
    # Get the raw body and signature
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    if not sig_header:
        logger.warning("Missing Stripe signature header")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing stripe-signature header"
        )
    
    try:
        # Verify the webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        logger.error(f"Invalid payload: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload"
        )
    except stripe.SignatureVerificationError as e:
        logger.error(f"Invalid signature: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature"
        )
    
    billing_service = BillingService(db)
    
    try:
        # Handle the event
        if event['type'] == 'customer.subscription.created':
            await handle_subscription_created(event['data']['object'], billing_service)
        
        elif event['type'] == 'customer.subscription.updated':
            await handle_subscription_updated(event['data']['object'], billing_service)
        
        elif event['type'] == 'customer.subscription.deleted':
            await handle_subscription_deleted(event['data']['object'], billing_service)
        
        elif event['type'] == 'invoice.payment_succeeded':
            await handle_payment_succeeded(event['data']['object'], billing_service)
        
        elif event['type'] == 'invoice.payment_failed':
            await handle_payment_failed(event['data']['object'], billing_service)
        
        else:
            logger.info(f"Unhandled event type: {event['type']}")
    
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing webhook"
        )
    
    return {"received": True}


async def handle_subscription_created(subscription, billing_service: BillingService):
    """Handle subscription creation"""
    logger.info(f"Subscription created: {subscription['id']}")
    # Add your logic here to update the user's subscription in your database
    

async def handle_subscription_updated(subscription, billing_service: BillingService):
    """Handle subscription updates"""
    logger.info(f"Subscription updated: {subscription['id']}")
    # Add your logic here to update the user's subscription status
    

async def handle_subscription_deleted(subscription, billing_service: BillingService):
    """Handle subscription cancellation"""
    logger.info(f"Subscription deleted: {subscription['id']}")
    # Add your logic here to handle subscription cancellation
    

async def handle_payment_succeeded(invoice, billing_service: BillingService):
    """Handle successful payment"""
    logger.info(f"Payment succeeded for invoice: {invoice['id']}")
    # Add your logic here to handle successful payments
    

async def handle_payment_failed(invoice, billing_service: BillingService):
    """Handle failed payment"""
    logger.info(f"Payment failed for invoice: {invoice['id']}")
    # Add your logic here to handle failed payments