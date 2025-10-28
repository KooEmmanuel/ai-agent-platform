"""
Organization Project Management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.core.auth import get_current_user
from app.core.database import (
    get_db, User, OrganizationProject, OrganizationProjectTask, 
    OrganizationProjectTeamMember, OrganizationTimeEntry, 
    OrganizationProjectMilestone, OrganizationProjectComment,
    OrganizationProjectTemplate, OrganizationIntegration,
    OrganizationMember
)
from app.api.v1.endpoints.organizations import check_organization_permission

router = APIRouter()

# Pydantic models
class OrganizationProjectCreate(BaseModel):
    integration_id: int
    name: str
    description: Optional[str] = None
    priority: str = 'medium'
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class OrganizationProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    progress: Optional[float] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class OrganizationProjectResponse(BaseModel):
    id: int
    organization_id: int
    integration_id: int
    name: str
    description: Optional[str]
    status: str
    priority: str
    start_date: Optional[str]
    end_date: Optional[str]
    budget: Optional[float]
    progress: float
    color: Optional[str]
    icon: Optional[str]
    settings: Optional[Dict[str, Any]]
    created_by_id: int
    created_at: str
    updated_at: Optional[str]
    task_count: Optional[int] = 0
    team_member_count: Optional[int] = 0

class OrganizationProjectFromTemplateCreate(BaseModel):
    integration_id: int
    name: str
    template_id: str
    start_date: Optional[datetime] = None
    custom_settings: Optional[Dict[str, Any]] = None

# Time Entry Models
class OrganizationTimeEntryCreate(BaseModel):
    project_id: int
    task_id: Optional[int] = None
    description: Optional[str] = None
    hours: float
    date: datetime
    is_billable: bool = True
    hourly_rate: Optional[float] = None

class OrganizationTimeEntryResponse(BaseModel):
    id: int
    project_id: int
    task_id: Optional[int] = None
    description: Optional[str] = None
    hours: float
    date: datetime
    is_billable: bool
    hourly_rate: Optional[float] = None
    created_at: datetime
    user_name: Optional[str] = None
    task_title: Optional[str] = None

    class Config:
        from_attributes = True

# Task Models
class OrganizationProjectTaskCreate(BaseModel):
    parent_task_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    status: str = 'pending'
    priority: str = 'medium'
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None

class OrganizationProjectTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    progress: Optional[float] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None

class OrganizationProjectTaskResponse(BaseModel):
    id: int
    project_id: int
    parent_task_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    actual_hours: float
    progress: float
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

@router.post("/organizations/{organization_id}/projects", response_model=OrganizationProjectResponse)
async def create_organization_project(
    organization_id: int,
    project_data: OrganizationProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new organization project"""
    # Check if user has permission to create projects (member level)
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create projects for this organization"
        )
    
    # Verify integration exists and belongs to organization
    integration_result = await db.execute(
        select(OrganizationIntegration).where(
            and_(
                OrganizationIntegration.id == project_data.integration_id,
                OrganizationIntegration.organization_id == organization_id,
                OrganizationIntegration.platform == "project_management"
            )
        )
    )
    integration = integration_result.scalar_one_or_none()
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project management integration not found"
        )
    
    # Create project
    start_date_naive = project_data.start_date.replace(tzinfo=None) if project_data.start_date else None
    end_date_naive = project_data.end_date.replace(tzinfo=None) if project_data.end_date else None
    
    project = OrganizationProject(
        organization_id=organization_id,
        integration_id=project_data.integration_id,
        name=project_data.name,
        description=project_data.description,
        priority=project_data.priority,
        start_date=start_date_naive,
        end_date=end_date_naive,
        budget=project_data.budget,
        color=project_data.color,
        icon=project_data.icon,
        settings=project_data.settings,
        created_by_id=current_user.id
    )
    
    db.add(project)
    await db.commit()
    await db.refresh(project)
    
    # Add project creator as team member
    team_member = OrganizationProjectTeamMember(
        project_id=project.id,
        user_id=current_user.id,
        role="owner"
    )
    db.add(team_member)
    await db.commit()
    
    return OrganizationProjectResponse(
        id=project.id,
        organization_id=project.organization_id,
        integration_id=project.integration_id,
        name=project.name,
        description=project.description,
        status=project.status,
        priority=project.priority,
        start_date=project.start_date.isoformat() if project.start_date else None,
        end_date=project.end_date.isoformat() if project.end_date else None,
        budget=project.budget,
        progress=project.progress,
        color=project.color,
        icon=project.icon,
        settings=project.settings,
        created_by_id=project.created_by_id,
        created_at=project.created_at.isoformat(),
        updated_at=project.updated_at.isoformat() if project.updated_at else None
    )

