#!/usr/bin/env python3
"""
Export subscription plans from database to JSON file
This script exports all plans from the plans table to a JSON file
"""

import asyncio
import sys
import os
import json
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db, SubscriptionPlan
from sqlalchemy import select

async def export_plans_to_json():
    """Export all subscription plans to JSON file"""
    async for db in get_db():
        try:
            # Get all plans from the database
            result = await db.execute(select(SubscriptionPlan))
            plans = result.scalars().all()
            
            # Convert plans to JSON-serializable format
            plans_data = []
            for plan in plans:
                plan_dict = {
                    "id": plan.id,
                    "name": plan.name,
                    "display_name": plan.display_name,
                    "description": plan.description,
                    "price": float(plan.price) if plan.price else 0.0,
                    "currency": plan.currency,
                    "billing_interval": plan.billing_interval,
                    "monthly_credits": plan.monthly_credits,
                    "max_agents": plan.max_agents,
                    "max_custom_tools": plan.max_custom_tools,
                    "max_integrations": plan.max_integrations,
                    "features": plan.features,
                    "support_level": plan.support_level,
                    "custom_branding": plan.custom_branding,
                    "api_access": plan.api_access,
                    "priority_support": plan.priority_support,
                    "stripe_price_id": plan.stripe_price_id,
                    "stripe_product_id": plan.stripe_product_id,
                    "is_active": plan.is_active,
                    "created_at": plan.created_at.isoformat() if plan.created_at else None,
                    "updated_at": plan.updated_at.isoformat() if plan.updated_at else None
                }
                plans_data.append(plan_dict)
            
            # Create the JSON file
            json_data = {
                "exported_at": datetime.utcnow().isoformat(),
                "total_plans": len(plans_data),
                "plans": plans_data
            }
            
            # Write to JSON file
            with open('subscription_plans.json', 'w', encoding='utf-8') as f:
                json.dump(json_data, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Successfully exported {len(plans_data)} plans to subscription_plans.json")
            print(f"📁 File location: {os.path.abspath('subscription_plans.json')}")
            
            # Print summary
            print("\n📋 Plans exported:")
            for plan in plans_data:
                print(f"  • {plan['display_name']} - ${plan['price']} {plan['currency']} ({plan['billing_interval']})")
            
        except Exception as e:
            print(f"❌ Error exporting plans: {e}")
            raise
        finally:
            await db.close()

if __name__ == "__main__":
    print("📤 Exporting subscription plans to JSON...")
    asyncio.run(export_plans_to_json())
    print("✅ Export completed!") 