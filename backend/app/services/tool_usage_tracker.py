"""
Tool Usage Tracker

This service tracks and logs tool usage statistics for monitoring and analytics.
"""

import asyncio
from datetime import datetime
from typing import Dict, Any, List
from loguru import logger


class ToolUsageTracker:
    """
    Tracks tool usage statistics and provides logging functionality.
    """
    
    def __init__(self):
        self.usage_stats = {}
        self.session_stats = {
            'total_tools_used': 0,
            'successful_executions': 0,
            'failed_executions': 0,
            'tools_by_category': {},
            'session_start': datetime.now()
        }
    
    def log_tool_execution(
        self, 
        agent_id: int, 
        agent_name: str, 
        tool_name: str, 
        success: bool, 
        execution_time: float = 0.0,
        result_size: int = 0,
        category: str = "unknown"
    ):
        """
        Log a tool execution event.
        
        Args:
            agent_id: ID of the agent that used the tool
            agent_name: Name of the agent
            tool_name: Name of the tool that was executed
            success: Whether the execution was successful
            execution_time: Time taken to execute the tool (seconds)
            result_size: Size of the result (characters)
            category: Tool category
        """
        timestamp = datetime.now()
        
        # Update session stats
        self.session_stats['total_tools_used'] += 1
        if success:
            self.session_stats['successful_executions'] += 1
        else:
            self.session_stats['failed_executions'] += 1
        
        # Update category stats
        if category not in self.session_stats['tools_by_category']:
            self.session_stats['tools_by_category'][category] = 0
        self.session_stats['tools_by_category'][category] += 1
        
        # Update tool-specific stats
        if tool_name not in self.usage_stats:
            self.usage_stats[tool_name] = {
                'total_uses': 0,
                'successful_uses': 0,
                'failed_uses': 0,
                'total_execution_time': 0.0,
                'average_execution_time': 0.0,
                'last_used': None,
                'agents_used_by': set()
            }
        
        stats = self.usage_stats[tool_name]
        stats['total_uses'] += 1
        stats['total_execution_time'] += execution_time
        stats['average_execution_time'] = stats['total_execution_time'] / stats['total_uses']
        stats['last_used'] = timestamp
        stats['agents_used_by'].add(f"{agent_name} (ID: {agent_id})")
        
        if success:
            stats['successful_uses'] += 1
        else:
            stats['failed_uses'] += 1
        
        # Log the event
        status_emoji = "✅" if success else "❌"
        logger.info(
            f"{status_emoji} TOOL USAGE | "
            f"Agent: {agent_name} (ID: {agent_id}) | "
            f"Tool: {tool_name} | "
            f"Category: {category} | "
            f"Time: {execution_time:.2f}s | "
            f"Result Size: {result_size} chars"
        )
    
    def log_session_summary(self):
        """Log a summary of tool usage for the current session."""
        session_duration = (datetime.now() - self.session_stats['session_start']).total_seconds()
        
        logger.info("=" * 80)
        logger.info("📊 TOOL USAGE SESSION SUMMARY")
        logger.info("=" * 80)
        logger.info(f"⏱️ Session Duration: {session_duration:.1f} seconds")
        logger.info(f"🔧 Total Tools Used: {self.session_stats['total_tools_used']}")
        logger.info(f"✅ Successful Executions: {self.session_stats['successful_executions']}")
        logger.info(f"❌ Failed Executions: {self.session_stats['failed_executions']}")
        
        if self.session_stats['total_tools_used'] > 0:
            success_rate = (self.session_stats['successful_executions'] / self.session_stats['total_tools_used']) * 100
            logger.info(f"📈 Success Rate: {success_rate:.1f}%")
        
        # Log tools by category
        if self.session_stats['tools_by_category']:
            logger.info("📋 Tools by Category:")
            for category, count in self.session_stats['tools_by_category'].items():
                logger.info(f"  • {category}: {count} uses")
        
        # Log top used tools
        if self.usage_stats:
            sorted_tools = sorted(
                self.usage_stats.items(), 
                key=lambda x: x[1]['total_uses'], 
                reverse=True
            )[:5]
            
            logger.info("🏆 Top Used Tools:")
            for tool_name, stats in sorted_tools:
                logger.info(
                    f"  • {tool_name}: {stats['total_uses']} uses "
                    f"(Success: {stats['successful_uses']}, "
                    f"Avg Time: {stats['average_execution_time']:.2f}s)"
                )
        
        logger.info("=" * 80)
    
    def get_tool_stats(self, tool_name: str) -> Dict[str, Any]:
        """Get statistics for a specific tool."""
        return self.usage_stats.get(tool_name, {})
    
    def get_session_stats(self) -> Dict[str, Any]:
        """Get current session statistics."""
        return self.session_stats.copy()


# Global tool usage tracker instance
tool_usage_tracker = ToolUsageTracker()