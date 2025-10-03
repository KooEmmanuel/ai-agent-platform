"""
YouTube Transcript Tool

This tool extracts transcripts from YouTube videos using the youtube-transcript-api library.
It supports multiple languages and can handle both auto-generated and manually created transcripts.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse, parse_qs
import re

from .base import BaseTool

logger = logging.getLogger(__name__)

class YouTubeTranscriptTool(BaseTool):
    """
    Tool for extracting transcripts from YouTube videos.
    
    Supports:
    - Multiple languages
    - Auto-generated and manual transcripts
    - Various YouTube URL formats
    - Timestamp information
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = "YouTube Transcript Extractor"
        self.description = "Extract transcripts from YouTube videos with support for multiple languages"
        self.category = "Content Analysis"
        self.tool_type = "Function"
        
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Extract transcript from a YouTube video.
        
        Args:
            video_url (str): YouTube video URL or video ID
            language (str, optional): Language code (e.g., 'en', 'es', 'fr'). Defaults to 'en'
            include_timestamps (bool, optional): Include timestamp information. Defaults to True
            format_output (str, optional): Output format ('json', 'text', 'srt'). Defaults to 'json'
            
        Returns:
            Dict containing transcript data and metadata
        """
        try:
            # Import here to avoid dependency issues if not installed
            from youtube_transcript_api import YouTubeTranscriptApi
            from youtube_transcript_api.formatters import TextFormatter, SRTFormatter
            from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound, VideoUnavailable
            
            video_url = kwargs.get('video_url', '')
            language = kwargs.get('language', 'en')
            include_timestamps = kwargs.get('include_timestamps', True)
            format_output = kwargs.get('format_output', 'json')
            
            if not video_url:
                return self._format_error("video_url is required")
            
            # Extract video ID from URL
            video_id = self._extract_video_id(video_url)
            if not video_id:
                return self._format_error("Invalid YouTube URL. Please provide a valid YouTube video URL.")
            
            logger.info(f"Extracting transcript for video ID: {video_id}")
            
            # Check if video is available and get transcript list
            try:
                transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                available_transcripts = list(transcript_list)
                logger.info(f"Found {len(available_transcripts)} available transcripts")
                
                if not available_transcripts:
                    return self._format_error("No transcripts are available for this video. The video may not have captions enabled.")
                
            except VideoUnavailable:
                return self._format_error("Video is unavailable or private. Cannot access transcripts.")
            except TranscriptsDisabled:
                return self._format_error("Transcripts are disabled for this video.")
            except Exception as e:
                logger.error(f"Error listing transcripts: {str(e)}")
                return self._format_error(f"Could not access video transcripts: {str(e)}")
            
            # Try to get transcript in requested language
            transcript = None
            actual_language = language
            
            try:
                if language == 'auto':
                    # Get the first available transcript
                    transcript = available_transcripts[0]
                    actual_language = transcript.language_code
                else:
                    # Try to find transcript in requested language
                    transcript = transcript_list.find_transcript([language])
                    actual_language = language
                    
            except NoTranscriptFound:
                logger.warning(f"Could not find transcript in language '{language}', trying fallback languages")
                # Try common fallback languages
                fallback_languages = ['en', 'en-US', 'en-GB']
                for fallback_lang in fallback_languages:
                    try:
                        transcript = transcript_list.find_transcript([fallback_lang])
                        actual_language = fallback_lang
                        logger.info(f"Found transcript in fallback language: {fallback_lang}")
                        break
                    except NoTranscriptFound:
                        continue
                
                # If still no transcript found, use the first available
                if transcript is None:
                    transcript = available_transcripts[0]
                    actual_language = transcript.language_code
                    logger.info(f"Using first available transcript in language: {actual_language}")
            
            # Fetch the transcript data
            try:
                transcript_data = transcript.fetch()
                logger.info(f"Successfully fetched transcript with {len(transcript_data)} entries")
                
                if not transcript_data:
                    return self._format_error("Transcript is empty. The video may not have proper captions.")
                
            except Exception as e:
                error_msg = str(e)
                if "no element found" in error_msg.lower():
                    return self._format_error("No transcripts are available for this video. The video may not have captions enabled or the captions may be empty.")
                else:
                    return self._format_error(f"Failed to fetch transcript data: {error_msg}")
            
            # Format the output
            if format_output == 'text':
                if include_timestamps:
                    formatted_text = self._format_with_timestamps(transcript_data)
                else:
                    formatter = TextFormatter()
                    formatted_text = formatter.format_transcript(transcript_data)
                
                return self._format_success({
                    'transcript': formatted_text,
                    'video_id': video_id,
                    'language': actual_language,
                    'format': 'text',
                    'word_count': len(formatted_text.split()),
                    'available_languages': [t.language_code for t in available_transcripts]
                })
            
            elif format_output == 'srt':
                formatter = SRTFormatter()
                srt_content = formatter.format_transcript(transcript_data)
                
                return self._format_success({
                    'transcript': srt_content,
                    'video_id': video_id,
                    'language': actual_language,
                    'format': 'srt',
                    'word_count': len(srt_content.split()),
                    'available_languages': [t.language_code for t in available_transcripts]
                })
            
            else:  # JSON format (default)
                return self._format_success({
                    'transcript': transcript_data,
                    'video_id': video_id,
                    'language': actual_language,
                    'format': 'json',
                    'word_count': sum(len(item['text'].split()) for item in transcript_data),
                    'duration_seconds': transcript_data[-1]['start'] + transcript_data[-1]['duration'] if transcript_data else 0,
                    'available_languages': [t.language_code for t in available_transcripts]
                })
                
        except Exception as e:
            logger.error(f"Unexpected error extracting YouTube transcript: {str(e)}")
            return self._format_error(f"Unexpected error: {str(e)}")
    
    def _extract_video_id(self, url: str) -> Optional[str]:
        """
        Extract video ID from various YouTube URL formats.
        
        Args:
            url: YouTube URL or video ID
            
        Returns:
            Video ID or None if invalid
        """
        # If it's already a video ID (11 characters)
        if len(url) == 11 and url.replace('-', '').replace('_', '').isalnum():
            return url
        
        # Common YouTube URL patterns
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
            r'youtube\.com\/v\/([^&\n?#]+)',
            r'youtube\.com\/embed\/([^&\n?#]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None
    
    def _format_with_timestamps(self, transcript_data: List[Dict]) -> str:
        """
        Format transcript with timestamps in readable format.
        
        Args:
            transcript_data: Raw transcript data from YouTube API
            
        Returns:
            Formatted transcript with timestamps
        """
        formatted_lines = []
        
        for item in transcript_data:
            start_time = self._format_timestamp(item['start'])
            text = item['text'].strip()
            formatted_lines.append(f"[{start_time}] {text}")
        
        return '\n'.join(formatted_lines)
    
    def _format_timestamp(self, seconds: float) -> str:
        """
        Convert seconds to MM:SS format.
        
        Args:
            seconds: Time in seconds
            
        Returns:
            Formatted timestamp string
        """
        minutes = int(seconds // 60)
        seconds = int(seconds % 60)
        return f"{minutes:02d}:{seconds:02d}"
    
    def get_tool_definition(self) -> Dict[str, Any]:
        """
        Get the tool definition for the AI agent.
        
        Returns:
            Tool definition dictionary
        """
        return {
            "type": "function",
            "function": {
                "name": "youtube_transcript",
                "description": "Extract transcripts from YouTube videos. Supports multiple languages and output formats.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "video_url": {
                            "type": "string",
                            "description": "YouTube video URL or video ID (e.g., 'https://www.youtube.com/watch?v=VIDEO_ID' or 'VIDEO_ID')"
                        },
                        "language": {
                            "type": "string",
                            "description": "Language code for transcript (e.g., 'en', 'es', 'fr'). Use 'auto' to get the first available transcript.",
                            "default": "en"
                        },
                        "include_timestamps": {
                            "type": "boolean",
                            "description": "Whether to include timestamp information in the output",
                            "default": True
                        },
                        "format_output": {
                            "type": "string",
                            "enum": ["json", "text", "srt"],
                            "description": "Output format for the transcript",
                            "default": "json"
                        }
                    },
                    "required": ["video_url"]
                }
            }
        }