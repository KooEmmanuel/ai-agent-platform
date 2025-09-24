"""
Tool marketplace and management endpoints
"""

import os
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
import shutil
from pathlib import Path

from app.core.database import get_db, User, Tool, UserTool, Agent, SYSTEM_USER_ID
from app.core.auth import get_current_user
from app.services.marketplace_tools_service import marketplace_tools_service
from app.services.tool_registry import ToolRegistry
from app.services.json_tool_loader import json_tool_loader
from app.services.tool_system_prompts import tool_system_prompts_service

router = APIRouter()
logger = logging.getLogger(__name__)

class ToolCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str  # search, scheduling, communication, custom, etc.
    tool_type: str  # function, api, webhook, etc.
    config: Dict[str, Any]
    is_public: bool = False

class ToolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tool_type: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None
    is_active: Optional[bool] = None

class ToolResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: str
    tool_type: str
    config: Dict[str, Any]
    parameters: Optional[Dict[str, Any]] = None  # Extract from config
    is_public: bool
    is_active: bool
    created_at: str
    updated_at: Optional[str]
    user_id: int
    is_in_user_collection: bool = False  # Whether user has added this tool to their collection

    def __init__(self, **data):
        # Handle parameters that might be stored as list or dict
        if 'config' in data and isinstance(data['config'], dict):
            config_params = data['config'].get('parameters')
            if isinstance(config_params, list):
                # Convert list to dict format
                data['parameters'] = {'items': config_params}
            elif isinstance(config_params, dict):
                data['parameters'] = config_params
            elif config_params is not None:
                # Handle any other unexpected format by converting to string
                data['parameters'] = {'raw': str(config_params)}
            else:
                data['parameters'] = None
        
        super().__init__(**data)

@router.post("/", response_model=ToolResponse)
async def create_tool(
    tool_data: ToolCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new tool"""
    # Create the tool
    new_tool = Tool(
        user_id=current_user.id,
        name=tool_data.name,
        description=tool_data.description,
        category=tool_data.category,
        tool_type=tool_data.tool_type,
        config=tool_data.config,
        is_public=tool_data.is_public
    )
    
    db.add(new_tool)
    await db.commit()
    await db.refresh(new_tool)
    
    # Also add to user's collection
    user_tool = UserTool(
        user_id=current_user.id,
        tool_id=new_tool.id
    )
    db.add(user_tool)
    await db.commit()
    
    return ToolResponse(
        id=new_tool.id,
        name=new_tool.name,
        description=new_tool.description,
        category=new_tool.category,
        tool_type=new_tool.tool_type,
        config=new_tool.config,
        parameters=new_tool.config.get('parameters') if new_tool.config else None,
        is_public=new_tool.is_public,
        is_active=new_tool.is_active,
        created_at=new_tool.created_at.isoformat(),
        updated_at=new_tool.updated_at.isoformat() if new_tool.updated_at else None,
        user_id=new_tool.user_id,
        is_in_user_collection=True
    )

@router.get("/", response_model=List[ToolResponse])
async def list_user_tools(
    category: Optional[str] = None,
    tool_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List user's tools (tools in their collection)"""
    # Get tools that user has added to their collection
    query = select(Tool).join(UserTool).where(
        UserTool.user_id == current_user.id,
        Tool.is_active == True
    )
    
    if category:
        query = query.where(Tool.category == category)
    if tool_type:
        query = query.where(Tool.tool_type == tool_type)
    
    result = await db.execute(query)
    tools = result.scalars().all()
    
    return [
        ToolResponse(
            id=tool.id,
            name=tool.name,
            description=tool.description,
            category=tool.category,
            tool_type=tool.tool_type,
            config=tool.config,
            parameters=tool.config.get('parameters') if tool.config else None,
            is_public=tool.is_public,
            is_active=tool.is_active,
            created_at=tool.created_at.isoformat(),
            updated_at=tool.updated_at.isoformat() if tool.updated_at else None,
            user_id=tool.user_id,
            is_in_user_collection=True
        )
        for tool in tools
    ]

@router.get("/marketplace", response_model=List[ToolResponse])
async def get_marketplace_tools(
    category: Optional[str] = None,
    tool_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get marketplace tools from JSON file"""
    try:
        # Get marketplace tools from JSON service
        if category:
            tools_data = marketplace_tools_service.get_tools_by_category(category)
        elif tool_type:
            tools_data = marketplace_tools_service.get_tools_by_type(tool_type)
        else:
            tools_data = marketplace_tools_service.get_public_tools()
        
        # Get user's collection to mark which tools they have
        user_tools_result = await db.execute(
            select(UserTool).where(UserTool.user_id == current_user.id)
        )
        user_tools = user_tools_result.scalars().all()
        user_tool_ids = {ut.tool_id for ut in user_tools}
        
        # Convert to ToolResponse format
        tools = []
        for tool_data in tools_data:
            # Check if user has this tool in their collection
            is_in_collection = tool_data.get('id') in user_tool_ids
            
            tool_response = ToolResponse(
                id=tool_data.get('id'),
                name=tool_data.get('name'),
                description=tool_data.get('description'),
                category=tool_data.get('category'),
                tool_type=tool_data.get('tool_type'),
                config=tool_data.get('config', {}),
                is_public=tool_data.get('is_public', True),
                is_active=tool_data.get('is_active', True),
                created_at=tool_data.get('created_at', ''),
                updated_at=tool_data.get('updated_at'),
                user_id=tool_data.get('user_id', SYSTEM_USER_ID),
                is_in_user_collection=is_in_collection
            )
            tools.append(tool_response)
        
        return tools
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch marketplace tools: {str(e)}"
        )

@router.post("/{tool_id}/add-to-collection")
async def add_tool_to_collection(
    tool_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a tool to user's collection"""
    # Check if tool exists in marketplace tools
    tool_data = marketplace_tools_service.get_tool_by_id(tool_id)
    
    if not tool_data or not tool_data.get('is_public', True) or not tool_data.get('is_active', True):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool not found or not available"
        )
    
    # Check if user already has this tool in their collection
    existing_result = await db.execute(
        select(UserTool).where(
            UserTool.user_id == current_user.id,
            UserTool.tool_id == tool_id
        )
    )
    existing = existing_result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tool already in your collection"
        )
    
    # Check if the tool exists in the database
    db_tool_result = await db.execute(
        select(Tool).where(Tool.id == tool_id)
    )
    db_tool = db_tool_result.scalar_one_or_none()
    
    # If it's a marketplace tool that doesn't exist in the database, create it
    if not db_tool:
        # Create the tool in the database for the user
        new_tool = Tool(
            user_id=current_user.id,
            name=tool_data.get('name'),
            description=tool_data.get('description'),
            category=tool_data.get('category'),
            tool_type=tool_data.get('tool_type'),
            config=tool_data.get('config', {}),
            is_public=tool_data.get('is_public', True),
            is_active=tool_data.get('is_active', True)
        )
        db.add(new_tool)
        await db.commit()
        await db.refresh(new_tool)
        
        # Update tool_id to use the newly created tool's ID
        tool_id = new_tool.id
    
    # Add to user's collection
    user_tool = UserTool(
        user_id=current_user.id,
        tool_id=tool_id
    )
    db.add(user_tool)
    await db.commit()
    
    return {"message": f"Tool '{tool_data.get('name', 'Unknown')}' added to your collection successfully"}

