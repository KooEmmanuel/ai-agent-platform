"""
Tool marketplace and management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from app.core.database import get_db, User, Tool, UserTool, SYSTEM_USER_ID
from app.core.auth import get_current_user
from app.services.marketplace_tools_service import marketplace_tools_service

router = APIRouter()

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
    # Check if tool exists and is public
    result = await db.execute(
        select(Tool).where(Tool.id == tool_id, Tool.is_public == True, Tool.is_active == True)
    )
    tool = result.scalar_one_or_none()
    
    if not tool:
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
    
    # Add to user's collection
    user_tool = UserTool(
        user_id=current_user.id,
        tool_id=tool_id
    )
    db.add(user_tool)
    await db.commit()
    
    return {"message": f"Tool '{tool.name}' added to your collection successfully"}

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

@router.get("/{tool_id}/config-schema")
async def get_tool_config_schema(
    tool_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get configuration schema for a specific tool"""
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
    
    # Get tool class from registry
    from app.services.tool_registry import ToolRegistry
    tool_registry = ToolRegistry()
    tool_class = tool_registry.get_tool_class(tool.name)
    
    if not tool_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tool implementation not found"
        )
    
    # Create a temporary instance to get tool info
    temp_tool = tool_class({})
    tool_info = temp_tool.get_tool_info()
    
    # Extract configuration schema from tool's config
    config_schema = {
        'tool_name': tool.name,
        'tool_description': tool.description,
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
    if tool.tool_type == 'API':
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
        if 'weather' in tool.name.lower():
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
                }
            ])
        
        # News search API specific fields
        elif 'news' in tool.name.lower():
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
        elif 'sheets' in tool.name.lower() or 'google' in tool.name.lower():
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
        elif 'payment' in tool.name.lower():
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
    
    elif tool.tool_type == 'Function':
        # Add function-specific fields
        if 'web' in tool.name.lower() or 'search' in tool.name.lower():
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
        elif 'calendar' in tool.name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'credentials_path',
                    'type': 'text',
                    'label': 'Google Credentials Path',
                    'description': 'Path to Google Calendar API credentials JSON file',
                    'required': True,
                    'placeholder': 'path/to/credentials.json'
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
        elif 'reminder' in tool.name.lower():
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
        elif 'date' in tool.name.lower() and 'calculator' in tool.name.lower():
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
        elif 'csv' in tool.name.lower() or 'data' in tool.name.lower():
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
        elif 'email' in tool.name.lower():
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
        elif 'text' in tool.name.lower() and 'analyzer' in tool.name.lower():
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
        elif 'image' in tool.name.lower():
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
        elif 'pdf' in tool.name.lower():
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
        elif 'file' in tool.name.lower() and 'processor' in tool.name.lower():
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
        
        # Data scraper specific fields
        elif 'scraper' in tool.name.lower() or 'scrape' in tool.name.lower():
            config_schema['config_fields'].extend([
                {
                    'name': 'user_agent',
                    'type': 'text',
                    'label': 'User Agent',
                    'description': 'User agent string for web requests',
                    'default': 'KooAgent Data Scraper 1.0',
                    'placeholder': 'KooAgent Data Scraper 1.0'
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
        
        # Database query specific fields
        elif 'database' in tool.name.lower():
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
        elif 'visualization' in tool.name.lower():
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
        elif 'statistical' in tool.name.lower():
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
        elif 'notification' in tool.name.lower():
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
        elif 'social' in tool.name.lower():
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
        elif 'translation' in tool.name.lower() or 'translate' in tool.name.lower():
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
    
    elif tool.tool_type == 'Webhook':
        # Slack integration specific fields
        if 'slack' in tool.name.lower():
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
        elif 'zapier' in tool.name.lower():
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
    
    return config_schema 