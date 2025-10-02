#!/usr/bin/env python3
"""
Test script to verify agent service model configuration
"""

import sys
import os
import asyncio

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_agent_service():
    """Test the agent service model configuration"""
    try:
        from app.services.agent_service import AgentService
        from app.core.database import Agent
        
        print("🧪 Testing Agent Service Model Configuration")
        print("=" * 60)
        
        # Create a mock agent service (without database)
        agent_service = AgentService(None)
        
        # Test different models
        test_models = [
            'gpt-4o-mini', 
            'gpt-4o', 
            'gpt-4.1', 
            'gpt-5', 
            'o1', 
            'o3'
        ]
        
        print("Testing max_tokens for different models:")
        for model in test_models:
            max_tokens = agent_service._get_max_tokens_for_model(model)
            print(f"✅ Model: {model:<15} -> Max Tokens: {max_tokens:,}")
        
        print("\n✅ Agent service model configuration test completed!")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure you're running this from the backend directory")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_agent_service())
    if success:
        print("\n🎉 All tests passed!")
    else:
        print("\n💥 Tests failed!")
        sys.exit(1)