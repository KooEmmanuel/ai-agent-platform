#!/usr/bin/env python3
"""
Test script to verify model configuration and max_tokens
"""

import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_max_tokens():
    """Test the max_tokens configuration for different models"""
    
    # Mock the max_tokens function (since we can't import the full service)
    def get_max_tokens_for_model(model: str) -> int:
        model_max_tokens = {
            "gpt-4o-mini": 4000,
            "gpt-4o": 8000,
            "gpt-4.1": 8000,
            "gpt-5": 12000,
            "o1": 6000,
            "o3": 10000
        }
        return model_max_tokens.get(model, 4000)
    
    print("🧪 Testing max_tokens for different models:")
    print("=" * 60)
    
    models_to_test = [
        'gpt-4o-mini', 
        'gpt-4o', 
        'gpt-4.1', 
        'gpt-5', 
        'o1', 
        'o3', 
        'unknown-model'
    ]
    
    for model in models_to_test:
        max_tokens = get_max_tokens_for_model(model)
        print(f"Model: {model:<15} -> Max Tokens: {max_tokens:,}")
    
    print("\n✅ Max tokens configuration test completed!")
    
    # Test context window sizes
    print("\n📊 Context Window Information:")
    print("=" * 60)
    
    context_windows = {
        "gpt-4o-mini": 128000,
        "gpt-4o": 128000,
        "gpt-4.1": 128000,
        "gpt-5": 200000,
        "o1": 128000,
        "o3": 200000
    }
    
    for model, context_window in context_windows.items():
        max_tokens = get_max_tokens_for_model(model)
        utilization = (max_tokens / context_window) * 100
        print(f"Model: {model:<15} -> Context: {context_window:,} | Max Tokens: {max_tokens:,} | Utilization: {utilization:.1f}%")

if __name__ == "__main__":
    test_max_tokens()