"""
Project Management Integration Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from app.core.auth import get_current_user
from app.core.database import (
    get_db, User, Integration, Agent,
    Project, ProjectTask, ProjectTeamMember, TimeEntry, 
    ProjectMilestone, ProjectComment, ProjectTemplate
)
from app.services.project_template_service import ProjectTemplateService

router = APIRouter()

# Pydantic Models
class ProjectCreate(BaseModel):
    integration_id: int
    name: str
    description: Optional[str] = None
    priority: str = "medium"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class ProjectUpdate(BaseModel):
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

class ProjectResponse(BaseModel):
    id: int
    integration_id: int
    name: str
    description: Optional[str]
    status: str
    priority: str
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    budget: Optional[float]
    progress: float
    color: Optional[str]
    icon: Optional[str]
    settings: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: Optional[datetime]
    task_count: Optional[int] = 0
    team_member_count: Optional[int] = 0

class TaskCreate(BaseModel):
    project_id: int
    parent_task_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    progress: Optional[float] = None
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None

class TaskResponse(BaseModel):
    id: int
    project_id: int
    parent_task_id: Optional[int]
    title: str
    description: Optional[str]
    status: str
    priority: str
    assignee_id: Optional[int]
    due_date: Optional[datetime]
    estimated_hours: Optional[float]
    actual_hours: float
    progress: float
    tags: Optional[List[str]]
    custom_fields: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: Optional[datetime]
    assignee_name: Optional[str] = None
    subtask_count: Optional[int] = 0

class TimeEntryCreate(BaseModel):
    project_id: int
    task_id: Optional[int] = None
    description: Optional[str] = None
    hours: float
    date: datetime
    is_billable: bool = True
    hourly_rate: Optional[float] = None

class TimeEntryResponse(BaseModel):
    id: int
    project_id: int
    task_id: Optional[int]
    description: Optional[str]
    hours: float
    date: datetime
    is_billable: bool
    hourly_rate: Optional[float]
    created_at: datetime
    user_name: Optional[str] = None
    task_title: Optional[str] = None

# Template Models
class ProjectTemplateResponse(BaseModel):
    id: str
    name: str
    description: str
    methodology: str
    estimated_duration: str
    phases: List[Dict[str, Any]]
    milestones: List[Dict[str, Any]]
    team_roles: List[Dict[str, Any]]
    settings: Dict[str, Any]

class ProjectFromTemplateCreate(BaseModel):
    integration_id: int
    name: str
    template_id: str
    start_date: Optional[datetime] = None
    custom_settings: Optional[Dict[str, Any]] = None

# Project Endpoints
@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new project"""
    # Verify integration exists and belongs to user
    integration_result = await db.execute(
        select(Integration).where(
            Integration.id == project_data.integration_id,
            Integration.user_id == current_user.id,
            Integration.platform == "project_management"
        )
    )
    integration = integration_result.scalar_one_or_none()
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project management integration not found"
        )
    
    # Create project
    # Convert timezone-aware datetimes to timezone-naive for database storage
    start_date_naive = project_data.start_date.replace(tzinfo=None) if project_data.start_date else None
    end_date_naive = project_data.end_date.replace(tzinfo=None) if project_data.end_date else None
    
    project = Project(
        user_id=current_user.id,
        integration_id=project_data.integration_id,
        name=project_data.name,
        description=project_data.description,
        priority=project_data.priority,
        start_date=start_date_naive,
        end_date=end_date_naive,
        budget=project_data.budget,
        color=project_data.color,
        icon=project_data.icon,
        settings=project_data.settings
    )
    
    db.add(project)
    await db.commit()
    await db.refresh(project)
    
    # Add project owner as team member
    team_member = ProjectTeamMember(
        project_id=project.id,
        user_id=current_user.id,
        role="owner"
    )
    db.add(team_member)
    await db.commit()
    
    return ProjectResponse(
        id=project.id,
        integration_id=project.integration_id,
        name=project.name,
        description=project.description,
        status=project.status,
        priority=project.priority,
        start_date=project.start_date,
        end_date=project.end_date,
        budget=project.budget,
        progress=project.progress,
        color=project.color,
        icon=project.icon,
        settings=project.settings,
        created_at=project.created_at,
        updated_at=project.updated_at,
        task_count=0,
        team_member_count=1
    )

