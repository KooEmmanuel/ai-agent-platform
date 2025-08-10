"""
Subscription Plans Service
Loads subscription plans from JSON file instead of database
"""

import json
import os
from typing import List, Optional, Dict, Any
from pathlib import Path

class SubscriptionPlansService:
    """Service for managing subscription plans from JSON file"""
    
    def __init__(self):
        self.json_file_path = Path(__file__).parent.parent.parent / "subscription_plans.json"
        self._plans_cache = None
        self._last_modified = None
    
    def _load_plans_from_json(self) -> List[Dict[str, Any]]:
        """Load plans from JSON file with caching"""
        if not self.json_file_path.exists():
            print(f"⚠️  Subscription plans JSON file not found: {self.json_file_path}")
            return []
        
        # Check if file has been modified
        current_modified = self.json_file_path.stat().st_mtime
        if (self._plans_cache is not None and 
            self._last_modified is not None and 
            current_modified <= self._last_modified):
            return self._plans_cache
        
        try:
            with open(self.json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self._plans_cache = data.get('plans', [])
            self._last_modified = current_modified
            
            print(f"✅ Loaded {len(self._plans_cache)} subscription plans from JSON")
            return self._plans_cache
            
        except Exception as e:
            print(f"❌ Error loading subscription plans from JSON: {e}")
            return []
    
    def get_all_plans(self) -> List[Dict[str, Any]]:
        """Get all subscription plans"""
        return self._load_plans_from_json()
    
    def get_active_plans(self) -> List[Dict[str, Any]]:
        """Get only active plans"""
        plans = self._load_plans_from_json()
        return [plan for plan in plans if plan.get('is_active', True)]
    
    def get_plan_by_id(self, plan_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific plan by ID"""
        plans = self._load_plans_from_json()
        for plan in plans:
            if plan.get('id') == plan_id:
                return plan
        return None
    
    def get_plan_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get a specific plan by name"""
        plans = self._load_plans_from_json()
        for plan in plans:
            if plan.get('name', '').lower() == name.lower():
                return plan
        return None
    
    def get_free_plan(self) -> Optional[Dict[str, Any]]:
        """Get the free plan"""
        return self.get_plan_by_name('free')
    
    def get_plans_by_price_range(self, min_price: float = 0, max_price: float = float('inf')) -> List[Dict[str, Any]]:
        """Get plans within a price range"""
        plans = self._load_plans_from_json()
        return [
            plan for plan in plans 
            if min_price <= plan.get('price', 0) <= max_price
        ]
    
    def get_plans_by_billing_interval(self, interval: str) -> List[Dict[str, Any]]:
        """Get plans by billing interval"""
        plans = self._load_plans_from_json()
        return [
            plan for plan in plans 
            if plan.get('billing_interval', '').lower() == interval.lower()
        ]
    
    def get_plans_with_feature(self, feature: str) -> List[Dict[str, Any]]:
        """Get plans that include a specific feature"""
        plans = self._load_plans_from_json()
        matching_plans = []
        
        for plan in plans:
            features = plan.get('features', [])
            if isinstance(features, list) and feature.lower() in [f.lower() for f in features]:
                matching_plans.append(plan)
        
        return matching_plans
    
    def get_plans_by_support_level(self, support_level: str) -> List[Dict[str, Any]]:
        """Get plans by support level"""
        plans = self._load_plans_from_json()
        return [
            plan for plan in plans 
            if plan.get('support_level', '').lower() == support_level.lower()
        ]
    
    def get_plans_with_api_access(self) -> List[Dict[str, Any]]:
        """Get plans that include API access"""
        plans = self._load_plans_from_json()
        return [plan for plan in plans if plan.get('api_access', False)]
    
    def get_plans_with_custom_branding(self) -> List[Dict[str, Any]]:
        """Get plans that include custom branding"""
        plans = self._load_plans_from_json()
        return [plan for plan in plans if plan.get('custom_branding', False)]
    
    def get_plans_sorted_by_price(self, ascending: bool = True) -> List[Dict[str, Any]]:
        """Get plans sorted by price"""
        plans = self._load_plans_from_json()
        return sorted(plans, key=lambda x: x.get('price', 0), reverse=not ascending)
    
    def get_plan_limits(self, plan_name: str) -> Dict[str, Any]:
        """Get limits for a specific plan"""
        plan = self.get_plan_by_name(plan_name)
        if not plan:
            return {}
        
        return {
            'max_agents': plan.get('max_agents', 3),
            'max_custom_tools': plan.get('max_custom_tools', 0),
            'max_integrations': plan.get('max_integrations', -1),
            'monthly_credits': plan.get('monthly_credits', 1000),
            'support_level': plan.get('support_level', 'community'),
            'custom_branding': plan.get('custom_branding', False),
            'api_access': plan.get('api_access', False)
        }

# Create a singleton instance
subscription_plans_service = SubscriptionPlansService() 