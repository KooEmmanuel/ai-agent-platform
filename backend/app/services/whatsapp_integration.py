"""
WhatsApp Integration Service for AI Agents
Handles WhatsApp Business API integration and message routing
"""

import asyncio
import httpx
from typing import Dict, Any, Optional
from sqlalchemy import select
from app.core.config import settings
from app.services.agent_service import AgentService
from app.core.database import get_db, Integration, Agent
from sqlalchemy.ext.asyncio import AsyncSession

class WhatsAppIntegrationService:
    """
    WhatsApp Business API integration service
    Handles incoming webhooks and outgoing messages
    """
    
    def __init__(self):
        self.api_url = "https://graph.facebook.com/v18.0"
        self.verify_token = settings.WHATSAPP_VERIFY_TOKEN
    
    async def verify_webhook(self, mode: str, token: str, challenge: str) -> Optional[str]:
        """Verify WhatsApp webhook subscription"""
        if mode == "subscribe" and token == self.verify_token:
            return challenge
        return None
    
    async def handle_webhook(self, webhook_data: Dict[str, Any], db: AsyncSession):
        """Process incoming WhatsApp messages"""
        try:
            # Extract message data
            entry = webhook_data.get("entry", [{}])[0]
            changes = entry.get("changes", [{}])[0]
            value = changes.get("value", {})
            
            messages = value.get("messages", [])
            
            for message in messages:
                await self._process_message(message, value, db)
                
        except Exception as e:
            print(f"Error processing webhook: {e}")
    
    async def _process_message(self, message: Dict[str, Any], value: Dict[str, Any], db: AsyncSession):
        """Process individual WhatsApp message"""
        try:
            # Extract message details
            phone_number = message.get("from")
            message_body = message.get("text", {}).get("body", "")
            message_id = message.get("id")
            
            # Find the integration and associated agent
            phone_number_id = value.get("metadata", {}).get("phone_number_id")
            integration = await self._get_integration_by_phone_id(phone_number_id, db)
            
            if not integration:
                print(f"No integration found for phone number ID: {phone_number_id}")
                return
            
            # Get the agent
            agent_service = AgentService(db)
            agent = await agent_service.get_agent(integration.agent_id)
            
            if not agent or not agent.is_active:
                await self.send_message(
                    phone_number_id,
                    phone_number,
                    "Sorry, this agent is currently unavailable."
                )
                return
            
            # Process message with AI agent
            response, tools_used, cost = await agent_service.execute_agent(
                agent=agent,
                user_message=message_body,
                conversation_history=[],
                session_id=f"whatsapp_{phone_number}"
            )
            
            # Send response back to WhatsApp
            await self.send_message(phone_number_id, phone_number, response)
            
            # Log the interaction
            print(f"WhatsApp message processed: {phone_number} -> {agent.name}")
            
        except Exception as e:
            print(f"Error processing message: {e}")
    
    async def send_message(self, phone_number_id: str, to: str, message: str):
        """Send message via WhatsApp Business API"""
        try:
            url = f"{self.api_url}/{phone_number_id}/messages"
            
            payload = {
                "messaging_product": "whatsapp",
                "to": to,
                "text": {"body": message}
            }
            
            headers = {
                "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                
            print(f"Message sent successfully to {to}")
            
        except Exception as e:
            print(f"Error sending message: {e}")
    
    async def _get_integration_by_phone_id(self, phone_number_id: str, db: AsyncSession):
        """Get WhatsApp integration by phone number ID"""
        try:
            result = await db.execute(
                select(Integration).where(
                    Integration.platform == "whatsapp",
                    Integration.is_active == True
                ).filter(
                    Integration.config["phone_number_id"].astext == phone_number_id
                )
            )
            return result.scalar_one_or_none()
        except Exception as e:
            print(f"Error getting integration: {e}")
            return None