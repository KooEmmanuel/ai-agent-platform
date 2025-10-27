"""
Configuration settings for the AI Agent Platform
"""

from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Drixai Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./ai_agent_platform.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "AGNT4FLW98F4PGHTUI3WHI")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # API Base URL
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://localhost:8000").rstrip('/')
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://drixai.com",  # Production frontend
        "https://www.drixai.com",  # Production frontend
        "https://drixai.com",  # Production frontend
        "https://www.drixai.com",  # Production frontend
        "https://kwickbuild.up.railway.app",  # Backend itself
        "https://kwickbuild.vercel.app",
        "https://ai-agent-platform-production.up.railway.app",  # Alternative backend URL
        "*"  # Allow all origins for web widget integration
    ]
    
    # External APIs
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    TAVILY_API_KEY: Optional[str] = None
    
    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_CALLBACK_URL: Optional[str] = None
    
    # WhatsApp Integration
    WHATSAPP_ACCESS_TOKEN: Optional[str] = None
    WHATSAPP_VERIFY_TOKEN: Optional[str] = None
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None
    WHATSAPP_BUSINESS_ACCOUNT_ID: Optional[str] = None
    
    # Redis (for caching and queues)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # Vercel Blob Storage
    BLOB_READ_WRITE_TOKEN: Optional[str] = None
    
    # Agent Settings
    MAX_AGENTS_PER_USER: int = 10
    MAX_TOOLS_PER_AGENT: int = 20
    
    # Firebase Configuration (for existing .env)
    FIREBASE_API_KEY: Optional[str] = None
    FIREBASE_AUTH_DOMAIN: Optional[str] = None
    FIREBASE_PROJECT_ID: Optional[str] = None
    FIREBASE_STORAGE_BUCKET: Optional[str] = None
    FIREBASE_MESSAGING_SENDER_ID: Optional[str] = None
    FIREBASE_APP_ID: Optional[str] = None
    FIREBASE_MEASUREMENT_ID: Optional[str] = None
    FIREBASE_PRIVATE_KEY: Optional[str] = None
    FIREBASE_CLIENT_EMAIL: Optional[str] = None
    FIREBASE_PRIVATE_KEY_ID: Optional[str] = None
    FIREBASE_CLIENT_ID: Optional[str] = None
    
    # Stripe Configuration
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    
    # SMTP Email Configuration
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: Optional[str] = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "noreply@kooagent.com")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "KooAgent Platform")
    
    # File Upload Notification Settings
    FILE_UPLOAD_NOTIFICATION_ENABLED: bool = os.getenv("FILE_UPLOAD_NOTIFICATION_ENABLED", "true").lower() == "true"
    FILE_UPLOAD_NOTIFICATION_EMAILS: str = os.getenv("FILE_UPLOAD_NOTIFICATION_EMAILS", "")  # Comma-separated emails
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Allow extra fields from .env

# Create settings instance
settings = Settings() 