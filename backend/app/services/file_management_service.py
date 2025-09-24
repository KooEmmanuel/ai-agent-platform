"""
File Management Service
Handles file uploads, storage, and management using Vercel Blob
"""

import os
import uuid
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from pathlib import Path
import mimetypes
from vercel_blob import put, del_blob, list_blobs, head_blob
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from app.core.database import User
from app.core.config import settings

logger = logging.getLogger(__name__)

class FileManagementService:
    """Service for managing file uploads and storage using Vercel Blob"""
    
    def __init__(self):
        self.blob_token = settings.BLOB_READ_WRITE_TOKEN
        if not self.blob_token:
            logger.warning("BLOB_READ_WRITE_TOKEN not found in environment variables")
        
        # Supported file types
        self.supported_types = {
            'csv': 'text/csv',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls': 'application/vnd.ms-excel',
            'pdf': 'application/pdf',
            'txt': 'text/plain',
            'json': 'application/json',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'mp4': 'video/mp4',
            'mp3': 'audio/mpeg',
            'zip': 'application/zip'
        }
        
        # File size limits (in bytes)
        self.max_file_size = 50 * 1024 * 1024  # 50MB
        self.max_image_size = 10 * 1024 * 1024  # 10MB for images
    
    async def upload_file(
        self, 
        file_content: bytes, 
        filename: str, 
        user_id: int, 
        agent_id: Optional[int] = None,
        folder_path: str = "",
        db: AsyncSession = None
    ) -> Dict[str, Any]:
        """
        Upload a file to Vercel Blob storage
        
        Args:
            file_content: File content as bytes
            filename: Original filename
            user_id: ID of the user uploading the file
            agent_id: Optional agent ID for organization
            folder_path: Optional folder path for organization
            db: Database session
            
        Returns:
            Dictionary with upload result
        """
        try:
            # Validate file
            validation_result = self._validate_file(file_content, filename)
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': validation_result['error']
                }
            
            # Generate unique filename
            file_extension = Path(filename).suffix.lower()
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            
            # Create blob path
            blob_path = f"users/{user_id}"
            if agent_id:
                blob_path += f"/agents/{agent_id}"
            if folder_path:
                blob_path += f"/{folder_path}"
            blob_path += f"/{unique_filename}"
            
            # Upload to Vercel Blob
            blob = await put(
                blob_path,
                file_content,
                access='public',
                token=self.blob_token
            )
            
            # Save file metadata to database
            if db:
                user_file = UserFile(
                    user_id=user_id,
                    agent_id=agent_id,
                    original_name=filename,
                    stored_name=unique_filename,
                    blob_url=blob.url,
                    blob_path=blob_path,
                    file_size=len(file_content),
                    mime_type=validation_result['mime_type'],
                    file_extension=file_extension,
                    folder_path=folder_path,
                    is_public=False,
                    created_at=datetime.utcnow(),
                    expires_at=datetime.utcnow() + timedelta(days=30)  # 30 days retention
                )
                db.add(user_file)
                await db.commit()
                await db.refresh(user_file)
                
                return {
                    'success': True,
                    'file_id': user_file.id,
                    'blob_url': blob.url,
                    'original_name': filename,
                    'file_size': len(file_content),
                    'mime_type': validation_result['mime_type']
                }
            else:
                return {
                    'success': True,
                    'blob_url': blob.url,
                    'original_name': filename,
                    'file_size': len(file_content),
                    'mime_type': validation_result['mime_type']
                }
                
        except Exception as e:
            logger.error(f"Error uploading file: {str(e)}")
            return {
                'success': False,
                'error': f"Upload failed: {str(e)}"
            }
    
    async def get_user_files(
        self, 
        user_id: int, 
        agent_id: Optional[int] = None,
        folder_path: Optional[str] = None,
        file_type: Optional[str] = None,
        db: AsyncSession = None
    ) -> List[Dict[str, Any]]:
        """
        Get files for a user
        
        Args:
            user_id: User ID
            agent_id: Optional agent ID filter
            folder_path: Optional folder path filter
            file_type: Optional file type filter
            db: Database session
            
        Returns:
            List of file metadata
        """
        try:
            if not db:
                return []
            
            query = select(UserFile).where(UserFile.user_id == user_id)
            
            if agent_id:
                query = query.where(UserFile.agent_id == agent_id)
            
            if folder_path:
                query = query.where(UserFile.folder_path == folder_path)
            
            if file_type:
                query = query.where(UserFile.file_extension == f".{file_type}")
            
            result = await db.execute(query)
            files = result.scalars().all()
            
            return [
                {
                    'id': file.id,
                    'original_name': file.original_name,
                    'stored_name': file.stored_name,
                    'blob_url': file.blob_url,
                    'file_size': file.file_size,
                    'mime_type': file.mime_type,
                    'file_extension': file.file_extension,
                    'folder_path': file.folder_path,
                    'is_public': file.is_public,
                    'created_at': file.created_at.isoformat(),
                    'expires_at': file.expires_at.isoformat() if file.expires_at else None
                }
                for file in files
            ]
            
        except Exception as e:
            logger.error(f"Error getting user files: {str(e)}")
            return []
    
    async def delete_file(
        self, 
        file_id: int, 
        user_id: int, 
        db: AsyncSession = None
    ) -> Dict[str, Any]:
        """
        Delete a file
        
        Args:
            file_id: File ID to delete
            user_id: User ID (for authorization)
            db: Database session
            
        Returns:
            Dictionary with deletion result
        """
        try:
            if not db:
                return {'success': False, 'error': 'Database session required'}
            
            # Get file metadata
            result = await db.execute(
                select(UserFile).where(
                    and_(UserFile.id == file_id, UserFile.user_id == user_id)
                )
            )
            file = result.scalar_one_or_none()
            
            if not file:
                return {'success': False, 'error': 'File not found or access denied'}
            
            # Delete from Vercel Blob
            try:
                await del_blob(file.blob_path, token=self.blob_token)
            except Exception as e:
                logger.warning(f"Error deleting blob: {str(e)}")
            
            # Delete from database
            await db.delete(file)
            await db.commit()
            
            return {'success': True, 'message': 'File deleted successfully'}
            
        except Exception as e:
            logger.error(f"Error deleting file: {str(e)}")
            return {'success': False, 'error': f"Deletion failed: {str(e)}"}
    
    async def share_file(
        self, 
        file_id: int, 
        owner_id: int, 
        shared_with_user_id: int, 
        permission: str = 'view',
        db: AsyncSession = None
    ) -> Dict[str, Any]:
        """
        Share a file with another user
        
        Args:
            file_id: File ID to share
            owner_id: Owner user ID
            shared_with_user_id: User ID to share with
            permission: Permission level (view, edit, admin)
            db: Database session
            
        Returns:
            Dictionary with sharing result
        """
        try:
            if not db:
                return {'success': False, 'error': 'Database session required'}
            
            # Check if file exists and user owns it
            result = await db.execute(
                select(UserFile).where(
                    and_(UserFile.id == file_id, UserFile.user_id == owner_id)
                )
            )
            file = result.scalar_one_or_none()
            
            if not file:
                return {'success': False, 'error': 'File not found or access denied'}
            
            # Check if already shared
            existing_share = await db.execute(
                select(FileShare).where(
                    and_(
                        FileShare.file_id == file_id,
                        FileShare.shared_with_user_id == shared_with_user_id
                    )
                )
            )
            share = existing_share.scalar_one_or_none()
            
            if share:
                # Update existing share
                share.permission = permission
                share.updated_at = datetime.utcnow()
            else:
                # Create new share
                share = FileShare(
                    file_id=file_id,
                    owner_user_id=owner_id,
                    shared_with_user_id=shared_with_user_id,
                    permission=permission,
                    created_at=datetime.utcnow()
                )
                db.add(share)
            
            await db.commit()
            
            return {
                'success': True, 
                'message': f'File shared with user {shared_with_user_id}',
                'permission': permission
            }
            
        except Exception as e:
            logger.error(f"Error sharing file: {str(e)}")
            return {'success': False, 'error': f"Sharing failed: {str(e)}"}
    
    async def get_shared_files(
        self, 
        user_id: int, 
        db: AsyncSession = None
    ) -> List[Dict[str, Any]]:
        """
        Get files shared with a user
        
        Args:
            user_id: User ID
            db: Database session
            
        Returns:
            List of shared file metadata
        """
        try:
            if not db:
                return []
            
            # Get files shared with this user
            result = await db.execute(
                select(FileShare, UserFile).join(
                    UserFile, FileShare.file_id == UserFile.id
                ).where(FileShare.shared_with_user_id == user_id)
            )
            
            shared_files = []
            for share, file in result:
                shared_files.append({
                    'id': file.id,
                    'original_name': file.original_name,
                    'blob_url': file.blob_url,
                    'file_size': file.file_size,
                    'mime_type': file.mime_type,
                    'file_extension': file.file_extension,
                    'folder_path': file.folder_path,
                    'owner_user_id': share.owner_user_id,
                    'permission': share.permission,
                    'shared_at': share.created_at.isoformat(),
                    'created_at': file.created_at.isoformat()
                })
            
            return shared_files
            
        except Exception as e:
            logger.error(f"Error getting shared files: {str(e)}")
            return []
    
    def _validate_file(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """
        Validate uploaded file
        
        Args:
            file_content: File content as bytes
            filename: Original filename
            
        Returns:
            Dictionary with validation result
        """
        try:
            # Check file size
            file_size = len(file_content)
            if file_size > self.max_file_size:
                return {
                    'valid': False,
                    'error': f'File size ({file_size} bytes) exceeds maximum allowed size ({self.max_file_size} bytes)'
                }
            
            # Check file extension
            file_extension = Path(filename).suffix.lower().lstrip('.')
            if file_extension not in self.supported_types:
                return {
                    'valid': False,
                    'error': f'File type .{file_extension} is not supported'
                }
            
            # Get MIME type
            mime_type, _ = mimetypes.guess_type(filename)
            if not mime_type:
                mime_type = self.supported_types.get(file_extension, 'application/octet-stream')
            
            # Additional validation for images
            if file_extension in ['png', 'jpg', 'jpeg', 'gif'] and file_size > self.max_image_size:
                return {
                    'valid': False,
                    'error': f'Image size ({file_size} bytes) exceeds maximum allowed size ({self.max_image_size} bytes)'
                }
            
            return {
                'valid': True,
                'mime_type': mime_type,
                'file_size': file_size,
                'file_extension': file_extension
            }
            
        except Exception as e:
            return {
                'valid': False,
                'error': f'Validation error: {str(e)}'
            }

# Global instance
file_management_service = FileManagementService()
