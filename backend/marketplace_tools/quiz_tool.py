import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from .base import BaseTool
from app.core.config import settings
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

class QuizTool(BaseTool):
    """
    Interactive Quiz Generation Tool
    
    Features:
    - Multiple question types (MCQ, True/False, Short Answer, Fill in Blank)
    - Flexible topic generation (user-provided or conversation-based)
    - Optional time limits
    - Difficulty levels
    - Customizable question counts
    - AI-generated questions and answers
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.supported_question_types = ["mcq", "true_false", "short_answer", "fill_blank"]
        self.difficulty_levels = ["easy", "medium", "hard"]
        
    async def execute(self, 
                     topic: Optional[str] = None,
                     question_types: Optional[List[str]] = None,
                     num_questions: int = 5,
                     difficulty: str = "medium",
                     time_limit: Optional[int] = None,
                     conversation_context: Optional[str] = None,
                     **kwargs) -> Dict[str, Any]:
        """
        Generate an interactive quiz.
        
        Args:
            topic: Quiz topic (optional, can be generated from context)
            question_types: List of question types to include
            num_questions: Number of questions (1-20)
            difficulty: Difficulty level (easy, medium, hard)
            time_limit: Time limit in seconds (optional)
            conversation_context: Context for topic generation
            
        Returns:
            Quiz in markdown format with embedded answers
        """
        try:
            # Validate inputs
            if num_questions < 1 or num_questions > 20:
                return self._format_error("Number of questions must be between 1 and 20")
            
            if difficulty not in self.difficulty_levels:
                return self._format_error(f"Difficulty must be one of: {', '.join(self.difficulty_levels)}")
            
            if question_types:
                invalid_types = [t for t in question_types if t not in self.supported_question_types]
                if invalid_types:
                    return self._format_error(f"Unsupported question types: {', '.join(invalid_types)}")
            else:
                question_types = self.supported_question_types
            
            # Generate quiz
            quiz_data = await self._generate_quiz(
                topic=topic,
                question_types=question_types,
                num_questions=num_questions,
                difficulty=difficulty,
                time_limit=time_limit,
                conversation_context=conversation_context
            )
            
            # Check if AI generation failed
            if quiz_data.get('ai_generation_failed'):
                # Return special format for agent to generate questions
                return self._format_ai_fallback_request(quiz_data)
            
            # Format as markdown
            quiz_markdown = self._format_quiz_markdown(quiz_data)
            
            metadata = {
                'quiz_id': quiz_data['quiz_id'],
                'topic': quiz_data['topic'],
                'num_questions': num_questions,
                'difficulty': difficulty,
                'time_limit': time_limit,
                'question_types': question_types,
                'generated_at': datetime.utcnow().isoformat()
            }
            
            return self._format_success(quiz_markdown, metadata)
            
        except Exception as e:
            logger.error(f"Quiz generation error: {str(e)}")
            return self._format_error(f"Quiz generation failed: {str(e)}")
    
    async def _generate_quiz(self, 
                           topic: Optional[str],
                           question_types: List[str],
                           num_questions: int,
                           difficulty: str,
                           time_limit: Optional[int],
                           conversation_context: Optional[str]) -> Dict[str, Any]:
        """Generate quiz data structure."""
        
        # Determine topic
        if not topic and conversation_context:
            topic = self._extract_topic_from_context(conversation_context)
        elif not topic:
            topic = "General Knowledge"
        
        # Generate questions using AI
        questions = []
        ai_failed_questions = []
        
        for i in range(num_questions):
            question_type = question_types[i % len(question_types)]  # Cycle through types
            question = await self._generate_question_with_ai(
                topic=topic,
                question_type=question_type,
                difficulty=difficulty,
                question_number=i + 1,
                conversation_context=conversation_context
            )
            
            # Check if AI generation failed
            if question.get('ai_generation_failed'):
                ai_failed_questions.append(question)
            else:
                questions.append(question)
        
        # If AI failed for all questions, return a special format for agent fallback
        if len(ai_failed_questions) == num_questions:
            return {
                'quiz_id': f"quiz_{uuid.uuid4().hex[:8]}",
                'topic': topic,
                'ai_generation_failed': True,
                'failed_questions': ai_failed_questions,
                'time_limit': time_limit,
                'difficulty': difficulty,
                'conversation_context': conversation_context
            }
        
        return {
            'quiz_id': f"quiz_{uuid.uuid4().hex[:8]}",
            'topic': topic,
            'questions': questions,
            'time_limit': time_limit,
            'difficulty': difficulty
        }
    
    async def _generate_question_with_ai(self, 
                                       topic: str, 
                                       question_type: str, 
                                       difficulty: str,
                                       question_number: int,
                                       conversation_context: Optional[str]) -> Dict[str, Any]:
        """Generate a single question using AI based on conversation context."""
        
        try:
            # Try to generate question using AI (this would be implemented with actual AI service)
            # For now, we'll return a structured format that the agent can use as fallback
            return await self._call_ai_for_question_generation(
                topic=topic,
                question_type=question_type,
                difficulty=difficulty,
                question_number=question_number,
                conversation_context=conversation_context
            )
        except Exception as e:
            logger.error(f"AI question generation failed: {str(e)}")
            # Return a structured format that indicates AI generation failed
            # The agent will use this to generate questions in the right format
            return {
                "id": f"q{question_number}",
                "type": question_type,
                "ai_generation_failed": True,
                "topic": topic,
                "difficulty": difficulty,
                "conversation_context": conversation_context,
                "error": str(e)
            }
    
    async def _call_ai_for_question_generation(self, 
                                             topic: str, 
                                             question_type: str, 
                                             difficulty: str,
                                             question_number: int,
                                             conversation_context: Optional[str]) -> Dict[str, Any]:
        """Call OpenAI GPT-4 to generate a question."""
        
        if not settings.OPENAI_API_KEY:
            raise Exception("OpenAI API key not configured")
        
        try:
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            
            # Create a comprehensive prompt for question generation
            prompt = self._create_question_generation_prompt(
                topic=topic,
                question_type=question_type,
                difficulty=difficulty,
                question_number=question_number,
                conversation_context=conversation_context
            )
            
            response = await client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert educational content creator specializing in creating high-quality quiz questions. You generate questions that are clear, accurate, and educational."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            # Parse the AI response
            ai_response = response.choices[0].message.content.strip()
            return self._parse_ai_question_response(ai_response, question_type, question_number)
            
        except Exception as e:
            logger.error(f"OpenAI API call failed: {str(e)}")
            raise Exception(f"AI question generation failed: {str(e)}")
    
    def _create_question_generation_prompt(self, 
                                         topic: str, 
                                         question_type: str, 
                                         difficulty: str,
                                         question_number: int,
                                         conversation_context: Optional[str]) -> str:
        """Create a detailed prompt for AI question generation."""
        
        context_info = f"Conversation Context: {conversation_context}" if conversation_context else "No specific conversation context provided."
        
        prompt = f"""