@router.delete("/{tool_id}/remove-from-collection")
async def remove_tool_from_collection(
    tool_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a tool from user's collection"""
    # Check if user has this tool in their collection
    result = await db.execute(
        select(UserTool).where(
            UserTool.user_id == current_user.id,
            UserTool.tool_id == tool_id
        )
    )
    user_tool = result.scalar_one_or_none()
    
    if not user_tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool not found in your collection"
        )
    
    # Get tool info for response
    tool_result = await db.execute(select(Tool).where(Tool.id == tool_id))
    tool = tool_result.scalar_one_or_none()
    
    # Remove from collection (but don't delete the actual tool)
    await db.delete(user_tool)
    await db.commit()
    
    return {"message": f"Tool '{tool.name if tool else 'Unknown'}' removed from your collection"}

@router.get("/{tool_id}", response_model=ToolResponse)
async def get_tool(
    tool_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific tool"""
    # First check if it's a marketplace tool
    tool_data = marketplace_tools_service.get_tool_by_id(tool_id)
    
    if tool_data:
        # It's a marketplace tool
        # Check if user has this tool in their collection
        user_tool_result = await db.execute(
            select(UserTool).where(
                UserTool.user_id == current_user.id,
                UserTool.tool_id == tool_id
            )
        )
        user_tool = user_tool_result.scalar_one_or_none()
        
        return ToolResponse(
            id=tool_data.get('id'),
            name=tool_data.get('name'),
            description=tool_data.get('description'),
            category=tool_data.get('category'),
            tool_type=tool_data.get('tool_type'),
            config=tool_data.get('config', {}),
            parameters=tool_data.get('config', {}).get('parameters') if tool_data.get('config') else None,
            is_public=tool_data.get('is_public', True),
            is_active=tool_data.get('is_active', True),
            created_at=tool_data.get('created_at', ''),
            updated_at=tool_data.get('updated_at'),
            user_id=tool_data.get('user_id', SYSTEM_USER_ID),
            is_in_user_collection=user_tool is not None
        )
    
    # Check if it's a user-created tool in the database
    result = await db.execute(
        select(Tool).where(Tool.id == tool_id)
    )
    tool = result.scalar_one_or_none()
    
    if not tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool not found"
        )
    
    # Check if user owns the tool, if it's public, or if it's in their collection
    user_tool_result = await db.execute(
        select(UserTool).where(
            UserTool.user_id == current_user.id,
            UserTool.tool_id == tool_id
        )
    )
    user_tool = user_tool_result.scalar_one_or_none()
    
    if tool.user_id != current_user.id and not tool.is_public and not user_tool:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return ToolResponse(
        id=tool.id,
        name=tool.name,
        description=tool.description,
        category=tool.category,
        tool_type=tool.tool_type,
        config=tool.config,
        parameters=tool.config.get('parameters') if tool.config else None,
        is_public=tool.is_public,
        is_active=tool.is_active,
        created_at=tool.created_at.isoformat(),
        updated_at=tool.updated_at.isoformat() if tool.updated_at else None,
        user_id=tool.user_id,
        is_in_user_collection=user_tool is not None
    )

@router.put("/{tool_id}", response_model=ToolResponse)
async def update_tool(
    tool_id: int,
    tool_data: ToolUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a tool (only if user owns it)"""
    # Get tool
    result = await db.execute(
        select(Tool).where(Tool.id == tool_id)
    )
    tool = result.scalar_one_or_none()
    
    if not tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool not found"
        )
    
    # Only tool owner can update
    if tool.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tool owner can update this tool"
        )
    
    # Update fields
    if tool_data.name is not None:
        tool.name = tool_data.name
    if tool_data.description is not None:
        tool.description = tool_data.description
    if tool_data.category is not None:
        tool.category = tool_data.category
    if tool_data.tool_type is not None:
        tool.tool_type = tool_data.tool_type
    if tool_data.config is not None:
        tool.config = tool_data.config
    if tool_data.is_public is not None:
        tool.is_public = tool_data.is_public
    if tool_data.is_active is not None:
        tool.is_active = tool_data.is_active
    
    await db.commit()
    await db.refresh(tool)
    
    # Check if tool is in user's collection
    user_tool_result = await db.execute(
        select(UserTool).where(
            UserTool.user_id == current_user.id,
            UserTool.tool_id == tool_id
        )
    )
    user_tool = user_tool_result.scalar_one_or_none()
    
    return ToolResponse(
        id=tool.id,
        name=tool.name,
        description=tool.description,
        category=tool.category,
        tool_type=tool.tool_type,
        config=tool.config,
        parameters=tool.config.get('parameters') if tool.config else None,
        is_public=tool.is_public,
        is_active=tool.is_active,
        created_at=tool.created_at.isoformat(),
        updated_at=tool.updated_at.isoformat() if tool.updated_at else None,
        user_id=tool.user_id,
        is_in_user_collection=user_tool is not None
    )

@router.delete("/{tool_id}")
async def delete_tool(
    tool_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a tool (only if user owns it)"""
    # Get tool
    result = await db.execute(
        select(Tool).where(Tool.id == tool_id)
    )
    tool = result.scalar_one_or_none()
    
    if not tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool not found"
        )
    
    # Only tool owner can delete
    if tool.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tool owner can delete this tool"
        )
    
    # Remove from all user collections first
    await db.execute(
        select(UserTool).where(UserTool.tool_id == tool_id)
    )
    user_tools_result = await db.execute(
        select(UserTool).where(UserTool.tool_id == tool_id)
    )
    user_tools = user_tools_result.scalars().all()
    
    for user_tool in user_tools:
        await db.delete(user_tool)
    
    # Delete the tool
    await db.delete(tool)
    await db.commit()
    
    return {"message": "Tool deleted successfully"}

@router.get("/categories/list")
async def get_tool_categories():
    """Get list of available tool categories from JSON"""
    try:
        categories = marketplace_tools_service.get_categories()
        return {"categories": categories}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch tool categories: {str(e)}"
        )

@router.get("/types/list")
async def get_tool_types():
    """Get list of available tool types from JSON"""
    try:
        types = marketplace_tools_service.get_tool_types()
        return {"types": types}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch tool types: {str(e)}"
        ) 

@router.get("/{tool_identifier}/agent-config")
async def get_tool_agent_config(
    tool_identifier: str,
    agent_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get tool configuration for a specific agent - includes base config and current agent config"""
    try:
        # Get tool ID
        tool_id = int(tool_identifier)
        
        # Get base tool configuration from JSON
        tool_data = marketplace_tools_service.get_tool_by_id(tool_id)
        if not tool_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tool with ID {tool_id} not found"
            )
        
        # Get agent to check current configuration
        result = await db.execute(
            select(Agent).where(Agent.id == agent_id, Agent.user_id == current_user.id)
        )
        agent = result.scalar_one_or_none()
        
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        
        # Find current tool configuration in agent's tools
        current_config = None
        is_configured = False
        
        if agent.tools:
            for tool_config in agent.tools:
                if isinstance(tool_config, dict):
                    config_tool_id = tool_config.get('id') or tool_config.get('tool_id')
                    if config_tool_id == tool_id:
                        current_config = tool_config.get('custom_config', {})
                        is_configured = True
                        break
        
        # Prepare response
        response = {
            "tool_id": tool_id,
            "tool_name": tool_data.get('name'),
            "tool_description": tool_data.get('description'),
            "tool_category": tool_data.get('category'),
            "tool_type": tool_data.get('tool_type'),
            "base_config": tool_data.get('config', {}),
            "current_config": current_config or {},
            "is_configured": is_configured,
            "agent_id": agent_id,
            "agent_name": agent.name
        }
        
        return response
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tool ID"
        )

