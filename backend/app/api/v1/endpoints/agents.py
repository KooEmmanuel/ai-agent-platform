"""
AI Agent management endpoints
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.core.auth import get_current_user
from app.core.database import get_db, User, Agent, Tool

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models
class AgentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    instructions: str
    tools: List[Dict[str, Any]] = []
    context_config: Optional[Dict[str, Any]] = None

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    tools: Optional[List[Dict[str, Any]]] = None
    context_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class AgentResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    instructions: str
    is_active: bool
    tools: List[Dict[str, Any]]
    context_config: Optional[Dict[str, Any]]
    created_at: str
    updated_at: Optional[str]
    tool_count: int = 0

@router.post("/", response_model=AgentResponse)
async def create_agent(
    agent_data: AgentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new AI agent"""
    from app.services.billing_service import BillingService
    
    # Initialize billing service
    billing_service = BillingService(db)
    
    # Check agent creation limit based on user's plan
    agent_check = await billing_service.check_agent_limit(current_user.id)
    
    if not agent_check['can_create']:
        plan_name = await billing_service.get_user_plan(current_user.id)
        max_agents = agent_check['max_allowed']
        current_count = agent_check['current_count']
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum number of agents reached ({current_count}/{max_agents} for {plan_name} plan). Upgrade your plan to create more agents."
        )
    
    # Agent creation is now FREE - no credits charged for creation
    # Credits are only consumed for actual AI usage (messages, tool executions)
    
    # Create new agent
    new_agent = Agent(
        user_id=current_user.id,
        name=agent_data.name,
        description=agent_data.description,
        instructions=agent_data.instructions,
        tools=agent_data.tools,
        context_config=agent_data.context_config or get_default_context_config()
    )
    
    db.add(new_agent)
    await db.commit()
    await db.refresh(new_agent)
    
    return AgentResponse(
        id=new_agent.id,
        name=new_agent.name,
        description=new_agent.description,
        instructions=new_agent.instructions,
        is_active=new_agent.is_active,
        tools=new_agent.tools or [],
        context_config=new_agent.context_config,
        created_at=new_agent.created_at.isoformat(),
        updated_at=new_agent.updated_at.isoformat() if new_agent.updated_at else None,
        tool_count=len(new_agent.tools or [])
    )

def get_default_context_config():
    """Get default context configuration for new agents"""
    return {
        "memory_strategy": {
            "type": "hybrid",
            "retention_policy": {
                "conversation_history": {
                    "enabled": True,
                    "max_messages": 50,
                    "max_days": 30,
                    "auto_cleanup": True
                },
                "user_preferences": {
                    "enabled": True,
                    "persistent": True,
                    "categories": ["product_preferences", "communication_style", "technical_level"]
                },
                "session_data": {
                    "enabled": True,
                    "max_sessions": 10,
                    "session_timeout": 3600
                }
            }
        },
        "context_management": {
            "context_window": {
                "max_tokens": 8000,
                "reserve_tokens": 1000,
                "overflow_strategy": "summarize"
            },
            "context_injection": {
                "system_context": {
                    "enabled": True,
                    "include_agent_info": True,
                    "include_user_info": True,
                    "include_conversation_summary": True
                },
                "dynamic_context": {
                    "enabled": True,
                    "include_relevant_history": True,
                    "include_user_preferences": True,
                    "include_session_state": True
                }
            },
            "memory_summarization": {
                "enabled": True,
                "strategy": "adaptive",
                "trigger_conditions": {
                    "message_count": 20,
                    "token_threshold": 6000,
                    "time_threshold": 3600
                },
                "summary_style": {
                    "include_key_points": True,
                    "include_user_preferences": True,
                    "include_action_items": True,
                    "max_summary_length": 500
                }
            }
        },
        "conversation_persistence": {
            "storage_strategy": {
                "type": "database",
                "encryption": False,
                "compression": True,
                "backup_frequency": "daily"
            },
            "data_retention": {
                "conversation_lifetime": 90,
                "metadata_lifetime": 365,
                "anonymization": {
                    "enabled": False,
                    "after_days": 30,
                    "fields": ["email", "phone", "address"]
                }
            }
        },
        "session_management": {
            "session_creation": {
                "auto_create": True,
                "session_naming": "auto",
                "session_grouping": {
                    "enabled": True,
                    "group_by": "platform",
                    "max_groups": 5
                }
            },
            "session_context": {
                "include_previous_sessions": True,
                "max_previous_sessions": 3,
                "context_merging": {
                    "enabled": True,
                    "strategy": "smart",
                    "priority": "recent"
                }
            }
        },
        "user_control": {
            "memory_permissions": {
                "allow_memory_clear": True,
                "allow_preference_edit": True,
                "allow_context_export": True,
                "allow_memory_import": True
            },
            "privacy_controls": {
                "data_collection": {
                    "conversation_content": True,
                    "user_preferences": True,
                    "interaction_patterns": False,
                    "performance_metrics": True
                },
                "data_sharing": {
                    "with_agent_owner": False,
                    "for_improvement": False,
                    "with_third_parties": False
                }
            }
        },
        "intelligent_features": {
            "context_learning": {
                "enabled": True,
                "learn_user_patterns": True,
                "adapt_responses": True,
                "personalize_experience": True
            },
            "memory_optimization": {
                "enabled": True,
                "auto_cleanup": True,
                "priority_retention": True,
                "smart_summarization": True
            },
            "context_relevance": {
                "enabled": True,
                "relevance_scoring": True,
                "dynamic_filtering": True,
                "context_boosting": True
            }
        }
    }