Generate a {difficulty} {question_type} question about {topic}.

{context_info}

Question Requirements:
- Question Type: {question_type}
- Difficulty Level: {difficulty}
- Topic: {topic}
- Question Number: {question_number}

Please generate a high-quality educational question that tests understanding of {topic}.

For the response format, return ONLY a valid JSON object with the following structure:

{{
    "question": "Your question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],  // Only for MCQ and true_false
    "correct_answer": "The correct answer",
    "explanation": "Detailed explanation of why this answer is correct"
}}

Question Type Specific Requirements:
- MCQ: Provide 4 options (A, B, C, D), one correct answer
- true_false: Provide options ["True", "False"], one correct answer
- short_answer: No options needed, provide the correct answer
- fill_blank: Use ___ in the question where the answer goes, provide the correct answer

Make sure the question is:
1. Clear and unambiguous
2. Tests actual knowledge of {topic}
3. Appropriate for {difficulty} difficulty level
4. Educational and informative
5. Has a detailed explanation

Return ONLY the JSON object, no additional text.
"""
        return prompt
    
    def _parse_ai_question_response(self, ai_response: str, question_type: str, question_number: int) -> Dict[str, Any]:
        """Parse the AI response and return structured question data."""
        
        try:
            # Clean the response (remove any markdown formatting)
            cleaned_response = ai_response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]
            cleaned_response = cleaned_response.strip()
            
            # Parse JSON
            question_data = json.loads(cleaned_response)
            
            # Validate required fields
            required_fields = ["question", "correct_answer", "explanation"]
            for field in required_fields:
                if field not in question_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Build the question object
            result = {
                "id": f"q{question_number}",
                "type": question_type,
                "question": question_data["question"],
                "correct_answer": question_data["correct_answer"],
                "explanation": question_data["explanation"]
            }
            
            # Add options for MCQ and true_false
            if question_type in ["mcq", "true_false"] and "options" in question_data:
                result["options"] = question_data["options"]
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {str(e)}")
            logger.error(f"AI Response: {ai_response}")
            raise Exception("AI returned invalid JSON format")
        except Exception as e:
            logger.error(f"Error parsing AI question response: {str(e)}")
            raise Exception(f"Failed to parse AI response: {str(e)}")
    
    def _format_ai_fallback_request(self, quiz_data: Dict[str, Any]) -> Dict[str, Any]:
        """Format a request for the agent to generate questions when AI fails."""
        
        fallback_request = f"""
