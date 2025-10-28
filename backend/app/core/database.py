"""
Database configuration and models for the AI Agent Platform
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, Float, func, UniqueConstraint, text
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
    
    # Configure engine based on database type
    if database_url.startswith('sqlite'):
        # SQLite configuration - no pooling parameters
        engine = create_async_engine(
            database_url,
            echo=settings.DEBUG,
            connect_args={"check_same_thread": False}
        )
    else:
        # PostgreSQL configuration - with pooling parameters
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
                }
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
        database_url = get_async_database_url()
        
        if database_url.startswith('sqlite'):
            # SQLite-specific queries
            async with engine.begin() as conn:
                result = await conn.execute(text("SELECT sqlite_version()"))
                version = result.fetchone()
                
            # Test if tables exist (SQLite)
            async with engine.begin() as conn:
                result = await conn.execute(text("""
                    SELECT name 
                    FROM sqlite_master 
                    WHERE type='table' AND name NOT LIKE 'sqlite_%'
                    LIMIT 5
                """))
                tables = result.fetchall()
        else:
            # PostgreSQL-specific queries
            async with engine.begin() as conn:
                result = await conn.execute(text("SELECT version()"))
                version = result.fetchone()
                
            # Test if tables exist (PostgreSQL)
            async with engine.begin() as conn:
                result = await conn.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    LIMIT 5
                """))
                tables = result.fetchall()
            
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
    firebase_uid = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    hashed_password = Column(String, nullable=True)
    picture = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    credits = relationship("UserCredits", back_populates="user", uselist=False)
    credit_transactions = relationship("CreditTransaction", back_populates="user")
    agents = relationship("Agent", back_populates="user")
    conversations = relationship("Conversation", back_populates="user")
    workspaces = relationship("Workspace", back_populates="user")
    tools = relationship("Tool", back_populates="user")
    user_tools = relationship("UserTool", back_populates="user")
    integrations = relationship("Integration", back_populates="user")
    notification_preferences = relationship("NotificationPreference", back_populates="user", uselist=False)
    push_subscriptions = relationship("PushSubscription", back_populates="user")
    notification_history = relationship("NotificationHistory", back_populates="user")
    user_preferences = relationship("UserPreferences", back_populates="user")
    subscription = relationship("UserSubscription", back_populates="user", uselist=False)
    billing_history = relationship("BillingHistory", back_populates="user")
    knowledge_base_collections = relationship("KnowledgeBaseCollection", back_populates="user")
    support_tickets = relationship("SupportTicket", back_populates="user")

class Admin(Base):
    __tablename__ = "admins"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    hashed_password = Column(String)
    is_super_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_login = Column(DateTime, nullable=True)

class SupportTicket(Base):
    __tablename__ = "support_tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_email = Column(String, nullable=False)  # Store email even if user is deleted
    user_name = Column(String, nullable=True)
    subject = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=False)  # 'auth', 'billing', 'technical', 'general'
    priority = Column(String, default='medium')  # 'low', 'medium', 'high', 'urgent'
    status = Column(String, default='open')  # 'open', 'in_progress', 'resolved', 'closed'
    assigned_to = Column(Integer, ForeignKey("admins.id"), nullable=True)
    admin_notes = Column(Text, nullable=True)
    resolution = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    resolved_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="support_tickets")
    assigned_admin = relationship("Admin", foreign_keys=[assigned_to])
    messages = relationship("SupportMessage", back_populates="ticket")

class SupportMessage(Base):
    __tablename__ = "support_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id"), nullable=False)
    sender_type = Column(String, nullable=False)  # 'user', 'admin'
    sender_id = Column(Integer, nullable=True)  # user_id or admin_id
    sender_name = Column(String, nullable=False)
    sender_email = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)  # Internal admin notes
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    ticket = relationship("SupportTicket", back_populates="messages")

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

class OrganizationIntegration(Base):
    __tablename__ = "organization_integrations"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    platform = Column(String, nullable=False)  # whatsapp, telegram, discord, etc.
    config = Column(JSON, nullable=False)  # Platform-specific configuration
    webhook_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who created this integration
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization")
    agent = relationship("Agent")
    created_by = relationship("User")

