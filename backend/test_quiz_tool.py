#!/usr/bin/env python3
"""
Test script for the Quiz Tool
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(__file__))

from marketplace_tools.quiz_tool import QuizTool

async def test_quiz_tool():
    """Test the quiz tool functionality."""
    print("🧪 Testing Quiz Tool")
    print("=" * 50)
    
    # Initialize the tool
    config = {
        'name': 'Quiz Generator',
        'description': 'Generate interactive quizzes',
        'category': 'Education',
        'tool_type': 'Function'
    }
    
    quiz_tool = QuizTool(config)
    
    # Test 1: Basic quiz generation
    print("\n🔍 Test 1: Basic Quiz Generation")
    print("-" * 30)
    
    result = await quiz_tool.execute(
        topic="JavaScript Programming",
        num_questions=3,
        difficulty="medium",
        question_types=["mcq", "true_false"]
    )
    
    if result['success']:
        print("✅ Quiz generated successfully!")
        print(f"📊 Quiz ID: {result['metadata']['quiz_id']}")
        print(f"📝 Topic: {result['metadata']['topic']}")
        print(f"❓ Questions: {result['metadata']['num_questions']}")
        print(f"🎯 Difficulty: {result['metadata']['difficulty']}")
        print("\n📋 Quiz Content Preview:")
        print(result['result'][:500] + "..." if len(result['result']) > 500 else result['result'])
    else:
        print(f"❌ Quiz generation failed: {result['error']}")
    
    # Test 2: Timed quiz
    print("\n🔍 Test 2: Timed Quiz")
    print("-" * 30)
    
    result = await quiz_tool.execute(
        topic="General Knowledge",
        num_questions=2,
        difficulty="easy",
        time_limit=300,  # 5 minutes
        question_types=["mcq", "short_answer"]
    )
    
    if result['success']:
        print("✅ Timed quiz generated successfully!")
        print(f"⏰ Time Limit: {result['metadata']['time_limit']} seconds")
        print(f"📝 Topic: {result['metadata']['topic']}")
    else:
        print(f"❌ Timed quiz generation failed: {result['error']}")
    
    # Test 3: Context-based quiz
    print("\n🔍 Test 3: Context-based Quiz")
    print("-" * 30)
    
    result = await quiz_tool.execute(
        conversation_context="We were discussing React hooks and useState in our conversation",
        num_questions=2,
        difficulty="medium"
    )
    
    if result['success']:
        print("✅ Context-based quiz generated successfully!")
        print(f"📝 Topic: {result['metadata']['topic']}")
        print("🎯 Topic was extracted from conversation context")
    else:
        print(f"❌ Context-based quiz generation failed: {result['error']}")
    
    # Test 4: Error handling
    print("\n🔍 Test 4: Error Handling")
    print("-" * 30)
    
    result = await quiz_tool.execute(
        num_questions=25,  # Too many questions
        difficulty="invalid"  # Invalid difficulty
    )
    
    if not result['success']:
        print("✅ Error handling works correctly!")
        print(f"❌ Expected error: {result['error']}")
    else:
        print("❌ Error handling failed - should have caught invalid parameters")
    
    print("\n" + "=" * 50)
    print("🎉 Quiz Tool Testing Complete!")

if __name__ == "__main__":
    asyncio.run(test_quiz_tool())
