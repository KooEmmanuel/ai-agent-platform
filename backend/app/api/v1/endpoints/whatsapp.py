"""
WhatsApp webhook endpoints for receiving messages
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any
from app.core.database import get_db
from app.services.whatsapp_integration import WhatsAppIntegrationService

router = APIRouter()

@router.get("/webhook")
async def verify_webhook(
    hub_mode: str = Query(..., alias="hub.mode"),
    hub_verify_token: str = Query(..., alias="hub.verify_token"), 
    hub_challenge: str = Query(..., alias="hub.challenge")
):
    """
    Verify WhatsApp webhook subscription
    This endpoint is called by WhatsApp to verify your webhook URL
    """
    whatsapp_service = WhatsAppIntegrationService()
    challenge = await whatsapp_service.verify_webhook(
        hub_mode, hub_verify_token, hub_challenge
    )
    
    if challenge:
        return int(challenge)
    
    raise HTTPException(status_code=403, detail="Forbidden")

@router.post("/webhook")
async def receive_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Receive WhatsApp messages via webhook
    This endpoint receives incoming WhatsApp messages and routes them to AI agents
    """
    try:
        webhook_data = await request.json()
        
        whatsapp_service = WhatsAppIntegrationService()
        await whatsapp_service.handle_webhook(webhook_data, db)
        
        return {"status": "ok"}
        
    except Exception as e:
        print(f"Webhook error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/send-message")
async def send_message(
    phone_number_id: str,
    to: str,
    message: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message via WhatsApp (for testing)
    """
    try:
        whatsapp_service = WhatsAppIntegrationService()
        await whatsapp_service.send_message(phone_number_id, to, message)
        
        return {"status": "sent", "to": to, "message": message}
        
    except Exception as e:
        print(f"Send message error: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message")