# Organization Project Management Models
class OrganizationProject(Base):
    """Organization Project Management - Projects"""
    __tablename__ = "organization_projects"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    integration_id = Column(Integer, ForeignKey("organization_integrations.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default='active')  # 'active', 'completed', 'paused', 'cancelled'
    priority = Column(String, default='medium')  # 'low', 'medium', 'high', 'urgent'
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    budget = Column(Float, nullable=True)
    progress = Column(Float, default=0.0)  # 0-100 percentage
    color = Column(String, nullable=True)  # UI color
    icon = Column(String, nullable=True)  # UI icon
    settings = Column(JSON, nullable=True)  # Project-specific settings
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who created this project
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization")
    integration = relationship("OrganizationIntegration")
    created_by = relationship("User")
    tasks = relationship("OrganizationProjectTask", back_populates="project", cascade="all, delete-orphan")
    team_members = relationship("OrganizationProjectTeamMember", back_populates="project", cascade="all, delete-orphan")
    time_entries = relationship("OrganizationTimeEntry", back_populates="project", cascade="all, delete-orphan")
    milestones = relationship("OrganizationProjectMilestone", back_populates="project", cascade="all, delete-orphan")

class OrganizationProjectTask(Base):
    """Organization Project Management - Tasks"""
    __tablename__ = "organization_project_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("organization_projects.id"), nullable=False)
    parent_task_id = Column(Integer, ForeignKey("organization_project_tasks.id"), nullable=True)  # For subtasks
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default='pending')  # 'pending', 'in_progress', 'completed', 'closed', 'achieved'
    priority = Column(String, default='medium')  # 'low', 'medium', 'high', 'urgent'
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    due_date = Column(DateTime, nullable=True)
    estimated_hours = Column(Float, nullable=True)
    actual_hours = Column(Float, default=0.0)
    progress = Column(Float, default=0.0)  # 0-100 percentage
    tags = Column(JSON, nullable=True)  # Array of tags
    attachments = Column(JSON, nullable=True)  # Array of file attachments
    custom_fields = Column(JSON, nullable=True)  # Custom field values
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    project = relationship("OrganizationProject", back_populates="tasks")
    parent_task = relationship("OrganizationProjectTask", remote_side=[id], back_populates="subtasks")
    subtasks = relationship("OrganizationProjectTask", back_populates="parent_task", cascade="all, delete-orphan")
    assignee = relationship("User")
    time_entries = relationship("OrganizationTimeEntry", back_populates="task", cascade="all, delete-orphan")
    comments = relationship("OrganizationProjectComment", back_populates="task", cascade="all, delete-orphan")
    documents = relationship("OrganizationTaskDocument", back_populates="task", cascade="all, delete-orphan")

class OrganizationProjectTeamMember(Base):
    """Organization Project Management - Team Members"""
    __tablename__ = "organization_project_team_members"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("organization_projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False)  # 'owner', 'manager', 'member', 'viewer'
    permissions = Column(JSON, nullable=True)  # Specific permissions
    joined_at = Column(DateTime, default=func.now())
    
    # Relationships
    project = relationship("OrganizationProject", back_populates="team_members")
    user = relationship("User")

class OrganizationTimeEntry(Base):
    """Organization Project Management - Time Tracking"""
    __tablename__ = "organization_time_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("organization_projects.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("organization_project_tasks.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    description = Column(Text, nullable=True)
    hours = Column(Float, nullable=False)  # Manual time entry in hours
    date = Column(DateTime, nullable=False)  # Date when time was logged
    is_billable = Column(Boolean, default=True)
    hourly_rate = Column(Float, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    project = relationship("OrganizationProject", back_populates="time_entries")
    task = relationship("OrganizationProjectTask", back_populates="time_entries")
    user = relationship("User")

class OrganizationProjectMilestone(Base):
    """Organization Project Management - Milestones"""
    __tablename__ = "organization_project_milestones"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("organization_projects.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    project = relationship("OrganizationProject", back_populates="milestones")

class OrganizationProjectComment(Base):
    """Organization Project Management - Comments"""
    __tablename__ = "organization_project_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("organization_project_tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    attachments = Column(JSON, nullable=True)  # Array of file attachments
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    task = relationship("OrganizationProjectTask", back_populates="comments")
    user = relationship("User")

class OrganizationProjectTemplate(Base):
    """Organization Project Management - Templates"""
    __tablename__ = "organization_project_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    template_data = Column(JSON, nullable=False)  # Project structure, tasks, etc.
    is_public = Column(Boolean, default=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization")
    created_by = relationship("User")

class OrganizationTaskDocument(Base):
    """Organization Project Management - Task Documents"""
    __tablename__ = "organization_task_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("organization_project_tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)  # Unique filename (UUID)
    original_filename = Column(String, nullable=False)  # Original filename
    file_size = Column(Integer, nullable=True)
    file_type = Column(String, nullable=True)
    blob_url = Column(String, nullable=True)  # Vercel Blob URL
    blob_key = Column(String, nullable=True)  # Vercel Blob key
    uploaded_at = Column(DateTime, default=func.now())
    
    # Relationships
    task = relationship("OrganizationProjectTask", back_populates="documents")
    user = relationship("User")

class Workspace(Base):
    __tablename__ = "workspaces"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    parent_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)  # For hierarchy
    color = Column(String, nullable=True)  # UI color
    icon = Column(String, nullable=True)  # UI icon
    is_default = Column(Boolean, default=False)  # Default workspace
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="workspaces")
    parent = relationship("Workspace", remote_side=[id], back_populates="children")
    children = relationship("Workspace", back_populates="parent")
    conversations = relationship("Conversation", back_populates="workspace")

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for anonymous users
    agent_id = Column(Integer, ForeignKey("agents.id"))
    session_id = Column(String, nullable=True)  # Session tracking
    title = Column(String)
    context_summary = Column(Text, nullable=True)  # Conversation summary
    memory_metadata = Column(JSON, nullable=True)  # Memory metadata
    retention_policy = Column(JSON, nullable=True)  # Retention settings
    meta_data = Column(JSON, nullable=True)
    
    # Customer persistence fields
    customer_type = Column(String, default="authenticated")  # 'authenticated' or 'anonymous'
    customer_identifier = Column(String, nullable=True, index=True)  # Cookie ID for anonymous users
    linked_email = Column(String, nullable=True, index=True)  # Optional email for persistence
    expires_at = Column(DateTime, nullable=True)  # NULL for persistent conversations
    
    # Workspace support
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)  # Optional workspace
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="conversations")
    agent = relationship("Agent", back_populates="conversations")
    workspace = relationship("Workspace", back_populates="conversations")
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

class KnowledgeBaseCollection(Base):
    """Knowledge Base Collection model."""
    __tablename__ = "knowledge_base_collections"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    collection_type = Column(String, nullable=False)  # 'website', 'files', 'mixed'
    chroma_collection_name = Column(String, nullable=False, unique=True)
    pages_extracted = Column(Integer, default=0)  # Number of pages extracted from websites
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="knowledge_base_collections")
    documents = relationship("KnowledgeBaseDocument", back_populates="collection", cascade="all, delete-orphan")

