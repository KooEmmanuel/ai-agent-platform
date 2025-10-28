"""
Main API router for v1 endpoints
"""

from fastapi import APIRouter
from app.api.v1.endpoints import auth, agents, tools, integrations, playground, credits, whatsapp, email, telegram, web_widget, analytics, users, notifications, billing, conversations, knowledge_base, files, admin, admin_auth, support, project_management, organizations, file_notifications, organization_integrations, organization_project_management

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])
api_router.include_router(tools.router, prefix="/tools", tags=["tools"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])
api_router.include_router(organization_integrations.router, prefix="/integrations", tags=["organization-integrations"])
api_router.include_router(organization_project_management.router, prefix="/project-management", tags=["organization-project-management"])
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
api_router.include_router(knowledge_base.router, prefix="/knowledge-base", tags=["knowledge-base"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(admin_auth.router, prefix="/admin-auth", tags=["admin-authentication"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(support.router, prefix="/support", tags=["support"])
api_router.include_router(project_management.router, prefix="/project-management", tags=["project-management"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(file_notifications.router, prefix="/file-notifications", tags=["file-notifications"]) 