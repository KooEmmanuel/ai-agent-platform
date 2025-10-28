"""
Organization Management API endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta
import secrets
import uuid
import hashlib
import os
import logging

from app.core.database import get_db
from app.core.database import Organization, OrganizationMember, OrganizationInvitation, User
from app.core.auth import get_current_user
from app.core.email import email_service
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models
class OrganizationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    slug: Optional[str] = None

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[dict] = None

class OrganizationResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    slug: Optional[str]
    owner_id: int
    settings: Optional[dict]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    member_count: int = 0
    
    class Config:
        from_attributes = True

class OrganizationMemberCreate(BaseModel):
    user_id: int
    role: str = "member"  # 'admin', 'member', 'guest'

class OrganizationInvitationCreate(BaseModel):
    email: str
    role: str = "member"  # 'admin', 'member', 'guest'

class OrganizationMemberResponse(BaseModel):
    id: int
    organization_id: int
    user_id: int
    role: str
    status: str
    joined_at: datetime
    created_at: datetime
    user_name: str
    user_email: str
    
    class Config:
        from_attributes = True

class OrganizationInvitationResponse(BaseModel):
    id: int
    organization_id: int
    email: str
    role: str
    invited_by: int
    token: str
    expires_at: datetime
    status: str
    created_at: datetime
    organization_name: str
    inviter_name: str
    
    class Config:
        from_attributes = True

class InvitationAcceptRequest(BaseModel):
    token: str

# Helper functions
def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from organization name"""
    import re
    slug = re.sub(r'[^a-zA-Z0-9\s-]', '', name.lower())
    slug = re.sub(r'\s+', '-', slug)
    return slug[:50]  # Limit length

async def get_user_organizations(user_id: int, db: AsyncSession) -> List[Organization]:
    """Get all organizations where user is a member"""
    result = await db.execute(
        select(Organization)
        .join(OrganizationMember)
        .where(
            and_(
                OrganizationMember.user_id == user_id,
                OrganizationMember.status == 'active'
            )
        )
        .options(selectinload(Organization.members))
    )
    return result.scalars().all()

async def check_organization_permission(
    organization_id: int, 
    user_id: int, 
    required_role: str, 
    db: AsyncSession
) -> bool:
    """Check if user has required permission in organization"""
    logger.info(f"🔐 Checking permission: user {user_id}, org {organization_id}, required role: {required_role}")
    
    # First check if user is the organization owner
    org_result = await db.execute(
        select(Organization).where(Organization.id == organization_id)
    )
    org = org_result.scalar_one_or_none()
    
    if org and org.owner_id == user_id:
        logger.info(f"🔐 User {user_id} is the organization owner - granting permission")
        return True
    
    logger.info(f"🔐 User {user_id} is NOT the organization owner (owner_id: {org.owner_id if org else 'org not found'})")
    
    # Then check organization membership
    result = await db.execute(
        select(OrganizationMember)
        .where(
            and_(
                OrganizationMember.organization_id == organization_id,
                OrganizationMember.user_id == user_id,
                OrganizationMember.status == 'active'
            )
        )
    )
    member = result.scalar_one_or_none()
    
    if not member:
        logger.warning(f"🔐 User {user_id} not found as active member in organization {organization_id}")
        logger.info(f"🔐 Organization {organization_id} members:")
        all_members_result = await db.execute(
            select(OrganizationMember).where(OrganizationMember.organization_id == organization_id)
        )
        all_members = all_members_result.scalars().all()
        for m in all_members:
            logger.info(f"🔐   - User {m.user_id}: {m.role} ({m.status})")
        return False
    
    logger.info(f"🔐 Found member: {member.role} (user {user_id} in org {organization_id})")
    
    # Role hierarchy: owner > admin > member > guest
    role_hierarchy = {'owner': 4, 'admin': 3, 'member': 2, 'guest': 1}
    user_level = role_hierarchy.get(member.role, 0)
    required_level = role_hierarchy.get(required_role, 0)
    
    has_permission = user_level >= required_level
    logger.info(f"🔐 Permission check: user_level={user_level}, required_level={required_level}, has_permission={has_permission}")
    
    return has_permission

