"""
Additional database models for file management
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

class FilePermission(enum.Enum):
    VIEW = "view"
    EDIT = "edit"
    ADMIN = "admin"

class UserFile(Base):
    """Model for user uploaded files"""
    __tablename__ = "user_files"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=True, index=True)
    
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
    user = relationship("User", back_populates="files")
    agent = relationship("Agent", back_populates="files")
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
    owner = relationship("User", foreign_keys=[owner_user_id])
    shared_with = relationship("User", foreign_keys=[shared_with_user_id])

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
    user = relationship("User")
    agent = relationship("Agent")
    parent_folder = relationship("FileFolder", remote_side=[id])
    subfolders = relationship("FileFolder", back_populates="parent_folder")
    files = relationship("UserFile", back_populates="folder")