@router.get("/organizations/{organization_id}/projects", response_model=List[OrganizationProjectResponse])
async def list_organization_projects(
    organization_id: int,
    integration_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all projects for an organization"""
    # Check if user has access to organization
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this organization"
        )
    
    query = select(OrganizationProject).where(
        OrganizationProject.organization_id == organization_id
    )
    
    if integration_id:
        query = query.where(OrganizationProject.integration_id == integration_id)
    if status:
        query = query.where(OrganizationProject.status == status)
    
    result = await db.execute(query)
    projects = result.scalars().all()
    
    # Get task and team member counts for each project
    project_responses = []
    for project in projects:
        # Count tasks
        task_count_result = await db.execute(
            select(func.count(OrganizationProjectTask.id)).where(
                OrganizationProjectTask.project_id == project.id
            )
        )
        task_count = task_count_result.scalar() or 0
        
        # Count team members
        team_count_result = await db.execute(
            select(func.count(OrganizationProjectTeamMember.id)).where(
                OrganizationProjectTeamMember.project_id == project.id
            )
        )
        team_count = team_count_result.scalar() or 0
        
        project_responses.append(OrganizationProjectResponse(
            id=project.id,
            organization_id=project.organization_id,
            integration_id=project.integration_id,
            name=project.name,
            description=project.description,
            status=project.status,
            priority=project.priority,
            start_date=project.start_date.isoformat() if project.start_date else None,
            end_date=project.end_date.isoformat() if project.end_date else None,
            budget=project.budget,
            progress=project.progress,
            color=project.color,
            icon=project.icon,
            settings=project.settings,
            created_by_id=project.created_by_id,
            created_at=project.created_at.isoformat(),
            updated_at=project.updated_at.isoformat() if project.updated_at else None,
            task_count=task_count,
            team_member_count=team_count
        ))
    
    return project_responses

@router.get("/organizations/{organization_id}/projects/{project_id}", response_model=OrganizationProjectResponse)
async def get_organization_project(
    organization_id: int,
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific organization project"""
    # Check if user has access to organization
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this organization"
        )
    
    result = await db.execute(
        select(OrganizationProject).where(
            and_(
                OrganizationProject.id == project_id,
                OrganizationProject.organization_id == organization_id
            )
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Get task and team member counts
    task_count_result = await db.execute(
        select(func.count(OrganizationProjectTask.id)).where(
            OrganizationProjectTask.project_id == project.id
        )
    )
    task_count = task_count_result.scalar() or 0
    
    team_count_result = await db.execute(
        select(func.count(OrganizationProjectTeamMember.id)).where(
            OrganizationProjectTeamMember.project_id == project.id
        )
    )
    team_count = team_count_result.scalar() or 0
    
    return OrganizationProjectResponse(
        id=project.id,
        organization_id=project.organization_id,
        integration_id=project.integration_id,
        name=project.name,
        description=project.description,
        status=project.status,
        priority=project.priority,
        start_date=project.start_date.isoformat() if project.start_date else None,
        end_date=project.end_date.isoformat() if project.end_date else None,
        budget=project.budget,
        progress=project.progress,
        color=project.color,
        icon=project.icon,
        settings=project.settings,
        created_by_id=project.created_by_id,
        created_at=project.created_at.isoformat(),
        updated_at=project.updated_at.isoformat() if project.updated_at else None,
        task_count=task_count,
        team_member_count=team_count
    )

@router.put("/organizations/{organization_id}/projects/{project_id}", response_model=OrganizationProjectResponse)
async def update_organization_project(
    organization_id: int,
    project_id: int,
    project_data: OrganizationProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an organization project"""
    # Check if user has permission to update projects (member level)
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update projects for this organization"
        )
    
    result = await db.execute(
        select(OrganizationProject).where(
            and_(
                OrganizationProject.id == project_id,
                OrganizationProject.organization_id == organization_id
            )
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Update fields
    if project_data.name is not None:
        project.name = project_data.name
    if project_data.description is not None:
        project.description = project_data.description
    if project_data.status is not None:
        project.status = project_data.status
    if project_data.priority is not None:
        project.priority = project_data.priority
    if project_data.start_date is not None:
        project.start_date = project_data.start_date.replace(tzinfo=None)
    if project_data.end_date is not None:
        project.end_date = project_data.end_date.replace(tzinfo=None)
    if project_data.budget is not None:
        project.budget = project_data.budget
    if project_data.progress is not None:
        project.progress = project_data.progress
    if project_data.color is not None:
        project.color = project_data.color
    if project_data.icon is not None:
        project.icon = project_data.icon
    if project_data.settings is not None:
        project.settings = project_data.settings
    
    await db.commit()
    await db.refresh(project)
    
    # Get task and team member counts
    task_count_result = await db.execute(
        select(func.count(OrganizationProjectTask.id)).where(
            OrganizationProjectTask.project_id == project.id
        )
    )
    task_count = task_count_result.scalar() or 0
    
    team_count_result = await db.execute(
        select(func.count(OrganizationProjectTeamMember.id)).where(
            OrganizationProjectTeamMember.project_id == project.id
        )
    )
    team_count = team_count_result.scalar() or 0
    
    return OrganizationProjectResponse(
        id=project.id,
        organization_id=project.organization_id,
        integration_id=project.integration_id,
        name=project.name,
        description=project.description,
        status=project.status,
        priority=project.priority,
        start_date=project.start_date.isoformat() if project.start_date else None,
        end_date=project.end_date.isoformat() if project.end_date else None,
        budget=project.budget,
        progress=project.progress,
        color=project.color,
        icon=project.icon,
        settings=project.settings,
        created_by_id=project.created_by_id,
        created_at=project.created_at.isoformat(),
        updated_at=project.updated_at.isoformat() if project.updated_at else None,
        task_count=task_count,
        team_member_count=team_count
    )

@router.delete("/organizations/{organization_id}/projects/{project_id}")
async def delete_organization_project(
    organization_id: int,
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an organization project"""
    # Check if user has permission to delete projects (admin level)
    if not await check_organization_permission(organization_id, current_user.id, 'admin', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete projects for this organization"
        )
    
    result = await db.execute(
        select(OrganizationProject).where(
            and_(
                OrganizationProject.id == project_id,
                OrganizationProject.organization_id == organization_id
            )
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    await db.delete(project)
    await db.commit()
    
    return {"message": "Project deleted successfully"}

# Task Management Endpoints
@router.post("/organizations/{organization_id}/projects/{project_id}/tasks", response_model=OrganizationProjectTaskResponse)
async def create_organization_project_task(
    organization_id: int,
    project_id: int,
    task_data: OrganizationProjectTaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new task for an organization project"""
    # Check if user has permission to create tasks (member level)
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create tasks for this organization"
        )
    
    # Verify project exists and belongs to organization
    project_result = await db.execute(
        select(OrganizationProject).where(
            and_(
                OrganizationProject.id == project_id,
                OrganizationProject.organization_id == organization_id
            )
        )
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Create task
    due_date_naive = task_data.due_date.replace(tzinfo=None) if task_data.due_date else None
    
    task = OrganizationProjectTask(
        project_id=project_id,
        parent_task_id=task_data.parent_task_id,
        title=task_data.title,
        description=task_data.description,
        status=task_data.status,
        priority=task_data.priority,
        assignee_id=task_data.assignee_id,
        due_date=due_date_naive,
        estimated_hours=task_data.estimated_hours,
        tags=task_data.tags,
        custom_fields=task_data.custom_fields
    )
    
    db.add(task)
    await db.commit()
    await db.refresh(task)
    
    return task

@router.get("/organizations/{organization_id}/projects/{project_id}/tasks", response_model=List[OrganizationProjectTaskResponse])
async def get_organization_project_tasks(
    organization_id: int,
    project_id: int,
    task_status: Optional[str] = Query(None),
    assignee_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all tasks for an organization project"""
    # Check if user has permission to view tasks (member level)
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view tasks for this organization"
        )
    
    # Verify project exists and belongs to organization
    project_result = await db.execute(
        select(OrganizationProject).where(
            and_(
                OrganizationProject.id == project_id,
                OrganizationProject.organization_id == organization_id
            )
        )
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Build query
    query = select(OrganizationProjectTask).where(OrganizationProjectTask.project_id == project_id)
    
    if task_status:
        query = query.where(OrganizationProjectTask.status == task_status)
    if assignee_id:
        query = query.where(OrganizationProjectTask.assignee_id == assignee_id)
    
    result = await db.execute(query)
    tasks = result.scalars().all()
    
    return tasks

@router.put("/organizations/{organization_id}/projects/{project_id}/tasks/{task_id}", response_model=OrganizationProjectTaskResponse)
async def update_organization_project_task(
    organization_id: int,
    project_id: int,
    task_id: int,
    task_data: OrganizationProjectTaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an organization project task"""
    # Check if user has permission to update tasks (member level)
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update tasks for this organization"
        )
    
    # Verify task exists and belongs to project/organization
    task_result = await db.execute(
        select(OrganizationProjectTask)
        .join(OrganizationProject)
        .where(
            and_(
                OrganizationProjectTask.id == task_id,
                OrganizationProjectTask.project_id == project_id,
                OrganizationProject.organization_id == organization_id
            )
        )
    )
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Update task fields
    update_data = task_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == 'due_date' and value:
            setattr(task, field, value.replace(tzinfo=None))
        else:
            setattr(task, field, value)
    
    await db.commit()
    await db.refresh(task)
    
    return task

@router.delete("/organizations/{organization_id}/projects/{project_id}/tasks/{task_id}")
async def delete_organization_project_task(
    organization_id: int,
    project_id: int,
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an organization project task"""
    # Check if user has permission to delete tasks (admin level)
    if not await check_organization_permission(organization_id, current_user.id, 'admin', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete tasks for this organization"
        )
    
    # Verify task exists and belongs to project/organization
    task_result = await db.execute(
        select(OrganizationProjectTask)
        .join(OrganizationProject)
        .where(
            and_(
                OrganizationProjectTask.id == task_id,
                OrganizationProjectTask.project_id == project_id,
                OrganizationProject.organization_id == organization_id
            )
        )
    )
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    await db.delete(task)
    await db.commit()
    
    return {"message": "Task deleted successfully"}

# File Management Endpoints
@router.post("/organizations/{organization_id}/projects/{project_id}/tasks/{task_id}/files")
async def upload_organization_task_file(
    organization_id: int,
    project_id: int,
    task_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a file to an organization task"""
    # Check if user has permission to upload files (member level)
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to upload files for this organization"
        )
    
    # Verify task exists and belongs to project/organization
    task_result = await db.execute(
        select(OrganizationProjectTask)
        .join(OrganizationProject)
        .where(
            and_(
                OrganizationProjectTask.id == task_id,
                OrganizationProjectTask.project_id == project_id,
                OrganizationProject.id == project_id,
                OrganizationProject.organization_id == organization_id
            )
        )
    )
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    try:
        # Upload to Vercel Blob using the same pattern as personal version
        from vercel_blob import put
        import os
        import uuid
        
        # Get blob token from environment
        blob_token = os.getenv('BLOB_READ_WRITE_TOKEN')
        if not blob_token:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Blob storage not configured"
            )
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Read file content
        file_content = await file.read()
        
        # Create blob path for organization task documents
        blob_path = f"organization-project-management/tasks/{task_id}/{unique_filename}"
        
        # Upload to Vercel Blob
        blob_result = put(
            blob_path,
            file_content,
            {
                "token": blob_token,
                "addRandomSuffix": "true"
            }
        )
        
        # Save document record to database
        from app.core.database import OrganizationTaskDocument
        document = OrganizationTaskDocument(
            task_id=task_id,
            user_id=current_user.id,
            filename=unique_filename,
            original_filename=file.filename,
            file_size=len(file_content),
            file_type=file.content_type or "application/octet-stream",
            blob_url=blob_result['url'],
            blob_key=blob_path
        )
        
        db.add(document)
        await db.commit()
        await db.refresh(document)
        
        return {
            "success": True,
            "message": "File uploaded successfully",
            "document": {
                "id": document.id,
                "filename": document.original_filename,
                "size": document.file_size,
                "url": document.blob_url,
                "uploaded_by": current_user.name,
                "uploaded_at": document.uploaded_at.isoformat()
            }
        }
        
    except Exception as e:
        print(f"Error uploading file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file"
        )

@router.get("/organizations/{organization_id}/projects/{project_id}/tasks/{task_id}/files")
async def get_organization_task_files(
    organization_id: int,
    project_id: int,
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all files for an organization task"""
    # Check if user has permission to view files (member level)
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view files for this organization"
        )
    
    # Verify task exists and belongs to project/organization
    task_result = await db.execute(
        select(OrganizationProjectTask)
        .join(OrganizationProject)
        .where(
            and_(
                OrganizationProjectTask.id == task_id,
                OrganizationProjectTask.project_id == project_id,
                OrganizationProject.id == project_id,
                OrganizationProject.organization_id == organization_id
            )
        )
    )
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Return files from database
    from app.core.database import OrganizationTaskDocument
    result = await db.execute(
        select(OrganizationTaskDocument)
        .where(OrganizationTaskDocument.task_id == task_id)
        .order_by(OrganizationTaskDocument.uploaded_at.desc())
    )
    documents = result.scalars().all()
    
    # Format response to match frontend expectations
    files = []
    for doc in documents:
        files.append({
            "id": doc.id,
            "filename": doc.original_filename,
            "size": doc.file_size,
            "url": doc.blob_url,
            "uploaded_by": doc.user.name if doc.user else "Unknown",
            "uploaded_at": doc.uploaded_at.isoformat()
        })
    
    return files

@router.delete("/organizations/{organization_id}/projects/{project_id}/tasks/{task_id}/files/{file_id}")
async def delete_organization_task_file(
    organization_id: int,
    project_id: int,
    task_id: int,
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a file from an organization task"""
    # Check if user has permission to delete files (member level)
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete files for this organization"
        )
    
    # Verify task exists and belongs to project/organization
    task_result = await db.execute(
        select(OrganizationProjectTask)
        .join(OrganizationProject)
        .where(
            and_(
                OrganizationProjectTask.id == task_id,
                OrganizationProjectTask.project_id == project_id,
                OrganizationProject.id == project_id,
                OrganizationProject.organization_id == organization_id
            )
        )
    )
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Find and delete the document
    from app.core.database import OrganizationTaskDocument
    result = await db.execute(
        select(OrganizationTaskDocument)
        .where(
            and_(
                OrganizationTaskDocument.id == file_id,
                OrganizationTaskDocument.task_id == task_id
            )
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    try:
        # Delete from Vercel Blob
        from vercel_blob import delete
        import os
        
        blob_token = os.getenv('BLOB_READ_WRITE_TOKEN')
        if blob_token and document.blob_url:
            try:
                delete(document.blob_url, {"token": blob_token})
            except Exception as e:
                print(f"Warning: Error deleting blob: {e}")
        
        # Delete from database
        await db.delete(document)
        await db.commit()
        
        return {"message": "File deleted successfully"}
        
    except Exception as e:
        print(f"Error deleting file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete file"
        )

# Time Entry Endpoints
@router.post("/organizations/{organization_id}/projects/{project_id}/time-entries", response_model=OrganizationTimeEntryResponse)
async def create_organization_time_entry(
    organization_id: int,
    project_id: int,
    time_data: OrganizationTimeEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a time entry for an organization project"""
    # Check if user has permission to create time entries (member level)
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create time entries for this organization"
        )
    
    # Verify project exists and belongs to organization
    project_result = await db.execute(
        select(OrganizationProject).where(
            and_(
                OrganizationProject.id == project_id,
                OrganizationProject.organization_id == organization_id
            )
        )
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Verify task exists if provided
    if time_data.task_id:
        task_result = await db.execute(
            select(OrganizationProjectTask).where(
                and_(
                    OrganizationProjectTask.id == time_data.task_id,
                    OrganizationProjectTask.project_id == project_id
                )
            )
        )
        task = task_result.scalar_one_or_none()
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
    
    # Create time entry
    # Convert timezone-aware datetime to timezone-naive for database storage
    date_value = time_data.date
    if date_value.tzinfo is not None:
        date_value = date_value.replace(tzinfo=None)
    
    time_entry = OrganizationTimeEntry(
        project_id=project_id,
        task_id=time_data.task_id,
        user_id=current_user.id,
        description=time_data.description,
        hours=time_data.hours,
        date=date_value,
        is_billable=time_data.is_billable,
        hourly_rate=time_data.hourly_rate
    )
    
    db.add(time_entry)
    await db.commit()
    await db.refresh(time_entry)
    
    # Update task actual_hours if task_id is provided
    if time_entry.task_id:
        print(f"🕒 [ORG_TIME_ENTRY] Updating actual_hours for task_id: {time_entry.task_id}")
        
        # Calculate total hours for the task
        total_hours_result = await db.execute(
            select(func.sum(OrganizationTimeEntry.hours)).where(OrganizationTimeEntry.task_id == time_entry.task_id)
        )
        total_hours = total_hours_result.scalar() or 0
        
        # Update task actual_hours
        task_result = await db.execute(
            select(OrganizationProjectTask).where(OrganizationProjectTask.id == time_entry.task_id)
        )
        task = task_result.scalar_one_or_none()
        if task:
            task.actual_hours = total_hours
            await db.commit()
            print(f"✅ [ORG_TIME_ENTRY] Updated task {task.id} actual_hours to {total_hours}")
        else:
            print(f"❌ [ORG_TIME_ENTRY] Task not found for task_id: {time_entry.task_id}")
    
    return OrganizationTimeEntryResponse(
        id=time_entry.id,
        project_id=time_entry.project_id,
        task_id=time_entry.task_id,
        description=time_entry.description,
        hours=time_entry.hours,
        date=time_entry.date,
        is_billable=time_entry.is_billable,
        hourly_rate=time_entry.hourly_rate,
        created_at=time_entry.created_at,
        user_name=current_user.name,
        task_title=task.title if time_data.task_id and task else None
    )

@router.get("/organizations/{organization_id}/projects/{project_id}/time-entries", response_model=List[OrganizationTimeEntryResponse])
async def get_organization_project_time_entries(
    organization_id: int,
    project_id: int,
    task_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all time entries for an organization project"""
    # Check if user has permission to view time entries (member level)
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view time entries for this organization"
        )
    
    # Verify project exists and belongs to organization
    project_result = await db.execute(
        select(OrganizationProject).where(
            and_(
                OrganizationProject.id == project_id,
                OrganizationProject.organization_id == organization_id
            )
        )
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Build query
    query = select(OrganizationTimeEntry).where(OrganizationTimeEntry.project_id == project_id)
    
    if task_id:
        query = query.where(OrganizationTimeEntry.task_id == task_id)
    
    if start_date:
        start_date_obj = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        # Convert to timezone-naive for database comparison
        if start_date_obj.tzinfo is not None:
            start_date_obj = start_date_obj.replace(tzinfo=None)
        query = query.where(OrganizationTimeEntry.date >= start_date_obj)
    
    if end_date:
        end_date_obj = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        # Convert to timezone-naive for database comparison
        if end_date_obj.tzinfo is not None:
            end_date_obj = end_date_obj.replace(tzinfo=None)
        query = query.where(OrganizationTimeEntry.date <= end_date_obj)
    
    # Include relationships
    query = query.options(
        selectinload(OrganizationTimeEntry.user),
        selectinload(OrganizationTimeEntry.task)
    ).order_by(desc(OrganizationTimeEntry.date))
    
    result = await db.execute(query)
    time_entries = result.scalars().all()
    
    return [
        OrganizationTimeEntryResponse(
            id=entry.id,
            project_id=entry.project_id,
            task_id=entry.task_id,
            description=entry.description,
            hours=entry.hours,
            date=entry.date,
            is_billable=entry.is_billable,
            hourly_rate=entry.hourly_rate,
            created_at=entry.created_at,
            user_name=entry.user.name if entry.user else None,
            task_title=entry.task.title if entry.task else None
        )
        for entry in time_entries
    ]

@router.delete("/organizations/{organization_id}/projects/{project_id}/time-entries/{time_entry_id}")
async def delete_organization_time_entry(
    organization_id: int,
    project_id: int,
    time_entry_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an organization time entry"""
    # Check if user has permission to delete time entries (member level)
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete time entries for this organization"
        )
    
    # Verify time entry exists and belongs to project/organization
    time_entry_result = await db.execute(
        select(OrganizationTimeEntry)
        .join(OrganizationProject)
        .where(
            and_(
                OrganizationTimeEntry.id == time_entry_id,
                OrganizationTimeEntry.project_id == project_id,
                OrganizationProject.organization_id == organization_id
            )
        )
    )
    time_entry = time_entry_result.scalar_one_or_none()
    if not time_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time entry not found"
        )
    
    # Store task_id before deletion for recalculation
    task_id = time_entry.task_id
    
    # Delete time entry
    await db.delete(time_entry)
    await db.commit()
    
    # Recalculate task actual_hours if task_id exists
    if task_id:
        total_hours_result = await db.execute(
            select(func.sum(OrganizationTimeEntry.hours)).where(OrganizationTimeEntry.task_id == task_id)
        )
        total_hours = total_hours_result.scalar() or 0
        
        # Update task actual_hours
        task_result = await db.execute(
            select(OrganizationProjectTask).where(OrganizationProjectTask.id == task_id)
        )
        task = task_result.scalar_one_or_none()
        if task:
            task.actual_hours = total_hours
            await db.commit()
    
    return {"message": "Time entry deleted successfully"}

@router.post("/organizations/{organization_id}/projects/from-template", response_model=OrganizationProjectResponse)
async def create_organization_project_from_template(
    organization_id: int,
    project_data: OrganizationProjectFromTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new organization project from a template"""
    # Check if user has permission to create projects (member level)
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create projects for this organization"
        )
    
    # Verify integration exists and belongs to organization
    integration_result = await db.execute(
        select(OrganizationIntegration).where(
            and_(
                OrganizationIntegration.id == project_data.integration_id,
                OrganizationIntegration.organization_id == organization_id,
                OrganizationIntegration.platform == "project_management"
            )
        )
    )
    integration = integration_result.scalar_one_or_none()
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project management integration not found"
        )
    
    # For now, create a basic project structure
    # In a full implementation, you would apply template logic here
    start_date_naive = project_data.start_date.replace(tzinfo=None) if project_data.start_date else None
    
    project = OrganizationProject(
        organization_id=organization_id,
        integration_id=project_data.integration_id,
        name=project_data.name,
        description=f"Project created from template: {project_data.template_id}",
        priority="medium",
        start_date=start_date_naive,
        settings=project_data.custom_settings or {},
        created_by_id=current_user.id
    )
    
    db.add(project)
    await db.commit()
    await db.refresh(project)
    
    # Add project creator as team member
    team_member = OrganizationProjectTeamMember(
        project_id=project.id,
        user_id=current_user.id,
        role="owner"
    )
    db.add(team_member)
    await db.commit()
    
    return OrganizationProjectResponse(
        id=project.id,
        organization_id=project.organization_id,
        integration_id=project.integration_id,
        name=project.name,
        description=project.description,
        status=project.status,
        priority=project.priority,
        start_date=project.start_date.isoformat() if project.start_date else None,
        end_date=project.end_date.isoformat() if project.end_date else None,
        budget=project.budget,
        progress=project.progress,
        color=project.color,
        icon=project.icon,
        settings=project.settings,
        created_by_id=project.created_by_id,
        created_at=project.created_at.isoformat(),
        updated_at=project.updated_at.isoformat() if project.updated_at else None
    )