QUIZ GENERATION REQUEST - AI FAILED

The quiz tool's AI service failed to generate questions. Please generate a quiz with the following specifications:

**Quiz Topic:** {quiz_data['topic']}
**Difficulty:** {quiz_data['difficulty']}
**Number of Questions:** {len(quiz_data['failed_questions'])}
**Time Limit:** {quiz_data['time_limit'] or 'No time limit'}
**Conversation Context:** {quiz_data['conversation_context'] or 'None provided'}

**Question Types Needed:**
"""
        
        for i, failed_q in enumerate(quiz_data['failed_questions'], 1):
            fallback_request += f"- Question {i}: {failed_q['type']}\n"
        
        fallback_request += f"""

**Required Format:**
Generate the quiz in the exact markdown format below:

# Quiz: {quiz_data['topic']}

**Settings:**
- Questions: {len(quiz_data['failed_questions'])}
- Time Limit: {quiz_data['time_limit'] or 'No time limit'}
- Difficulty: {quiz_data['difficulty'].title()}

---

## Question 1
**Type:** [Question Type]
**Question:** [Your question here]

[For MCQ/True-False: Add options with - [ ] format]
[For Short Answer/Fill Blank: Add answer field]

**Answer:** [Correct answer]
**Explanation:** [Explanation]

---

[Repeat for each question]

**Quiz ID:** {quiz_data['quiz_id']}
**Total Questions:** {len(quiz_data['failed_questions'])}

