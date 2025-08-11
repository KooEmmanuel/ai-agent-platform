"""
Agent execution service for handling AI model calls and tool execution
"""

import asyncio
import json
import time
from typing import List, Dict, Any, Optional, Tuple, AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import openai
from openai import AsyncOpenAI
from loguru import logger
import re

from app.core.config import settings
from app.core.database import Agent, Tool, Message, Conversation
from app.services.credit_service import CreditService
from app.services.tool_registry import tool_registry
from app.services.tool_usage_tracker import tool_usage_tracker

class AgentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.credit_service = CreditService(db)
        
        # Initialize OpenAI client
        if settings.OPENAI_API_KEY:
            self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        else:
            self.openai_client = None
            logger.warning("OpenAI API key not configured")

    async def execute_agent_stream(
        self, 
        agent: Agent, 
        user_message: str, 
        conversation_history: List[Dict[str, str]] = None,
        session_id: str = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Execute an agent with streaming response
        """
        if not self.openai_client:
            yield {"type": "error", "content": "OpenAI API not configured. Please set OPENAI_API_KEY."}
            return

        try:
            # Prepare conversation history
            messages = self._prepare_messages(agent, user_message, conversation_history)
            
            # Prepare tools if agent has any
            tools = await self._prepare_tools(agent)
            
            # Make streaming API call
            stream = await self.openai_client.chat.completions.create(
                model=agent.model or "gpt-4o-mini",
                messages=messages,
                tools=tools if tools else None,
                tool_choice="auto" if tools else None,
                temperature=0.7,
                max_tokens=1000,
                stream=True
            )
            
            # Process streaming response
            assistant_message = {"role": "assistant", "content": "", "tool_calls": []}
            tools_used = []
            full_response = ""
            
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    assistant_message["content"] += content
                    full_response += content
                    
                    # Stream the content chunk
                    yield {"type": "content", "content": content}
                
                # Handle tool calls in streaming
                if chunk.choices[0].delta.tool_calls:
                    for tool_call in chunk.choices[0].delta.tool_calls:
                        if tool_call.index is not None:
                            # Initialize tool call if not exists
                            while len(assistant_message["tool_calls"]) <= tool_call.index:
                                assistant_message["tool_calls"].append({
                                    "id": "",
                                    "type": "function",
                                    "function": {"name": "", "arguments": ""}
                                })
                            
                            # Update tool call
                            if tool_call.id:
                                assistant_message["tool_calls"][tool_call.index]["id"] = tool_call.id
                            if tool_call.function:
                                if tool_call.function.name:
                                    assistant_message["tool_calls"][tool_call.index]["function"]["name"] = tool_call.function.name
                                if tool_call.function.arguments:
                                    assistant_message["tool_calls"][tool_call.index]["function"]["arguments"] += tool_call.function.arguments
            
            # Handle tool calls if any
            if assistant_message["tool_calls"]:
                logger.info(f"🔧 Agent {agent.id} using {len(assistant_message['tool_calls'])} tools")
                yield {"type": "status", "content": "Using tools..."}
                
                # Add the assistant message with tool calls to the conversation
                messages.append(assistant_message)
                
                tools_used = await self._handle_tool_calls_stream(
                    agent, assistant_message["tool_calls"], messages
                )
                
                # Make a follow-up streaming call to get the final response after tool execution
                logger.info(f"🔄 Agent {agent.id} making follow-up streaming call after tool execution")
                yield {"type": "status", "content": "Processing results..."}
                
                follow_up_stream = await self.openai_client.chat.completions.create(
                    model=agent.model or "gpt-4o-mini",
                    messages=messages,  # Now includes assistant message + tool results
                    temperature=0.7,
                    max_tokens=1000,
                    stream=True
                )
                
                # Stream the final response
                final_response = ""
                async for chunk in follow_up_stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        final_response += content
                        yield {"type": "content", "content": content}
                
                full_response = final_response
            
            # Send completion status
            yield {"type": "complete", "content": full_response, "tools_used": tools_used}
            
        except Exception as e:
            logger.error(f"Error in streaming agent execution: {str(e)}")
            yield {"type": "error", "content": f"Error: {str(e)}"}

    async def execute_agent(
        self, 
        agent: Agent, 
        user_message: str, 
        conversation_history: List[Dict[str, str]] = None,
        session_id: str = None
    ) -> Tuple[str, List[str], float]:
        """
        Execute an agent with the given message and return response, tools used, and cost
        """
        if not self.openai_client:
            return "OpenAI API not configured. Please set OPENAI_API_KEY.", [], 0.0

        try:
            # Prepare conversation history
            messages = self._prepare_messages(agent, user_message, conversation_history)
            
            # Prepare tools if agent has any
            tools = await self._prepare_tools(agent)
            
            # Make API call
            response = await self.openai_client.chat.completions.create(
                model=agent.model or "gpt-4o-mini",
                messages=messages,
                tools=tools if tools else None,
                tool_choice="auto" if tools else None,
                temperature=0.7,
                max_tokens=1000
            )
            
            # Process response
            assistant_message = response.choices[0].message
            tools_used = []
            
            # Handle tool calls if any
            if assistant_message.tool_calls:
                # Add the assistant message with tool calls to the conversation
                messages.append({
                    "role": "assistant",
                    "content": assistant_message.content,
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments
                            }
                        } for tc in assistant_message.tool_calls
                    ]
                })
                
                tools_used = await self._handle_tool_calls(
                    agent, assistant_message.tool_calls, messages
                )
                
                # Make a follow-up call to get the final response after tool execution
                logger.info(f"🔄 Making follow-up call to process tool results...")
                follow_up_response = await self.openai_client.chat.completions.create(
                    model=agent.model or "gpt-4o-mini",
                    messages=messages,  # Now includes assistant message + tool results
                    temperature=0.7,
                    max_tokens=1000
                )
                
                # Get the final response content
                final_message = follow_up_response.choices[0].message
                agent_response = final_message.content or "No response generated."
            else:
                agent_response = assistant_message.content or "No response generated."
            
            # Calculate cost
            cost = await self._calculate_cost(response, tools_used)
            
            logger.info(f"🚀 Agent {agent.id} execution completed with {len(tools_used)} tools used")
            logger.info(f"💰 Execution cost: ${cost:.4f}")
            
            return agent_response, tools_used, cost
            
        except Exception as e:
            logger.error(f"Error executing agent {agent.id}: {str(e)}")
            return f"Error: {str(e)}", [], 0.0

    def _prepare_messages(
        self, 
        agent: Agent, 
        user_message: str, 
        conversation_history: List[Dict[str, str]] = None
    ) -> List[Dict[str, str]]:
        """Prepare messages for OpenAI API"""
        messages = []
        
        # System message with agent instructions
        system_message = f"""You are {agent.name}, an AI agent with the following instructions:

{agent.instructions}

Please respond in a helpful and professional manner. If you have access to tools, use them when appropriate to provide accurate and up-to-date information."""

        messages.append({"role": "system", "content": system_message})
        
        # Add conversation history
        if conversation_history:
            messages.extend(conversation_history)
        
        # Add current user message
        messages.append({"role": "user", "content": user_message})
        
        return messages

    def _sanitize_tool_name(self, tool_name: str) -> str:
        """Sanitize tool name to match OpenAI function calling requirements"""
        # Replace spaces and special characters with underscores
        sanitized = re.sub(r'[^a-zA-Z0-9_-]', '_', tool_name)
        # Ensure it starts with a letter or underscore
        if sanitized and not sanitized[0].isalpha() and sanitized[0] != '_':
            sanitized = 'tool_' + sanitized
        # Ensure it's not empty
        if not sanitized:
            sanitized = 'unknown_tool'
        return sanitized.lower()

    async def _prepare_tools(self, agent: Agent) -> List[Dict[str, Any]]:
        """Prepare tools for the agent"""
        if not agent.tools:
            return []
        
        tools = []
        for tool_config in agent.tools:
            # Get tool details from database if tool_id is provided
            if isinstance(tool_config, dict) and tool_config.get('tool_id'):
                result = await self.db.execute(
                    select(Tool).where(Tool.id == tool_config['tool_id'])
                )
                tool = result.scalar_one_or_none()
                if tool:
                    # Get tool parameters from the tool registry
                    tool_class = tool_registry.get_tool_class(tool.name.lower())
                    if tool_class:
                        # Create temporary instance to get tool info
                        temp_config = tool.config.copy()
                        temp_config['name'] = tool.name
                        temp_instance = tool_class(temp_config)
                        
                        # Get tool information
                        tool_info = getattr(temp_instance, 'get_tool_info', lambda: {})()
                        
                        tools.append({
                            "type": "function",
                            "function": {
                                "name": self._sanitize_tool_name(tool.name),
                                "description": tool.description or tool_info.get('description', f"Tool: {tool.name}"),
                                "parameters": self._get_tool_parameters(tool, tool_info)
                            }
                        })
                    else:
                        # Fallback to database config
                        tools.append({
                            "type": "function",
                            "function": {
                                "name": self._sanitize_tool_name(tool.name),
                                "description": tool.description or f"Tool: {tool.name}",
                                "parameters": tool.config.get('parameters', {})
                            }
                        })
            else:
                # Handle inline tool configuration
                # Check if this is a tool with an 'id' field (new format)
                if isinstance(tool_config, dict) and 'id' in tool_config:
                    # Get tool from database using the 'id' field
                    result = await self.db.execute(
                        select(Tool).where(Tool.id == tool_config['id'])
                    )
                    tool = result.scalar_one_or_none()
                    if tool:
                        tools.append({
                            "type": "function",
                            "function": {
                                "name": self._sanitize_tool_name(tool.name),
                                "description": tool.description or f"Tool: {tool.name}",
                                "parameters": self._get_tool_parameters(tool, {})
                            }
                        })
                        continue
                
                # Fallback to inline configuration
                tools.append({
                    "type": "function",
                    "function": {
                        "name": self._sanitize_tool_name(tool_config.get('name', 'unknown_tool')),
                        "description": tool_config.get('description', ''),
                        "parameters": tool_config.get('parameters', {})
                    }
                })
        
        return tools

    def _get_tool_parameters(self, tool: Tool, tool_info: Dict[str, Any]) -> Dict[str, Any]:
        """Get tool parameters for OpenAI function calling"""
        # Check if we have parameters in the database config first
        if tool.config and 'parameters' in tool.config and isinstance(tool.config['parameters'], dict):
            db_params = tool.config['parameters']
            if db_params.get('type') == 'object' and 'properties' in db_params:
                logger.info(f"Using database parameters for {tool.name}: {db_params}")
                return db_params
        
        # Create parameters based on tool type and name
        properties = {}
        required = []
        
        # Add tool-specific parameters
        if 'search' in tool.name.lower():
            properties['query'] = {
                'type': 'string',
                'description': 'Search query or keywords to search for'
            }
            required.append('query')
            
            if 'web' in tool.name.lower():
                properties['result_type'] = {
                    'type': 'string',
                    'description': 'Type of results to return',
                    'enum': ['web', 'news', 'images'],
                    'default': 'web'
                }
                properties['max_results'] = {
                    'type': 'integer',
                    'description': 'Maximum number of results to return',
                    'default': 10,
                    'minimum': 1,
                    'maximum': 50
                }
        elif 'weather' in tool.name.lower():
            properties['location'] = {
                'type': 'string',
                'description': 'Location for weather information (city, coordinates, etc.)'
            }
            required.append('location')
            
            properties['forecast_type'] = {
                'type': 'string',
                'description': 'Type of weather forecast',
                'enum': ['current', 'daily', 'hourly'],
                'default': 'current'
            }
        elif 'email' in tool.name.lower():
            properties.update({
                'to': {
                    'type': 'string',
                    'description': 'Recipient email address'
                },
                'subject': {
                    'type': 'string', 
                    'description': 'Email subject'
                },
                'body': {
                    'type': 'string',
                    'description': 'Email body content'
                }
            })
            required.extend(['to', 'subject', 'body'])
        else:
            # Generic fallback
            properties['input'] = {
                'type': 'string',
                'description': f'Input for {tool.name}'
            }
            required.append('input')
        
        result = {
            'type': 'object',
            'properties': properties,
            'required': required
        }
        
        logger.info(f"Generated parameters for {tool.name}: {result}")
        return result

    async def _handle_tool_calls(
        self, 
        agent: Agent, 
        tool_calls: List[Any], 
        messages: List[Dict[str, str]]
    ) -> List[str]:
        """Handle tool calls from the AI model"""
        tools_used = []
        
        logger.info(f"Agent {agent.id} ({agent.name}) is calling {len(tool_calls)} tool(s)")
        
        for tool_call in tool_calls:
            tool_name = tool_call.function.name
            tool_args = tool_call.function.arguments
            tools_used.append(tool_name)
            
            logger.info(f"🔧 Tool Call: {tool_name}")
            logger.info(f"📋 Arguments: {tool_args}")
            
            start_time = time.time()
            try:
                # Execute the tool using the registry
                tool_result = await self._execute_tool(tool_name, tool_args)
                execution_time = time.time() - start_time
                
                # Log successful tool execution
                logger.info(f"✅ Tool '{tool_name}' executed successfully")
                logger.info(f"📤 Tool Result: {str(tool_result)[:200]}{'...' if len(str(tool_result)) > 200 else ''}")
                
                # Track tool usage
                tool_usage_tracker.log_tool_execution(
                    agent_id=agent.id,
                    agent_name=agent.name,
                    tool_name=tool_name,
                    success=True,
                    execution_time=execution_time,
                    result_size=len(str(tool_result)),
                    category="unknown"  # Will be enhanced later with actual category
                )
                
                # Add tool response to messages
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": str(tool_result)
                })
                
            except Exception as e:
                execution_time = time.time() - start_time
                logger.error(f"❌ Error executing tool {tool_name}: {str(e)}")
                
                # Track failed tool usage
                tool_usage_tracker.log_tool_execution(
                    agent_id=agent.id,
                    agent_name=agent.name,
                    tool_name=tool_name,
                    success=False,
                    execution_time=execution_time,
                    result_size=0,
                    category="unknown"
                )
                
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": f"Error executing tool: {str(e)}"
                })
        
        if tools_used:
            logger.info(f"🎯 Agent {agent.id} successfully used {len(tools_used)} tool(s): {', '.join(tools_used)}")
            # Log session summary periodically (every 10 tool uses)
            if tool_usage_tracker.session_stats['total_tools_used'] % 10 == 0:
                tool_usage_tracker.log_session_summary()
        
        return tools_used

    async def _handle_tool_calls_stream(
        self, 
        agent: Agent, 
        tool_calls: List[Dict], 
        messages: List[Dict[str, str]]
    ) -> List[str]:
        """Handle tool calls with streaming updates"""
        tools_used = []
        
        for i, tool_call in enumerate(tool_calls):
            try:
                tool_name = tool_call["function"]["name"]
                arguments = tool_call["function"]["arguments"]
                
                logger.info(f"🔧 Tool Call: {tool_name}")
                logger.info(f"📋 Arguments: {arguments}")
                
                # Execute tool
                logger.info(f"🔄 Starting tool execution: {tool_name}")
                tool_result = await self._execute_tool(tool_name, arguments)
                logger.info(f"✅ Tool execution completed: {tool_name}")
                
                # Add tool result to messages
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "content": tool_result
                })
                
                tools_used.append(tool_name)
                
                logger.info(f"✅ Tool '{tool_name}' executed successfully")
                logger.info(f"📤 Tool Result: {tool_result}")
                
            except Exception as e:
                error_msg = f"Tool execution failed: {str(e)}"
                logger.error(f"❌ Tool {tool_name} failed: {str(e)}")
                
                # Add error to messages
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "content": error_msg
                })
        
        return tools_used

    async def _execute_tool(self, tool_name: str, arguments: str) -> str:
        """Execute a specific tool using the tool registry"""
        try:
            args = json.loads(arguments) if isinstance(arguments, str) else arguments
            
            # Find tool in database by matching sanitized names
            result = await self.db.execute(select(Tool))
            tools = result.scalars().all()
            
            tool = None
            for t in tools:
                if self._sanitize_tool_name(t.name) == tool_name:
                    tool = t
                    break
            
            if not tool:
                logger.error(f"Tool '{tool_name}' not found in database. Available tools: {[t.name for t in tools]}")
                return f"Tool '{tool_name}' not found in database"
            
            logger.info(f"Executing tool: {tool.name} with args: {args}")
            
            # Extract operation and other parameters
            operation = args.get('operation')
            tool_params = {k: v for k, v in args.items() if k != 'operation'}
            
            # Execute tool using registry with sanitized name
            sanitized_tool_name = self._sanitize_tool_name(tool.name)
            logger.info(f"🔄 Mapping tool: '{tool.name}' -> '{sanitized_tool_name}'")
            
            result = await tool_registry.execute_tool(
                tool_name=sanitized_tool_name,
                config=tool.config,
                operation=operation,
                **tool_params
            )
            
            if result.get('success'):
                # Return the actual result
                logger.info(f"Tool {tool.name} executed successfully")
                return str(result.get('result', 'Tool executed successfully'))
            else:
                # Return error message
                error_msg = f"Tool execution failed: {result.get('error', 'Unknown error')}"
                logger.error(f"Tool {tool.name} failed: {error_msg}")
                return error_msg
                
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {str(e)}")
            return f"Error executing tool {tool_name}: {str(e)}"

    async def _calculate_cost(self, response: Any, tools_used: List[str]) -> float:
        """Calculate the cost of the API call"""
        # Basic cost calculation
        input_tokens = response.usage.prompt_tokens if response.usage else 0
        output_tokens = response.usage.completion_tokens if response.usage else 0
        
        # Rough cost estimation (adjust based on your pricing)
        input_cost = input_tokens * 0.000001  # $0.001 per 1K tokens
        output_cost = output_tokens * 0.000002  # $0.002 per 1K tokens
        tool_cost = len(tools_used) * 0.01  # $0.01 per tool call
        
        return input_cost + output_cost + tool_cost

    async def get_conversation_history(self, conversation_id: int) -> List[Dict[str, str]]:
        """Get conversation history for context"""
        result = await self.db.execute(
            select(Message).where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        messages = result.scalars().all()
        
        history = []
        for msg in messages:
            if msg.role in ['user', 'assistant']:
                history.append({
                    "role": msg.role,
                    "content": msg.content
                })
        
        return history 