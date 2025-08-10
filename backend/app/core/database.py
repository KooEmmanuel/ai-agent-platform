"""
Database configuration and models for the AI Agent Platform
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, Float, func, UniqueConstraint
from sqlalchemy.orm import relationship
from typing import AsyncGenerator
import uuid
from datetime import datetime

from app.core.config import settings

# Create async engine with proper driver handling
def get_async_database_url():
    """Convert sync database URL to async URL if needed"""
    url = settings.DATABASE_URL
    print(f"🔍 Original DATABASE_URL: {url}")
    
    # Check if it's a Railway internal URL that might have connectivity issues
    if "railway.internal" in url:
        print("⚠️  Detected Railway internal URL - checking connectivity...")
        # Try to extract connection info for debugging
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            print(f"🔍 Internal URL - Host: {parsed.hostname}, Port: {parsed.port}")
        except Exception as e:
            print(f"🔍 Could not parse internal URL: {e}")
    
    # Handle different PostgreSQL URL formats
    if url.startswith('postgresql://'):
        if '+asyncpg' in url:
            # Already async URL
            print(f"✅ Already async URL: {url}")
            return url
        elif '+psycopg2' in url:
            # Convert psycopg2 to asyncpg
            async_url = url.replace('+psycopg2', '+asyncpg')
            print(f"🔄 Converted psycopg2 to asyncpg: {async_url}")
            return async_url
        else:
            # Plain postgresql:// URL - add asyncpg
            async_url = url.replace('postgresql://', 'postgresql+asyncpg://')
            print(f"🔄 Added asyncpg to URL: {async_url}")
            return async_url
    elif url.startswith('postgres://'):
        # Convert postgres:// to postgresql+asyncpg://
        async_url = url.replace('postgres://', 'postgresql+asyncpg://')
        print(f"🔄 Converted postgres:// to async: {async_url}")
        return async_url
    else:
        # For SQLite or other databases, return as is
        print(f"✅ Non-PostgreSQL URL (returning as-is): {url}")
        return url

# Create async engine with error handling
try:
    database_url = get_async_database_url()
    print(f"🚀 Creating async engine with URL: {database_url}")
    
    engine = create_async_engine(
        database_url,
        echo=settings.DEBUG,
        pool_pre_ping=True,
        pool_size=5,  # Reduced pool size for Railway
        max_overflow=10,  # Reduced overflow
        pool_timeout=30,  # Connection timeout
        connect_args={
            "server_settings": {
                "application_name": "ai_agent_platform"
            },
            "command_timeout": 60,  # Command timeout
            "connect_timeout": 30,  # Connect timeout
        }
    )
    print("✅ Async engine created successfully")
except Exception as e:
    print(f"❌ Error creating async engine: {e}")
    print(f"🔍 DATABASE_URL: {settings.DATABASE_URL}")
    
    # Try to extract connection info for debugging
    try:
        from urllib.parse import urlparse
        parsed = urlparse(settings.DATABASE_URL)
        print(f"🔍 Parsed URL - Host: {parsed.hostname}, Port: {parsed.port}, Database: {parsed.path}")
    except Exception as parse_error:
        print(f"🔍 Could not parse DATABASE_URL: {parse_error}")
    
    # Check if it's a Railway internal hostname issue
    if "railway.internal" in settings.DATABASE_URL:
        print("⚠️  Detected Railway internal hostname - this might be a networking issue")
        print("💡 Try using the external DATABASE_URL from Railway dashboard")
    
    raise

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Create base class for models
Base = declarative_base()

# System user ID for default tools
SYSTEM_USER_ID = 1

# Database dependency
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Initialize database
async def init_db():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created successfully")
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        print("💡 This might be a connection issue. Check your Railway database configuration.")
        raise

# Close database
async def close_db():
    await engine.dispose()

# Check database connection
async def check_db_connection():
    """Check if database is connected and accessible"""
    try:
        async with engine.begin() as conn:
            # Try to execute a simple query
            result = await conn.execute("SELECT 1")
            await result.fetchone()
            return {"status": "connected", "message": "Database connection successful"}
    except Exception as e:
        return {"status": "error", "message": f"Database connection failed: {str(e)}"}

# Test database connection
async def test_db_connection():
    """Test database connection and return detailed status"""
    try:
        # Test basic connection
        async with engine.begin() as conn:
            result = await conn.execute("SELECT version()")
            version = await result.fetchone()
            
        # Test if tables exist
        async with engine.begin() as conn:
            result = await conn.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                LIMIT 5
            """)
            tables = await result.fetchall()
            
        return {
            "status": "connected",
            "message": "Database connection successful",
            "version": version[0] if version else "Unknown",
            "tables_count": len(tables),
            "sample_tables": [table[0] for table in tables[:3]]
        }
    except Exception as e:
        return {
            "status": "error", 
            "message": f"Database connection failed: {str(e)}",
            "error_type": type(e).__name__
        }

# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    picture = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    credits = relationship("UserCredits", back_populates="user", uselist=False)
    credit_transactions = relationship("CreditTransaction", back_populates="user")
    agents = relationship("Agent", back_populates="user")
    conversations = relationship("Conversation", back_populates="user")
    tools = relationship("Tool", back_populates="user")
    user_tools = relationship("UserTool", back_populates="user")
    integrations = relationship("Integration", back_populates="user")
    notification_preferences = relationship("NotificationPreference", back_populates="user", uselist=False)
    push_subscriptions = relationship("PushSubscription", back_populates="user")
    notification_history = relationship("NotificationHistory", back_populates="user")
    user_preferences = relationship("UserPreferences", back_populates="user")
    subscription = relationship("UserSubscription", back_populates="user", uselist=False)
    billing_history = relationship("BillingHistory", back_populates="user")

class UserCredits(Base):
    __tablename__ = "user_credits"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    total_credits = Column(Float, default=1000.0)  # Free tier starts with 1000 credits
    used_credits = Column(Float, default=0.0)
    available_credits = Column(Float, default=1000.0)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="credits")

class CreditTransaction(Base):
    __tablename__ = "credit_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    transaction_type = Column(String)  # 'usage', 'purchase', 'refund', 'bonus'
    amount = Column(Float)  # Positive for credits added, negative for credits used
    description = Column(String)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=True)
    tool_used = Column(String, nullable=True)  # Which tool was used
    meta_data = Column(JSON, nullable=True)  # Additional data about the transaction
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="credit_transactions")
    agent = relationship("Agent", back_populates="credit_transactions")
    conversation = relationship("Conversation", back_populates="credit_transactions")

class Agent(Base):
    __tablename__ = "agents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    description = Column(Text, nullable=True)
    instructions = Column(Text)
    model = Column(String, default="gpt-4o-mini")  # AI model to use
    tools = Column(JSON)  # Array of tool configurations
    context_config = Column(JSON, nullable=True)  # Context and memory configuration
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="agents")
    conversations = relationship("Conversation", back_populates="agent")
    credit_transactions = relationship("CreditTransaction", back_populates="agent")
    user_preferences = relationship("UserPreferences", back_populates="agent")

class Tool(Base):
    __tablename__ = "tools"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=False)  # search, scheduling, custom, etc.
    tool_type = Column(String, nullable=False)  # function, api, webhook, etc.
    config = Column(JSON, nullable=False)  # Tool configuration
    is_public = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="tools")
    user_tools = relationship("UserTool", back_populates="tool")

class UserTool(Base):
    __tablename__ = "user_tools"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tool_id = Column(Integer, ForeignKey("tools.id"), nullable=False)
    is_favorite = Column(Boolean, default=False)
    custom_config = Column(JSON, nullable=True)  # User's custom configuration for this tool
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="user_tools")
    tool = relationship("Tool", back_populates="user_tools")
    
    # Unique constraint to prevent duplicate user-tool relationships
    __table_args__ = (
        UniqueConstraint('user_id', 'tool_id', name='uq_user_tool'),
    )