@router.get("/test")
async def test_agents_endpoint():
    """Test endpoint to verify the agents router is working"""
    return {"message": "Agents endpoint is working", "status": "ok"}

@router.get("/simple")
async def list_agents_simple(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Simple version of list agents to test serialization"""
    print(f"🔍 list_agents_simple called for user {current_user.id} ({current_user.email})")
    
    try:
        print(f"📊 Executing database query for user {current_user.id}")
        result = await db.execute(
            select(Agent).where(Agent.user_id == current_user.id)
        )
        agents = result.scalars().all()
        print(f"✅ Found {len(agents)} agents for user {current_user.id}")
        
        # Return simple data without complex serialization
        simple_agents = []
        for agent in agents:
            simple_agents.append({
                "id": agent.id,
                "name": agent.name,
                "description": agent.description,
                "instructions": agent.instructions,
                "is_active": agent.is_active,
                "created_at": agent.created_at.isoformat() if agent.created_at else None,
                "updated_at": agent.updated_at.isoformat() if agent.updated_at else None,
                "tool_count": len(agent.tools) if agent.tools else 0
            })
        
        print(f"✅ Returning {len(simple_agents)} agents (simple format)")
        return {"agents": simple_agents, "count": len(simple_agents)}
        
    except Exception as e:
        print(f"❌ Error in list_agents_simple: {e}")
        print(f"❌ Error type: {type(e).__name__}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise

@router.get("/", response_model=List[AgentResponse])
async def list_agents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all agents for the current user"""
    print(f"🚀 ENTERING list_agents endpoint for user {current_user.id} ({current_user.email})")
    print(f"🔍 list_agents called for user {current_user.id} ({current_user.email})")
    
    try:
        print(f"📊 Executing database query for user {current_user.id}")
        result = await db.execute(
            select(Agent).where(Agent.user_id == current_user.id)
        )
        agents = result.scalars().all()
        print(f"✅ Found {len(agents)} agents for user {current_user.id}")
        
        response_data = [
            AgentResponse(
                id=agent.id,
                name=agent.name,
                description=agent.description,
                instructions=agent.instructions,
                is_active=agent.is_active,
                tools=agent.tools or [],
                context_config=agent.context_config,
                created_at=agent.created_at.isoformat(),
                updated_at=agent.updated_at.isoformat() if agent.updated_at else None,
                tool_count=len(agent.tools or [])
            )
            for agent in agents
        ]
        
        print(f"✅ Returning {len(response_data)} agents")
        return response_data
        
    except Exception as e:
        print(f"❌ Error in list_agents: {e}")
        print(f"❌ Error type: {type(e).__name__}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific agent"""
    result = await db.execute(
        select(Agent).where(
            Agent.id == agent_id,
            Agent.user_id == current_user.id
        )
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        instructions=agent.instructions,
        is_active=agent.is_active,
        tools=agent.tools or [],
        context_config=agent.context_config,
        created_at=agent.created_at.isoformat(),
        updated_at=agent.updated_at.isoformat() if agent.updated_at else None,
        tool_count=len(agent.tools or [])
    )

@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: int,
    agent_data: AgentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an agent"""
    result = await db.execute(
        select(Agent).where(
            Agent.id == agent_id,
            Agent.user_id == current_user.id
        )
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Update fields
    if agent_data.name is not None:
        agent.name = agent_data.name
    if agent_data.description is not None:
        agent.description = agent_data.description
    if agent_data.instructions is not None:
        agent.instructions = agent_data.instructions
    if agent_data.tools is not None:
        agent.tools = agent_data.tools
    if agent_data.context_config is not None:
        agent.context_config = agent_data.context_config
    if agent_data.is_active is not None:
        agent.is_active = agent_data.is_active
    
    await db.commit()
    await db.refresh(agent)
    
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        instructions=agent.instructions,
        is_active=agent.is_active,
        tools=agent.tools or [],
        context_config=agent.context_config,
        created_at=agent.created_at.isoformat(),
        updated_at=agent.updated_at.isoformat() if agent.updated_at else None,
        tool_count=len(agent.tools or [])
    )

@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an agent"""
    # Get agent
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.user_id == current_user.id)
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Delete agent
    await db.delete(agent)
    await db.commit()
    
    return {"message": "Agent deleted successfully"}

# Agent Tools Management
class AgentToolAdd(BaseModel):
    tool_id: int
    custom_config: Optional[Dict[str, Any]] = None

class AgentToolRemove(BaseModel):
    tool_id: Optional[int] = None
    tool_name: Optional[str] = None

class AgentToolUpdate(BaseModel):
    tool_id: Optional[int] = None
    tool_name: Optional[str] = None
    custom_config: Dict[str, Any]

@router.post("/{agent_id}/tools", response_model=AgentResponse)
async def add_tool_to_agent(
    agent_id: int,
    tool_data: AgentToolAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a tool to an agent"""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"🔧 Adding tool {tool_data.tool_id} to agent {agent_id}")
    # Get agent
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.user_id == current_user.id)
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Get tool from database or marketplace
    tool_result = await db.execute(
        select(Tool).where(Tool.id == tool_data.tool_id)
    )
    tool = tool_result.scalar_one_or_none()
    
    if tool:
        pass  # Tool found in database
    else:
        from app.services.marketplace_tools_service import marketplace_tools_service
        tool_data_marketplace = marketplace_tools_service.get_tool_by_id(tool_data.tool_id)
        
        if not tool_data_marketplace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tool not found"
            )
        
        # Create a mock tool object from marketplace data
        class MockTool:
            def __init__(self, data):
                self.id = data.get('id')
                self.name = data.get('name')
                self.description = data.get('description')
                self.category = data.get('category')
                self.tool_type = data.get('tool_type')
                self.config = data.get('config', {})
        
        tool = MockTool(tool_data_marketplace)
    
    # Check if tool is already added
    current_tools = agent.tools or []
    if any(t.get('id') == tool_data.tool_id for t in current_tools):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tool is already added to this agent"
        )
    
    # Add tool to agent using name as primary identifier
    tool_config = {
        'id': tool.id,  # Keep ID for backward compatibility
        'name': tool.name,  # Use name as primary identifier
        'description': tool.description,
        'category': tool.category,
        'tool_type': tool.tool_type,
        'config': tool.config,
        'custom_config': tool_data.custom_config or {}
    }
    
    current_tools.append(tool_config)
    
    # Mark the JSONB field as modified for SQLAlchemy
    from sqlalchemy.orm.attributes import flag_modified
    agent.tools = current_tools
    flag_modified(agent, 'tools')
    
    await db.commit()
    await db.refresh(agent)
    
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        instructions=agent.instructions,
        is_active=agent.is_active,
        tools=agent.tools or [],
        context_config=agent.context_config,
        created_at=agent.created_at.isoformat(),
        updated_at=agent.updated_at.isoformat() if agent.updated_at else None,
        tool_count=len(agent.tools or [])
    )

@router.delete("/{agent_id}/tools", response_model=AgentResponse)
async def remove_tool_from_agent(
    agent_id: int,
    tool_data: AgentToolRemove,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a tool from an agent"""
    # Get agent
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.user_id == current_user.id)
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Remove tool from agent (support both ID and name)
    current_tools = agent.tools or []
    updated_tools = [t for t in current_tools if t.get('id') != tool_data.tool_id and t.get('name') != tool_data.tool_name]
    
    if len(updated_tools) == len(current_tools):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool not found in agent"
        )
    
    # Mark the JSONB field as modified for SQLAlchemy
    from sqlalchemy.orm.attributes import flag_modified
    agent.tools = updated_tools
    flag_modified(agent, 'tools')
    
    await db.commit()
    await db.refresh(agent)
    
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        instructions=agent.instructions,
        is_active=agent.is_active,
        tools=agent.tools or [],
        context_config=agent.context_config,
        created_at=agent.created_at.isoformat(),
        updated_at=agent.updated_at.isoformat() if agent.updated_at else None,
        tool_count=len(agent.tools or [])
    )

