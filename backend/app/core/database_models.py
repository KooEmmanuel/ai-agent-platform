"""
Additional database models for file management
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

# Import the same Base that User model uses
from .database import Base

class FilePermission(enum.Enum):
    VIEW = "view"
    EDIT = "edit"
    ADMIN = "admin"

class UserFile(Base):
    """Model for user uploaded files"""
    __tablename__ = "user_files"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # Removed agent_id foreign key to avoid agents table dependency
    
    # File metadata
    original_name = Column(String(255), nullable=False)
    stored_name = Column(String(255), nullable=False)
    blob_url = Column(Text, nullable=False)
    blob_path = Column(String(500), nullable=False)
    
    # File properties
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_extension = Column(String(10), nullable=False)
    folder_path = Column(String(500), default="")
    
    # Access control
    is_public = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    
    # Relationships
    # Note: Removed user and agent relationships to avoid circular import issues
    # These can be accessed via foreign key queries if needed
    shares = relationship("FileShare", back_populates="file", cascade="all, delete-orphan")

class FileShare(Base):
    """Model for file sharing permissions"""
    __tablename__ = "file_shares"
    
    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("user_files.id"), nullable=False, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    shared_with_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Permission level
    permission = Column(Enum(FilePermission), default=FilePermission.VIEW)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    file = relationship("UserFile", back_populates="shares")
    # Note: Removed User relationships to avoid circular import issues
    # These can be accessed via foreign key queries if needed

class FileFolder(Base):
    """Model for file organization folders"""
    __tablename__ = "file_folders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=True, index=True)
    parent_folder_id = Column(Integer, ForeignKey("file_folders.id"), nullable=True, index=True)
    
    # Folder properties
    name = Column(String(255), nullable=False)
    path = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    
    # Access control
    is_public = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    # Note: Removed User and Agent relationships to avoid circular import issues
    # These can be accessed via foreign key queries if needed
    parent_folder = relationship("FileFolder", remote_side=[id])
    subfolders = relationship("FileFolder", back_populates="parent_folder")
    # Note: Removed files relationship to avoid circular import issues