@router.get("/{tool_identifier}/config-schema")
async def get_tool_config_schema(
    tool_identifier: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get configuration schema for a specific tool by ID or name"""
    tool_name = None
    tool_description = None
    tool_type = None
    
    # First try to parse as ID
    try:
        tool_id = int(tool_identifier)
        # Check if it's a marketplace tool
        tool_data = marketplace_tools_service.get_tool_by_id(tool_id)
        
        if tool_data:
            # It's a marketplace tool
            tool_name = tool_data.get('name')
            tool_description = tool_data.get('description')
            tool_type = tool_data.get('tool_type')
        else:
            # Check if it's a database tool
            result = await db.execute(
                select(Tool).where(Tool.id == tool_id)
            )
            tool = result.scalar_one_or_none()
            
            if not tool:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tool not found"
                )
            
            tool_name = tool.name
            tool_description = tool.description
            tool_type = tool.tool_type
    except ValueError:
        # Not a number, treat as tool name
        tool_name = tool_identifier
        
        # Check marketplace tools by name
        tool_data = marketplace_tools_service.get_tool_by_name(tool_name)
        if tool_data:
            tool_description = tool_data.get('description')
            tool_type = tool_data.get('tool_type')
        else:
            # Check database tools by name
            result = await db.execute(
                select(Tool).where(Tool.name == tool_name)
            )
            tool = result.scalar_one_or_none()
            
            if not tool:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Tool '{tool_name}' not found"
                )
            
            tool_description = tool.description
            tool_type = tool.tool_type
    
    # Get tool class from registry
    tool_registry = ToolRegistry()
    tool_class = tool_registry.get_tool_class(tool_name)
    
    if not tool_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool implementation not found"
        )
    
    # Create a temporary instance to get tool info
    try:
        # Try to instantiate with config parameter first
        temp_tool = tool_class({})
    except TypeError:
        # If that fails, try instantiating without parameters
        temp_tool = tool_class()
    
    # Get tool info, handling different method names
    tool_info = {}
    try:
        if hasattr(temp_tool, 'get_tool_info'):
            tool_info = temp_tool.get_tool_info()
        elif hasattr(temp_tool, 'get_config_schema'):
            tool_info = temp_tool.get_config_schema()
        else:
            tool_info = {}
    except Exception as e:
        logger.warning(f"Failed to get tool info for {tool_name}: {str(e)}")
        tool_info = {}
    
    # Ensure tool_info is a dictionary
    if tool_info is None:
        tool_info = {}
    
    # Extract configuration schema from tool's config
    config_schema = {
        'tool_name': tool_name,
        'tool_description': tool_description,
        'parameters': tool_info.get('parameters', {}),
        'capabilities': tool_info.get('capabilities', []),
        'config_fields': []
    }
    
    # Add common configuration fields
    config_schema['config_fields'] = [
        {
            'name': 'max_results',
            'type': 'number',
            'label': 'Max Results',
            'description': 'Maximum number of results to return',
            'default': 10,
            'min': 1,
            'max': 100
        },
        {
            'name': 'timeout',
            'type': 'number',
            'label': 'Timeout (seconds)',
            'description': 'Request timeout in seconds',
            'default': 30,
            'min': 5,
            'max': 300
        }
    ]
    
    # Add tool-specific configuration fields based on tool type
    logger.info(f"🔧 Processing tool: {tool_name}, type: {tool_type}")
    if tool_type == 'API':
        config_schema['config_fields'].extend([
            {
                'name': 'api_key',
                'type': 'text',
                'label': 'API Key',
                'description': 'API key for the service',
                'required': True,
                'sensitive': True
            },
            {
                'name': 'base_url',
                'type': 'text',
                'label': 'Base URL',
                'description': 'Base URL for API requests',
                'default': ''
            }
        ])
        
        # Weather API specific fields
        if 'weather' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'units',
                    'type': 'select',
                    'label': 'Units',
                    'description': 'Temperature units',
                    'options': ['metric', 'imperial', 'kelvin'],
                    'default': 'metric'
                },
                {
                    'name': 'language',
                    'type': 'text',
                    'label': 'Language',
                    'description': 'Language for weather descriptions',
                    'default': 'en'
                },
                {
                    'name': 'base_url',
                    'type': 'text',
                    'label': 'Base URL',
                    'description': 'Base URL for API requests',
                    'default': 'https://api.openweathermap.org/data/2.5',
                    'placeholder': 'https://api.openweathermap.org/data/2.5'
                }
            ])
        
        # News search API specific fields
        elif 'news' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'newsapi_key',
                    'type': 'text',
                    'label': 'NewsAPI Key',
                    'description': 'API key for NewsAPI.org',
                    'sensitive': True,
                    'placeholder': 'your-newsapi-key'
                },
                {
                    'name': 'gnews_key',
                    'type': 'text',
                    'label': 'GNews API Key',
                    'description': 'API key for GNews API',
                    'sensitive': True,
                    'placeholder': 'your-gnews-key'
                },
                {
                    'name': 'default_language',
                    'type': 'text',
                    'label': 'Default Language',
                    'description': 'Default language for news',
                    'default': 'en',
                    'placeholder': 'en'
                },
                {
                    'name': 'default_country',
                    'type': 'text',
                    'label': 'Default Country',
                    'description': 'Default country for news',
                    'default': 'us',
                    'placeholder': 'us'
                }
            ])
        
        # Google Sheets API specific fields
        elif 'sheets' in tool_name.lower() or 'google' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'credentials_path',
                    'type': 'text',
                    'label': 'Google Credentials Path',
                    'description': 'Path to Google Sheets API credentials JSON file',
                    'required': True,
                    'placeholder': 'path/to/credentials.json'
                },
                {
                    'name': 'token_path',
                    'type': 'text',
                    'label': 'Token Storage Path',
                    'description': 'Path to store authentication tokens',
                    'default': 'sheets_token.pickle',
                    'placeholder': 'sheets_token.pickle'
                },
                {
                    'name': 'default_value_input_option',
                    'type': 'select',
                    'label': 'Value Input Option',
                    'description': 'How input data should be interpreted',
                    'options': ['RAW', 'USER_ENTERED'],
                    'default': 'USER_ENTERED'
                }
            ])
        
        # Payment processor API specific fields
        elif 'payment' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'stripe_secret_key',
                    'type': 'text',
                    'label': 'Stripe Secret Key',
                    'description': 'Stripe secret API key',
                    'sensitive': True,
                    'placeholder': 'sk_test_...'
                },
                {
                    'name': 'paypal_client_id',
                    'type': 'text',
                    'label': 'PayPal Client ID',
                    'description': 'PayPal API client ID',
                    'sensitive': True,
                    'placeholder': 'your-paypal-client-id'
                },
                {
                    'name': 'default_currency',
                    'type': 'text',
                    'label': 'Default Currency',
                    'description': 'Default currency code',
                    'default': 'USD',
                    'placeholder': 'USD'
                },
                {
                    'name': 'test_mode',
                    'type': 'boolean',
                    'label': 'Test Mode',
                    'description': 'Enable test mode for payments',
                    'default': True
                }
            ])
    
    elif tool_type == 'web_scraper':
        # Web scraper specific fields
        if 'multi_link_scraper' in tool_name.lower() or 'multi_link' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'links_text',
                    'type': 'textarea',
                    'label': 'Website Links',
                    'description': 'Paste your website links here (one per line or separated by commas). The tool will automatically process them.',
                    'required': False,
                    'default': '',
                    'placeholder': 'https://example.com\nhttps://newsite.com\nhttps://blog.example.com'
                },
                {
                    'name': 'max_content_length',
                    'type': 'number',
                    'label': 'Max Content Length',
                    'description': 'Maximum length of scraped content per page',
                    'default': 5000,
                    'min': 1000,
                    'max': 20000
                },
                {
                    'name': 'relevance_threshold',
                    'type': 'number',
                    'label': 'Relevance Threshold',
                    'description': 'Minimum relevance score to include content (0-1)',
                    'default': 0.3,
                    'min': 0.1,
                    'max': 1.0,
                    'step': 0.1
                },
                {
                    'name': 'user_agent',
                    'type': 'text',
                    'label': 'User Agent',
                    'description': 'User agent string for web requests',
                    'default': 'KooAgent Multi-Link Scraper 1.0',
                    'placeholder': 'KooAgent Multi-Link Scraper 1.0'
                },
                {
                    'name': 'request_delay',
                    'type': 'number',
                    'label': 'Request Delay (seconds)',
                    'description': 'Delay between requests to avoid rate limiting',
                    'default': 1,
                    'min': 0.1,
                    'max': 10,
                    'step': 0.1
                },
                {
                    'name': '_help',
                    'type': 'info',
                    'label': 'How to Use',
                    'description': 'After configuring this tool, you can add website links through the agent interface. The tool will intelligently scrape content from your configured links based on user queries.',
                    'default': 'Configure links and start asking questions!'
                }
            ])
        else:
            # General web scraper configuration
            config_schema['config_fields'].extend([
                {
                    'name': 'user_agent',
                    'type': 'text',
                    'label': 'User Agent',
                    'description': 'User agent string for web requests',
                    'default': 'KooAgent Web Scraper 1.0',
                    'placeholder': 'KooAgent Web Scraper 1.0'
                },
                {
                    'name': 'request_delay',
                    'type': 'number',
                    'label': 'Request Delay (seconds)',
                    'description': 'Delay between requests to avoid rate limiting',
                    'default': 1,
                    'min': 0.1,
                    'max': 10,
                    'step': 0.1
                },
                {
                    'name': 'max_pages',
                    'type': 'number',
                    'label': 'Max Pages',
                    'description': 'Maximum number of pages to scrape',
                    'default': 10,
                    'min': 1,
                    'max': 100
                },
                {
                    'name': 'respect_robots_txt',
                    'type': 'boolean',
                    'label': 'Respect robots.txt',
                    'description': 'Follow robots.txt rules',
                    'default': True
                }
            ])
    
    elif tool_type == 'Function':
        # Website Knowledge Base specific fields (check this first)
        if 'website_knowledge_base' in tool_name.lower():
            # Get available collections for dropdown
            try:
                from marketplace_tools.website_knowledge_base import WebsiteKnowledgeBaseTool
                temp_tool = WebsiteKnowledgeBaseTool({})
                available_collections = temp_tool.get_available_collections()
                # Convert to simple string array for frontend compatibility
                collection_options = [''] + [opt['value'] for opt in available_collections]
                logger.info(f"✅ Available collections for dropdown: {collection_options}")
            except Exception as e:
                logger.warning(f"Failed to get available collections: {e}")
                collection_options = ['']
            
            config_schema['config_fields'].extend([
                {
                    'name': 'collection_name',
                    'type': 'select',
                    'label': 'Collection Name',
                    'description': 'Select a knowledge base collection to query',
                    'required': True,
                    'options': collection_options
                },
                {
                    'name': 'similarity_threshold',
                    'type': 'number',
                    'label': 'Similarity Threshold',
                    'description': 'Minimum similarity score for results (0.0 - 1.0)',
                    'default': 0.7,
                    'min': 0.0,
                    'max': 1.0,
                    'step': 0.1
                },
                {
                    'name': 'top_k_results',
                    'type': 'number',
                    'label': 'Max Results',
                    'description': 'Maximum number of results to return',
                    'default': 5,
                    'min': 1,
                    'max': 20
                },
                {
                    'name': '_help',
                    'type': 'info',
                    'label': 'How to Use',
                    'description': 'This tool queries pre-built knowledge base collections. First, create collections and add content in the Knowledge Base section, then configure this tool to query those collections.',
                    'default': 'Create collections in Knowledge Base section first, then configure this tool to query them!'
                }
            ])
        
        # Add other function-specific fields
        elif 'web' in tool_name.lower() or 'search' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'safe_search',
                    'type': 'boolean',
                    'label': 'Safe Search',
                    'description': 'Enable safe search filtering',
                    'default': True
                },
                {
                    'name': 'result_type',
                    'type': 'select',
                    'label': 'Result Type',
                    'description': 'Type of results to return',
                    'options': ['web', 'news', 'images'],
                    'default': 'web'
                }
            ])
        
        # Calendar manager specific fields
        elif 'calendar' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'credentials_path',
                    'type': 'file',
                    'label': 'Google Service Account Credentials',
                    'description': 'Upload your Google Service Account JSON credentials file',
                    'required': True,
                    'accept': '.json',
                    'max_size': '1MB'
                },
                {
                    'name': 'token_path',
                    'type': 'text',
                    'label': 'Token Storage Path',
                    'description': 'Path to store authentication tokens',
                    'default': 'token.pickle',
                    'placeholder': 'token.pickle'
                },
                {
                    'name': 'calendar_id',
                    'type': 'text',
                    'label': 'Calendar ID',
                    'description': 'Google Calendar ID to use (use "primary" for main calendar)',
                    'default': 'primary',
                    'placeholder': 'primary'
                },
                {
                    'name': 'default_reminder_minutes',
                    'type': 'number',
                    'label': 'Default Reminder (minutes)',
                    'description': 'Default reminder time in minutes before events',
                    'default': 10,
                    'min': 1,
                    'max': 10080
                }
            ])
        
        # Reminder tool specific fields
        elif 'reminder' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'storage_file',
                    'type': 'text',
                    'label': 'Storage File',
                    'description': 'File to store reminders',
                    'default': 'reminders.json',
                    'placeholder': 'reminders.json'
                },
                {
                    'name': 'default_timezone',
                    'type': 'text',
                    'label': 'Default Timezone',
                    'description': 'Default timezone for reminders',
                    'default': 'UTC',
                    'placeholder': 'UTC'
                },
                {
                    'name': 'notification_methods',
                    'type': 'text',
                    'label': 'Notification Methods',
                    'description': 'Comma-separated list of notification methods (email, sms, push)',
                    'default': 'email',
                    'placeholder': 'email,sms,push'
                }
            ])
        
        # Date calculator specific fields
        elif 'date' in tool_name.lower() and 'calculator' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'default_timezone',
                    'type': 'text',
                    'label': 'Default Timezone',
                    'description': 'Default timezone for date calculations',
                    'default': 'UTC',
                    'placeholder': 'UTC'
                },
                {
                    'name': 'default_date_format',
                    'type': 'text',
                    'label': 'Default Date Format',
                    'description': 'Default format for date output',
                    'default': '%Y-%m-%d',
                    'placeholder': '%Y-%m-%d'
                },
                {
                    'name': 'business_days_only',
                    'type': 'boolean',
                    'label': 'Business Days Only',
                    'description': 'Consider only business days in calculations',
                    'default': False
                }
            ])
        
        # Data processing tools
        elif 'csv' in tool_name.lower() or 'data' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'encoding',
                    'type': 'select',
                    'label': 'File Encoding',
                    'description': 'CSV file encoding',
                    'options': ['utf-8', 'latin-1', 'cp1252'],
                    'default': 'utf-8'
                },
                {
                    'name': 'delimiter',
                    'type': 'text',
                    'label': 'Delimiter',
                    'description': 'CSV delimiter character',
                    'default': ','
                }
            ])
        
        # Email sender specific fields
        elif 'email' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'smtp_server',
                    'type': 'text',
                    'label': 'SMTP Server',
                    'description': 'SMTP server hostname',
                    'default': 'smtp.gmail.com',
                    'placeholder': 'smtp.gmail.com'
                },
                {
                    'name': 'smtp_port',
                    'type': 'number',
                    'label': 'SMTP Port',
                    'description': 'SMTP server port',
                    'default': 587,
                    'min': 1,
                    'max': 65535
                },
                {
                    'name': 'username',
                    'type': 'text',
                    'label': 'Email Username',
                    'description': 'Email account username',
                    'required': True,
                    'placeholder': 'your-email@gmail.com'
                },
                {
                    'name': 'password',
                    'type': 'password',
                    'label': 'Email Password',
                    'description': 'Email account password or app password',
                    'required': True,
                    'sensitive': True
                },
                {
                    'name': 'use_tls',
                    'type': 'boolean',
                    'label': 'Use TLS',
                    'description': 'Enable TLS encryption',
                    'default': True
                }
            ])
        
        # Text analyzer specific fields
        elif 'text' in tool_name.lower() and 'analyzer' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'max_text_length',
                    'type': 'number',
                    'label': 'Max Text Length',
                    'description': 'Maximum text length to analyze',
                    'default': 10000,
                    'min': 100,
                    'max': 100000
                },
                {
                    'name': 'default_language',
                    'type': 'text',
                    'label': 'Default Language',
                    'description': 'Default language for analysis',
                    'default': 'en',
                    'placeholder': 'en'
                },
                {
                    'name': 'sentiment_threshold',
                    'type': 'number',
                    'label': 'Sentiment Threshold',
                    'description': 'Threshold for sentiment classification',
                    'default': 0.5,
                    'min': 0.0,
                    'max': 1.0,
                    'step': 0.1
                }
            ])
        
        # Image processor specific fields
        elif 'image' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'max_file_size_mb',
                    'type': 'number',
                    'label': 'Max File Size (MB)',
                    'description': 'Maximum image file size in MB',
                    'default': 10,
                    'min': 1,
                    'max': 100
                },
                {
                    'name': 'supported_formats',
                    'type': 'text',
                    'label': 'Supported Formats',
                    'description': 'Comma-separated list of supported formats',
                    'default': 'jpg,jpeg,png,gif,bmp,webp',
                    'placeholder': 'jpg,jpeg,png,gif,bmp,webp'
                },
                {
                    'name': 'default_quality',
                    'type': 'number',
                    'label': 'Default Quality',
                    'description': 'Default image quality (1-100)',
                    'default': 85,
                    'min': 1,
                    'max': 100
                }
            ])
        
        # PDF processor specific fields
        elif 'pdf' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'max_file_size_mb',
                    'type': 'number',
                    'label': 'Max File Size (MB)',
                    'description': 'Maximum PDF file size in MB',
                    'default': 50,
                    'min': 1,
                    'max': 500
                },
                {
                    'name': 'extract_images',
                    'type': 'boolean',
                    'label': 'Extract Images',
                    'description': 'Extract images from PDF by default',
                    'default': False
                },
                {
                    'name': 'ocr_enabled',
                    'type': 'boolean',
                    'label': 'OCR Enabled',
                    'description': 'Enable OCR for scanned PDFs',
                    'default': False
                }
            ])
        
        # File processor specific fields
        elif 'file' in tool_name.lower() and 'processor' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'max_file_size_mb',
                    'type': 'number',
                    'label': 'Max File Size (MB)',
                    'description': 'Maximum file size in MB',
                    'default': 100,
                    'min': 1,
                    'max': 1000
                },
                {
                    'name': 'supported_formats',
                    'type': 'text',
                    'label': 'Supported Formats',
                    'description': 'Comma-separated list of supported file formats',
                    'default': 'txt,json,xml,yaml,csv,xlsx,docx',
                    'placeholder': 'txt,json,xml,yaml,csv,xlsx,docx'
                },
                {
                    'name': 'auto_detect_encoding',
                    'type': 'boolean',
                    'label': 'Auto-detect Encoding',
                    'description': 'Automatically detect file encoding',
                    'default': True
                }
            ])
        
        # Database query specific fields
        elif 'database' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'connection_string',
                    'type': 'text',
                    'label': 'Connection String',
                    'description': 'Database connection string',
                    'required': True,
                    'sensitive': True,
                    'placeholder': 'postgresql://user:pass@localhost:5432/db'
                },
                {
                    'name': 'query_timeout',
                    'type': 'number',
                    'label': 'Query Timeout (seconds)',
                    'description': 'Maximum query execution time',
                    'default': 30,
                    'min': 5,
                    'max': 300
                },
                {
                    'name': 'max_rows',
                    'type': 'number',
                    'label': 'Max Rows',
                    'description': 'Maximum number of rows to return',
                    'default': 1000,
                    'min': 1,
                    'max': 10000
                }
            ])
        
        # Data visualization specific fields
        elif 'visualization' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'default_style',
                    'type': 'select',
                    'label': 'Default Style',
                    'description': 'Default chart style',
                    'options': ['seaborn', 'ggplot', 'classic', 'dark_background'],
                    'default': 'seaborn'
                },
                {
                    'name': 'figure_width',
                    'type': 'number',
                    'label': 'Figure Width',
                    'description': 'Default figure width in inches',
                    'default': 10,
                    'min': 4,
                    'max': 20
                },
                {
                    'name': 'figure_height',
                    'type': 'number',
                    'label': 'Figure Height',
                    'description': 'Default figure height in inches',
                    'default': 6,
                    'min': 3,
                    'max': 15
                },
                {
                    'name': 'dpi',
                    'type': 'number',
                    'label': 'DPI',
                    'description': 'Image resolution (dots per inch)',
                    'default': 100,
                    'min': 50,
                    'max': 300
                }
            ])
        
        # Statistical analysis specific fields
        elif 'statistical' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'confidence_level',
                    'type': 'number',
                    'label': 'Confidence Level',
                    'description': 'Default confidence level for statistical tests',
                    'default': 0.95,
                    'min': 0.80,
                    'max': 0.99,
                    'step': 0.01
                },
                {
                    'name': 'random_seed',
                    'type': 'number',
                    'label': 'Random Seed',
                    'description': 'Random seed for reproducible results',
                    'default': 42,
                    'min': 0,
                    'max': 9999
                },
                {
                    'name': 'max_samples',
                    'type': 'number',
                    'label': 'Max Samples',
                    'description': 'Maximum number of samples to process',
                    'default': 10000,
                    'min': 100,
                    'max': 1000000
                }
            ])
        
        # Notification service specific fields
        elif 'notification' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'default_channel',
                    'type': 'select',
                    'label': 'Default Channel',
                    'description': 'Default notification channel',
                    'options': ['email', 'sms', 'push', 'webhook'],
                    'default': 'email'
                },
                {
                    'name': 'retry_attempts',
                    'type': 'number',
                    'label': 'Retry Attempts',
                    'description': 'Number of retry attempts for failed notifications',
                    'default': 3,
                    'min': 1,
                    'max': 10
                },
                {
                    'name': 'rate_limit_per_minute',
                    'type': 'number',
                    'label': 'Rate Limit (per minute)',
                    'description': 'Maximum notifications per minute',
                    'default': 60,
                    'min': 1,
                    'max': 1000
                }
            ])
        
        # Social media specific fields
        elif 'social' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'default_platform',
                    'type': 'select',
                    'label': 'Default Platform',
                    'description': 'Default social media platform',
                    'options': ['twitter', 'facebook', 'linkedin', 'instagram'],
                    'default': 'twitter'
                },
                {
                    'name': 'auto_hashtags',
                    'type': 'boolean',
                    'label': 'Auto Hashtags',
                    'description': 'Automatically generate hashtags',
                    'default': False
                },
                {
                    'name': 'max_post_length',
                    'type': 'number',
                    'label': 'Max Post Length',
                    'description': 'Maximum post length in characters',
                    'default': 280,
                    'min': 50,
                    'max': 5000
                }
            ])
        
        # Translation tools
        elif 'translation' in tool_name.lower() or 'translate' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'source_language',
                    'type': 'text',
                    'label': 'Source Language',
                    'description': 'Source language code (e.g., en, es, fr)',
                    'default': 'auto'
                },
                {
                    'name': 'target_language',
                    'type': 'text',
                    'label': 'Target Language',
                    'description': 'Target language code (e.g., en, es, fr)',
                    'default': 'en'
                }
            ])
    
    elif tool_type == 'Webhook':
        # Slack integration specific fields
        if 'slack' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'bot_token',
                    'type': 'text',
                    'label': 'Slack Bot Token',
                    'description': 'Slack bot token (xoxb-...)',
                    'required': True,
                    'sensitive': True,
                    'placeholder': 'xoxb-your-bot-token'
                },
                {
                    'name': 'webhook_url',
                    'type': 'text',
                    'label': 'Webhook URL',
                    'description': 'Slack webhook URL (optional, for simple messaging)',
                    'placeholder': 'https://hooks.slack.com/services/...'
                },
                {
                    'name': 'default_channel',
                    'type': 'text',
                    'label': 'Default Channel',
                    'description': 'Default Slack channel',
                    'default': '#general',
                    'placeholder': '#general'
                },
                {
                    'name': 'username',
                    'type': 'text',
                    'label': 'Bot Username',
                    'description': 'Display name for the bot',
                    'default': 'KooAgent',
                    'placeholder': 'KooAgent'
                }
            ])
        
        # Zapier webhook specific fields
        elif 'zapier' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'webhook_url',
                    'type': 'text',
                    'label': 'Zapier Webhook URL',
                    'description': 'Zapier webhook trigger URL',
                    'required': True,
                    'placeholder': 'https://hooks.zapier.com/hooks/catch/...'
                },
                {
                    'name': 'auth_header',
                    'type': 'text',
                    'label': 'Auth Header',
                    'description': 'Authorization header value (optional)',
                    'sensitive': True,
                    'placeholder': 'Bearer your-token'
                },
                {
                    'name': 'retry_attempts',
                    'type': 'number',
                    'label': 'Retry Attempts',
                    'description': 'Number of retry attempts on failure',
                    'default': 3,
                    'min': 1,
                    'max': 10
                }
            ])
        
        # Generic webhook handler fields
        else:
            config_schema['config_fields'].extend([
                {
                    'name': 'webhook_url',
                    'type': 'text',
                    'label': 'Webhook URL',
                    'description': 'Webhook endpoint URL',
                    'required': True,
                    'placeholder': 'https://your-webhook-endpoint.com/hook'
                },
                {
                    'name': 'method',
                    'type': 'select',
                    'label': 'HTTP Method',
                    'description': 'HTTP method for webhook calls',
                    'options': ['POST', 'GET', 'PUT', 'PATCH', 'DELETE'],
                    'default': 'POST'
                },
                {
                    'name': 'headers',
                    'type': 'text',
                    'label': 'Headers',
                    'description': 'Additional headers (JSON format)',
                    'default': '{}',
                    'placeholder': '{"Content-Type": "application/json"}'
                },
                {
                    'name': 'auth_header',
                    'type': 'text',
                    'label': 'Authorization Header',
                    'description': 'Authorization header value (optional)',
                    'sensitive': True,
                    'placeholder': 'Bearer your-token'
                },
                {
                    'name': 'timeout_seconds',
                    'type': 'number',
                    'label': 'Timeout (seconds)',
                    'description': 'Request timeout in seconds',
                    'default': 30,
                    'min': 5,
                    'max': 300
                }
            ])
        
        # PDF Generator specific fields
        if 'pdf_generator' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'page_size',
                    'type': 'select',
                    'label': 'Page Size',
                    'description': 'Page size for the PDF',
                    'options': ['letter', 'A4', 'legal'],
                    'default': 'A4'
                },
                {
                    'name': 'template',
                    'type': 'select',
                    'label': 'Document Template',
                    'description': 'Document template to use',
                    'options': ['professional', 'resume', 'report', 'letter', 'minimal'],
                    'default': 'professional'
                },
                {
                    'name': 'font_size',
                    'type': 'number',
                    'label': 'Font Size',
                    'description': 'Base font size',
                    'default': 12,
                    'min': 8,
                    'max': 24
                },
                {
                    'name': 'line_spacing',
                    'type': 'number',
                    'label': 'Line Spacing',
                    'description': 'Line spacing multiplier',
                    'default': 1.2,
                    'min': 1.0,
                    'max': 2.0,
                    'step': 0.1
                },
                {
                    'name': 'include_header',
                    'type': 'boolean',
                    'label': 'Include Header',
                    'description': 'Include header with title and date',
                    'default': True
                },
                {
                    'name': 'include_footer',
                    'type': 'boolean',
                    'label': 'Include Footer',
                    'description': 'Include footer with page numbers',
                    'default': True
                },
                {
                    'name': 'primary_color',
                    'type': 'text',
                    'label': 'Primary Color',
                    'description': 'Primary color for styling (hex format)',
                    'default': '#2563eb',
                    'placeholder': '#2563eb'
                },
                {
                    'name': 'font_family',
                    'type': 'text',
                    'label': 'Font Family',
                    'description': 'Font family for the document',
                    'default': 'Helvetica',
                    'placeholder': 'Helvetica'
                }
            ])
        
        # ChromaDB specific fields
        elif 'chromadb' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'collection_name',
                    'type': 'text',
                    'label': 'Collection Name',
                    'description': 'Name of the ChromaDB collection to use',
                    'default': 'documents',
                    'required': True,
                    'placeholder': 'documents'
                },
                {
                    'name': 'embedding_model',
                    'type': 'text',
                    'label': 'Embedding Model',
                    'description': 'Embedding model to use',
                    'default': 'all-MiniLM-L6-v2',
                    'placeholder': 'all-MiniLM-L6-v2'
                },
                {
                    'name': 'chunk_size',
                    'type': 'number',
                    'label': 'Chunk Size',
                    'description': 'Size of text chunks for embedding',
                    'default': 1000,
                    'min': 100,
                    'max': 5000
                },
                {
                    'name': 'chunk_overlap',
                    'type': 'number',
                    'label': 'Chunk Overlap',
                    'description': 'Overlap between text chunks',
                    'default': 200,
                    'min': 0,
                    'max': 1000
                },
                {
                    'name': 'persist_directory',
                    'type': 'text',
                    'label': 'Persist Directory',
                    'description': 'Directory to persist ChromaDB data',
                    'default': './chroma_db',
                    'placeholder': './chroma_db'
                }
            ])
        
        # MongoDB Advanced specific fields
        elif 'mongodb_advanced' in tool_name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'connection_string',
                    'type': 'text',
                    'label': 'Connection String',
                    'description': 'MongoDB connection string (mongodb://username:password@host:port/database)',
                    'required': True,
                    'sensitive': True,
                    'placeholder': 'mongodb://username:password@host:port/database'
                },
                {
                    'name': 'database_name',
                    'type': 'text',
                    'label': 'Database Name',
                    'description': 'Name of the database to connect to',
                    'required': True,
                    'placeholder': 'my_database'
                },
                {
                    'name': 'max_query_time',
                    'type': 'number',
                    'label': 'Max Query Time',
                    'description': 'Maximum query execution time in seconds',
                    'default': 30,
                    'min': 5,
                    'max': 300
                },
                {
                    'name': 'max_results',
                    'type': 'number',
                    'label': 'Max Results',
                    'description': 'Maximum number of results to return',
                    'default': 100,
                    'min': 1,
                    'max': 10000
                },
                {
                    'name': 'enable_logging',
                    'type': 'boolean',
                    'label': 'Enable Logging',
                    'description': 'Enable query logging',
                    'default': False
                }
            ])
    
    # Reddit tool specific fields - applies to all tool types
    if 'reddit' in tool_name.lower():
        logger.info(f"🔧 Reddit tool detected: {tool_name}")
        # Remove the generic fields and replace with Reddit-specific ones
        config_schema['config_fields'] = [
            {
                'name': 'max_results',
                'type': 'number',
                'label': 'Max Results',
                'description': 'Maximum number of results to return',
                'default': 10,
                'min': 1,
                'max': 100
            },
            {
                'name': 'timeout',
                'type': 'number',
                'label': 'Timeout (seconds)',
                'description': 'Request timeout in seconds',
                'default': 30,
                'min': 5,
                'max': 300
            },
            {
                'name': 'client_id',
                'type': 'text',
                'label': 'Reddit Client ID',
                'description': 'Reddit API client ID from your Reddit app (required for live data)',
                'required': True,
                'sensitive': True,
                'placeholder': 'your_reddit_client_id'
            },
            {
                'name': 'client_secret',
                'type': 'text',
                'label': 'Reddit Client Secret',
                'description': 'Reddit API client secret from your Reddit app (required for live data)',
                'required': True,
                'sensitive': True,
                'placeholder': 'your_reddit_client_secret'
            },
            {
                'name': 'username',
                'type': 'text',
                'label': 'Reddit Username (Optional)',
                'description': 'Your Reddit username (optional, only needed for user-specific actions)',
                'required': False,
                'placeholder': 'your_reddit_username'
            },
            {
                'name': 'password',
                'type': 'password',
                'label': 'Reddit Password (Optional)',
                'description': 'Your Reddit password (optional, only needed for user-specific actions)',
                'required': False,
                'sensitive': True,
                'placeholder': 'your_reddit_password'
            }
        ]
        logger.info(f"🔧 Reddit tool config fields set: {len(config_schema['config_fields'])} fields")
    
    # RSS Feed tool specific fields - no configuration needed
    if 'rss' in tool_name.lower() or tool_name == 'rss_feed_tool':
        logger.info(f"🔧 RSS Feed tool detected: {tool_name}")
        # RSS feeds are public, no authentication needed
        config_schema['config_fields'] = [
            {
                'name': 'max_results',
                'type': 'number',
                'label': 'Max Results',
                'description': 'Maximum number of RSS items to return',
                'default': 50,
                'min': 1,
                'max': 200
            },
            {
                'name': 'timeout',
                'type': 'number',
                'label': 'Timeout (seconds)',
                'description': 'Request timeout in seconds',
                'default': 30,
                'min': 5,
                'max': 300
            }
        ]
        logger.info(f"🔧 RSS Feed tool config fields set: {len(config_schema['config_fields'])} fields")
    
    # Telegram tool specific fields
    if 'telegram' in tool_name.lower() or tool_name == 'telegram_tool':
        logger.info(f"🔧 Telegram tool detected: {tool_name}")
        config_schema['config_fields'] = [
            {
                'name': 'max_results',
                'type': 'number',
                'label': 'Max Results',
                'description': 'Maximum number of messages to return',
                'default': 100,
                'min': 1,
                'max': 500
            },
            {
                'name': 'timeout',
                'type': 'number',
                'label': 'Timeout (seconds)',
                'description': 'Request timeout in seconds',
                'default': 30,
                'min': 5,
                'max': 300
            },
            {
                'name': 'api_id',
                'type': 'text',
                'label': 'Telegram API ID',
                'description': 'Telegram API ID from my.telegram.org (required)',
                'required': True,
                'sensitive': True,
                'placeholder': 'your_telegram_api_id'
            },
            {
                'name': 'api_hash',
                'type': 'text',
                'label': 'Telegram API Hash',
                'description': 'Telegram API Hash from my.telegram.org (required)',
                'required': True,
                'sensitive': True,
                'placeholder': 'your_telegram_api_hash'
            },
            {
                'name': 'phone_number',
                'type': 'text',
                'label': 'Phone Number',
                'description': 'Your phone number with country code (e.g., +1234567890)',
                'required': True,
                'sensitive': True,
                'placeholder': '+1234567890'
            },
            {
                'name': 'session_name',
                'type': 'text',
                'label': 'Session Name',
                'description': 'Name for the Telegram session (optional)',
                'required': False,
                'placeholder': 'telegram_session'
            }
        ]
        logger.info(f"🔧 Telegram tool config fields set: {len(config_schema['config_fields'])} fields")
    
    # For website knowledge base tools, fetch the actual page count
    if tool_name == 'website_knowledge_base':
        logger.info(f"🔍 Fetching page count for website knowledge base tool")
        try:
            # Get the website name from the agent's tool configuration if it exists
            website_name = None
            
            # Check if agent_id is provided in the request
            agent_id = None
            if hasattr(current_user, 'id'):
                # Try to get the agent_id from query parameters or request context
                # For now, we'll try to find any agent with this tool configured
                result = await db.execute(
                    select(Agent).where(Agent.user_id == current_user.id)
                )
                agents = result.scalars().all()
                
                for agent in agents:
                    if agent.tools:
                        for tool in agent.tools:
                            if (tool.get('name') == tool_name or 
                                tool.get('tool_name') == tool_name or
                                str(tool.get('id')) == tool_name or
                                str(tool.get('tool_id')) == tool_name):
                                if tool.get('custom_config'):
                                    website_name = tool['custom_config'].get('website_name')
                                    if website_name:
                                        break
                        if website_name:
                            break
            

        except Exception as e:
            logger.warning(f"Error fetching page count: {str(e)}")
    
    return config_schema 

@router.post("/upload-credentials")
async def upload_credentials(
    file: UploadFile = File(...),
    tool_name: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload credential files for tools (Google Calendar, etc.)"""
    try:
        # Validate file type
        if not file.filename.endswith('.json'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only JSON files are allowed for credentials"
            )
        
        # Validate file size (max 1MB)
        if file.size and file.size > 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size must be less than 1MB"
            )
        
        # Create secure directory for user credentials
        credentials_dir = Path(f"credentials/{current_user.id}")
        credentials_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{tool_name}_{timestamp}.json"
        file_path = credentials_dir / filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Validate JSON content
        try:
            with open(file_path, 'r') as f:
                json.load(f)
        except json.JSONDecodeError:
            # Delete invalid file
            file_path.unlink()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON file"
            )
        
        return {
            "success": True,
            "file_path": str(file_path),
            "filename": filename,
            "message": "Credentials uploaded successfully"
        }
        
    except Exception as e:
        logging.error(f"Error uploading credentials: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload credentials"
        )

