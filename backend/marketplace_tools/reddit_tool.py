"""
Reddit Tool

A tool for discovering trending content from Reddit for social media creation.
Provides Reddit API integration with content discovery, analysis, and formatting.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
import asyncpraw
from asyncpraw.models import Submission, Comment
import re

from .base import BaseTool

logger = logging.getLogger(__name__)

class RedditTool(BaseTool):
    """
    Reddit Tool for content discovery and social media creation.
    
    Features:
    - Subreddit monitoring and content discovery
    - Content analysis and engagement scoring
    - Social media formatting
    - Hashtag generation
    - Content filtering and quality assessment
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = "Reddit Content Discovery Tool"
        self.description = "Discover trending content from Reddit for social media creation"
        self.category = "Search"
        self.tool_type = "API"
        
        # Reddit API configuration
        self.client_id = config.get('client_id', '')
        self.client_secret = config.get('client_secret', '')
        self.user_agent = config.get('user_agent', 'RedditContentTool/1.0')
        self.username = config.get('username', '')
        self.password = config.get('password', '')
        
        # Default settings - minimal and flexible
        self.default_limit = config.get('limit', 15)
        self.default_sort = config.get('sort_by', 'hot')
        self.time_filter = config.get('time_filter', 'day')  # hour, day, week, month, year, all
        
        # Content filters - minimal filtering by default
        self.min_upvotes = config.get('min_upvotes', 0)  # No minimum by default
        self.max_upvotes = config.get('max_upvotes', 100000)  # Very high limit
        self.min_comments = config.get('min_comments', 0)  # No minimum by default
        self.max_age_hours = config.get('max_age_hours', 8760)  # 1 year - essentially no limit
        
        # Initialize Reddit instance
        self.reddit = None
        if self.client_id and self.client_secret:
            self._initialize_reddit()
    
    def get_config_schema(self) -> Dict[str, Any]:
        """Get the configuration schema for this tool"""
        return {
            "name": "Reddit Content Discovery Tool",
            "description": "Discover trending content from Reddit for social media creation",
            "parameters": {
                "client_id": {
                    "type": "string",
                    "description": "Reddit API client ID",
                    "required": True,
                    "sensitive": True
                },
                "client_secret": {
                    "type": "string", 
                    "description": "Reddit API client secret",
                    "required": True,
                    "sensitive": True
                },
                "user_agent": {
                    "type": "string",
                    "description": "User agent string for Reddit API requests",
                    "default": "RedditContentTool/1.0"
                },
                "username": {
                    "type": "string",
                    "description": "Reddit username (optional, for user-specific actions)",
                    "required": False,
                    "sensitive": True
                },
                "password": {
                    "type": "string",
                    "description": "Reddit password (optional, for user-specific actions)",
                    "required": False,
                    "sensitive": True
                },
                "limit": {
                    "type": "integer",
                    "description": "Default number of posts to retrieve",
                    "default": 15,
                    "min": 1,
                    "max": 100
                },
                "sort_by": {
                    "type": "string",
                    "description": "Default sort method for posts",
                    "enum": ["hot", "new", "top", "rising"],
                    "default": "hot"
                },
                "time_filter": {
                    "type": "string",
                    "description": "Time filter for top posts",
                    "enum": ["hour", "day", "week", "month", "year", "all"],
                    "default": "day"
                },
                "min_upvotes": {
                    "type": "integer",
                    "description": "Minimum upvotes filter",
                    "default": 0,
                    "min": 0
                },
                "max_upvotes": {
                    "type": "integer",
                    "description": "Maximum upvotes filter",
                    "default": 100000,
                    "min": 1
                },
                "min_comments": {
                    "type": "integer",
                    "description": "Minimum comments filter",
                    "default": 0,
                    "min": 0
                },
                "max_age_hours": {
                    "type": "integer",
                    "description": "Maximum age of posts in hours",
                    "default": 8760,
                    "min": 1
                }
            },
            "capabilities": [
                "subreddit_monitoring",
                "content_discovery",
                "engagement_analysis",
                "social_media_formatting",
                "hashtag_generation",
                "content_filtering"
            ],
            "config_fields": [
                {
                    "name": "client_id",
                    "type": "text",
                    "label": "Reddit Client ID",
                    "description": "Your Reddit API client ID from reddit.com/prefs/apps",
                    "required": True,
                    "sensitive": True
                },
                {
                    "name": "client_secret",
                    "type": "text",
                    "label": "Reddit Client Secret",
                    "description": "Your Reddit API client secret from reddit.com/prefs/apps",
                    "required": True,
                    "sensitive": True
                },
                {
                    "name": "user_agent",
                    "type": "text",
                    "label": "User Agent",
                    "description": "User agent string for API requests",
                    "default": "RedditContentTool/1.0",
                    "required": False
                },
                {
                    "name": "username",
                    "type": "text",
                    "label": "Reddit Username",
                    "description": "Your Reddit username (optional, for user-specific actions)",
                    "required": False,
                    "sensitive": True
                },
                {
                    "name": "password",
                    "type": "password",
                    "label": "Reddit Password",
                    "description": "Your Reddit password (optional, for user-specific actions)",
                    "required": False,
                    "sensitive": True
                },
                {
                    "name": "limit",
                    "type": "number",
                    "label": "Default Post Limit",
                    "description": "Default number of posts to retrieve",
                    "default": 15,
                    "min": 1,
                    "max": 100,
                    "required": False
                },
                {
                    "name": "sort_by",
                    "type": "select",
                    "label": "Default Sort Method",
                    "description": "Default sort method for posts",
                    "options": ["hot", "new", "top", "rising"],
                    "default": "hot",
                    "required": False
                },
                {
                    "name": "time_filter",
                    "type": "select",
                    "label": "Default Time Filter",
                    "description": "Time filter for top posts",
                    "options": ["hour", "day", "week", "month", "year", "all"],
                    "default": "day",
                    "required": False
                },
                {
                    "name": "min_upvotes",
                    "type": "number",
                    "label": "Minimum Upvotes",
                    "description": "Minimum upvotes filter",
                    "default": 0,
                    "min": 0,
                    "required": False
                },
                {
                    "name": "max_upvotes",
                    "type": "number",
                    "label": "Maximum Upvotes",
                    "description": "Maximum upvotes filter",
                    "default": 100000,
                    "min": 1,
                    "required": False
                },
                {
                    "name": "min_comments",
                    "type": "number",
                    "label": "Minimum Comments",
                    "description": "Minimum comments filter",
                    "default": 0,
                    "min": 0,
                    "required": False
                },
                {
                    "name": "max_age_hours",
                    "type": "number",
                    "label": "Maximum Age (Hours)",
                    "description": "Maximum age of posts in hours",
                    "default": 8760,
                    "min": 1,
                    "required": False
                }
            ]
        }
    
    def _initialize_reddit(self):
        """Initialize Reddit API client."""
        try:
            # For script apps, we only need client_id and client_secret
            # Username and password are optional and only needed for user-specific actions
            reddit_config = {
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'user_agent': self.user_agent
            }
            
            # Only add username/password if they're provided and not placeholder values
            if (self.username and self.username != 'YOUR_REDDIT_USERNAME' and 
                self.password and self.password != 'YOUR_REDDIT_PASSWORD'):
                reddit_config['username'] = self.username
                reddit_config['password'] = self.password
            
            self.reddit = asyncpraw.Reddit(**reddit_config)
            
            # Test connection - for script apps, we can't call user.me() without username/password
            # Instead, let's try to access a public subreddit to test the connection
            test_subreddit = self.reddit.subreddit('test')
            # This will raise an exception if the credentials are invalid
            _ = test_subreddit.display_name
            
            logger.info("Reddit API initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Reddit API: {str(e)}")
            self.reddit = None
    
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute Reddit content discovery.
        
        Args:
            subreddit: Subreddit name to search (required)
            sort_by: Sort method (hot, new, top, rising) (optional)
            limit: Number of posts to retrieve (optional)
            time_filter: Time filter for top posts (hour, day, week, month, year, all) (optional)
            content_type: Type of content to find (questions, stories, facts, discussions) (optional)
            min_upvotes: Minimum upvotes filter (optional)
            max_upvotes: Maximum upvotes filter (optional)
            min_comments: Minimum comments filter (optional)
            max_age_hours: Maximum age in hours (optional)
            format_for: Platform to format for (twitter, instagram, tiktok) (optional)
            include_hashtags: Whether to include hashtag suggestions (optional)
            
        Returns:
            Dictionary containing discovered content and metadata
        """
        if not self.reddit:
            return self._format_error("Reddit API not initialized. Please check your credentials.")
        
        # Check if we should use smart parameters
        user_query = kwargs.get('user_query', '') or kwargs.get('query', '') or kwargs.get('search_query', '')
        if user_query and not kwargs.get('subreddit'):
            # Use smart parameter generation when user query is provided
            logger.info(f"🧠 Using smart parameters for query: {user_query}")
            smart_params = self.get_smart_parameters(user_query)
            # Merge smart parameters with any provided kwargs
            for key, value in smart_params.items():
                if key not in kwargs:
                    kwargs[key] = value
        
        subreddit_name = kwargs.get('subreddit', '')
        if not subreddit_name:
            # If no subreddit is specified, try to use smart parameters
            if user_query:
                logger.info(f"🧠 No subreddit specified, using smart parameters for query: {user_query}")
                smart_params = self.get_smart_parameters(user_query)
                subreddit_name = smart_params['subreddit']
                # Update kwargs with smart parameters
                for key, value in smart_params.items():
                    if key not in kwargs:
                        kwargs[key] = value
                logger.info(f"🎯 Smart subreddit selected: r/{subreddit_name}")
            else:
                return self._format_error("Subreddit parameter is required")
        
        # Always use our smart defaults - ignore AI's restrictive parameters
        sort_by = kwargs.get('sort_by', self.default_sort)
        limit = self.default_limit  # Always use our default (20)
        time_filter = kwargs.get('time_filter', self.time_filter)
        content_type = 'all'  # Always use 'all' to get maximum content
        min_upvotes = self.min_upvotes  # Always use our default (0)
        max_upvotes = self.max_upvotes  # Always use our default (100000)
        min_comments = self.min_comments  # Always use our default (0)
        max_age_hours = self.max_age_hours  # Always use our default (8760)
        format_for = kwargs.get('format_for', 'twitter')
        include_hashtags = kwargs.get('include_hashtags', True)
        
        logger.info(f"🎯 Using smart defaults: limit={limit}, content_type={content_type}, min_upvotes={min_upvotes}, max_upvotes={max_upvotes}, max_age_hours={max_age_hours}")
        
        try:
            # Get posts from subreddit
            posts = await self._get_subreddit_posts(
                subreddit_name, sort_by, limit, time_filter
            )
            
            if not posts:
                return self._format_error(f"No posts found in r/{subreddit_name}")
            
            # Filter posts based on criteria
            filtered_posts = self._filter_posts(
                posts, min_upvotes, max_upvotes, min_comments, max_age_hours
            )
            
            logger.info(f"📊 Found {len(posts)} total posts, {len(filtered_posts)} after basic filtering")
            
            if not filtered_posts:
                return self._format_error("No posts match the specified criteria")
            
            # Analyze and format content
            formatted_content = []
            content_type_matches = 0
            for i, post in enumerate(filtered_posts):
                logger.info(f"🔄 Processing post {i+1}/{len(filtered_posts)}: {post.title[:50]}...")
                content_data = await self._analyze_and_format_post(
                    post, content_type, format_for, include_hashtags
                )
                if content_data:
                    formatted_content.append(content_data)
                    content_type_matches += 1
                    logger.info(f"✅ Added post {i+1} to results. Total results: {len(formatted_content)}")
                else:
                    logger.info(f"❌ Post {i+1} was not added to results")
            
            logger.info(f"📊 Content type filtering: {content_type_matches} posts matched '{content_type}' type")
            logger.info(f"📊 Final formatted_content list length: {len(formatted_content)}")
            
            metadata = {
                'subreddit': subreddit_name,
                'sort_by': sort_by,
                'time_filter': time_filter,
                'total_posts_found': len(posts),
                'filtered_posts': len(filtered_posts),
                'formatted_content': len(formatted_content),
                'filters_applied': {
                    'min_upvotes': min_upvotes,
                    'max_upvotes': max_upvotes,
                    'min_comments': min_comments,
                    'max_age_hours': max_age_hours
                }
            }
            
            return self._format_success(formatted_content, metadata)
            
        except Exception as e:
            logger.error(f"Reddit tool error: {str(e)}")
            return self._format_error(f"Reddit search failed: {str(e)}")

    async def execute_with_fallback(self, user_query: str, min_results: int = 3) -> Dict[str, Any]:
        """Execute Reddit search with fallback to multiple subreddits if needed."""
        try:
            # Get smart parameters
            smart_params = self.get_smart_parameters(user_query)
            all_results = []
            tried_subreddits = []
            
            # Try primary subreddit
            primary_subreddit = smart_params['subreddit']
            logger.info(f"🎯 Trying primary subreddit: r/{primary_subreddit}")
            
            result = await self.execute(**smart_params)
            if result.get('success') and result.get('result'):
                all_results.extend(result['result'])
                tried_subreddits.append(primary_subreddit)
                logger.info(f"✅ Found {len(result['result'])} results from r/{primary_subreddit}")
            
            # Try fallback subreddits if we don't have enough results
            fallback_subreddits = smart_params.get('fallback_subreddits', [])
            for subreddit in fallback_subreddits:
                if len(all_results) >= min_results:
                    break
                    
                logger.info(f"🔄 Trying fallback subreddit: r/{subreddit}")
                fallback_params = smart_params.copy()
                fallback_params['subreddit'] = subreddit
                
                result = await self.execute(**fallback_params)
                if result.get('success') and result.get('result'):
                    all_results.extend(result['result'])
                    tried_subreddits.append(subreddit)
                    logger.info(f"✅ Found {len(result['result'])} additional results from r/{subreddit}")
            
            # Limit to reasonable number of results
            final_results = all_results[:10]
            
            metadata = {
                'total_results': len(final_results),
                'tried_subreddits': tried_subreddits,
                'primary_subreddit': primary_subreddit,
                'fallback_used': len(tried_subreddits) > 1,
                'user_query': user_query,
                'smart_reasoning': smart_params.get('reasoning', '')
            }
            
            if final_results:
                return self._format_success(final_results, metadata)
            else:
                return self._format_error(f"No stories found in any of the tried subreddits: {tried_subreddits}")
                
        except Exception as e:
            logger.error(f"Reddit tool fallback error: {str(e)}")
            return self._format_error(f"Reddit search with fallback failed: {str(e)}")

    def get_smart_parameters(self, user_query: str) -> Dict[str, Any]:
        """Generate smart parameters based on user query."""
        query_lower = user_query.lower()
        
        # Detect content type from user query
        content_type = 'all'
        if any(word in query_lower for word in ['story', 'stories', 'happened', 'experience', 'told']):
            content_type = 'stories'
        elif any(word in query_lower for word in ['question', 'ask', 'what', 'why', 'how', '?']):
            content_type = 'questions'
        elif any(word in query_lower for word in ['fact', 'learned', 'discovered', 'interesting']):
            content_type = 'facts'
        elif any(word in query_lower for word in ['opinion', 'discuss', 'debate', 'think']):
            content_type = 'discussions'
        
        # Get smart subreddit suggestions
        suggestions = self._get_smart_subreddit_suggestions(user_query, content_type)
        
        # Use the top suggestion or default to AskReddit
        best_subreddit = 'AskReddit'
        if suggestions['suggestions']:
            best_subreddit = suggestions['suggestions'][0]['subreddit']
        
        return {
            'subreddit': best_subreddit,
            'content_type': content_type,
            'sort_by': 'hot',
            'limit': 20,  # Increased to get more content
            'time_filter': 'day',
            'min_upvotes': 0,  # No minimum upvotes
            'max_upvotes': 100000,  # Very high limit
            'min_comments': 0,  # No minimum comments
            'max_age_hours': 8760,  # 1 year - essentially no age limit
            'format_for': 'twitter',
            'include_hashtags': True,
            'suggestions': suggestions,
            'reasoning': f"Selected r/{best_subreddit} for {content_type} content based on query analysis",
            'fallback_subreddits': [s['subreddit'] for s in suggestions['suggestions'][1:3]]  # Top 2 alternatives
        }
    
    async def _get_subreddit_posts(self, subreddit_name: str, sort_by: str, limit: int, time_filter: str) -> List[Submission]:
        """Get posts from a subreddit."""
        try:
            subreddit = self.reddit.subreddit(subreddit_name)
            logger.info(f"🔍 Accessing subreddit: r/{subreddit_name}")
            
            if sort_by == 'hot':
                posts = list(subreddit.hot(limit=limit))
            elif sort_by == 'new':
                posts = list(subreddit.new(limit=limit))
            elif sort_by == 'top':
                posts = list(subreddit.top(limit=limit, time_filter=time_filter))
            elif sort_by == 'rising':
                posts = list(subreddit.rising(limit=limit))
            else:
                posts = list(subreddit.hot(limit=limit))
            
            logger.info(f"📊 Retrieved {len(posts)} posts from r/{subreddit_name} using {sort_by} sort")
            if posts:
                logger.info(f"📝 First post title: {posts[0].title[:100]}...")
                logger.info(f"📊 First post score: {posts[0].score}, comments: {posts[0].num_comments}")
            
            return posts
            
        except Exception as e:
            logger.error(f"Error getting posts from r/{subreddit_name}: {str(e)}")
            return []
    
    def _filter_posts(self, posts: List[Submission], min_upvotes: int, max_upvotes: int, 
                     min_comments: int, max_age_hours: int) -> List[Submission]:
        """Filter posts based on criteria - minimal and flexible filtering."""
        filtered = []
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
        
        for post in posts:
            # Only apply upvote filter if user specifically requested it (min_upvotes > 0)
            if min_upvotes > 0 and post.score < min_upvotes:
                logger.info(f"❌ Post filtered by upvotes: {post.score} (min: {min_upvotes})")
                continue
            
            # Only apply max upvote filter if it's reasonable (not 100000+)
            if max_upvotes < 100000 and post.score > max_upvotes:
                logger.info(f"❌ Post filtered by max upvotes: {post.score} (max: {max_upvotes})")
                continue
            
            # Only apply comment filter if user specifically requested it (min_comments > 0)
            if min_comments > 0 and post.num_comments < min_comments:
                logger.info(f"❌ Post filtered by comments: {post.num_comments} (min: {min_comments})")
                continue
            
            # Only apply age filter if it's reasonable (not 1 year+)
            if max_age_hours < 8760:  # Less than 1 year
                post_time = datetime.utcfromtimestamp(post.created_utc)
                age_hours = (datetime.utcnow() - post_time).total_seconds() / 3600
                if post_time < cutoff_time:
                    logger.info(f"❌ Post filtered by age: {age_hours:.1f} hours old (max: {max_age_hours})")
                    continue
            
            # Skip stickied posts and ads (this is always applied)
            if post.stickied or (post.is_self is False and 'reddit.com' in post.url):
                logger.info(f"❌ Post filtered: stickied or ad")
                continue
            
            # Calculate age for logging
            post_time = datetime.utcfromtimestamp(post.created_utc)
            age_hours = (datetime.utcnow() - post_time).total_seconds() / 3600
            
            logger.info(f"✅ Post passed all filters: {post.title[:50]}... (score: {post.score}, comments: {post.num_comments}, age: {age_hours:.1f}h)")
            filtered.append(post)
        
        return filtered
    
    async def _analyze_and_format_post(self, post: Submission, content_type: str, 
                                     format_for: str, include_hashtags: bool) -> Optional[Dict[str, Any]]:
        """Analyze and format a Reddit post for social media."""
        try:
            logger.info(f"🔍 Analyzing post: {post.title[:50]}...")
            
            # Calculate engagement score
            engagement_score = self._calculate_engagement_score(post)
            
            # Determine content type
            detected_type = self._detect_content_type(post)
            logger.info(f"📊 Detected content type: {detected_type} for post: {post.title[:30]}...")
            
            # Filter by content type if specified
            if content_type != 'all' and detected_type != content_type:
                logger.info(f"❌ Content type mismatch: wanted '{content_type}', got '{detected_type}'")
                return None
            
            # Format content for platform
            formatted_content = self._format_for_platform(post, format_for, include_hashtags)
            
            # Get top comments for context
            top_comments = self._get_top_comments(post, 3)
            
            # Clean and validate the URL
            permalink = post.permalink
            if not permalink.startswith('/'):
                permalink = '/' + permalink
            reddit_url = f"https://www.reddit.com{permalink}"
            
            logger.info(f"🔗 Generated Reddit URL: {reddit_url}")
            
            result = {
                'id': post.id,
                'title': post.title,
                'content': post.selftext[:500] if post.selftext else '',
                'url': reddit_url,
                'subreddit': str(post.subreddit),
                'author': str(post.author) if post.author else '[deleted]',
                'score': post.score,
                'upvote_ratio': post.upvote_ratio,
                'num_comments': post.num_comments,
                'created_utc': post.created_utc,
                'engagement_score': engagement_score,
                'content_type': detected_type,
                'formatted_content': formatted_content,
                'top_comments': top_comments,
                'hashtags': self._generate_hashtags(post) if include_hashtags else [],
                'platform_specific': self._get_platform_specific_format(post, format_for)
            }
            
            logger.info(f"✅ Successfully formatted post: {post.title[:30]}...")
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing post {post.id}: {str(e)}")
            return None
    
    def _calculate_engagement_score(self, post: Submission) -> float:
        """Calculate engagement score for a post."""
        try:
            # Base score from upvotes
            base_score = post.score
            
            # Bonus for high upvote ratio
            ratio_bonus = post.upvote_ratio * 10
            
            # Bonus for comments (engagement)
            comment_bonus = min(post.num_comments * 0.5, 50)
            
            # Age penalty (newer posts get slight bonus)
            age_hours = (datetime.utcnow().timestamp() - post.created_utc) / 3600
            age_penalty = max(0, age_hours * 0.1)
            
            total_score = base_score + ratio_bonus + comment_bonus - age_penalty
            return round(total_score, 2)
            
        except Exception as e:
            logger.error(f"Error calculating engagement score: {str(e)}")
            return 0.0
    
    def _get_smart_subreddit_suggestions(self, user_query: str, content_type: str) -> Dict[str, Any]:
        """Intelligently suggest subreddits based on user query and content type."""
        
        # Comprehensive subreddit database with metadata
        subreddit_database = {
            # Story-focused subreddits
            'stories': {
                'tifu': {
                    'name': 'Today I Fucked Up',
                    'description': 'Personal stories of mistakes and mishaps',
                    'keywords': ['mistake', 'accident', 'wrong', 'screw up', 'embarrassing', 'regret'],
                    'content_types': ['stories'],
                    'engagement': 'high'
                },
                'confession': {
                    'name': 'Confession',
                    'description': 'Personal confessions and secrets',
                    'keywords': ['confession', 'secret', 'guilty', 'admit', 'truth'],
                    'content_types': ['stories'],
                    'engagement': 'high'
                },
                'offmychest': {
                    'name': 'Off My Chest',
                    'description': 'Personal stories and rants',
                    'keywords': ['rant', 'vent', 'frustrated', 'angry', 'upset', 'personal'],
                    'content_types': ['stories', 'discussions'],
                    'engagement': 'high'
                },
                'relationships': {
                    'name': 'Relationships',
                    'description': 'Relationship advice and stories',
                    'keywords': ['relationship', 'boyfriend', 'girlfriend', 'marriage', 'dating', 'love'],
                    'content_types': ['stories', 'questions', 'discussions'],
                    'engagement': 'very_high'
                },
                'humansbeingbros': {
                    'name': 'Humans Being Bros',
                    'description': 'Heartwarming stories of human kindness',
                    'keywords': ['kind', 'helpful', 'good deed', 'wholesome', 'heartwarming', 'people', 'catchy'],
                    'content_types': ['stories'],
                    'engagement': 'high'
                },
                'entitledparents': {
                    'name': 'Entitled Parents',
                    'description': 'Stories about entitled parents',
                    'keywords': ['entitled', 'parent', 'karen', 'demanding', 'rude'],
                    'content_types': ['stories'],
                    'engagement': 'high'
                },
                'choosingbeggars': {
                    'name': 'Choosing Beggars',
                    'description': 'Stories about people who are choosy when asking for free things',
                    'keywords': ['choosy', 'beggar', 'free', 'demanding', 'rude', 'people'],
                    'content_types': ['stories'],
                    'engagement': 'high'
                },
                'prorevenge': {
                    'name': 'Pro Revenge',
                    'description': 'Professional-level revenge stories',
                    'keywords': ['revenge', 'pro', 'justice', 'karma', 'people'],
                    'content_types': ['stories'],
                    'engagement': 'high'
                },
                'pettyrevenge': {
                    'name': 'Petty Revenge',
                    'description': 'Small but satisfying revenge stories',
                    'keywords': ['petty', 'revenge', 'small', 'satisfying', 'people'],
                    'content_types': ['stories'],
                    'engagement': 'high'
                }
            },
            
            # Question-focused subreddits
            'questions': {
                'askreddit': {
                    'name': 'Ask Reddit',
                    'description': 'Open-ended questions and discussions',
                    'keywords': ['ask', 'question', 'what', 'why', 'how', 'opinion'],
                    'content_types': ['questions', 'stories', 'discussions'],
                    'engagement': 'very_high'
                },
                'explainlikeimfive': {
                    'name': 'Explain Like I\'m Five',
                    'description': 'Simple explanations of complex topics',
                    'keywords': ['explain', 'simple', 'understand', 'how does', 'what is'],
                    'content_types': ['questions', 'facts'],
                    'engagement': 'high'
                },
                'nostupidquestions': {
                    'name': 'No Stupid Questions',
                    'description': 'Safe space for any questions',
                    'keywords': ['question', 'ask', 'wonder', 'curious', 'help'],
                    'content_types': ['questions'],
                    'engagement': 'high'
                }
            },
            
            # Fact/Educational subreddits
            'facts': {
                'todayilearned': {
                    'name': 'Today I Learned',
                    'description': 'Interesting facts and discoveries',
                    'keywords': ['learned', 'fact', 'discovered', 'til', 'interesting'],
                    'content_types': ['facts'],
                    'engagement': 'high'
                },
                'mildlyinteresting': {
                    'name': 'Mildly Interesting',
                    'description': 'Mildly interesting things',
                    'keywords': ['interesting', 'mildly', 'unusual', 'different'],
                    'content_types': ['facts', 'stories'],
                    'engagement': 'medium'
                },
                'science': {
                    'name': 'Science',
                    'description': 'Scientific discussions and discoveries',
                    'keywords': ['science', 'research', 'study', 'scientific', 'discovery'],
                    'content_types': ['facts', 'discussions'],
                    'engagement': 'high'
                }
            },
            
            # Discussion-focused subreddits
            'discussions': {
                'unpopularopinion': {
                    'name': 'Unpopular Opinion',
                    'description': 'Controversial opinions and discussions',
                    'keywords': ['opinion', 'unpopular', 'controversial', 'disagree'],
                    'content_types': ['discussions'],
                    'engagement': 'very_high'
                },
                'changemyview': {
                    'name': 'Change My View',
                    'description': 'Debates and perspective changes',
                    'keywords': ['change', 'view', 'debate', 'convince', 'persuade'],
                    'content_types': ['discussions'],
                    'engagement': 'high'
                }
            }
        }
        
        # Score subreddits based on user query
        query_lower = user_query.lower()
        scored_subreddits = []
        
        for category, subreddits in subreddit_database.items():
            for subreddit_name, metadata in subreddits.items():
                score = 0
                
                # Content type match
                if content_type in metadata['content_types'] or content_type == 'all':
                    score += 10
                
                # Keyword matching
                for keyword in metadata['keywords']:
                    if keyword in query_lower:
                        score += 5
                
                # Engagement bonus
                if metadata['engagement'] == 'very_high':
                    score += 3
                elif metadata['engagement'] == 'high':
                    score += 2
                elif metadata['engagement'] == 'medium':
                    score += 1
                
                if score > 0:
                    scored_subreddits.append({
                        'subreddit': subreddit_name,
                        'score': score,
                        'metadata': metadata
                    })
        
        # Sort by score and return top suggestions
        scored_subreddits.sort(key=lambda x: x['score'], reverse=True)
        return {
            'suggestions': scored_subreddits[:5],  # Top 5 suggestions
            'total_found': len(scored_subreddits)
        }

    def _detect_content_type(self, post: Submission) -> str:
        """Detect the type of content in a post using subreddit context."""
        subreddit_name = str(post.subreddit).lower()
        
        # Use subreddit-specific content type detection
        subreddit_content_map = {
            'tifu': 'stories',
            'confession': 'stories', 
            'offmychest': 'stories',
            'humansbeingbros': 'stories',
            'entitledparents': 'stories',
            'askreddit': 'questions',
            'explainlikeimfive': 'questions',
            'nostupidquestions': 'questions',
            'todayilearned': 'facts',
            'mildlyinteresting': 'facts',
            'science': 'facts',
            'unpopularopinion': 'discussions',
            'changemyview': 'discussions'
        }
        
        # If subreddit has a clear content type, use it
        if subreddit_name in subreddit_content_map:
            return subreddit_content_map[subreddit_name]
        
        # Fallback to keyword detection for unknown subreddits
        title_lower = post.title.lower()
        content_lower = (post.selftext or '').lower()
        combined_text = f"{title_lower} {content_lower}"
        
        # Simple keyword detection
        if '?' in post.title or any(word in combined_text for word in ['what', 'why', 'how', 'when', 'where', 'who']):
            return 'questions'
        elif any(word in combined_text for word in ['story', 'happened', 'experience', 'told']):
            return 'stories'
        elif any(word in combined_text for word in ['fact', 'learned', 'discovered']):
            return 'facts'
        elif any(word in combined_text for word in ['opinion', 'think', 'believe', 'discuss']):
            return 'discussions'
        
        return 'general'
    
    def _format_for_platform(self, post: Submission, platform: str, include_hashtags: bool) -> Dict[str, str]:
        """Format content for specific social media platforms."""
        base_content = {
            'title': post.title,
            'summary': self._create_summary(post),
            'url': f"https://www.reddit.com{post.permalink}"
        }
        
        if platform == 'twitter':
            return self._format_for_twitter(post, base_content, include_hashtags)
        elif platform == 'instagram':
            return self._format_for_instagram(post, base_content, include_hashtags)
        elif platform == 'tiktok':
            return self._format_for_tiktok(post, base_content, include_hashtags)
        else:
            return base_content
    
    def _format_for_twitter(self, post: Submission, base_content: Dict[str, str], include_hashtags: bool) -> Dict[str, str]:
        """Format content for Twitter."""
        hashtags = self._generate_hashtags(post) if include_hashtags else []
        hashtag_text = ' '.join(hashtags[:3])  # Limit to 3 hashtags for Twitter
        
        # Twitter character limit considerations
        max_length = 280
        available_length = max_length - len(hashtag_text) - 3  # 3 for spaces
        
        if len(base_content['summary']) > available_length:
            summary = base_content['summary'][:available_length-3] + "..."
        else:
            summary = base_content['summary']
        
        return {
            'tweet': f"{summary} {hashtag_text}".strip(),
            'thread_starter': f"Reddit is discussing: {post.title}",
            'poll_question': f"What's your take on this: {post.title[:100]}...?"
        }
    
    def _format_for_instagram(self, post: Submission, base_content: Dict[str, str], include_hashtags: bool) -> Dict[str, str]:
        """Format content for Instagram."""
        hashtags = self._generate_hashtags(post) if include_hashtags else []
        hashtag_text = '\n'.join(hashtags)
        
        return {
            'caption': f"{base_content['summary']}\n\n{hashtag_text}",
            'story_text': f"Reddit says: {post.title}",
            'carousel_title': f"Reddit Discussion: {post.title[:50]}..."
        }
    
    def _format_for_tiktok(self, post: Submission, base_content: Dict[str, str], include_hashtags: bool) -> Dict[str, str]:
        """Format content for TikTok."""
        hashtags = self._generate_hashtags(post) if include_hashtags else []
        hashtag_text = ' '.join(hashtags[:5])  # More hashtags for TikTok
        
        return {
            'script': f"Reddit is talking about: {post.title}",
            'hook': f"Reddit just dropped this hot take: {post.title[:60]}...",
            'hashtags': hashtag_text,
            'question': f"What do you think about this Reddit discussion?"
        }
    
    def _create_summary(self, post: Submission) -> str:
        """Create a summary of the post."""
        if post.selftext:
            # For text posts, use first 200 characters
            summary = post.selftext[:200]
            if len(post.selftext) > 200:
                summary += "..."
        else:
            # For link posts, use title
            summary = post.title
        
        return summary
    
    def _get_top_comments(self, post: Submission, limit: int = 3) -> List[Dict[str, Any]]:
        """Get top comments from a post."""
        try:
            comments = []
            post.comments.replace_more(limit=0)  # Load all comments
            
            for comment in post.comments[:limit]:
                if hasattr(comment, 'body') and comment.body != '[deleted]':
                    comments.append({
                        'author': str(comment.author) if comment.author else '[deleted]',
                        'body': comment.body[:200] + "..." if len(comment.body) > 200 else comment.body,
                        'score': comment.score,
                        'created_utc': comment.created_utc
                    })
            
            return comments
            
        except Exception as e:
            logger.error(f"Error getting comments: {str(e)}")
            return []
    
    def _generate_hashtags(self, post: Submission) -> List[str]:
        """Generate relevant hashtags for the post."""
        hashtags = []
        
        # Subreddit-based hashtags
        subreddit = str(post.subreddit).lower()
        hashtags.append(f"#{subreddit}")
        
        # Content-based hashtags
        title_words = re.findall(r'\b\w+\b', post.title.lower())
        common_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'}
        
        for word in title_words:
            if len(word) > 3 and word not in common_words:
                hashtags.append(f"#{word}")
                if len(hashtags) >= 8:  # Limit hashtags
                    break
        
        # Add some generic Reddit hashtags
        hashtags.extend(['#reddit', '#viral', '#trending'])
        
        return hashtags[:10]  # Return max 10 hashtags
    
    def _get_platform_specific_format(self, post: Submission, platform: str) -> Dict[str, Any]:
        """Get platform-specific formatting options."""
        if platform == 'twitter':
            return {
                'character_count': len(post.title),
                'thread_potential': len(post.selftext) > 280 if post.selftext else False,
                'poll_options': self._generate_poll_options(post)
            }
        elif platform == 'instagram':
            return {
                'visual_elements': self._suggest_visual_elements(post),
                'story_templates': self._get_story_templates(post)
            }
        elif platform == 'tiktok':
            return {
                'video_ideas': self._generate_video_ideas(post),
                'trending_sounds': self._suggest_trending_sounds(post)
            }
        
        return {}
    
    def _generate_poll_options(self, post: Submission) -> List[str]:
        """Generate poll options for Twitter."""
        if '?' in post.title:
            return [
                "Yes",
                "No", 
                "Maybe",
                "Need more info"
            ]
        return [
            "Agree",
            "Disagree",
            "Neutral",
            "Interesting"
        ]
    
    def _suggest_visual_elements(self, post: Submission) -> List[str]:
        """Suggest visual elements for Instagram."""
        elements = ["Quote card", "Infographic", "Story highlight"]
        
        if '?' in post.title:
            elements.append("Question sticker")
        if post.num_comments > 50:
            elements.append("Discussion highlight")
        
        return elements
    
    def _generate_video_ideas(self, post: Submission) -> List[str]:
        """Generate video ideas for TikTok."""
        ideas = [
            "React to this Reddit post",
            "Share your opinion",
            "Tell a related story"
        ]
        
        if '?' in post.title:
            ideas.append("Answer the question")
        
        return ideas
    
    def _suggest_trending_sounds(self, post: Submission) -> List[str]:
        """Suggest trending sounds for TikTok."""
        return [
            "Trending discussion sound",
            "Opinion sharing sound",
            "Story time sound"
        ]