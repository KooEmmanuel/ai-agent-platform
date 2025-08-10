"""
Telegram Integration Service for AI Agents
Handles Telegram bot integration and message routing
"""

import asyncio
import httpx
from typing import Dict, Any, Optional
from sqlalchemy import select
from app.core.config import settings
from app.services.agent_service import AgentService
from app.core.database import get_db, Integration, Agent
from sqlalchemy.ext.asyncio import AsyncSession

class TelegramIntegrationService:
    """
    Telegram Bot API integration service
    Handles both webhook and polling modes for receiving messages
    """
    
    def __init__(self):
        self.agent_service = AgentService()
        self.base_url = "https://api.telegram.org/bot"
    
    async def process_telegram_update(self, update_data: Dict[str, Any], db: AsyncSession):
        """Process incoming Telegram update and route to appropriate agent"""
        try:
            # Extract message data
            message = update_data.get('message', {})
            if not message:
                return
            
            chat_id = message.get('chat', {}).get('id')
            user_id = message.get('from', {}).get('id')
            username = message.get('from', {}).get('username', 'Unknown')
            text = message.get('text', '')
            
            if not chat_id or not text:
                return
            
            # Find integration by bot token (we'll need to extract this from the webhook)
            # For now, we'll find the first active Telegram integration
            integration = await self._get_active_telegram_integration(db)
            if not integration:
                print("No active Telegram integration found")
                return
            
            # Get the associated agent
            result = await db.execute(
                select(Agent).where(Agent.id == integration.agent_id)
            )
            agent = result.scalar_one_or_none()
            
            if not agent:
                print(f"No agent found for integration: {integration.id}")
                return
            
            # Process message with agent
            response = await self.agent_service.process_message(
                agent_id=agent.id,
                message=f"Telegram message from @{username}: {text}",
                user_id=integration.user_id,
                db=db
            )
            
            # Send response back to Telegram
            if response:
                await self._send_telegram_message(
                    bot_token=integration.config.get('bot_token'),
                    chat_id=chat_id,
                    text=response
                )
                
        except Exception as e:
            print(f"Error processing Telegram update: {e}")
    
    async def _get_active_telegram_integration(self, db: AsyncSession):
        """Get active Telegram integration"""
        try:
            result = await db.execute(
                select(Integration).where(
                    Integration.platform == "telegram",
                    Integration.is_active == True
                )
            )
            return result.scalar_one_or_none()
        except Exception as e:
            print(f"Error getting Telegram integration: {e}")
            return None
    
    async def _send_telegram_message(self, bot_token: str, chat_id: int, text: str):
        """Send message to Telegram chat"""
        try:
            url = f"{self.base_url}{bot_token}/sendMessage"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json={
                    'chat_id': chat_id,
                    'text': text,
                    'parse_mode': 'HTML'
                })
                
                if response.status_code == 200:
                    print(f"Message sent to Telegram chat {chat_id}")
                else:
                    print(f"Failed to send Telegram message: {response.text}")
                    
        except Exception as e:
            print(f"Error sending Telegram message: {e}")
    
    async def set_webhook(self, bot_token: str, webhook_url: str) -> bool:
        """Set Telegram webhook URL"""
        try:
            url = f"{self.base_url}{bot_token}/setWebhook"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json={
                    'url': webhook_url
                })
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('ok'):
                        print(f"Webhook set successfully: {webhook_url}")
                        return True
                    else:
                        print(f"Failed to set webhook: {result.get('description')}")
                        return False
                else:
                    print(f"HTTP error setting webhook: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"Error setting Telegram webhook: {e}")
            return False
    
    async def delete_webhook(self, bot_token: str) -> bool:
        """Delete Telegram webhook (switch to polling mode)"""
        try:
            url = f"{self.base_url}{bot_token}/deleteWebhook"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('ok'):
                        print("Webhook deleted successfully")
                        return True
                    else:
                        print(f"Failed to delete webhook: {result.get('description')}")
                        return False
                else:
                    print(f"HTTP error deleting webhook: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"Error deleting Telegram webhook: {e}")
            return False
    
    async def get_bot_info(self, bot_token: str) -> Optional[Dict[str, Any]]:
        """Get bot information to validate token"""
        try:
            url = f"{self.base_url}{bot_token}/getMe"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('ok'):
                        return result.get('result')
                    else:
                        print(f"Bot API error: {result.get('description')}")
                        return None
                else:
                    print(f"HTTP error getting bot info: {response.status_code}")
                    return None
                    
        except Exception as e:
            print(f"Error getting bot info: {e}")
            return None
    
    async def start_polling(self, bot_token: str, db: AsyncSession):
        """Start polling for updates (alternative to webhook)"""
        try:
            offset = 0
            url = f"{self.base_url}{bot_token}/getUpdates"
            
            print(f"Starting Telegram polling for bot token: {bot_token[:10]}...")
            
            while True:
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(url, params={
                            'offset': offset,
                            'timeout': 30
                        })
                        
                        if response.status_code == 200:
                            result = response.json()
                            if result.get('ok'):
                                updates = result.get('result', [])
                                
                                for update in updates:
                                    await self.process_telegram_update(update, db)
                                    offset = max(offset, update['update_id'] + 1)
                            else:
                                print(f"Polling error: {result.get('description')}")
                                break
                        else:
                            print(f"HTTP error during polling: {response.status_code}")
                            break
                            
                except Exception as e:
                    print(f"Error during polling: {e}")
                    await asyncio.sleep(5)  # Wait before retrying
                    
        except Exception as e:
            print(f"Error starting Telegram polling: {e}")
    
    def validate_telegram_config(self, config: Dict[str, Any]) -> bool:
        """Validate Telegram integration configuration"""
        bot_token = config.get('bot_token', '')
        
        # Basic validation
        if not bot_token:
            return False
        
        # Bot token format validation (should be like: 123456:ABC-DEF...)
        if ':' not in bot_token:
            return False
        
        parts = bot_token.split(':')
        if len(parts) != 2:
            return False
        
        # First part should be numeric (bot ID)
        try:
            int(parts[0])
        except ValueError:
            return False
        
        return True
    
    async def setup_integration(self, config: Dict[str, Any]) -> bool:
        """Setup Telegram integration based on configuration"""
        try:
            bot_token = config.get('bot_token')
            webhook_url = config.get('webhook_url')
            
            # Validate bot token
            bot_info = await self.get_bot_info(bot_token)
            if not bot_info:
                print("Invalid bot token")
                return False
            
            print(f"Bot validated: {bot_info.get('username')} ({bot_info.get('first_name')})")
            
            # Setup webhook if provided
            if webhook_url:
                success = await self.set_webhook(bot_token, webhook_url)
                if success:
                    print("Webhook mode configured")
                else:
                    print("Failed to set webhook, will use polling")
                    return False
            else:
                # Delete any existing webhook to use polling
                await self.delete_webhook(bot_token)
                print("Polling mode configured")
            
            return True
            
        except Exception as e:
            print(f"Error setting up Telegram integration: {e}")
            return False