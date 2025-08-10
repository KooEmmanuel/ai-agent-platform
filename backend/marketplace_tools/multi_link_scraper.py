"""
Multi-Link Web Scraper Tool
Allows storing multiple website links and intelligently scraping relevant content based on user queries.
"""

import asyncio
import aiohttp
from bs4 import BeautifulSoup
import re
from typing import Dict, List, Any, Optional
from urllib.parse import urljoin, urlparse
import json
from dataclasses import dataclass
from datetime import datetime
import hashlib

@dataclass
class ScrapedContent:
    url: str
    title: str
    content: str
    relevance_score: float
    timestamp: datetime

class MultiLinkScraperTool:
    def __init__(self):
        self.name = "multi_link_scraper"
        self.description = "Store multiple website links and intelligently scrape relevant content based on user queries"
        self.category = "Data Collection"
        self.tool_type = "web_scraper"
        
    def get_config_schema(self) -> Dict[str, Any]:
        """Get the configuration schema for this tool"""
        return {
            "name": "Multi-Link Web Scraper",
            "description": "Store and scrape multiple website links based on user queries",
            "parameters": {
                "links": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "url": {"type": "string", "description": "Website URL to scrape"},
                            "description": {"type": "string", "description": "Brief description of what this link contains"},
                            "tags": {"type": "array", "items": {"type": "string"}, "description": "Tags to help identify relevant content"}
                        },
                        "required": ["url", "description"]
                    },
                    "description": "List of website links to store and scrape"
                },
                "max_content_length": {
                    "type": "integer",
                    "default": 5000,
                    "description": "Maximum length of scraped content per page"
                },
                "relevance_threshold": {
                    "type": "number",
                    "default": 0.3,
                    "description": "Minimum relevance score to include content (0-1)"
                }
            },
            "required": ["links"]
        }

    async def execute(self, config: Dict[str, Any], query: str) -> Dict[str, Any]:
        """Execute the multi-link scraper tool"""
        try:
            links = config.get("links", [])
            max_content_length = config.get("max_content_length", 5000)
            relevance_threshold = config.get("relevance_threshold", 0.3)
            
            if not links:
                return {
                    "success": False,
                    "error": "No links configured. Please add website links first."
                }
            
            # Find relevant links based on query
            relevant_links = self._find_relevant_links(links, query)
            
            if not relevant_links:
                return {
                    "success": False,
                    "error": "No relevant links found for the query."
                }
            
            # Scrape content from relevant links
            scraped_content = await self._scrape_relevant_content(
                relevant_links, query, max_content_length, relevance_threshold
            )
            
            if not scraped_content:
                return {
                    "success": False,
                    "error": "No relevant content found in the configured links."
                }
            
            # Format results
            results = []
            for content in scraped_content:
                results.append({
                    "url": content.url,
                    "title": content.title,
                    "content": content.content[:max_content_length],
                    "relevance_score": content.relevance_score,
                    "timestamp": content.timestamp.isoformat()
                })
            
            return {
                "success": True,
                "query": query,
                "results": results,
                "total_results": len(results),
                "summary": f"Found {len(results)} relevant content pieces from {len(relevant_links)} links"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error executing multi-link scraper: {str(e)}"
            }

    def _find_relevant_links(self, links: List[Dict], query: str) -> List[Dict]:
        """Find links relevant to the query based on description and tags"""
        relevant_links = []
        query_lower = query.lower()
        
        for link in links:
            relevance_score = 0
            
            # Check description
            description = link.get("description", "").lower()
            if description:
                # Simple keyword matching
                query_words = set(query_lower.split())
                desc_words = set(description.split())
                common_words = query_words.intersection(desc_words)
                if common_words:
                    relevance_score += len(common_words) / len(query_words)
            
            # Check tags
            tags = link.get("tags", [])
            for tag in tags:
                if tag.lower() in query_lower:
                    relevance_score += 0.5
            
            # Check URL for keywords
            url = link.get("url", "").lower()
            if any(word in url for word in query_lower.split()):
                relevance_score += 0.3
            
            if relevance_score > 0:
                link["relevance_score"] = relevance_score
                relevant_links.append(link)
        
        # Sort by relevance score
        relevant_links.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
        return relevant_links[:5]  # Limit to top 5 most relevant

    async def _scrape_relevant_content(
        self, 
        links: List[Dict], 
        query: str, 
        max_length: int,
        threshold: float
    ) -> List[ScrapedContent]:
        """Scrape content from relevant links"""
        scraped_content = []
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for link in links:
                task = self._scrape_single_page(session, link, query, max_length, threshold)
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, ScrapedContent):
                    scraped_content.append(result)
        
        return scraped_content

    async def _scrape_single_page(
        self, 
        session: aiohttp.ClientSession, 
        link: Dict, 
        query: str, 
        max_length: int,
        threshold: float
    ) -> Optional[ScrapedContent]:
        """Scrape content from a single page"""
        try:
            url = link["url"]
            
            # Add headers to avoid being blocked
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            
            async with session.get(url, headers=headers, timeout=10) as response:
                if response.status != 200:
                    return None
                
                html = await response.text()
                
                # Parse HTML
                soup = BeautifulSoup(html, 'html.parser')
                
                # Extract title
                title = ""
                title_tag = soup.find('title')
                if title_tag:
                    title = title_tag.get_text().strip()
                
                # Extract main content
                content = self._extract_main_content(soup)
                
                if not content:
                    return None
                
                # Calculate relevance score
                relevance_score = self._calculate_content_relevance(content, query)
                
                if relevance_score < threshold:
                    return None
                
                # Truncate content if needed
                if len(content) > max_length:
                    content = content[:max_length] + "..."
                
                return ScrapedContent(
                    url=url,
                    title=title,
                    content=content,
                    relevance_score=relevance_score,
                    timestamp=datetime.now()
                )
                
        except Exception as e:
            print(f"Error scraping {url}: {str(e)}")
            return None

    def _extract_main_content(self, soup: BeautifulSoup) -> str:
        """Extract main content from HTML"""
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Try to find main content areas
        content_selectors = [
            'main',
            'article',
            '.content',
            '.main-content',
            '#content',
            '#main',
            '.post-content',
            '.entry-content'
        ]
        
        content = ""
        for selector in content_selectors:
            element = soup.select_one(selector)
            if element:
                content = element.get_text(separator=' ', strip=True)
                if len(content) > 100:  # Ensure we have substantial content
                    break
        
        # If no main content found, use body
        if not content or len(content) < 100:
            body = soup.find('body')
            if body:
                content = body.get_text(separator=' ', strip=True)
        
        # Clean up content
        content = re.sub(r'\s+', ' ', content)  # Remove extra whitespace
        content = re.sub(r'[^\w\s\.\,\!\?\;\:\-\(\)]', '', content)  # Remove special chars
        
        return content.strip()

    def _calculate_content_relevance(self, content: str, query: str) -> float:
        """Calculate relevance score between content and query"""
        content_lower = content.lower()
        query_lower = query.lower()
        
        # Simple keyword matching
        query_words = set(query_lower.split())
        content_words = set(content_lower.split())
        
        if not query_words:
            return 0.0
        
        # Calculate word overlap
        common_words = query_words.intersection(content_words)
        word_overlap = len(common_words) / len(query_words)
        
        # Calculate phrase matching
        phrase_score = 0.0
        for word in query_words:
            if word in content_lower:
                phrase_score += 0.1
        
        # Combine scores
        total_score = (word_overlap * 0.7) + (min(phrase_score, 1.0) * 0.3)
        
        return min(total_score, 1.0)

    def add_link(self, config: Dict[str, Any], url: str, description: str, tags: List[str] = None) -> Dict[str, Any]:
        """Add a new link to the configuration"""
        try:
            links = config.get("links", [])
            
            # Check if link already exists
            for link in links:
                if link.get("url") == url:
                    return {
                        "success": False,
                        "error": "Link already exists in configuration"
                    }
            
            # Add new link
            new_link = {
                "url": url,
                "description": description,
                "tags": tags or []
            }
            
            links.append(new_link)
            config["links"] = links
            
            return {
                "success": True,
                "message": f"Link added successfully: {url}",
                "total_links": len(links)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error adding link: {str(e)}"
            }

    def remove_link(self, config: Dict[str, Any], url: str) -> Dict[str, Any]:
        """Remove a link from the configuration"""
        try:
            links = config.get("links", [])
            
            # Find and remove link
            for i, link in enumerate(links):
                if link.get("url") == url:
                    del links[i]
                    config["links"] = links
                    
                    return {
                        "success": True,
                        "message": f"Link removed successfully: {url}",
                        "total_links": len(links)
                    }
            
            return {
                "success": False,
                "error": "Link not found in configuration"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error removing link: {str(e)}"
            }

# Create tool instance
multi_link_scraper = MultiLinkScraperTool() 