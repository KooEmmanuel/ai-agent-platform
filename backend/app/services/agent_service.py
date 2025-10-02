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
from app.services.json_tool_loader import json_tool_loader
from app.services.tool_system_prompts import tool_system_prompts_service

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

    def _get_max_tokens_for_model(self, model: str) -> int:
        """Get appropriate max_tokens based on the model"""
        model_max_tokens = {
            "gpt-4o-mini": 4000,
            "gpt-4o": 8000,
            "gpt-4.1": 8000,
            "gpt-5": 12000,
            "o1": 6000,  # O1 models have different token limits
            "o3": 10000
        }
        return model_max_tokens.get(model, 4000)  # Default to 4000 if model not found

    async def execute_agent_stream(
        self, 
        agent: Agent, 
        user_message: str, 
        conversation_history: List[Dict[str, str]] = None,
        session_id: str = None,
        user_id: int = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Execute an agent with streaming response
        """
        if not self.openai_client:
            yield {"type": "error", "content": "OpenAI API not configured. Please set OPENAI_API_KEY."}
            return

        try:
            # Prepare conversation history
            messages = await self._prepare_messages(agent, user_message, conversation_history)
            
            # Prepare tools if agent has any
            tools = await self._prepare_tools(agent)
            
            # Check if agent has web search tools and add OpenAI web search
            has_web_search = any('web_search' in str(tool).lower() for tool in tools) if tools else False
            
            # Add OpenAI's web search tool if agent has web search capabilities
            if has_web_search:
                logger.info("🌐 Adding OpenAI web search tool")
                if not tools:
                    tools = []
                tools.append({
                    "type": "web_search"
                })
            
            # Make streaming API call
            # Use agent's configured max_tokens if available, otherwise fall back to model defaults
            if agent.context_config and 'max_tokens' in agent.context_config:
                max_tokens = agent.context_config['max_tokens']
                logger.info(f"🤖 Using model: {agent.model or 'gpt-4o-mini'} with configured max_tokens: {max_tokens}")
            else:
                max_tokens = self._get_max_tokens_for_model(agent.model or "gpt-4o-mini")
                logger.info(f"🤖 Using model: {agent.model or 'gpt-4o-mini'} with default max_tokens: {max_tokens}")
            stream = await self.openai_client.chat.completions.create(
                model=agent.model or "gpt-4o-mini",
                messages=messages,
                tools=tools if tools else None,
                tool_choice="auto" if tools else None,
                temperature=0.7,
                max_tokens=max_tokens,
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
                    agent, assistant_message["tool_calls"], messages, user_id
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
        session_id: str = None,
        user_id: int = None
    ) -> Tuple[str, List[str], float]:
        """
        Execute an agent with the given message and return response, tools used, and cost
        """
        if not self.openai_client:
            return "OpenAI API not configured. Please set OPENAI_API_KEY.", [], 0.0

        try:
            # Prepare conversation history
            messages = await self._prepare_messages(agent, user_message, conversation_history)
            
            # Prepare tools if agent has any
            tools = await self._prepare_tools(agent)
            
            # Log the tools being sent to the AI
            logger.info(f"🛠️ Tools being sent to AI: {[tool['function']['name'] for tool in tools] if tools else 'No tools'}")
            logger.info(f"📝 Tool descriptions: {[tool['function']['description'] for tool in tools] if tools else 'No descriptions'}")
            
            # Detailed tool logging
            if tools:
                logger.info(f"🔍 DETAILED TOOL INFORMATION:")
                for i, tool in enumerate(tools):
                    logger.info(f"  Tool {i+1}: {tool['function']['name']}")
                    logger.info(f"    Description: {tool['function']['description']}")
                    logger.info(f"    Parameters: {tool['function']['parameters']}")
                    logger.info(f"    ---")
            else:
                logger.warning(f"⚠️ No tools available for agent {agent.id} ({agent.name})")
            
            # Check if agent has web search tools and add OpenAI web search
            has_web_search = any('web_search' in str(tool).lower() for tool in tools) if tools else False
            
            # Add OpenAI's web search tool if agent has web search capabilities
            if has_web_search:
                logger.info("🌐 Adding OpenAI web search tool")
                if not tools:
                    tools = []
                tools.append({
                    "type": "web_search"
                })
            
            # Make API call
            # Use agent's configured max_tokens if available, otherwise fall back to model defaults
            if agent.context_config and 'max_tokens' in agent.context_config:
                max_tokens = agent.context_config['max_tokens']
                logger.info(f"🤖 Using model: {agent.model or 'gpt-4o-mini'} with configured max_tokens: {max_tokens}")
            else:
                max_tokens = self._get_max_tokens_for_model(agent.model or "gpt-4o-mini")
                logger.info(f"🤖 Using model: {agent.model or 'gpt-4o-mini'} with default max_tokens: {max_tokens}")
            response = await self.openai_client.chat.completions.create(
                model=agent.model or "gpt-4o-mini",
                messages=messages,
                tools=tools if tools else None,
                tool_choice="auto" if tools else None,  # Let AI decide when to use tools
                temperature=0.7,
                max_tokens=max_tokens
            )
            
            # Process response
            assistant_message = response.choices[0].message
            tools_used = []
            
            # Log the assistant's response for debugging
            logger.info(f"🤖 Assistant response: {assistant_message.content}")
            logger.info(f"🔧 Tool calls: {assistant_message.tool_calls}")
            
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
                    agent, assistant_message.tool_calls, messages, user_id
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

    async def _prepare_messages(
        self, 
        agent: Agent, 
        user_message: str, 
        conversation_history: List[Dict[str, str]] = None
    ) -> List[Dict[str, str]]:
        """Prepare messages for OpenAI API"""
        messages = []
        
        # Get current date and time
        from datetime import datetime
        current_datetime = datetime.now()
        current_date = current_datetime.strftime("%Y-%m-%d")
        current_time = current_datetime.strftime("%H:%M:%S")
        current_timezone = current_datetime.strftime("%Z")
        day_of_week = current_datetime.strftime("%A")
        
        # Get available tools for the agent
        tools = await self._prepare_tools(agent)
        tool_names = [tool['function']['name'] for tool in tools] if tools else []
        
        # Build system message using agent's own instructions
        system_message_parts = [
            f"You are {agent.name}, an AI agent with the following instructions:",
            "",
            agent.instructions,
            "",
            f"**CURRENT DATE AND TIME:** {current_date} ({day_of_week}) at {current_time} {current_timezone}",
            ""
        ]
        
        # Add tool information if tools are available
        if tool_names:
            system_message_parts.extend([
                f"**AVAILABLE TOOLS:** You have access to: {', '.join(tool_names)}",
                ""
            ])
            
            # Add tool descriptions to help the AI understand when to use each tool
            for tool in tools:
                tool_name = tool['function']['name']
                tool_description = tool['function']['description']
                system_message_parts.extend([
                    f"**{tool_name}:** {tool_description}",
                    ""
                ])
            
            # Add tool-specific system prompts for each tool
            tool_prompts = tool_system_prompts_service.get_tool_prompts(tool_names)
            if tool_prompts:
                system_message_parts.extend([
                    "**TOOL-SPECIFIC GUIDANCE:**",
                    ""
                ])
                for prompt in tool_prompts:
                    system_message_parts.extend([
                        prompt,
                        ""
                    ])
            
            system_message_parts.extend([
                "**TOOL USAGE:** Use these tools when they can help you provide better service to users.",
                ""
            ])
        
        system_message = "\n".join(system_message_parts)

        messages.append({"role": "system", "content": system_message})
        
        # Add conversation history
        if conversation_history:
            # Adding {len(conversation_history)} conversation history messages to context
            messages.extend(conversation_history)
        else:
            logger.warning("⚠️  No conversation history provided - agent will not have context from previous messages")
        
        # Add current user message
        messages.append({"role": "user", "content": user_message})
        
        # Log the messages being sent for debugging
        # System message length: {len(system_message)} characters, Total messages: {len(messages)}
        
        # Agent: {agent.name} (ID: {agent.id}) with {len(tools)} tools
        
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
        logger.info(f"🔧 Preparing tools for agent {agent.id} ({agent.name})")
        logger.info(f"📋 Agent tools configuration: {agent.tools}")
        
        if not agent.tools:
            logger.warning(f"⚠️ Agent {agent.id} has no tools configured")
            return []
        
        tools = []
        # Processing tool configurations
        
        for i, tool_config in enumerate(agent.tools):
            # Get tool details from database if tool_id is provided
            if isinstance(tool_config, dict) and tool_config.get('tool_id'):
                result = await self.db.execute(
                    select(Tool).where(Tool.id == tool_config['tool_id'])
                )
                tool = result.scalar_one_or_none()
                if not tool:
                    logger.error(f"❌ Tool not found in database for tool_id: {tool_config['tool_id']}")
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
                        logger.info(f"✅ Added tool '{tool.name}' (fallback config) to agent's tool list")
            else:
                # Handle inline tool configuration
                # Check if this is a tool with an 'id' field (new format)
                if isinstance(tool_config, dict) and 'id' in tool_config:
                    # First try to get tool by ID
                    tool_data = json_tool_loader.get_tool_by_id(tool_config['id'])
                    
                    # Check if the found tool matches the expected name
                    expected_tool_name = tool_config.get('name')
                    if tool_data and expected_tool_name:
                        found_tool_name = tool_data.get('name')
                        if found_tool_name != expected_tool_name:
                            tool_data_by_name = json_tool_loader.get_tool_by_name(expected_tool_name)
                            if tool_data_by_name:
                                tool_data = tool_data_by_name
                    
                    # If not found by ID, try to get by name from the tool_config
                    if not tool_data and 'name' in tool_config:
                        expected_tool_name = tool_config['name']
                        tool_data = json_tool_loader.get_tool_by_name(expected_tool_name)
                    
                    if tool_data:
                        tool_name = tool_data.get('name')
                        tool_description = tool_data.get('description', '')
                        tool_config_data = tool_data.get('config', {})
                        
                        # Try to get tool class from registry
                        tool_class = tool_registry.get_tool_class(tool_name.lower())
                        if tool_class:
                            # Create temporary instance to get tool info
                            # Merge base config with custom config for proper initialization
                            temp_config = tool_config_data.copy()
                            if 'custom_config' in tool_config:
                                temp_config.update(tool_config['custom_config'])
                            temp_config['name'] = tool_name
                            
                            # Special handling for Google Suite tool - load stored tokens from database
                            if tool_name.lower() == 'google_suite_tool':
                                try:
                                    from app.core.config import settings
                                    result = await self.db.execute(
                                        select(Tool).where(Tool.name == 'google_suite_tool')
                                    )
                                    stored_tool = result.scalar_one_or_none()
                                    if stored_tool and stored_tool.config:
                                        print(f"🔍 Agent Service - Loading stored Google Suite config with tokens")
                                        print(f"🔍 Agent Service - Has access_token: {bool(stored_tool.config.get('access_token'))}")
                                        print(f"🔍 Agent Service - Has refresh_token: {bool(stored_tool.config.get('refresh_token'))}")
                                        temp_config.update(stored_tool.config)
                                    else:
                                        print(f"🔍 Agent Service - No stored Google Suite config found, using defaults")
                                        # Ensure we have the correct OAuth settings
                                        temp_config['client_id'] = settings.GOOGLE_CLIENT_ID
                                        temp_config['client_secret'] = settings.GOOGLE_CLIENT_SECRET
                                        temp_config['redirect_uri'] = 'http://localhost:3000/auth/google/callback'
                                except Exception as e:
                                    print(f"❌ Agent Service - Error loading Google Suite config: {e}")
                                    # Fallback to default config
                                    temp_config['client_id'] = settings.GOOGLE_CLIENT_ID
                                    temp_config['client_secret'] = settings.GOOGLE_CLIENT_SECRET
                                    temp_config['redirect_uri'] = 'http://localhost:3000/auth/google/callback'
                            
                            temp_instance = tool_class(temp_config)
                            
                            # Get tool information
                            tool_info = getattr(temp_instance, 'get_tool_info', lambda: {})()
                            
                            tools.append({
                                "type": "function",
                                "function": {
                                    "name": self._sanitize_tool_name(tool_name),
                                    "description": tool_description or tool_info.get('description', f"Tool: {tool_name}"),
                                    "parameters": self._get_tool_parameters_from_json(tool_config_data, tool_info)
                                }
                            })
                        else:
                            logger.warning(f"⚠️ Tool class not found for {tool_name}, using fallback")
                            tools.append({
                                "type": "function",
                                "function": {
                                    "name": self._sanitize_tool_name(tool_name),
                                    "description": tool_description or f"Tool: {tool_name}",
                                    "parameters": self._get_tool_parameters_from_json(tool_config_data, {})
                                }
                            })
                            logger.info(f"✅ Added tool '{tool_name}' (by ID/name fallback) to agent's tool list")
                        continue
                    else:
                        logger.error(f"❌ Tool not found in JSON for ID: {tool_config['id']} or name: {tool_config.get('name', 'N/A')}")
                        logger.error(f"❌ Falling back to inline tool processing")
                
                # Fallback to inline configuration
                tool_name = tool_config.get('name', 'unknown_tool')
                tools.append({
                    "type": "function",
                    "function": {
                        "name": self._sanitize_tool_name(tool_name),
                        "description": tool_config.get('description', ''),
                        "parameters": tool_config.get('parameters', {})
                    }
                })
                logger.info(f"✅ Added inline tool '{tool_name}' to agent's tool list")
        
        # Final tool count: {len(tools)} tools
        return tools

    def _get_tool_parameters_from_json(self, tool_config: Dict[str, Any], tool_info: Dict[str, Any]) -> Dict[str, Any]:
        """Get tool parameters for OpenAI function calling from JSON config"""
        # Check if we have parameters in the JSON config first
        if tool_config and 'parameters' in tool_config and isinstance(tool_config['parameters'], dict):
            json_params = tool_config['parameters']
            if json_params.get('type') == 'object' and 'properties' in json_params:
                # logger.info(f"Using JSON parameters: {json_params}")
                return json_params
        
        # Fallback to tool_info parameters
        if tool_info and 'parameters' in tool_info:
            # logger.info(f"Using tool_info parameters: {tool_info['parameters']}")
            return tool_info['parameters']
        
        # Create basic parameters structure
        return {
            "type": "object",
            "properties": {},
            "required": []
        }
    
    def _get_tool_parameters(self, tool: Tool, tool_info: Dict[str, Any]) -> Dict[str, Any]:
        """Get tool parameters for OpenAI function calling (legacy database method)"""
        # Check if we have parameters in the database config first
        if tool.config and 'parameters' in tool.config and isinstance(tool.config['parameters'], dict):
            db_params = tool.config['parameters']
            if db_params.get('type') == 'object' and 'properties' in db_params:
                # logger.info(f"Using database parameters for {tool.name}: {db_params}")
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
        messages: List[Dict[str, str]],
        user_id: int = None
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
                tool_result = await self._execute_tool(tool_name, tool_args, agent, user_id)
                execution_time = time.time() - start_time
                
                # Log successful tool execution
                # logger.info(f"✅ Tool '{tool_name}' executed successfully")
                # logger.info(f"📤 Tool Result: {str(tool_result)[:200]}{'...' if len(str(tool_result)) > 200 else ''}")
                
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
                # Sanitize tool result to avoid sending massive base64 content to AI
                if isinstance(tool_result, dict):
                    sanitized_result = self._sanitize_tool_result_for_ai(tool_result)
                    content = json.dumps(sanitized_result)
                    # logger.info(f"📤 Sending sanitized tool result to AI: {content[:200]}...")
                else:
                    content = str(tool_result)
                    # logger.info(f"📤 Sending string tool result to AI: {content[:200]}...")
                
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": content
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
            # logger.info(f"🎯 Agent {agent.id} successfully used {len(tools_used)} tool(s): {', '.join(tools_used)}")
            # Log session summary periodically (every 10 tool uses)
            if tool_usage_tracker.session_stats['total_tools_used'] % 10 == 0:
                tool_usage_tracker.log_session_summary()
        
        return tools_used

    async def _handle_tool_calls_stream(
        self, 
        agent: Agent, 
        tool_calls: List[Dict], 
        messages: List[Dict[str, str]],
        user_id: int = None
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
                tool_result = await self._execute_tool(tool_name, arguments, agent, user_id)
                logger.info(f"✅ Tool execution completed: {tool_name}")
                
                # Add tool result to messages
                # Sanitize tool result to avoid sending massive base64 content to AI
                if isinstance(tool_result, dict):
                    sanitized_result = self._sanitize_tool_result_for_ai(tool_result)
                    content = json.dumps(sanitized_result)
                    logger.info(f"📤 Sending sanitized tool result to AI: {content[:200]}...")
                else:
                    content = str(tool_result)
                    logger.info(f"📤 Sending string tool result to AI: {content[:200]}...")
                
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "content": content
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

    async def _execute_tool(self, tool_name: str, arguments: str, agent: Agent = None, user_id: int = None) -> str:
        """Execute a specific tool using the tool registry"""
        try:
            args = json.loads(arguments) if isinstance(arguments, str) else arguments
            
            # Get tools that are available to this agent from JSON
            if agent and agent.tools:
                # Get tool IDs from agent's tool collection
                tool_ids = []
                for tool_config in agent.tools:
                    if isinstance(tool_config, dict):
                        if 'tool_id' in tool_config:
                            tool_ids.append(tool_config['tool_id'])
                        elif 'id' in tool_config:
                            tool_ids.append(tool_config['id'])
                
                # Find the tool in JSON by name
                tool_data = None
                for tool_id in tool_ids:
                    json_tool = json_tool_loader.get_tool_by_id(tool_id)
                    if json_tool and self._sanitize_tool_name(json_tool.get('name', '')) == tool_name:
                        tool_data = json_tool
                        break
                
                # If not found by ID, try to find by name directly
                if not tool_data:
                    tool_data = json_tool_loader.get_tool_by_name(tool_name)
            else:
                # Fallback: search all tools in JSON by name
                tool_data = json_tool_loader.get_tool_by_name(tool_name)
            
            if not tool_data:
                logger.error(f"Tool '{tool_name}' not found in agent's tool collection")
                return f"Tool '{tool_name}' not found in agent's tool collection"
            
            tool_name_from_json = tool_data.get('name', tool_name)
            logger.info(f"Executing tool: {tool_name_from_json} with args: {args}")
            
            # Extract operation and other parameters
            operation = args.get('operation')
            tool_params = {k: v for k, v in args.items() if k != 'operation'}
            
            # Merge agent's custom configuration with base tool configuration from JSON
            merged_config = tool_data.get('config', {}).copy()
            
            # Find the agent's custom config for this tool
            if agent and agent.tools:
                for agent_tool_config in agent.tools:
                    if isinstance(agent_tool_config, dict):
                        tool_id = agent_tool_config.get('id') or agent_tool_config.get('tool_id')
                        json_tool_id = tool_data.get('id')
                        if tool_id == json_tool_id and 'custom_config' in agent_tool_config:
                            logger.info(f"🔧 Merging custom config for tool {tool_name_from_json}: {agent_tool_config['custom_config']}")
                            merged_config.update(agent_tool_config['custom_config'])
                            break
            
            # Special handling for Google Suite tool - load stored tokens from database
            if tool_name_from_json.lower() == 'google_suite_tool':
                try:
                    # Get all Google Suite tool records (there might be multiple)
                    result = await self.db.execute(
                        select(Tool).where(Tool.name == 'google_suite_tool')
                    )
                    stored_tools = result.scalars().all()
                    
                    if stored_tools:
                        # Find the most recent one with tokens
                        latest_tool = None
                        for tool in stored_tools:
                            if tool.config and (tool.config.get('access_token') or tool.config.get('refresh_token')):
                                latest_tool = tool
                                break
                        
                        if latest_tool:
                            logger.info(f"🔍 Tool Execution - Loading stored Google Suite config with tokens")
                            logger.info(f"🔍 Tool Execution - Has access_token: {bool(latest_tool.config.get('access_token'))}")
                            logger.info(f"🔍 Tool Execution - Has refresh_token: {bool(latest_tool.config.get('refresh_token'))}")
                            merged_config.update(latest_tool.config)
                        else:
                            logger.info(f"🔍 Tool Execution - No stored Google Suite config with tokens found, using defaults")
                            # Ensure we have the correct OAuth settings
                            merged_config['client_id'] = settings.GOOGLE_CLIENT_ID
                            merged_config['client_secret'] = settings.GOOGLE_CLIENT_SECRET
                            merged_config['redirect_uri'] = 'http://localhost:3000/auth/google/callback'
                    else:
                        logger.info(f"🔍 Tool Execution - No stored Google Suite config found, using defaults")
                        # Ensure we have the correct OAuth settings
                        merged_config['client_id'] = settings.GOOGLE_CLIENT_ID
                        merged_config['client_secret'] = settings.GOOGLE_CLIENT_SECRET
                        merged_config['redirect_uri'] = 'http://localhost:3000/auth/google/callback'
                except Exception as e:
                    logger.error(f"❌ Tool Execution - Error loading Google Suite config: {e}")
                    # Fallback to default config
                    merged_config['client_id'] = settings.GOOGLE_CLIENT_ID
                    merged_config['client_secret'] = settings.GOOGLE_CLIENT_SECRET
                    merged_config['redirect_uri'] = 'http://localhost:3000/auth/google/callback'
            
            logger.info(f"🔧 Final merged config for {tool_name_from_json}: {merged_config}")
            
            # Execute tool using registry with sanitized name
            sanitized_tool_name = self._sanitize_tool_name(tool_name_from_json)
            logger.info(f"🔄 Mapping tool: '{tool_name_from_json}' -> '{sanitized_tool_name}'")
            
            # Add user_id to tool_params for tools that need it (like PDF generator)
            # Priority: passed user_id > agent.user_id
            if user_id:
                tool_params['user_id'] = user_id
            elif agent and hasattr(agent, 'user_id'):
                tool_params['user_id'] = agent.user_id
            
            result = await tool_registry.execute_tool(
                tool_name=sanitized_tool_name,
                config=merged_config,  # Use merged config from JSON
                operation=operation,
                **tool_params
            )
            
            if result.get('success'):
                # Return the full result dictionary so frontend can access download_url, etc.
                logger.info(f"Tool {tool_name_from_json} executed successfully")
                logger.info(f"📤 Full tool result: {result}")
                logger.info(f"📤 Result type: {type(result)}")
                logger.info(f"📤 Result keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
                if isinstance(result, dict) and 'download_url' in result:
                    logger.info(f"📤 Download URL: {result['download_url'][:100]}...")
                return result
            else:
                # Return error message
                error_msg = f"Tool execution failed: {result.get('error', 'Unknown error')}"
                logger.error(f"Tool {tool_name_from_json} failed: {error_msg}")
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

    def _sanitize_tool_result_for_ai(self, tool_result: dict) -> dict:
        """Sanitize tool result to remove large base64 content before sending to AI"""
        sanitized = tool_result.copy()
        
        # Remove or truncate large base64 content
        if 'data' in sanitized and isinstance(sanitized['data'], dict):
            data = sanitized['data'].copy()
            if 'pdf_content' in data:
                # Replace with a placeholder indicating the content exists
                data['pdf_content'] = f"[PDF_CONTENT_BASE64_LENGTH_{len(data['pdf_content'])}]"
            sanitized['data'] = data
        
        # Remove download_url if it contains base64 content
        if 'download_url' in sanitized and sanitized['download_url'].startswith('data:'):
            sanitized['download_url'] = "[DOWNLOAD_URL_AVAILABLE]"
        
        return sanitized

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