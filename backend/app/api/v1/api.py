"""
Main API router for v1 endpoints
"""

from fastapi import APIRouter
from app.api.v1.endpoints import auth, agents, tools, integrations, playground, credits, whatsapp, email, telegram, web_widget, analytics, users, notifications, billing, conversations

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])
api_router.include_router(tools.router, prefix="/tools", tags=["tools"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])
api_router.include_router(playground.router, prefix="/playground", tags=["playground"])
api_router.include_router(credits.router, prefix="/credits", tags=["credits"])
api_router.include_router(whatsapp.router, prefix="/whatsapp", tags=["whatsapp"])
api_router.include_router(email.router, prefix="/email", tags=["email"])
api_router.include_router(telegram.router, prefix="/telegram", tags=["telegram"])
api_router.include_router(web_widget.router, prefix="/web-widget", tags=["web-widget"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["conversations"]) 