# Organization CRUD endpoints
@router.post("/", response_model=OrganizationResponse)
async def create_organization(
    organization_data: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new organization"""
    # Generate slug if not provided
    slug = organization_data.slug or generate_slug(organization_data.name)
    
    # Check if slug is unique
    result = await db.execute(
        select(Organization).where(Organization.slug == slug)
    )
    if result.scalar_one_or_none():
        # Add timestamp to make it unique
        slug = f"{slug}-{int(datetime.now().timestamp())}"
    
    # Create organization
    organization = Organization(
        name=organization_data.name,
        description=organization_data.description,
        slug=slug,
        owner_id=current_user.id,
        settings={},
        is_active=True
    )
    
    db.add(organization)
    await db.commit()
    await db.refresh(organization)
    
    # Add owner as first member
    owner_member = OrganizationMember(
        organization_id=organization.id,
        user_id=current_user.id,
        role='owner',
        status='active'
    )
    db.add(owner_member)
    await db.commit()
    
    # Get member and project counts
    member_count = await db.execute(
        select(OrganizationMember).where(
            and_(
                OrganizationMember.organization_id == organization.id,
                OrganizationMember.status == 'active'
            )
        )
    )
    
    return OrganizationResponse(
        **organization.__dict__,
        member_count=len(member_count.scalars().all()),
    )

@router.get("/", response_model=List[OrganizationResponse])
async def get_organizations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all organizations for current user"""
    organizations = await get_user_organizations(current_user.id, db)
    
    # Get member and project counts for each organization
    result = []
    for org in organizations:
        member_count = await db.execute(
            select(OrganizationMember).where(
                and_(
                    OrganizationMember.organization_id == org.id,
                    OrganizationMember.status == 'active'
                )
            )
        )
        
        result.append(OrganizationResponse(
            **org.__dict__,
            member_count=len(member_count.scalars().all())
        ))
    
    return result

@router.get("/{organization_id}", response_model=OrganizationResponse)
async def get_organization(
    organization_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get organization details"""
    # Check if user has access to organization
    if not await check_organization_permission(organization_id, current_user.id, 'guest', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this organization"
        )
    
    result = await db.execute(
        select(Organization).where(Organization.id == organization_id)
    )
    organization = result.scalar_one_or_none()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Get member and project counts
    member_count = await db.execute(
        select(OrganizationMember).where(
            and_(
                OrganizationMember.organization_id == organization.id,
                OrganizationMember.status == 'active'
            )
        )
    )
    
    return OrganizationResponse(
        **organization.__dict__,
        member_count=len(member_count.scalars().all()),
    )

@router.put("/{organization_id}", response_model=OrganizationResponse)
async def update_organization(
    organization_id: int,
    organization_data: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update organization"""
    # Check if user is admin or owner
    if not await check_organization_permission(organization_id, current_user.id, 'admin', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this organization"
        )
    
    result = await db.execute(
        select(Organization).where(Organization.id == organization_id)
    )
    organization = result.scalar_one_or_none()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Update fields
    if organization_data.name:
        organization.name = organization_data.name
    if organization_data.description is not None:
        organization.description = organization_data.description
    if organization_data.settings is not None:
        organization.settings = organization_data.settings
    
    organization.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(organization)
    
    # Get member and project counts
    member_count = await db.execute(
        select(OrganizationMember).where(
            and_(
                OrganizationMember.organization_id == organization.id,
                OrganizationMember.status == 'active'
            )
        )
    )
    
    return OrganizationResponse(
        **organization.__dict__,
        member_count=len(member_count.scalars().all()),
    )

# Organization Members endpoints
@router.get("/{organization_id}/members", response_model=List[OrganizationMemberResponse])
async def get_organization_members(
    organization_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all members of an organization"""
    logger.info(f"📋 Getting members for organization {organization_id} by user {current_user.id} ({current_user.email})")
    
    # Check if user has access to organization
    if not await check_organization_permission(organization_id, current_user.id, 'guest', db):
        logger.warning(f"❌ User {current_user.id} doesn't have access to organization {organization_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this organization"
        )
    
    # Use a proper join to get user data
    result = await db.execute(
        select(OrganizationMember, User)
        .join(User, OrganizationMember.user_id == User.id)
        .where(OrganizationMember.organization_id == organization_id)
    )
    member_user_pairs = result.all()
    
    logger.info(f"🔍 Found {len(member_user_pairs)} members for organization {organization_id}")
    for member, user in member_user_pairs:
        logger.info(f"🔍 Member: {member.id}, User: {user.id} ({user.name}, {user.email})")
        logger.info(f"🔍 Member details: role={member.role}, status={member.status}, joined_at={member.joined_at}")
        logger.info(f"🔍 User details: name='{user.name}', email='{user.email}', id={user.id}")
    
    # Create response objects
    response_objects = []
    for member, user in member_user_pairs:
        response_obj = OrganizationMemberResponse(
            **member.__dict__,
            user_name=user.name or user.email,
            user_email=user.email
        )
        logger.info(f"🔍 Created response: user_name='{response_obj.user_name}', user_email='{response_obj.user_email}'")
        response_objects.append(response_obj)
    
    logger.info(f"🔍 Returning {len(response_objects)} member responses")
    
    # Log the final response data
    for i, response in enumerate(response_objects):
        logger.info(f"🔍 Response {i+1}: user_name='{response.user_name}', user_email='{response.user_email}', role='{response.role}', status='{response.status}'")
    
    return response_objects


@router.delete("/{organization_id}/members/{user_id}")
async def remove_organization_member(
    organization_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a member from an organization"""
    logger.info(f"🗑️ Removing user {user_id} from organization {organization_id} by user {current_user.id}")
    
    # Check if current user has admin permissions
    if not await check_organization_permission(organization_id, current_user.id, 'admin', db):
        logger.warning(f"❌ User {current_user.id} doesn't have admin permissions for organization {organization_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to remove members from this organization"
        )
    
    # Check if the user to be removed is the owner
    org_result = await db.execute(
        select(Organization).where(Organization.id == organization_id)
    )
    org = org_result.scalar_one_or_none()
    
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    if org.owner_id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the organization owner"
        )
    
    # Find the member to remove
    member_result = await db.execute(
        select(OrganizationMember).where(
            and_(
                OrganizationMember.organization_id == organization_id,
                OrganizationMember.user_id == user_id
            )
        )
    )
    member = member_result.scalar_one_or_none()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this organization"
        )
    
    # Remove the member
    await db.delete(member)
    await db.commit()
    
    logger.info(f"✅ Successfully removed user {user_id} from organization {organization_id}")
    
    return {"message": "Member removed successfully"}


# Organization Invitation endpoints
@router.post("/{organization_id}/invitations", response_model=OrganizationInvitationResponse)
async def create_organization_invitation(
    organization_id: int,
    invitation_data: OrganizationInvitationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send an invitation to join an organization"""
    try:
        logger.info(f"📧 Creating invitation for organization {organization_id}")
        logger.info(f"📧 Invitation data: {invitation_data}")
        logger.info(f"📧 Current user: {current_user.id} ({current_user.email})")
        
        # Validate invitation data
        if not invitation_data.email or not invitation_data.email.strip():
            logger.error(f"📧 Invalid email: {invitation_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )
        
        if not invitation_data.role or invitation_data.role not in ['admin', 'member', 'guest']:
            logger.error(f"📧 Invalid role: {invitation_data.role}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role. Must be one of: admin, member, guest"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"📧 Unexpected error in invitation creation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
    # Check if user has permission to invite (admin or owner)
    logger.info(f"📧 Checking permissions for user {current_user.id} in organization {organization_id}")
    has_permission = await check_organization_permission(organization_id, current_user.id, 'admin', db)
    logger.info(f"📧 Permission check result: {has_permission}")
    
    if not has_permission:
        logger.warning(f"📧 Permission denied for user {current_user.id} in organization {organization_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to invite users to this organization"
        )
    
    # Check if organization exists
    logger.info(f"📧 Checking if organization {organization_id} exists")
    result = await db.execute(
        select(Organization).where(Organization.id == organization_id)
    )
    organization = result.scalar_one_or_none()
    
    if not organization:
        logger.error(f"📧 Organization {organization_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    logger.info(f"📧 Organization found: {organization.name}")
    
    # Check if the invited user is already a member
    # First, we need to find the user by email
    user_result = await db.execute(
        select(User).where(User.email == invitation_data.email)
    )
    invited_user = user_result.scalar_one_or_none()
    
    if invited_user:
        logger.info(f"📧 Checking if invited user {invited_user.id} ({invited_user.email}) is already a member of organization {organization_id}")
        member_result = await db.execute(
            select(OrganizationMember).where(
                and_(
                    OrganizationMember.organization_id == organization_id,
                    OrganizationMember.user_id == invited_user.id
                )
            )
        )
        existing_member = member_result.scalar_one_or_none()
        
        if existing_member:
            logger.warning(f"📧 User {invited_user.email} is already a member of organization {organization_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member of this organization"
            )
        
        logger.info(f"📧 Invited user {invited_user.email} is not a member, proceeding with invitation")
    else:
        logger.info(f"📧 Invited user {invitation_data.email} does not exist yet, proceeding with invitation")
    
    # Check if there's already a pending invitation
    logger.info(f"📧 Checking for existing invitation to {invitation_data.email}")
    existing_invitation = await db.execute(
        select(OrganizationInvitation).where(
            and_(
                OrganizationInvitation.organization_id == organization_id,
                OrganizationInvitation.email == invitation_data.email,
                OrganizationInvitation.status == 'pending'
            )
        )
    )
    
    existing_invitation_result = existing_invitation.scalar_one_or_none()
    if existing_invitation_result:
        logger.warning(f"📧 Invitation already exists for {invitation_data.email} in organization {organization_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An invitation has already been sent to this email"
        )
    
    logger.info(f"📧 No existing invitation found, proceeding to create new invitation")
    
    # Generate invitation token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=7)  # Invitation expires in 7 days
    logger.info(f"📧 Generated token: {token[:10]}... (expires: {expires_at})")
    
    # Create invitation
    logger.info(f"📧 Creating invitation for {invitation_data.email} with role {invitation_data.role}")
    invitation = OrganizationInvitation(
        organization_id=organization_id,
        email=invitation_data.email,
        role=invitation_data.role,
        invited_by=current_user.id,
        token=token,
        expires_at=expires_at,
        status='pending'
    )
    
    try:
        db.add(invitation)
        await db.commit()
        await db.refresh(invitation)
        logger.info(f"📧 Invitation created successfully with ID: {invitation.id}")
    except Exception as e:
        logger.error(f"📧 Failed to create invitation: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create invitation"
        )
    
    # Get organization and inviter names for response
    org_result = await db.execute(
        select(Organization).where(Organization.id == organization_id)
    )
    org = org_result.scalar_one()
    
    inviter_result = await db.execute(
        select(User).where(User.id == current_user.id)
    )
    inviter = inviter_result.scalar_one()
    
    # Send invitation email
    try:
        # Generate invitation URL
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        invitation_url = f"{frontend_url}/invitation/accept/{token}"
        
        # Send email
        email_sent = await email_service.send_organization_invitation(
            to_email=invitation_data.email,
            organization_name=org.name,
            inviter_name=inviter.name or inviter.email,
            role=invitation_data.role,
            invitation_url=invitation_url,
            expires_at=expires_at.strftime('%B %d, %Y at %I:%M %p')
        )
        
        if email_sent:
            logger.info(f"📧 Invitation email sent to {invitation_data.email}")
        else:
            logger.warning(f"⚠️ Failed to send invitation email to {invitation_data.email}")
            
    except Exception as e:
        logger.error(f"❌ Error sending invitation email: {str(e)}")
        # Don't fail the request if email fails
    
    return OrganizationInvitationResponse(
        **invitation.__dict__,
        organization_name=org.name,
        inviter_name=inviter.name or inviter.email
    )

@router.get("/{organization_id}/invitations", response_model=List[OrganizationInvitationResponse])
async def get_organization_invitations(
    organization_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all invitations for an organization"""
    # Check if user has permission to view invitations (any member can view)
    if not await check_organization_permission(organization_id, current_user.id, 'member', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view invitations for this organization"
        )
    
    result = await db.execute(
        select(OrganizationInvitation)
        .where(OrganizationInvitation.organization_id == organization_id)
        .order_by(OrganizationInvitation.created_at.desc())
    )
    invitations = result.scalars().all()
    
    logger.info(f"🔍 Found {len(invitations)} invitations for organization {organization_id}")
    for invitation in invitations:
        logger.info(f"🔍 Invitation: {invitation.id}, Email: {invitation.email}, Status: {invitation.status}")
    
    # Get organization and inviter names
    response_list = []
    for invitation in invitations:
        org_result = await db.execute(
            select(Organization).where(Organization.id == invitation.organization_id)
        )
        org = org_result.scalar_one()
        
        inviter_result = await db.execute(
            select(User).where(User.id == invitation.invited_by)
        )
        inviter = inviter_result.scalar_one()
        
        response_list.append(OrganizationInvitationResponse(
            **invitation.__dict__,
            organization_name=org.name,
            inviter_name=inviter.name or inviter.email
        ))
    
    return response_list

@router.post("/invitations/accept-public")
async def accept_organization_invitation_public(
    invitation_data: InvitationAcceptRequest,
    db: AsyncSession = Depends(get_db)
):
    """Accept an organization invitation (public endpoint for unauthenticated users)"""
    # Find the invitation by token
    result = await db.execute(
        select(OrganizationInvitation).where(
            OrganizationInvitation.token == invitation_data.token
        )
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    # Check if invitation is still valid
    if invitation.status != 'pending':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation is no longer valid"
        )
    
    if invitation.expires_at < datetime.utcnow():
        invitation.status = 'expired'
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired"
        )
    
    # For public acceptance, we need to create a user account first
    # This is a simplified version - in production you'd want proper user registration
    return {
        "message": "Please create an account first to accept this invitation",
        "invitation_token": invitation_data.token,
        "organization_name": "Organization Name",  # You'd get this from the invitation
        "next_step": "register"
    }

@router.post("/invitations/accept")
async def accept_organization_invitation(
    invitation_data: InvitationAcceptRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Accept an organization invitation"""
    logger.info(f"🎯 Accepting invitation for user {current_user.id} ({current_user.email}) with token: {invitation_data.token[:10]}...")
    
    # Find the invitation by token
    result = await db.execute(
        select(OrganizationInvitation).where(
            OrganizationInvitation.token == invitation_data.token
        )
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        logger.error(f"❌ Invitation not found for token: {invitation_data.token[:10]}...")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    logger.info(f"🎯 Found invitation: {invitation.id}, email: {invitation.email}, status: {invitation.status}")
    
    # Check if invitation is still valid
    if invitation.status != 'pending':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation is no longer valid"
        )
    
    if datetime.utcnow() > invitation.expires_at:
        # Mark as expired
        invitation.status = 'expired'
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired"
        )
    
    # Check if user email matches invitation email
    if current_user.email != invitation.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation is not for your email address"
        )
    
    # Check if user is already a member
    existing_member = await db.execute(
        select(OrganizationMember).where(
            and_(
                OrganizationMember.organization_id == invitation.organization_id,
                OrganizationMember.user_id == current_user.id
            )
        )
    )
    
    if existing_member.scalar_one_or_none():
        # Mark invitation as accepted even if already a member
        invitation.status = 'accepted'
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this organization"
        )
    
    # Add user as organization member
    member = OrganizationMember(
        organization_id=invitation.organization_id,
        user_id=current_user.id,
        role=invitation.role,
        status='active',
        invited_by=invitation.invited_by
    )
    
    logger.info(f"🎯 Creating member: org_id={invitation.organization_id}, user_id={current_user.id}, role={invitation.role}")
    db.add(member)
    
    # Mark invitation as accepted
    logger.info(f"🎯 Updating invitation status from {invitation.status} to 'accepted'")
    invitation.status = 'accepted'
    invitation.updated_at = datetime.utcnow()
    
    await db.commit()
    logger.info(f"🎯 Successfully added user {current_user.id} to organization {invitation.organization_id}")
    
    # Get organization name for response
    org_result = await db.execute(
        select(Organization).where(Organization.id == invitation.organization_id)
    )
    organization = org_result.scalar_one()
    
    # Send welcome email
    try:
        welcome_sent = await email_service.send_welcome_email(
            to_email=current_user.email,
            organization_name=organization.name,
            user_name=current_user.name or current_user.email,
            role=invitation.role
        )
        
        if welcome_sent:
            logger.info(f"📧 Welcome email sent to {current_user.email}")
        else:
            logger.warning(f"⚠️ Failed to send welcome email to {current_user.email}")
            
    except Exception as e:
        logger.error(f"❌ Error sending welcome email: {str(e)}")
        # Don't fail the request if email fails
    
    return {
        "message": "Successfully joined organization",
        "organization_id": invitation.organization_id,
        "organization_name": organization.name,
        "role": invitation.role
    }

@router.post("/invitations/{invitation_id}/decline")
async def decline_organization_invitation(
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Decline an organization invitation"""
    # Find the invitation
    result = await db.execute(
        select(OrganizationInvitation).where(
            OrganizationInvitation.id == invitation_id
        )
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    # Check if invitation is for current user
    if invitation.email != current_user.email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only decline your own invitations"
        )
    
    # Check if invitation is still pending
    if invitation.status != 'pending':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation is no longer pending"
        )
    
    # Mark as declined
    invitation.status = 'declined'
    invitation.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return {"message": "Invitation declined"}

@router.delete("/invitations/{invitation_id}")
async def cancel_organization_invitation(
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel an organization invitation (admin/owner only)"""
    # Find the invitation
    result = await db.execute(
        select(OrganizationInvitation).where(
            OrganizationInvitation.id == invitation_id
        )
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    # Check if user has permission to cancel invitations
    if not await check_organization_permission(invitation.organization_id, current_user.id, 'admin', db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to cancel invitations for this organization"
        )
    
    # Delete the invitation
    await db.delete(invitation)
    await db.commit()
    
    return {"message": "Invitation cancelled"}
