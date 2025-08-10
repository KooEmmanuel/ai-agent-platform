from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from typing import List
from pydantic import BaseModel
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.database import User, Agent, Integration, Tool

router = APIRouter()

class MonthlyUsage(BaseModel):
    conversations: int
    toolExecutions: int
    creditsUsed: int

class TopAgent(BaseModel):
    id: int
    name: str
    conversations: int
    successRate: float
    avgResponseTime: float

class TopTool(BaseModel):
    name: str
    executions: int
    successRate: float

class UsageTrend(BaseModel):
    date: str
    conversations: int
    toolExecutions: int

class AnalyticsResponse(BaseModel):
    totalAgents: int
    activeAgents: int
    totalTools: int
    totalConversations: int
    averageResponseTime: float
    successRate: float
    monthlyUsage: MonthlyUsage
    topAgents: List[TopAgent]
    topTools: List[TopTool]
    usageTrends: List[UsageTrend]

@router.get("/overview", response_model=AnalyticsResponse)
async def get_analytics_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get analytics overview for the current user"""
    try:
        # Get total agents count
        total_agents_result = await db.execute(
            select(func.count(Agent.id)).where(Agent.user_id == current_user.id)
        )
        total_agents = total_agents_result.scalar() or 0

        # Get active agents count
        active_agents_result = await db.execute(
            select(func.count(Agent.id)).where(
                Agent.user_id == current_user.id,
                Agent.is_active == True
            )
        )
        active_agents = active_agents_result.scalar() or 0

        # Get total tools count (user's tools)
        total_tools_result = await db.execute(
            select(func.count(Tool.id)).where(Tool.user_id == current_user.id)
        )
        total_tools = total_tools_result.scalar() or 0

        # For now, return basic data with zeros for metrics we don't track yet
        # TODO: Implement conversation tracking, tool execution tracking, etc.
        
        return AnalyticsResponse(
            totalAgents=total_agents,
            activeAgents=active_agents,
            totalTools=total_tools,
            totalConversations=0,  # TODO: Implement conversation tracking
            averageResponseTime=0.0,  # TODO: Implement response time tracking
            successRate=0.0,  # TODO: Implement success rate tracking
            monthlyUsage=MonthlyUsage(
                conversations=0,
                toolExecutions=0,
                creditsUsed=0  # TODO: Get from credit service
            ),
            topAgents=[],  # TODO: Implement agent performance tracking
            topTools=[],   # TODO: Implement tool usage tracking
            usageTrends=[] # TODO: Implement usage trend tracking
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch analytics: {str(e)}"
        )

@router.get("/agents", response_model=List[TopAgent])
async def get_top_agents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 10
):
    """Get top performing agents"""
    # TODO: Implement when we have conversation and performance tracking
    return []

@router.get("/tools", response_model=List[TopTool])
async def get_top_tools(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 10
):
    """Get most used tools"""
    # TODO: Implement when we have tool usage tracking
    return []

@router.get("/trends", response_model=List[UsageTrend])
async def get_usage_trends(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    days: int = 30
):
    """Get usage trends over time"""
    # TODO: Implement when we have historical usage data
    return []