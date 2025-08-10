"""
Web Widget integration endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Dict, Any, Optional
import os

from app.core.auth import get_current_user
from app.core.database import get_db, User, Integration
from app.services.web_widget_integration import WebWidgetIntegrationService
from sqlalchemy import select

def get_base_url(request: Request) -> str:
    """Get the base URL for the API"""
    # Use environment variable if available, otherwise construct from request
    base_url = os.getenv('API_BASE_URL')
    if base_url:
        return base_url.rstrip('/')
    
    # Construct from request
    scheme = request.headers.get('x-forwarded-proto', request.url.scheme)
    host = request.headers.get('x-forwarded-host', request.url.hostname)
    port = request.url.port
    
    if port and port not in (80, 443):
        return f"{scheme}://{host}:{port}"
    else:
        return f"{scheme}://{host}"

router = APIRouter()

class WidgetMessage(BaseModel):
    widget_id: str
    session_id: str
    user_id: str = "anonymous"
    message: str
    domain: str
    timestamp: str

class WidgetConfig(BaseModel):
    domain: str
    widget_id: Optional[str] = None
    theme_color: Optional[str] = "#3B82F6"
    position: Optional[str] = "bottom-right"
    greeting_message: Optional[str] = "Hi! How can I help you today?"

@router.post("/message")
async def handle_widget_message(
    message_data: WidgetMessage,
    db: AsyncSession = Depends(get_db)
):
    """
    Handle incoming web widget message
    This endpoint receives messages from embedded chat widgets
    """
    try:
        widget_service = WebWidgetIntegrationService()
        
        # Convert to dict for processing
        message_dict = message_data.dict()
        
        response = await widget_service.process_widget_message(message_dict, db)
        
        if response:
            return response
        else:
            return {
                "response": "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
                "session_id": message_data.session_id,
                "agent_name": "AI Assistant",
                "timestamp": message_data.timestamp
            }
        
    except Exception as e:
        print(f"Widget message error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process message")

@router.get("/script/{integration_id}")
async def get_widget_script(
    integration_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the JavaScript widget script for embedding"""
    try:
        # Get integration
        result = await db.execute(
            select(Integration).where(
                Integration.id == integration_id,
                Integration.user_id == current_user.id,
                Integration.platform == "web"
            )
        )
        integration = result.scalar_one_or_none()
        
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        widget_service = WebWidgetIntegrationService()
        
        # Add API URL to config
        config = integration.config.copy()
        base_url = get_base_url(request)
        config['api_url'] = f"{base_url}/api/v1/web-widget"
        
        script = widget_service.generate_widget_script(config)
        
        return {
            "script": script,
            "integration_id": integration_id,
            "widget_id": config.get('widget_id', 'default'),
            "domain": config.get('domain', '')
        }
        
    except Exception as e:
        print(f"Widget script error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate script")

@router.post("/validate-config")
async def validate_widget_config(
    config: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Validate web widget configuration"""
    try:
        widget_service = WebWidgetIntegrationService()
        is_valid = widget_service.validate_web_config(config)
        
        if is_valid:
            return {"status": "valid", "message": "Configuration is valid"}
        else:
            return {"status": "invalid", "message": "Domain is required and must be valid"}
            
    except Exception as e:
        print(f"Widget config validation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to validate configuration")

@router.get("/preview/{integration_id}")
async def preview_widget(
    integration_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a preview of the widget configuration"""
    try:
        # Get integration
        result = await db.execute(
            select(Integration).where(
                Integration.id == integration_id,
                Integration.user_id == current_user.id,
                Integration.platform == "web"
            )
        )
        integration = result.scalar_one_or_none()
        
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        base_url = get_base_url(request)
        return {
            "preview": {
                "domain": integration.config.get('domain', ''),
                "widget_id": integration.config.get('widget_id', 'default'),
                "theme_color": integration.config.get('theme_color', '#3B82F6'),
                "position": integration.config.get('position', 'bottom-right'),
                "greeting_message": integration.config.get('greeting_message', 'Hi! How can I help you today?')
            },
            "embed_url": f"{base_url}/api/v1/web-widget/script/{integration_id}",
            "test_url": f"{base_url}/api/v1/web-widget/test/{integration_id}"
        }
        
    except Exception as e:
        print(f"Widget preview error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate preview")

@router.get("/test/{integration_id}")
async def test_widget_page(
    integration_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Serve a test page with the widget embedded"""
    try:
        # Get integration (without auth for testing)
        result = await db.execute(
            select(Integration).where(
                Integration.id == integration_id,
                Integration.platform == "web"
            )
        )
        integration = result.scalar_one_or_none()
        
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        widget_service = WebWidgetIntegrationService()
        
        # Add API URL to config
        config = integration.config.copy()
        base_url = get_base_url(request)
        config['api_url'] = f"{base_url}/api/v1/web-widget"
        
        script = widget_service.generate_widget_script(config)
        
        # Create test HTML page
        html_page = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Chat Widget Test</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 40px;
            background: #f9fafb;
            min-height: 100vh;
        }}
        .container {{
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #1f2937;
            margin-bottom: 20px;
        }}
        .info {{
            background: #dbeafe;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #3b82f6;
        }}
        .code-block {{
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 14px;
            overflow-x: auto;
            margin: 20px 0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 AI Chat Widget Test Page</h1>
        
        <div class="info">
            <strong>Widget Test:</strong> This page demonstrates your AI chat widget in action. 
            Look for the chat button in the {config.get('position', 'bottom-right')} corner!
        </div>
        
        <h2>Widget Configuration</h2>
        <ul>
            <li><strong>Domain:</strong> {config.get('domain', '')}</li>
            <li><strong>Widget ID:</strong> {config.get('widget_id', 'default')}</li>
            <li><strong>Theme Color:</strong> {config.get('theme_color', '#3B82F6')}</li>
            <li><strong>Position:</strong> {config.get('position', 'bottom-right')}</li>
        </ul>
        
        <h2>How to Embed</h2>
        <p>Copy and paste this code into your website's HTML:</p>
        <div class="code-block">
            <pre>{script.replace('<', '&lt;').replace('>', '&gt;')}</pre>
        </div>
        
        <p>
            <strong>Try the widget:</strong> Click the chat button to test the AI assistant!
        </p>
    </div>
    
    {script}
</body>
</html>
"""
        
        return HTMLResponse(content=html_page)
        
    except Exception as e:
        print(f"Widget test page error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate test page")

# Import HTMLResponse for the test page
from fastapi.responses import HTMLResponse