class Integration(Base):
    __tablename__ = "integrations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    platform = Column(String, nullable=False)  # whatsapp, telegram, discord, etc.
    config = Column(JSON, nullable=False)  # Platform-specific configuration
    webhook_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="integrations")
    agent = relationship("Agent")

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    agent_id = Column(Integer, ForeignKey("agents.id"))
    session_id = Column(String, nullable=True)  # Session tracking
    title = Column(String)
    context_summary = Column(Text, nullable=True)  # Conversation summary
    memory_metadata = Column(JSON, nullable=True)  # Memory metadata
    retention_policy = Column(JSON, nullable=True)  # Retention settings
    meta_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="conversations")
    agent = relationship("Agent", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")
    credit_transactions = relationship("CreditTransaction", back_populates="conversation")

class UserPreferences(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=True)
    category = Column(String)  # "product_preferences", "communication_style", etc.
    preferences = Column(JSON)  # Actual preference data
    is_persistent = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="user_preferences")
    agent = relationship("Agent", back_populates="user_preferences")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    role = Column(String)  # 'user', 'assistant', 'system'
    content = Column(Text)
    meta_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    email_notifications = Column(Boolean, default=True)
    push_notifications = Column(Boolean, default=False)
    weekly_reports = Column(Boolean, default=True)
    marketing_emails = Column(Boolean, default=False)
    agent_alerts = Column(Boolean, default=True)
    integration_alerts = Column(Boolean, default=True)
    credit_alerts = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="notification_preferences")


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    endpoint = Column(Text)
    p256dh_key = Column(Text)
    auth_key = Column(Text)
    user_agent = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="push_subscriptions")


class NotificationHistory(Base):
    __tablename__ = "notification_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    notification_type = Column(String)  # 'email', 'push', 'weekly_report'
    subject = Column(String, nullable=True)
    content = Column(Text)
    status = Column(String, default='sent')  # 'sent', 'failed', 'pending'
    error_message = Column(Text, nullable=True)
    meta_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="notification_history")


class EmailTemplate(Base):
    __tablename__ = "email_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)  # 'weekly_report', 'agent_alert', etc.
    subject = Column(String)
    html_content = Column(Text)
    text_content = Column(Text, nullable=True)
    variables = Column(JSON, nullable=True)  # List of template variables
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)  # 'free', 'starter', 'pro', 'enterprise'
    display_name = Column(String)  # 'Free Plan', 'Starter Plan', etc.
    description = Column(Text, nullable=True)
    price = Column(Float, default=0.0)  # Monthly price in USD
    currency = Column(String, default='USD')
    billing_interval = Column(String, default='month')  # 'month', 'year'
    
    # Plan limits
    monthly_credits = Column(Integer, default=1000)
    max_agents = Column(Integer, default=3)  # -1 for unlimited
    max_custom_tools = Column(Integer, default=0)  # -1 for unlimited
    max_integrations = Column(Integer, default=-1)  # -1 for unlimited
    
    # Features
    features = Column(JSON, nullable=True)  # List of features
    support_level = Column(String, default='community')  # 'community', 'email', 'priority'
    custom_branding = Column(Boolean, default=False)
    api_access = Column(Boolean, default=False)
    priority_support = Column(Boolean, default=False)
    
    # Stripe/Payment integration
    stripe_price_id = Column(String, nullable=True)  # Stripe price ID
    stripe_product_id = Column(String, nullable=True)  # Stripe product ID
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    subscriptions = relationship("UserSubscription", back_populates="plan")


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"))
    
    # Subscription status
    status = Column(String, default='active')  # 'active', 'canceled', 'past_due', 'trialing'
    current_period_start = Column(DateTime)
    current_period_end = Column(DateTime)
    cancel_at_period_end = Column(Boolean, default=False)
    canceled_at = Column(DateTime, nullable=True)
    
    # Payment integration
    stripe_subscription_id = Column(String, nullable=True)
    stripe_customer_id = Column(String, nullable=True)
    
    # Credits tracking for current billing period
    credits_reset_at = Column(DateTime)  # When credits were last reset
    credits_used_this_period = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="subscription")
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")


class BillingHistory(Base):
    __tablename__ = "billing_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    subscription_id = Column(Integer, ForeignKey("user_subscriptions.id"))
    
    # Invoice details
    amount = Column(Float)
    currency = Column(String, default='USD')
    status = Column(String)  # 'paid', 'pending', 'failed', 'refunded'
    description = Column(String)
    
    # Payment integration
    stripe_invoice_id = Column(String, nullable=True)
    stripe_payment_intent_id = Column(String, nullable=True)
    
    # Dates
    invoice_date = Column(DateTime)
    paid_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="billing_history")
    subscription = relationship("UserSubscription") 