@router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(
    integration_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's projects"""
    query = select(Project).where(Project.user_id == current_user.id)
    
    if integration_id:
        query = query.where(Project.integration_id == integration_id)
    if status:
        query = query.where(Project.status == status)
    
    query = query.options(
        selectinload(Project.tasks),
        selectinload(Project.team_members)
    ).order_by(desc(Project.created_at))
    
    result = await db.execute(query)
    projects = result.scalars().all()
    
    return [
        ProjectResponse(
            id=p.id,
            integration_id=p.integration_id,
            name=p.name,
            description=p.description,
            status=p.status,
            priority=p.priority,
            start_date=p.start_date,
            end_date=p.end_date,
            budget=p.budget,
            progress=p.progress,
            color=p.color,
            icon=p.icon,
            settings=p.settings,
            created_at=p.created_at,
            updated_at=p.updated_at,
            task_count=len(p.tasks),
            team_member_count=len(p.team_members)
        )
        for p in projects
    ]

@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific project"""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id
        ).options(
            selectinload(Project.tasks),
            selectinload(Project.team_members)
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return ProjectResponse(
        id=project.id,
        integration_id=project.integration_id,
        name=project.name,
        description=project.description,
        status=project.status,
        priority=project.priority,
        start_date=project.start_date,
        end_date=project.end_date,
        budget=project.budget,
        progress=project.progress,
        color=project.color,
        icon=project.icon,
        settings=project.settings,
        created_at=project.created_at,
        updated_at=project.updated_at,
        task_count=len(project.tasks),
        team_member_count=len(project.team_members)
    )

@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a project"""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Update fields
    for field, value in project_data.dict(exclude_unset=True).items():
        # Convert timezone-aware datetime to timezone-naive for database storage
        if field in ['start_date', 'end_date'] and value is not None:
            value = value.replace(tzinfo=None)
        setattr(project, field, value)
    
    project.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(project)
    
    return ProjectResponse(
        id=project.id,
        integration_id=project.integration_id,
        name=project.name,
        description=project.description,
        status=project.status,
        priority=project.priority,
        start_date=project.start_date,
        end_date=project.end_date,
        budget=project.budget,
        progress=project.progress,
        color=project.color,
        icon=project.icon,
        settings=project.settings,
        created_at=project.created_at,
        updated_at=project.updated_at,
        task_count=0,
        team_member_count=0
    )

@router.delete("/projects/{project_id}", response_model=dict)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a project"""
    print(f"🗑️ [DELETE] Attempting to delete project ID: {project_id} for user: {current_user.id}")
    
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        print(f"❌ [DELETE] Project not found: ID {project_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    print(f"✅ [DELETE] Found project: {project.name} (ID: {project.id})")
    
    # Delete the project
    await db.delete(project)
    await db.commit()
    
    print(f"🗑️ [DELETE] Successfully deleted project: {project.name} (ID: {project.id})")
    
    return {"message": "Project deleted successfully"}

# Task Endpoints
@router.post("/tasks", response_model=TaskResponse)
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new task"""
    # Verify project exists and user has access
    result = await db.execute(
        select(Project).where(
            Project.id == task_data.project_id,
            Project.user_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Create task
    # Convert timezone-aware datetime to timezone-naive for database storage
    due_date_naive = task_data.due_date.replace(tzinfo=None) if task_data.due_date else None
    
    task = ProjectTask(
        project_id=task_data.project_id,
        parent_task_id=task_data.parent_task_id,
        title=task_data.title,
        description=task_data.description,
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
    
    return TaskResponse(
        id=task.id,
        project_id=task.project_id,
        parent_task_id=task.parent_task_id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        assignee_id=task.assignee_id,
        due_date=task.due_date,
        estimated_hours=task.estimated_hours,
        actual_hours=task.actual_hours,
        progress=task.progress,
        tags=task.tags,
        custom_fields=task.custom_fields,
        created_at=task.created_at,
        updated_at=task.updated_at,
        assignee_name=None,
        subtask_count=0
    )

@router.get("/projects/{project_id}/tasks", response_model=List[TaskResponse])
async def get_project_tasks(
    project_id: int,
    status: Optional[str] = Query(None),
    assignee_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get tasks for a project"""
    # Verify project access
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    query = select(ProjectTask).where(ProjectTask.project_id == project_id)
    
    if status:
        query = query.where(ProjectTask.status == status)
    if assignee_id:
        query = query.where(ProjectTask.assignee_id == assignee_id)
    
    query = query.options(
        selectinload(ProjectTask.assignee),
        selectinload(ProjectTask.subtasks)
    ).order_by(ProjectTask.id)
    
    result = await db.execute(query)
    tasks = result.scalars().all()
    
    return [
        TaskResponse(
            id=t.id,
            project_id=t.project_id,
            parent_task_id=t.parent_task_id,
            title=t.title,
            description=t.description,
            status=t.status,
            priority=t.priority,
            assignee_id=t.assignee_id,
            due_date=t.due_date,
            estimated_hours=t.estimated_hours,
            actual_hours=t.actual_hours,
            progress=t.progress,
            tags=t.tags,
            custom_fields=t.custom_fields,
            created_at=t.created_at,
            updated_at=t.updated_at,
            assignee_name=t.assignee.name if t.assignee else None,
            subtask_count=len(t.subtasks)
        )
        for t in tasks
    ]

@router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a task"""
    result = await db.execute(
        select(ProjectTask).join(Project).where(
            ProjectTask.id == task_id,
            Project.user_id == current_user.id
        )
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Update fields
    for field, value in task_data.dict(exclude_unset=True).items():
        # Convert timezone-aware datetime to timezone-naive for database storage
        if field == 'due_date' and value is not None:
            value = value.replace(tzinfo=None)
        setattr(task, field, value)
    
    task.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(task)
    
    return TaskResponse(
        id=task.id,
        project_id=task.project_id,
        parent_task_id=task.parent_task_id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        assignee_id=task.assignee_id,
        due_date=task.due_date,
        estimated_hours=task.estimated_hours,
        actual_hours=task.actual_hours,
        progress=task.progress,
        tags=task.tags,
        custom_fields=task.custom_fields,
        created_at=task.created_at,
        updated_at=task.updated_at,
        assignee_name=None,
        subtask_count=0
    )

@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a task"""
    result = await db.execute(
        select(ProjectTask).join(Project).where(
            ProjectTask.id == task_id,
            Project.user_id == current_user.id
        )
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    await db.delete(task)
    await db.commit()
    
    return {"message": "Task deleted successfully"}

# Time Tracking Endpoints
@router.post("/time-entries", response_model=TimeEntryResponse)
async def create_time_entry(
    time_data: TimeEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a time entry"""
    # Verify project access
    result = await db.execute(
        select(Project).where(
            Project.id == time_data.project_id,
            Project.user_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Create time entry
    # Convert timezone-aware datetime to timezone-naive for database storage
    date_naive = time_data.date.replace(tzinfo=None) if time_data.date else None
    
    time_entry = TimeEntry(
        project_id=time_data.project_id,
        task_id=time_data.task_id,
        user_id=current_user.id,
        description=time_data.description,
        hours=time_data.hours,
        date=date_naive,
        is_billable=time_data.is_billable,
        hourly_rate=time_data.hourly_rate
    )
    
    db.add(time_entry)
    await db.commit()
    await db.refresh(time_entry)
    
    # Update task's actual hours by summing all time entries for this task
    if time_entry.task_id:
        print(f"🕒 [TIME_ENTRY] Updating actual_hours for task_id: {time_entry.task_id}")
        result = await db.execute(
            select(func.sum(TimeEntry.hours)).where(TimeEntry.task_id == time_entry.task_id)
        )
        total_hours = result.scalar() or 0.0
        print(f"📊 [TIME_ENTRY] Total hours calculated: {total_hours}")
        
        # Update the task's actual_hours
        task_result = await db.execute(
            select(ProjectTask).where(ProjectTask.id == time_entry.task_id)
        )
        task = task_result.scalar_one_or_none()
        if task:
            print(f"📝 [TIME_ENTRY] Updating task '{task.title}' actual_hours from {task.actual_hours} to {total_hours}")
            task.actual_hours = total_hours
            await db.commit()
            print(f"✅ [TIME_ENTRY] Task actual_hours updated successfully")
        else:
            print(f"❌ [TIME_ENTRY] Task not found for task_id: {time_entry.task_id}")
    
    return TimeEntryResponse(
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
        task_title=None
    )

@router.delete("/time-entries/{time_entry_id}")
async def delete_time_entry(
    time_entry_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a time entry"""
    result = await db.execute(
        select(TimeEntry).join(Project).where(
            TimeEntry.id == time_entry_id,
            Project.user_id == current_user.id
        )
    )
    time_entry = result.scalar_one_or_none()
    
    if not time_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Time entry not found"
        )
    
    # Store task_id before deleting
    task_id = time_entry.task_id
    
    await db.delete(time_entry)
    await db.commit()
    
    # Update task's actual hours by summing remaining time entries for this task
    if task_id:
        result = await db.execute(
            select(func.sum(TimeEntry.hours)).where(TimeEntry.task_id == task_id)
        )
        total_hours = result.scalar() or 0.0
        
        # Update the task's actual_hours
        task_result = await db.execute(
            select(ProjectTask).where(ProjectTask.id == task_id)
        )
        task = task_result.scalar_one_or_none()
        if task:
            task.actual_hours = total_hours
            await db.commit()
    
    return {"message": "Time entry deleted successfully"}

@router.post("/tasks/{task_id}/recalculate-hours")
async def recalculate_task_hours(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Manually recalculate and update task's actual_hours"""
    # Get the task
    task_result = await db.execute(
        select(ProjectTask).join(Project).where(
            ProjectTask.id == task_id,
            Project.user_id == current_user.id
        )
    )
    task = task_result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Calculate total hours from time entries
    result = await db.execute(
        select(func.sum(TimeEntry.hours)).where(TimeEntry.task_id == task_id)
    )
    total_hours = result.scalar() or 0.0
    
    print(f"🔄 [RECALCULATE] Task '{task.title}': old actual_hours = {task.actual_hours}, new = {total_hours}")
    
    # Update the task
    task.actual_hours = total_hours
    await db.commit()
    
    return {
        "message": "Task hours recalculated successfully",
        "task_id": task_id,
        "old_hours": task.actual_hours,
        "new_hours": total_hours
    }

@router.get("/projects/{project_id}/time-entries", response_model=List[TimeEntryResponse])
async def get_project_time_entries(
    project_id: int,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get time entries for a project"""
    # Verify project access
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    query = select(TimeEntry).where(TimeEntry.project_id == project_id)
    
    if start_date:
        query = query.where(TimeEntry.date >= start_date)
    if end_date:
        query = query.where(TimeEntry.date <= end_date)
    
    query = query.options(
        selectinload(TimeEntry.user),
        selectinload(TimeEntry.task)
    ).order_by(desc(TimeEntry.date))
    
    result = await db.execute(query)
    time_entries = result.scalars().all()
    
    return [
        TimeEntryResponse(
            id=te.id,
            project_id=te.project_id,
            task_id=te.task_id,
            description=te.description,
            hours=te.hours,
            date=te.date,
            is_billable=te.is_billable,
            hourly_rate=te.hourly_rate,
            created_at=te.created_at,
            user_name=te.user.name if te.user else None,
            task_title=te.task.title if te.task else None
        )
        for te in time_entries
    ]

# Analytics Endpoints
@router.get("/projects/{project_id}/analytics")
async def get_project_analytics(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get project analytics"""
    # Verify project access
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Get task statistics
    task_stats = await db.execute(
        select(
            ProjectTask.status,
            func.count(ProjectTask.id).label('count')
        ).where(ProjectTask.project_id == project_id)
        .group_by(ProjectTask.status)
    )
    task_status_counts = {row.status: row.count for row in task_stats}
    
    # Get time tracking statistics
    time_stats = await db.execute(
        select(
            func.sum(TimeEntry.hours).label('total_hours'),
            func.avg(TimeEntry.hours).label('avg_hours_per_entry')
        ).where(TimeEntry.project_id == project_id)
    )
    time_data = time_stats.first()
    
    # Get team member count
    team_count = await db.execute(
        select(func.count(ProjectTeamMember.id))
        .where(ProjectTeamMember.project_id == project_id)
    )
    team_member_count = team_count.scalar()
    
    return {
        "project_id": project_id,
        "task_status_counts": task_status_counts,
        "total_hours_logged": float(time_data.total_hours or 0),
        "avg_hours_per_entry": float(time_data.avg_hours_per_entry or 0),
        "team_member_count": team_member_count,
        "project_progress": project.progress
    }

# Template Endpoints
@router.get("/templates", response_model=List[ProjectTemplateResponse])
async def get_project_templates():
    """Get all available project templates"""
    print("🔍 [TEMPLATES] Getting project templates...")
    templates = ProjectTemplateService.get_default_templates()
    print(f"📋 [TEMPLATES] Found {len(templates)} templates: {list(templates.keys())}")
    
    template_responses = []
    for template_id, template_data in templates.items():
        print(f"📝 [TEMPLATES] Processing template: {template_id} - {template_data['name']}")
        template_responses.append(ProjectTemplateResponse(
            id=template_id,
            name=template_data["name"],
            description=template_data["description"],
            methodology=template_data["methodology"],
            estimated_duration=template_data["estimated_duration"],
            phases=template_data["phases"],
            milestones=template_data["milestones"],
            team_roles=template_data["team_roles"],
            settings=template_data["settings"]
        ))
    
    print(f"✅ [TEMPLATES] Returning {len(template_responses)} template responses")
    return template_responses

@router.get("/templates/{template_id}", response_model=ProjectTemplateResponse)
async def get_project_template(template_id: str):
    """Get a specific project template by ID"""
    templates = ProjectTemplateService.get_default_templates()
    
    if template_id not in templates:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_id}' not found"
        )
    
    template_data = templates[template_id]
    return ProjectTemplateResponse(
        id=template_id,
        name=template_data["name"],
        description=template_data["description"],
        methodology=template_data["methodology"],
        estimated_duration=template_data["estimated_duration"],
        phases=template_data["phases"],
        milestones=template_data["milestones"],
        team_roles=template_data["team_roles"],
        settings=template_data["settings"]
    )

@router.post("/projects/from-template", response_model=ProjectResponse)
async def create_project_from_template(
    project_data: ProjectFromTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new project from a template"""
    # Verify integration exists and belongs to user
    integration_result = await db.execute(
        select(Integration).where(
            Integration.id == project_data.integration_id,
            Integration.user_id == current_user.id,
            Integration.platform == "project_management"
        )
    )
    integration = integration_result.scalar_one_or_none()
    if not integration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project management integration not found"
        )
    
    # Apply template to create project structure
    try:
        project_structure = ProjectTemplateService.apply_template_to_project(
            template_id=project_data.template_id,
            project_name=project_data.name,
            start_date=project_data.start_date
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Create project
    # Convert timezone-aware datetimes to timezone-naive for database storage
    start_date_naive = project_structure["start_date"].replace(tzinfo=None) if project_structure["start_date"] else None
    end_date_naive = project_structure["end_date"].replace(tzinfo=None) if project_structure["end_date"] else None
    
    project = Project(
        user_id=current_user.id,
        integration_id=project_data.integration_id,
        name=project_structure["name"],
        description=project_structure["description"],
        start_date=start_date_naive,
        end_date=end_date_naive,
        settings=project_structure["settings"]
    )
    
    db.add(project)
    await db.commit()
    await db.refresh(project)
    
    # Add project owner as team member
    team_member = ProjectTeamMember(
        project_id=project.id,
        user_id=current_user.id,
        role="owner"
    )
    db.add(team_member)
    
    # Create tasks from template
    for phase in project_structure["phases"]:
        for task_data in phase["tasks"]:
            task = ProjectTask(
                project_id=project.id,
                title=task_data["title"],
                description=task_data["description"],
                priority=task_data["priority"],
                estimated_hours=task_data["estimated_hours"],
                status=task_data["status"]
            )
            db.add(task)
    
    # Create milestones from template
    for milestone_data in project_structure["milestones"]:
        milestone = ProjectMilestone(
            project_id=project.id,
            title=milestone_data["title"],
            description=milestone_data["description"],
            due_date=milestone_data["due_date"],
            is_completed=milestone_data["is_completed"]
        )
        db.add(milestone)
    
    await db.commit()
    await db.refresh(project)
    
    return ProjectResponse(
        id=project.id,
        integration_id=project.integration_id,
        name=project.name,
        description=project.description,
        status=project.status,
        priority=project.priority,
        start_date=project.start_date,
        end_date=project.end_date,
        budget=project.budget,
        progress=project.progress,
        color=project.color,
        icon=project.icon,
        settings=project.settings,
        created_at=project.created_at,
        updated_at=project.updated_at,
        task_count=len([task for phase in project_structure["phases"] for task in phase["tasks"]]),
        team_member_count=1
    )