class KnowledgeBaseDocument(Base):
    """Knowledge Base Document model."""
    __tablename__ = "knowledge_base_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("knowledge_base_collections.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    source_url = Column(String, nullable=True)  # For website documents
    file_path = Column(String, nullable=True)   # For uploaded files
    document_type = Column(String, nullable=False)  # 'website', 'file', 'text'
    document_metadata = Column(JSON, nullable=True)  # Additional metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    collection = relationship("KnowledgeBaseCollection", back_populates="documents")

# Project Management Models
class Project(Base):
    """Project Management - Projects"""
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    integration_id = Column(Integer, ForeignKey("integrations.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default='active')  # 'active', 'completed', 'paused', 'cancelled'
    priority = Column(String, default='medium')  # 'low', 'medium', 'high', 'urgent'
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    budget = Column(Float, nullable=True)
    progress = Column(Float, default=0.0)  # 0-100 percentage
    color = Column(String, nullable=True)  # UI color
    icon = Column(String, nullable=True)  # UI icon
    settings = Column(JSON, nullable=True)  # Project-specific settings
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    integration = relationship("Integration")
    tasks = relationship("ProjectTask", back_populates="project", cascade="all, delete-orphan")
    team_members = relationship("ProjectTeamMember", back_populates="project", cascade="all, delete-orphan")
    time_entries = relationship("TimeEntry", back_populates="project", cascade="all, delete-orphan")
    milestones = relationship("ProjectMilestone", back_populates="project", cascade="all, delete-orphan")

class ProjectTask(Base):
    """Project Management - Tasks"""
    __tablename__ = "project_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    parent_task_id = Column(Integer, ForeignKey("project_tasks.id"), nullable=True)  # For subtasks
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default='pending')  # 'pending', 'in_progress', 'completed', 'closed', 'achieved'
    priority = Column(String, default='medium')  # 'low', 'medium', 'high', 'urgent'
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    due_date = Column(DateTime, nullable=True)
    estimated_hours = Column(Float, nullable=True)
    actual_hours = Column(Float, default=0.0)
    progress = Column(Float, default=0.0)  # 0-100 percentage
    tags = Column(JSON, nullable=True)  # Array of tags
    attachments = Column(JSON, nullable=True)  # Array of file attachments
    custom_fields = Column(JSON, nullable=True)  # Custom field values
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User")
    parent_task = relationship("ProjectTask", remote_side=[id], back_populates="subtasks")
    subtasks = relationship("ProjectTask", back_populates="parent_task", cascade="all, delete-orphan")
    time_entries = relationship("TimeEntry", back_populates="task", cascade="all, delete-orphan")
    comments = relationship("ProjectComment", back_populates="task", cascade="all, delete-orphan")
    documents = relationship("TaskDocument", back_populates="task", cascade="all, delete-orphan")

class ProjectTeamMember(Base):
    """Project Management - Team Members"""
    __tablename__ = "project_team_members"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False)  # 'owner', 'manager', 'member', 'viewer'
    permissions = Column(JSON, nullable=True)  # Specific permissions
    joined_at = Column(DateTime, default=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="team_members")
    user = relationship("User")

