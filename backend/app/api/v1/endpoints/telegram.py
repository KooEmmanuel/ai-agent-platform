"""
Telegram integration endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Dict, Any, Optional

from app.core.auth import get_current_user
from app.core.database import get_db, User
from app.services.telegram_integration import TelegramIntegrationService

router = APIRouter()

class TelegramUpdate(BaseModel):
    update_id: int
    message: Optional[Dict[str, Any]] = None
    edited_message: Optional[Dict[str, Any]] = None
    callback_query: Optional[Dict[str, Any]] = None

@router.post("/webhook")
async def telegram_webhook(
    update: TelegramUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Handle incoming Telegram webhook updates
    This endpoint receives updates from Telegram Bot API
    """
    try:
        telegram_service = TelegramIntegrationService()
        
        # Convert to dict for processing
        update_data = update.dict()
        
        await telegram_service.process_telegram_update(update_data, db)
        
        return {"status": "ok"}
        
    except Exception as e:
        print(f"Telegram webhook error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process update")

@router.post("/setup-webhook")
async def setup_telegram_webhook(
    bot_token: str,
    webhook_url: str,
    current_user: User = Depends(get_current_user)
):
    """Setup Telegram webhook for a bot"""
    try:
        telegram_service = TelegramIntegrationService()
        
        success = await telegram_service.set_webhook(bot_token, webhook_url)
        
        if success:
            return {"status": "success", "message": "Webhook set successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to set webhook")
            
    except Exception as e:
        print(f"Webhook setup error: {e}")
        raise HTTPException(status_code=500, detail="Failed to setup webhook")

@router.post("/delete-webhook")
async def delete_telegram_webhook(
    bot_token: str,
    current_user: User = Depends(get_current_user)
):
    """Delete Telegram webhook (switch to polling)"""
    try:
        telegram_service = TelegramIntegrationService()
        
        success = await telegram_service.delete_webhook(bot_token)
        
        if success:
            return {"status": "success", "message": "Webhook deleted successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to delete webhook")
            
    except Exception as e:
        print(f"Webhook deletion error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete webhook")

@router.post("/validate-token")
async def validate_telegram_token(
    bot_token: str,
    current_user: User = Depends(get_current_user)
):
    """Validate Telegram bot token"""
    try:
        telegram_service = TelegramIntegrationService()
        
        bot_info = await telegram_service.get_bot_info(bot_token)
        
        if bot_info:
            return {
                "status": "valid",
                "bot_info": {
                    "id": bot_info.get("id"),
                    "username": bot_info.get("username"),
                    "first_name": bot_info.get("first_name"),
                    "can_join_groups": bot_info.get("can_join_groups"),
                    "can_read_all_group_messages": bot_info.get("can_read_all_group_messages"),
                    "supports_inline_queries": bot_info.get("supports_inline_queries")
                }
            }
        else:
            return {"status": "invalid", "message": "Invalid bot token"}
            
    except Exception as e:
        print(f"Token validation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to validate token")

@router.post("/test")
async def test_telegram_integration(
    integration_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Test Telegram integration by sending a test message"""
    try:
        # This would send a test message to verify the integration works
        # For now, just return success
        return {"status": "success", "message": "Test message would be sent"}
        
    except Exception as e:
        print(f"Telegram test error: {e}")
        raise HTTPException(status_code=500, detail="Failed to test integration")

@router.post("/validate-config")
async def validate_telegram_config(
    config: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Validate Telegram configuration"""
    try:
        telegram_service = TelegramIntegrationService()
        is_valid = telegram_service.validate_telegram_config(config)
        
        if is_valid:
            # Also validate the bot token with Telegram API
            bot_token = config.get('bot_token')
            bot_info = await telegram_service.get_bot_info(bot_token)
            
            if bot_info:
                return {
                    "status": "valid", 
                    "message": "Configuration is valid",
                    "bot_username": bot_info.get('username')
                }
            else:
                return {"status": "invalid", "message": "Invalid bot token"}
        else:
            return {"status": "invalid", "message": "Invalid configuration format"}
            
    except Exception as e:
        print(f"Telegram config validation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to validate configuration")