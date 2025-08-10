"""
AI Agent Platform Backend
FastAPI application for managing AI agents, tools, and integrations
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from contextlib import asynccontextmanager
import uvicorn
from loguru import logger

from app.core.config import settings
from app.core.database import init_db, close_db
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

# CORS middleware - Allow specific origins for production and development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://kwickbuild.vercel.app",  # Production frontend
        "http://localhost:3000",          # Development frontend
        "http://localhost:3001",          # Alternative dev port
        "https://kwickbuild.up.railway.app",  # Backend itself
        "*",  # Allow all origins for development (remove in production)
    ],
    allow_credentials=True,  # Allow credentials for authentication
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

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
    return {"status": "healthy", "service": "ai-agent-platform"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 