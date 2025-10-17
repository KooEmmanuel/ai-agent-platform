"""
AI Agent Platform Backend
FastAPI application for managing AI agents, tools, and integrations
"""

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
import os
from loguru import logger
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from app.core.config import settings
from app.core.database import init_db, close_db, check_db_connection, test_db_connection
from app.api.v1.api import api_router
from app.core.auth import get_current_user

# Security
security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting AI Agent Platform Backend...")
    await init_db()
    logger.info("Database initialized successfully")
    
    # Load marketplace tools from JSON (no seeding needed)
    try:
        from app.services.marketplace_tools_service import marketplace_tools_service
        tools_count = len(marketplace_tools_service.get_all_tools())
        logger.info(f"Loaded {tools_count} marketplace tools from JSON")
    except Exception as e:
        logger.warning(f"Could not load marketplace tools: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Agent Platform Backend...")
    await close_db()
    logger.info("Database connection closed")

# Create FastAPI app
app = FastAPI(
    title="AI Agent Platform",
    description="A comprehensive platform for creating, managing, and deploying AI agents",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler to catch any unhandled exceptions"""
    logger.error(f"🔴 Global exception handler caught: {type(exc).__name__}: {exc}")
    logger.error(f"🔴 Request URL: {request.url}")
    logger.error(f"🔴 Request method: {request.method}")
    logger.error(f"🔴 Request headers: {dict(request.headers)}")
    
    import traceback
    logger.error(f"🔴 Full traceback: {traceback.format_exc()}")
    
    # Return 500 instead of 403 for debugging
    return JSONResponse(
        status_code=500,
        content={
            "detail": f"Internal server error: {type(exc).__name__}: {str(exc)}",
            "error_type": type(exc).__name__
        }
    )

# CORS middleware - Use settings for configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,  # Allow credentials for authentication
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Create temp directory for PDF files
temp_dir = os.path.join(os.getcwd(), "temp")
os.makedirs(temp_dir, exist_ok=True)

# Mount static files for temp directory
app.mount("/temp", StaticFiles(directory=temp_dir), name="temp")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI Agent Platform API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Simple health check without heavy imports
        return {
            "status": "healthy", 
            "service": "ai-agent-platform",
            "timestamp": "2025-08-10T03:00:00Z"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "ai-agent-platform", 
            "error": str(e),
            "timestamp": "2025-08-10T03:00:00Z"
        }

@app.get("/health/db")
async def database_health_check():
    """Database health check endpoint"""
    db_status = await check_db_connection()
    return {
        "service": "ai-agent-platform",
        "database": db_status,
        "timestamp": "2025-08-10T02:58:00Z"
    }

@app.get("/health/db/detailed")
async def database_detailed_health_check():
    """Detailed database health check endpoint"""
    db_status = await test_db_connection()
    return {
        "service": "ai-agent-platform",
        "database": db_status,
        "timestamp": "2025-08-10T02:58:00Z"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 