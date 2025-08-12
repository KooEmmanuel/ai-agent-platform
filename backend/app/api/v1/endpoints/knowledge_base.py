"""
Knowledge Base API endpoints
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.core.auth import get_current_user
from app.core.database import get_db, User
from app.services.knowledge_base_service import KnowledgeBaseService

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic models
class CollectionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    collection_type: str = "mixed"

class WebsiteCrawlRequest(BaseModel):
    collection_id: int
    website_url: str
    max_pages: int = 50
    max_depth: int = 3

class CollectionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    collection_type: str
    chroma_collection_name: str
    created_at: str
    updated_at: str
    document_count: int

@router.post("/collections", response_model=CollectionResponse)
async def create_collection(
    collection_data: CollectionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new knowledge base collection."""
    try:
        kb_service = KnowledgeBaseService(db)
        collection = await kb_service.create_collection(
            user_id=current_user.id,
            name=collection_data.name,
            description=collection_data.description,
            collection_type=collection_data.collection_type
        )
        
        return CollectionResponse(**collection)
        
    except Exception as e:
        logger.error(f"Failed to create collection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create collection: {str(e)}"
        )

@router.get("/collections", response_model=List[CollectionResponse])
async def get_collections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all collections for the current user."""
    try:
        kb_service = KnowledgeBaseService(db)
        collections = await kb_service.get_user_collections(current_user.id)
        
        return [CollectionResponse(**collection) for collection in collections]
        
    except Exception as e:
        logger.error(f"Failed to get collections: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get collections: {str(e)}"
        )

@router.post("/collections/{collection_id}/crawl-website")
async def crawl_website_to_collection(
    collection_id: int,
    crawl_request: WebsiteCrawlRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crawl a website and add documents to a collection."""
    try:
        kb_service = KnowledgeBaseService(db)
        result = await kb_service.crawl_website_to_collection(
            collection_id=collection_id,
            website_url=crawl_request.website_url,
            max_pages=crawl_request.max_pages,
            max_depth=crawl_request.max_depth
        )
        
        return {
            "success": True,
            "message": f"Successfully crawled {result['documents_added']} documents from {result['pages_discovered']} pages",
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Failed to crawl website: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to crawl website: {str(e)}"
        )

@router.post("/collections/{collection_id}/upload-file")
async def upload_file_to_collection(
    collection_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a file to a collection."""
    try:
        # Validate file type
        allowed_extensions = ['.txt', '.md', '.pdf', '.doc', '.docx']
        file_extension = file.filename.lower().split('.')[-1] if '.' in file.filename else ''
        
        if f'.{file_extension}' not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not supported. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        # Validate file size (max 10MB)
        if file.size and file.size > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size must be less than 10MB"
            )
        
        kb_service = KnowledgeBaseService(db)
        result = await kb_service.upload_file_to_collection(
            collection_id=collection_id,
            file=file
        )
        
        return {
            "success": True,
            "message": f"Successfully uploaded {result['filename']}",
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )

@router.post("/collections/{collection_id}/query")
async def query_collection(
    collection_id: int,
    query: str = Form(...),
    top_k: int = Form(5),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Query a collection for relevant documents."""
    try:
        kb_service = KnowledgeBaseService(db)
        result = await kb_service.query_collection(
            collection_id=collection_id,
            query=query,
            top_k=top_k
        )
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Failed to query collection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query collection: {str(e)}"
        )

@router.delete("/collections/{collection_id}")
async def delete_collection(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a collection and all its documents."""
    try:
        kb_service = KnowledgeBaseService(db)
        result = await kb_service.delete_collection(collection_id, current_user.id)
        
        return {
            "success": True,
            "message": "Collection deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to delete collection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete collection: {str(e)}"
        ) 