@router.get("/system-prompts")
async def get_tool_system_prompts(
    current_user: User = Depends(get_current_user)
):
    """Get all tool system prompts"""
    try:
        prompts = {}
        for tool_name in tool_system_prompts_service.list_tool_prompts():
            prompts[tool_name] = tool_system_prompts_service.get_tool_prompt(tool_name)
        
        return {
            "success": True,
            "prompts": prompts,
            "total_tools": len(prompts)
        }
    except Exception as e:
        logger.error(f"Error getting tool system prompts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get tool system prompts"
        )

@router.get("/{tool_name}/system-prompt")
async def get_tool_system_prompt(
    tool_name: str,
    current_user: User = Depends(get_current_user)
):
    """Get system prompt for a specific tool"""
    try:
        prompt = tool_system_prompts_service.get_tool_prompt(tool_name)
        
        if prompt is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No system prompt found for tool: {tool_name}"
            )
        
        return {
            "success": True,
            "tool_name": tool_name,
            "prompt": prompt
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting system prompt for {tool_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get tool system prompt"
        )

class ToolSystemPromptUpdate(BaseModel):
    prompt: str

@router.put("/{tool_name}/system-prompt")
async def update_tool_system_prompt(
    tool_name: str,
    prompt_data: ToolSystemPromptUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update system prompt for a specific tool"""
    try:
        tool_system_prompts_service.add_tool_prompt(tool_name, prompt_data.prompt)
        
        return {
            "success": True,
            "tool_name": tool_name,
            "message": f"System prompt updated for tool: {tool_name}"
        }
    except Exception as e:
        logger.error(f"Error updating system prompt for {tool_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update tool system prompt"
        )

@router.delete("/{tool_name}/system-prompt")
async def delete_tool_system_prompt(
    tool_name: str,
    current_user: User = Depends(get_current_user)
):
    """Delete system prompt for a specific tool"""
    try:
        tool_system_prompts_service.remove_tool_prompt(tool_name)
        
        return {
            "success": True,
            "tool_name": tool_name,
            "message": f"System prompt deleted for tool: {tool_name}"
        }
    except Exception as e:
        logger.error(f"Error deleting system prompt for {tool_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete tool system prompt"
        ) 