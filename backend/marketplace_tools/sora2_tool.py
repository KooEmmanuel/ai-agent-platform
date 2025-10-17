"""
Sora2 Video Generation Tool

This tool integrates with OpenAI's Sora2 API to generate videos from text prompts
and stores the generated videos in blob storage.
"""

import asyncio
import json
import logging
import os
import tempfile
from typing import Any, Dict, Optional
from datetime import datetime
import aiohttp
import requests
from openai import AsyncOpenAI
from vercel_blob import put

from .base import BaseTool

logger = logging.getLogger(__name__)


class Sora2Tool(BaseTool):
    """Tool for generating videos using OpenAI's Sora2 API"""
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config or {})
        self.name = "sora2_video_generator"
        self.description = "Generate high-quality videos from text prompts using OpenAI's Sora2 API. Requires OPENAI_API_KEY environment variable."
        self.category = "Video Generation"
        self.tool_type = "sora2_video_generator"
        
        # Initialize OpenAI client (will be created when needed)
        self.openai_client = None
        
        self.schema = {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "description": "Action to perform",
                    "enum": ["generate_video", "check_status", "get_video"],
                    "default": "generate_video"
                },
                "prompt": {
                    "type": "string",
                    "description": "Text prompt describing the video to generate (required for generate_video action)"
                },
                "video_id": {
                    "type": "string",
                    "description": "Video ID to check status or retrieve (required for check_status and get_video actions)"
                },
                "seconds": {
                    "type": "string",
                    "description": "Duration of the video in seconds",
                    "enum": ["4", "8", "12"],
                    "default": "4"
                },
                        "size": {
                            "type": "string",
                            "description": "Output resolution formatted as width x height",
                            "enum": ["720x1280", "1280x720", "1024x1024"],
                            "default": "720x1280"
                        },
                "style": {
                    "type": "string",
                    "description": "Visual style of the video",
                    "enum": ["realistic", "animated", "cinematic", "documentary"],
                    "default": "realistic"
                },
                "quality": {
                    "type": "string",
                    "description": "Quality of the generated video",
                    "enum": ["standard", "hd"],
                    "default": "standard"
                },
                "filename": {
                    "type": "string",
                    "description": "Filename for the generated video",
                    "default": "generated_video.mp4"
                }
            },
            "required": ["prompt"]
        }

    def _get_openai_client(self) -> AsyncOpenAI:
        """Get or create OpenAI client"""
        if self.openai_client is None:
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable is required")
            self.openai_client = AsyncOpenAI(api_key=api_key)
        return self.openai_client

    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute video operations with given parameters.
        
        Args:
            **kwargs: Tool parameters including action, prompt, video_id, etc.
            
        Returns:
            Dict containing the result of the video operation
        """
        try:
            action = kwargs.get('action', 'generate_video')
            
            if action == 'generate_video':
                return await self._handle_generate_video(kwargs)
            elif action == 'check_status':
                return await self._handle_check_status(kwargs)
            elif action == 'get_video':
                return await self._handle_get_video(kwargs)
            else:
                return {
                    "success": False,
                    "error": f"Unknown action: {action}. Supported actions: generate_video, check_status, get_video"
                }
            
        except Exception as e:
            logger.error(f"❌ [SORA2] Error executing action: {str(e)}")
            return {
                "success": False,
                "error": f"Video operation failed: {str(e)}"
            }

    async def _handle_generate_video(self, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Handle video generation"""
        # Extract parameters
        prompt = kwargs.get('prompt')
        seconds = kwargs.get('seconds', '4')
        size = kwargs.get('size', '720x1280')
        style = kwargs.get('style', 'realistic')
        quality = kwargs.get('quality', 'standard')
        filename = kwargs.get('filename', 'generated_video.mp4')
        
        if not prompt:
            return {
                "success": False,
                "error": "Prompt is required for video generation"
            }
        
        # Validate seconds parameter
        valid_seconds = ['4', '8', '12']
        if seconds not in valid_seconds:
            return {
                "success": False,
                "error": f"Invalid seconds value: '{seconds}'. Supported values are: {', '.join(valid_seconds)}"
            }
        
        logger.info(f"🎬 [SORA2] Generating video with prompt: {prompt[:100]}...")
        
        # Generate video using OpenAI Sora2 API
        video_result = await self._generate_video(
            prompt=prompt,
            seconds=seconds,
            size=size,
            style=style,
            quality=quality
        )
        
        if not video_result.get('success'):
            return video_result
        
        # Check if we have video data to upload
        if video_result.get('video_data') is None:
            # Video is being processed asynchronously
            return {
                "success": True,
                "message": "Video generation job created successfully. The video will be processed asynchronously.",
                "video_job_id": video_result.get('video_job_id'),
                "status": video_result.get('status'),
                "filename": filename,
                "seconds": seconds,
                "size": size,
                "style": style,
                "quality": quality,
                "prompt": prompt
            }
        
        # Upload to blob storage if we have video data
        blob_url = await self._upload_to_blob(
            video_data=video_result['video_data'],
            filename=filename
        )
        
        if not blob_url:
            return {
                "success": False,
                "error": "Failed to upload video to blob storage"
            }
        
        return {
            "success": True,
            "message": "Video generated and uploaded successfully",
            "video_url": blob_url,
            "filename": filename,
            "seconds": seconds,
            "size": size,
            "style": style,
            "quality": quality,
            "prompt": prompt
        }

    async def _handle_check_status(self, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Handle video status checking"""
        video_id = kwargs.get('video_id')
        
        if not video_id:
            return {
                "success": False,
                "error": "video_id is required to check status"
            }
        
        logger.info(f"🔍 [SORA2] Checking status of video: {video_id}")
        return await self._check_video_status(video_id)

    async def _handle_get_video(self, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Handle getting completed video"""
        video_id = kwargs.get('video_id')
        
        if not video_id:
            return {
                "success": False,
                "error": "video_id is required to get video"
            }
        
        logger.info(f"📥 [SORA2] Getting completed video: {video_id}")
        return await self._get_completed_video(video_id)

    async def _generate_video(
        self,
        prompt: str,
        seconds: str,
        size: str,
        style: str,
        quality: str
    ) -> Dict[str, Any]:
        """Generate video using OpenAI Sora2 API"""
        try:
            # Check if Sora2 API is available
            openai_client = self._get_openai_client()
            
            # Check if videos API is available
            if not hasattr(openai_client, 'videos'):
                logger.warning("🎬 [SORA2] Videos API not available in current OpenAI client")
                return {
                    "success": False,
                    "error": "Sora2 video generation API is not yet available in the current OpenAI client. Please check for updates or use a different video generation service."
                }
            
            # Prepare the request payload
            payload = {
                "prompt": prompt,
                "seconds": seconds,
                "size": size
            }
            
            logger.info(f"🎬 [SORA2] Calling OpenAI API with payload: {payload}")
            
            # Make the API call
            response = await openai_client.videos.create(
                prompt=prompt,
                seconds=seconds,
                size=size
            )
            
            # The response contains video job information, not the actual video
            # We need to wait for the video to be processed and then retrieve it
            logger.info(f"✅ [SORA2] Video job created successfully: {response.id}")
            logger.info(f"📊 [SORA2] Video status: {response.status}")
            
            # For now, return the job information
            # In a real implementation, you'd want to poll for completion
            return {
                "success": True,
                "video_job_id": response.id,
                "status": response.status,
                "message": "Video generation job created. The video will be processed asynchronously.",
                "video_data": None,  # No immediate video data available
                "video_url": None   # Will be available after processing
            }
                        
        except Exception as e:
            logger.error(f"❌ [SORA2] Error in video generation: {str(e)}")
            return {
                "success": False,
                "error": f"Video generation API error: {str(e)}"
            }

    async def _check_video_status(self, video_id: str) -> Dict[str, Any]:
        """Check the status of a video generation job"""
        try:
            openai_client = self._get_openai_client()
            
            # Retrieve video job status
            response = await openai_client.videos.retrieve(video_id)
            
            logger.info(f"📊 [SORA2] Video {video_id} status: {response.status}")
            
            return {
                "success": True,
                "video_id": video_id,
                "status": response.status,
                "progress": getattr(response, 'progress', 0),
                "created_at": getattr(response, 'created_at', None),
                "size": getattr(response, 'size', None),
                "seconds": getattr(response, 'seconds', None)
            }
            
        except Exception as e:
            logger.error(f"❌ [SORA2] Error checking video status: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to check video status: {str(e)}"
            }

    async def _get_completed_video(self, video_id: str) -> Dict[str, Any]:
        """Get the completed video and upload to blob storage"""
        try:
            openai_client = self._get_openai_client()
            
            # Retrieve video job
            response = await openai_client.videos.retrieve(video_id)
            logger.info(f"📊 [SORA2] Video {video_id} status: {response.status}")
            
            if response.status != "completed":
                return {
                    "success": False,
                    "error": f"Video is not completed yet. Current status: {response.status}"
                }
            
            # Download the video content directly
            try:
                logger.info(f"📥 [SORA2] Downloading video content for {video_id}")
                video_content = await openai_client.videos.download_content(video_id)
                # Read the content as bytes
                video_data = video_content.read()
                logger.info(f"✅ [SORA2] Downloaded video content, size: {len(video_data)} bytes")
            except Exception as e:
                logger.error(f"❌ [SORA2] Error downloading video content: {str(e)}")
                return {
                    "success": False,
                    "error": f"Failed to download video content: {str(e)}"
                }
            
            # Upload to blob storage
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            filename = f"sora2-video-{timestamp}-{video_id}.mp4"
            blob_url = await self._upload_to_blob(video_data, filename)
            
            if blob_url:
                logger.info(f"✅ [SORA2] Uploaded completed video to blob storage, size: {len(video_data)} bytes")
                
                # Ensure we never return internal OpenAI URLs
                if isinstance(blob_url, dict):
                    blob_url = blob_url.get('url', '')
                
                # Validate that it's a proper blob URL
                if not blob_url or 'blob.vercel-storage.com' not in blob_url:
                    logger.error(f"❌ [SORA2] Invalid blob URL returned: {blob_url}")
                    return {
                        "success": False,
                        "error": "Invalid blob storage URL returned"
                    }
                
                return {
                    "success": True,
                    "video_id": video_id,
                    "video_url": blob_url,
                    "filename": filename,
                    "size": len(video_data)
                }
            else:
                return {
                    "success": False,
                    "error": "Failed to upload video to blob storage"
                }
                        
        except Exception as e:
            logger.error(f"❌ [SORA2] Error getting completed video: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to get completed video: {str(e)}"
            }

    async def _upload_to_blob(self, video_data: bytes, filename: str) -> Optional[str]:
        """Upload video to blob storage"""
        try:
            # Get blob storage configuration
            blob_token = os.getenv('BLOB_READ_WRITE_TOKEN')
            if not blob_token:
                logger.error("❌ [SORA2] BLOB_READ_WRITE_TOKEN not found")
                return None
            
            # Generate a unique filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            name, ext = os.path.splitext(filename)
            unique_filename = f"sora2_videos/{name}_{timestamp}{ext}"
            
            logger.info(f"📤 [SORA2] Uploading video to blob storage: {unique_filename}")
            
            # Use the vercel_blob library
            blob_result = put(
                unique_filename, 
                video_data,
                {
                    "token": blob_token,
                    "addRandomSuffix": "true"
                }
            )
            
            # Extract the URL from the result
            blob_url = blob_result.get('url') if isinstance(blob_result, dict) else blob_result
            logger.info(f"✅ [SORA2] Video uploaded successfully: {blob_url}")
            return blob_url
                        
        except Exception as e:
            logger.error(f"❌ [SORA2] Error uploading to blob: {str(e)}")
            return None

    def get_tool_info(self) -> Dict[str, Any]:
        """Get tool information for agent integration."""
        return {
            'description': self.description,
            'parameters': self.schema
        }

    def get_name(self) -> str:
        """Get tool name"""
        return self.name

    def get_category(self) -> str:
        """Get tool category"""
        return self.category