@router.put("/{agent_id}/tools", response_model=AgentResponse)
async def update_tool_config(
    agent_id: int,
    tool_data: AgentToolUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update tool configuration in an agent"""
    # Get agent
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.user_id == current_user.id)
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Update tool configuration in agent (support both ID and name)
    current_tools = agent.tools or []
    tool_found = False
    
    for tool in current_tools:
        if (tool.get('id') == tool_data.tool_id or 
            tool.get('name') == tool_data.tool_name):
            tool['custom_config'] = tool_data.custom_config
            tool_found = True
            break
    
    if not tool_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool not found in agent"
        )
    
    # Mark the JSONB field as modified for SQLAlchemy
    from sqlalchemy.orm.attributes import flag_modified
    agent.tools = current_tools
    flag_modified(agent, 'tools')
    
    await db.commit()
    await db.refresh(agent)
    
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        instructions=agent.instructions,
        is_active=agent.is_active,
        tools=agent.tools or [],
        context_config=agent.context_config,
        created_at=agent.created_at.isoformat(),
        updated_at=agent.updated_at.isoformat() if agent.updated_at else None,
        tool_count=len(agent.tools or [])
    )

@router.get("/{agent_id}/tools")
async def get_agent_tools(
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get tools for a specific agent"""
    # Get agent
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.user_id == current_user.id)
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    tools = agent.tools or []
    
    return {
        "agent_id": agent.id,
        "agent_name": agent.name,
        "tools": tools,
        "tool_count": len(tools)
    } 