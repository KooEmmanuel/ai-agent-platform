"""
File Management API Endpoints
Handles file uploads, downloads, sharing, and management
"""

import os
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import io

from app.core.database import get_db, User
from app.core.auth import get_current_user
from app.services.file_management_service import file_management_service
from app.core.database_models import UserFile, FileShare, FilePermission

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic models for request/response
class FileUploadResponse(BaseModel):
    success: bool
    file_id: Optional[int] = None
    blob_url: Optional[str] = None
    original_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    error: Optional[str] = None

class FileListResponse(BaseModel):
    id: int
    original_name: str
    stored_name: str
    blob_url: str
    file_size: int
    mime_type: str
    file_extension: str
    folder_path: str
    is_public: bool
    created_at: str
    expires_at: Optional[str] = None

class FileShareRequest(BaseModel):
    file_id: int
    shared_with_user_id: int
    permission: str = "view"

class FileShareResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    permission: Optional[str] = None
    error: Optional[str] = None

class FileDeleteResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    agent_id: Optional[int] = Form(None),
    folder_path: str = Form(""),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a file to the file library
    
    Args:
        file: The file to upload
        agent_id: Optional agent ID for organization
        folder_path: Optional folder path for organization
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        File upload result with metadata
    """
    try:
        # Read file content
        file_content = await file.read()
        
        # Upload file
        result = await file_management_service.upload_file(
            file_content=file_content,
            filename=file.filename,
            user_id=current_user.id,
            agent_id=agent_id,
            folder_path=folder_path,
            db=db
        )
        
        if result['success']:
            return FileUploadResponse(
                success=True,
                file_id=result.get('file_id'),
                blob_url=result.get('blob_url'),
                original_name=result.get('original_name'),
                file_size=result.get('file_size'),
                mime_type=result.get('mime_type')
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Upload failed')
            )
            
    except Exception as e:
        logger.error(f"Error in file upload: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )

@router.get("/list", response_model=List[FileListResponse])
async def list_files(
    agent_id: Optional[int] = Query(None),
    folder_path: Optional[str] = Query(None),
    file_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List files for the current user
    
    Args:
        agent_id: Optional agent ID filter
        folder_path: Optional folder path filter
        file_type: Optional file type filter
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of file metadata
    """
    try:
        files = await file_management_service.get_user_files(
            user_id=current_user.id,
            agent_id=agent_id,
            folder_path=folder_path,
            file_type=file_type,
            db=db
        )
        
        return [FileListResponse(**file) for file in files]
        
    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list files: {str(e)}"
        )

@router.get("/shared", response_model=List[FileListResponse])
async def list_shared_files(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List files shared with the current user
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of shared file metadata
    """
    try:
        shared_files = await file_management_service.get_shared_files(
            user_id=current_user.id,
            db=db
        )
        
        return [FileListResponse(**file) for file in shared_files]
        
    except Exception as e:
        logger.error(f"Error listing shared files: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list shared files: {str(e)}"
        )

@router.post("/share", response_model=FileShareResponse)
async def share_file(
    share_request: FileShareRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Share a file with another user
    
    Args:
        share_request: File sharing request
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        File sharing result
    """
    try:
        # Validate permission
        if share_request.permission not in ['view', 'edit', 'admin']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid permission level. Must be 'view', 'edit', or 'admin'"
            )
        
        result = await file_management_service.share_file(
            file_id=share_request.file_id,
            owner_id=current_user.id,
            shared_with_user_id=share_request.shared_with_user_id,
            permission=share_request.permission,
            db=db
        )
        
        if result['success']:
            return FileShareResponse(
                success=True,
                message=result.get('message'),
                permission=result.get('permission')
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Sharing failed')
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sharing file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sharing failed: {str(e)}"
        )

@router.delete("/{file_id}", response_model=FileDeleteResponse)
async def delete_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a file
    
    Args:
        file_id: ID of the file to delete
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        File deletion result
    """
    try:
        result = await file_management_service.delete_file(
            file_id=file_id,
            user_id=current_user.id,
            db=db
        )
        
        if result['success']:
            return FileDeleteResponse(
                success=True,
                message=result.get('message')
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Deletion failed')
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Deletion failed: {str(e)}"
        )

@router.get("/{file_id}/download")
async def download_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Download a file
    
    Args:
        file_id: ID of the file to download
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        File download stream
    """
    try:
        # Get file metadata
        result = await db.execute(
            select(UserFile).where(
                and_(
                    UserFile.id == file_id,
                    or_(
                        UserFile.user_id == current_user.id,
                        UserFile.is_public == True
                    )
                )
            )
        )
        file = result.scalar_one_or_none()
        
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or access denied"
            )
        
        # For now, return the blob URL for download
        # In production, you might want to stream the file content
        return {"download_url": file.blob_url, "filename": file.original_name}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Download failed: {str(e)}"
        )

@router.get("/{file_id}/info", response_model=FileListResponse)
async def get_file_info(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get file information
    
    Args:
        file_id: ID of the file
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        File metadata
    """
    try:
        # Get file metadata
        result = await db.execute(
            select(UserFile).where(
                and_(
                    UserFile.id == file_id,
                    or_(
                        UserFile.user_id == current_user.id,
                        UserFile.is_public == True
                    )
                )
            )
        )
        file = result.scalar_one_or_none()
        
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or access denied"
            )
        
        return FileListResponse(
            id=file.id,
            original_name=file.original_name,
            stored_name=file.stored_name,
            blob_url=file.blob_url,
            file_size=file.file_size,
            mime_type=file.mime_type,
            file_extension=file.file_extension,
            folder_path=file.folder_path,
            is_public=file.is_public,
            created_at=file.created_at.isoformat(),
            expires_at=file.expires_at.isoformat() if file.expires_at else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting file info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get file info: {str(e)}"
        )
