#!/usr/bin/env python3
"""
Setup billing system with default plans and assign free plans to existing users
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db, User, UserCredits
from app.services.billing_service import BillingService


async def setup_billing_system():
    """Setup billing system with default plans and user assignments"""
    
    print("🚀 Setting up billing system...")
    
    async for db in get_db():
        billing_service = BillingService(db)
        
        # Create default subscription plans
        print("📋 Creating default subscription plans...")
        await billing_service.create_default_plans()
        print("✅ Default plans created successfully!")
        
        # Get all existing users
        result = await db.execute(select(User))
        users = result.scalars().all()
        
        print(f"👥 Found {len(users)} existing users")
        
        # Assign free plan to all existing users who don't have a subscription
        for user in users:
            print(f"🔄 Processing user: {user.email}")
            
            # Check if user already has a subscription
            existing_subscription = await billing_service.get_user_subscription(user.id)
            
            if not existing_subscription:
                # Assign free plan
                await billing_service.assign_free_plan(user.id)
                print(f"✅ Assigned free plan to {user.email}")
            else:
                print(f"⚠️  User {user.email} already has a subscription")
            
            # Ensure user has credits record
            user_credits = await billing_service.get_user_credits(user.id)
            if not user_credits:
                # Create credits record with 1000 free credits
                user_credits = UserCredits(
                    user_id=user.id,
                    total_credits=1000.0,
                    used_credits=0.0,
                    available_credits=1000.0
                )
                db.add(user_credits)
                await db.commit()
                print(f"💰 Created credits record for {user.email} (1000 credits)")
            else:
                print(f"💰 User {user.email} already has credits: {user_credits.available_credits}")
        
        print("🎉 Billing system setup completed!")
        print("\n📊 Summary:")
        print("• Default subscription plans created (Free, Starter, Pro)")
        print("• All existing users assigned to Free plan")
        print("• All users have 1000 free credits")
        print("\n🔄 Plan Details:")
        print("• Free Plan: 3 agents, 1000 credits/month, marketplace tools only")
        print("• Starter Plan: 10 agents, 10000 credits/month, 5 custom tools")
        print("• Pro Plan: Unlimited agents, 50000 credits/month, unlimited custom tools")
        
        break  # Exit after first db session


if __name__ == "__main__":
    asyncio.run(setup_billing_system())