Please generate the complete quiz in this exact format.
"""
        
        return self._format_success(fallback_request, {
            'quiz_id': quiz_data['quiz_id'],
            'topic': quiz_data['topic'],
            'ai_fallback_request': True,
            'num_questions': len(quiz_data['failed_questions']),
            'difficulty': quiz_data['difficulty'],
            'time_limit': quiz_data['time_limit'],
            'conversation_context': quiz_data['conversation_context']
        })
    
    
    def _extract_topic_from_context(self, context: str) -> str:
        """Extract topic from conversation context."""
        # Simple topic extraction - in production, use AI for better extraction
        context_lower = context.lower()
        
        if any(word in context_lower for word in ["big o", "bigo", "algorithm", "complexity", "time complexity", "space complexity", "o(n)", "o(log n)", "o(1)"]):
            return "Big O Notation and Algorithm Complexity"
        elif any(word in context_lower for word in ["javascript", "js", "node"]):
            return "JavaScript Programming"
        elif any(word in context_lower for word in ["python", "django", "flask"]):
            return "Python Programming"
        elif any(word in context_lower for word in ["react", "vue", "angular"]):
            return "Frontend Development"
        elif any(word in context_lower for word in ["database", "sql", "mysql"]):
            return "Database Management"
        elif any(word in context_lower for word in ["html", "css", "web"]):
            return "Web Development"
        elif any(word in context_lower for word in ["data structure", "linked list", "tree", "graph", "sorting", "searching"]):
            return "Data Structures and Algorithms"
        elif any(word in context_lower for word in ["machine learning", "ml", "ai", "neural network", "deep learning"]):
            return "Machine Learning and AI"
        elif any(word in context_lower for word in ["math", "mathematics", "calculus", "algebra", "geometry"]):
            return "Mathematics"
        elif any(word in context_lower for word in ["science", "physics", "chemistry", "biology"]):
            return "Science"
        else:
            return "General Knowledge"
    
    def _format_quiz_markdown(self, quiz_data: Dict[str, Any]) -> str:
        """Format quiz data as markdown."""
        quiz_id = quiz_data['quiz_id']
        topic = quiz_data['topic']
        questions = quiz_data['questions']
        time_limit = quiz_data.get('time_limit')
        
        markdown = f"# Quiz: {topic}\n\n"
        markdown += "**Settings:**\n"
        markdown += f"- Questions: {len(questions)}\n"
        if time_limit:
            minutes = time_limit // 60
            seconds = time_limit % 60
            if minutes > 0:
                markdown += f"- Time Limit: {minutes} minute{'s' if minutes != 1 else ''}"
                if seconds > 0:
                    markdown += f" {seconds} second{'s' if seconds != 1 else ''}"
            else:
                markdown += f"- Time Limit: {seconds} second{'s' if seconds != 1 else ''}"
        else:
            markdown += "- Time Limit: No time limit"
        markdown += f"\n- Difficulty: {quiz_data['difficulty'].title()}\n\n"
        markdown += "---\n\n"
        
        # Questions
        for i, question in enumerate(questions, 1):
            markdown += f"## Question {i}\n"
            markdown += f"**Type:** {question['type'].replace('_', ' ').title()}\n"
            markdown += f"**Question:** {question['question']}\n\n"
            
            if question['type'] == 'mcq':
                for j, option in enumerate(question['options']):
                    markdown += f"- [ ] {option}\n"
            elif question['type'] == 'true_false':
                markdown += "- [ ] True\n"
                markdown += "- [ ] False\n"
            elif question['type'] == 'short_answer':
                markdown += "**Answer:** [Your answer here]\n"
            elif question['type'] == 'fill_blank':
                markdown += "**Answer:** [Your answer here]\n"
            
            markdown += "\n"
            markdown += f"**Answer:** {question['correct_answer']}\n"
            markdown += f"**Explanation:** {question['explanation']}\n\n"
            markdown += "---\n\n"
        
        # Quiz metadata
        markdown += f"**Quiz ID:** {quiz_id}\n"
        markdown += f"**Total Questions:** {len(questions)}\n"
        if time_limit:
            markdown += f"**Time Limit:** {time_limit}\n"
        
        return markdown
    
    def get_tool_info(self) -> Dict[str, Any]:
        """
        Get tool information and schema.
        
        Returns:
            Tool information dictionary
        """
        return {
            'name': 'Quiz Generator',
            'description': 'Generate interactive quizzes with multiple question types. Supports MCQ, True/False, Short Answer, and Fill-in-the-Blank questions. Can create timed or untimed quizzes on any topic.',
            'version': '1.0.0',
            'author': 'Drixai',
            'category': 'Education',
            'tool_type': 'Function',
            'parameters': {
                'type': 'object',
                'properties': {
                    'topic': {
                        'type': 'string',
                        'description': 'Quiz topic (optional - will be generated from conversation context if not provided)',
                        'examples': ['JavaScript Programming', 'World History', 'Mathematics', 'Science']
                    },
                    'question_types': {
                        'type': 'array',
                        'items': {
                            'type': 'string',
                            'enum': ['mcq', 'true_false', 'short_answer', 'fill_blank']
                        },
                        'description': 'Types of questions to include in the quiz',
                        'default': ['mcq', 'true_false', 'short_answer', 'fill_blank']
                    },
                    'num_questions': {
                        'type': 'integer',
                        'description': 'Number of questions in the quiz',
                        'minimum': 1,
                        'maximum': 20,
                        'default': 5
                    },
                    'difficulty': {
                        'type': 'string',
                        'enum': ['easy', 'medium', 'hard'],
                        'description': 'Difficulty level of the quiz',
                        'default': 'medium'
                    },
                    'time_limit': {
                        'type': 'integer',
                        'description': 'Time limit in seconds (optional - leave empty for untimed quiz)',
                        'minimum': 30,
                        'maximum': 3600
                    },
                    'conversation_context': {
                        'type': 'string',
                        'description': 'Conversation context for topic generation (optional)'
                    }
                },
                'required': []
            }
        }