class TimeEntry(Base):
    """Project Management - Time Tracking"""
    __tablename__ = "time_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("project_tasks.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    description = Column(Text, nullable=True)
    hours = Column(Float, nullable=False)
    date = Column(DateTime, nullable=False)
    is_billable = Column(Boolean, default=True)
    hourly_rate = Column(Float, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="time_entries")
    task = relationship("ProjectTask", back_populates="time_entries")
    user = relationship("User")

class ProjectMilestone(Base):
    """Project Management - Milestones"""
    __tablename__ = "project_milestones"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="milestones")

class ProjectComment(Base):
    """Project Management - Comments"""
    __tablename__ = "project_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("project_tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    attachments = Column(JSON, nullable=True)  # Array of file attachments
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    task = relationship("ProjectTask", back_populates="comments")
    user = relationship("User")

class ProjectTemplate(Base):
    """Project Management - Templates"""
    __tablename__ = "project_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    template_data = Column(JSON, nullable=False)  # Project structure, tasks, etc.
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User")

class TaskDocument(Base):
    """Project Management - Task Documents"""
    __tablename__ = "task_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("project_tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)  # Size in bytes
    file_type = Column(String, nullable=False)  # MIME type
    blob_url = Column(String, nullable=False)  # Vercel Blob URL
    blob_key = Column(String, nullable=False)  # Vercel Blob key for deletion
    description = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=func.now())
    
    # Relationships
    task = relationship("ProjectTask", back_populates="documents")
    user = relationship("User")

class TaskDocumentNotification(Base):
    """Project Management - Document Upload Notifications"""
    __tablename__ = "task_document_notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("task_documents.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # User to notify
    notified_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # User who uploaded
    message = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    document = relationship("TaskDocument")
    user = relationship("User", foreign_keys=[user_id])
    notifier = relationship("User", foreign_keys=[notified_by])

class FileUploadNotification(Base):
    """File Upload Notifications - Track notifications sent to team members"""
    __tablename__ = "file_upload_notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String, nullable=False)  # File identifier (could be blob URL or file ID)
    filename = Column(String, nullable=False)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    notified_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=True)
    upload_context = Column(String, nullable=True)  # e.g., "Project Management", "Knowledge Base"
    notification_type = Column(String, default='team_member')  # 'team_member', 'admin', 'system'
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
    notified_user = relationship("User", foreign_keys=[notified_user_id])


# Organization Management Models
class Organization(Base):
    """Organizations - Top-level organizational structure"""
    __tablename__ = "organizations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    slug = Column(String, unique=True, index=True)  # URL-friendly identifier
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    settings = Column(JSON, nullable=True)  # Organization-specific settings
    billing_info = Column(JSON, nullable=True)  # Billing and subscription info
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])
    members = relationship("OrganizationMember", back_populates="organization")


class OrganizationMember(Base):
    """Organization Members - Users belonging to organizations"""
    __tablename__ = "organization_members"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False)  # 'owner', 'admin', 'member', 'guest'
    permissions = Column(JSON, nullable=True)  # Custom permissions
    status = Column(String, default='active')  # 'active', 'pending', 'suspended'
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    joined_at = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Ensure unique user per organization
    __table_args__ = (UniqueConstraint('organization_id', 'user_id', name='unique_org_user'),)
    
    # Relationships
    organization = relationship("Organization", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])
    inviter = relationship("User", foreign_keys=[invited_by])


class OrganizationInvitation(Base):
    """Organization Invitations - Pending invitations to join organizations"""
    __tablename__ = "organization_invitations"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    email = Column(String, nullable=False)
    role = Column(String, nullable=False)  # 'admin', 'member', 'guest'
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, index=True)  # Invitation token
    expires_at = Column(DateTime, nullable=False)
    status = Column(String, default='pending')  # 'pending', 'accepted', 'declined', 'expired'
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization")
    inviter = relationship("User")

