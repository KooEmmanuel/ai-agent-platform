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

from .base import BaseTool

@dataclass
class ScrapedContent:
    url: str
    title: str
    content: str
    relevance_score: float
    timestamp: datetime

class MultiLinkScraperTool(BaseTool):
    def __init__(self, config: Dict[str, Any] = None):
        if config is None:
            config = {}
        super().__init__(config)
        self.name = "multi_link_scraper"
        self.description = "Store multiple website links and intelligently scrape relevant content based on user queries"
        self.category = "Data Collection"
        self.tool_type = "web_scraper"
        
    def get_config_schema(self) -> Dict[str, Any]:
        """Get the configuration schema for this tool"""
        return {
            "name": "Multi-Link Web Scraper",
            "description": "Store and scrape multiple website links based on user queries with adaptive URL handling",
            "parameters": {
                "links_text": {
                    "type": "string",
                    "description": "Paste your website links here (one per line or comma-separated)"
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
                },
                "enable_url_variations": {
                    "type": "boolean",
                    "default": True,
                    "description": "Enable automatic URL variation attempts (e.g., /privacy vs /privacy-policy)"
                },
                "max_retries": {
                    "type": "integer",
                    "default": 3,
                    "description": "Maximum number of URL variations to try per link"
                }
            },
            "required": ["links_text"]
        }
    
    def get_tool_info(self) -> Dict[str, Any]:
        """
        Get information about this tool.
        
        Returns:
            Tool information dictionary
        """
        return {
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'tool_type': self.tool_type,
            'capabilities': [
                'Store multiple website links',
                'Intelligently scrape relevant content',
                'Query-based content filtering',
                'Relevance scoring',
                'Content extraction and processing',
                'Simple text-based link input'
            ],
            'parameters': {
                'query': 'Search query to find relevant content (required)',
                'links_text': 'Text field to paste website links (one per line or comma-separated)',
                'max_content_length': 'Maximum length of scraped content per page',
                'relevance_threshold': 'Minimum relevance score to include content (0-1)'
            }
        }

    async def execute(self, **kwargs) -> Dict[str, Any]:
        """Execute the multi-link scraper tool"""
        try:
            # Extract parameters from kwargs
            query = kwargs.get("query", "")
            links = kwargs.get("links", [])
            
            # If no links provided in kwargs, try to get from config
            if not links:
                links_text = self.config.get("links_text", "")
                links = self._parse_links_from_text(links_text)
            
            max_content_length = self.config.get("max_content_length", 5000)
            relevance_threshold = self.config.get("relevance_threshold", 0.3)
            enable_url_variations = self.config.get("enable_url_variations", True)
            max_retries = self.config.get("max_retries", 3)
            
            if not links:
                return self._format_error("No links provided. Please provide links in the request or configure them first.")
            
            # If no query provided, scrape all links
            if not query:
                print(f"Scraping {len(links)} links without query filtering")
                # Scrape content from all links
                scraped_content = await self._scrape_all_content(
                    links, max_content_length, enable_url_variations, max_retries
                )
                
                print(f"Scraped content count: {len(scraped_content)}")
                
                if not scraped_content:
                    return self._format_error("No content found in the provided links. This could be due to website blocking, JavaScript-rendered content, or the content not being accessible.")
                
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
                
                result_data = {
                    "query": "All content",
                    "results": results,
                    "total_results": len(results),
                    "summary": f"Scraped content from {len(links)} links"
                }
                
                return self._format_success(result_data, {"links_processed": len(links)})
            else:
                # Find relevant links based on query
                relevant_links = self._find_relevant_links(links, query)
                
                if not relevant_links:
                    return self._format_error("No relevant links found for the query.")
                
                # Scrape content from relevant links
                scraped_content = await self._scrape_relevant_content(
                    relevant_links, query, max_content_length, relevance_threshold, enable_url_variations, max_retries
                )
                
                if not scraped_content:
                    return self._format_error("No relevant content found in the provided links.")
                
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
                
                result_data = {
                    "query": query,
                    "results": results,
                    "total_results": len(results),
                    "summary": f"Found {len(results)} relevant content pieces from {len(relevant_links)} links"
                }
                
                return self._format_success(result_data, {"query": query, "links_processed": len(relevant_links)})
            
        except Exception as e:
            return self._format_error(f"Error executing multi-link scraper: {str(e)}")

    def _parse_links_from_text(self, links_text: str) -> List[Dict]:
        """
        Parse links from text input.
        Supports multiple formats:
        - One URL per line
        - Comma-separated URLs
        - URLs with descriptions (URL - Description)
        """
        if not links_text.strip():
            return []
        
        links = []
        lines = links_text.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Handle comma-separated URLs
            if ',' in line:
                urls = [url.strip() for url in line.split(',') if url.strip()]
                for url in urls:
                    if self._is_valid_url(url):
                        links.append({
                            'url': url,
                            'description': f'Scraped from {url}',
                            'tags': []
                        })
            else:
                # Handle single URL or URL with description
                if ' - ' in line:
                    # Format: URL - Description
                    parts = line.split(' - ', 1)
                    url = parts[0].strip()
                    description = parts[1].strip()
                else:
                    # Just a URL
                    url = line.strip()
                    description = f'Scraped from {url}'
                
                if self._is_valid_url(url):
                    links.append({
                        'url': url,
                        'description': description,
                        'tags': []
                    })
        
        return links
    
    def _is_valid_url(self, url: str) -> bool:
        """Check if a string is a valid URL"""
        try:
            from urllib.parse import urlparse
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except:
            return False

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

    async def _scrape_all_content(
        self, 
        links: List[Dict], 
        max_length: int,
        enable_url_variations: bool = True,
        max_retries: int = 3
    ) -> List[ScrapedContent]:
        """Scrape content from all links without query filtering"""
        scraped_content = []
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for link in links:
                task = self._scrape_single_page_all(session, link, max_length, enable_url_variations, max_retries)
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, ScrapedContent):
                    scraped_content.append(result)
        
        return scraped_content

    async def _scrape_relevant_content(
        self, 
        links: List[Dict], 
        query: str, 
        max_length: int,
        threshold: float,
        enable_url_variations: bool = True,
        max_retries: int = 3
    ) -> List[ScrapedContent]:
        """Scrape content from relevant links"""
        scraped_content = []
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for link in links:
                task = self._scrape_single_page(session, link, query, max_length, threshold, enable_url_variations, max_retries)
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, ScrapedContent):
                    scraped_content.append(result)
        
        return scraped_content

    async def _scrape_single_page_all(
        self, 
        session: aiohttp.ClientSession, 
        link: Dict, 
        max_length: int,
        enable_url_variations: bool = True,
        max_retries: int = 3
    ) -> Optional[ScrapedContent]:
        """Scrape content from a single page without query filtering"""
        try:
            url = link["url"]
            
            # Try multiple URL variations if enabled
            if enable_url_variations:
                url_variations = self._generate_url_variations(url, max_retries)
                print(f"Trying {len(url_variations)} URL variations for: {url}")
                
                for attempt_url in url_variations:
                    try:
                        result = await self._attempt_scrape_url(session, attempt_url, max_length)
                        if result:
                            print(f"Successfully scraped: {attempt_url}")
                            return result
                    except Exception as e:
                        print(f"Failed to scrape {attempt_url}: {str(e)}")
                        continue
                
                print(f"All URL variations failed for: {url}")
                return None
            else:
                # Try only the original URL
                try:
                    result = await self._attempt_scrape_url(session, url, max_length)
                    if result:
                        print(f"Successfully scraped: {url}")
                        return result
                except Exception as e:
                    print(f"Failed to scrape {url}: {str(e)}")
                    return None
                
        except Exception as e:
            print(f"Error scraping {url}: {str(e)}")
            return None

    def _generate_url_variations(self, original_url: str, max_retries: int = 3) -> List[str]:
        """Generate URL variations to try if the original fails"""
        variations = [original_url]
        
        # Parse the URL
        parsed = urlparse(original_url)
        base_url = f"{parsed.scheme}://{parsed.netloc}"
        path = parsed.path.strip('/')
        
        # Common variations for different page types
        if 'privacy' in path.lower():
            variations.extend([
                f"{base_url}/privacy",
                f"{base_url}/privacy-policy",
                f"{base_url}/privacy-policy/",
                f"{base_url}/privacy/",
                f"{base_url}/legal/privacy",
                f"{base_url}/legal/privacy-policy",
                f"{base_url}/terms/privacy",
                f"{base_url}/terms/privacy-policy"
            ])
        elif 'terms' in path.lower():
            variations.extend([
                f"{base_url}/terms",
                f"{base_url}/terms-of-service",
                f"{base_url}/terms-of-use",
                f"{base_url}/terms/",
                f"{base_url}/terms-of-service/",
                f"{base_url}/legal/terms",
                f"{base_url}/legal/terms-of-service"
            ])
        elif 'about' in path.lower():
            variations.extend([
                f"{base_url}/about",
                f"{base_url}/about-us",
                f"{base_url}/about/",
                f"{base_url}/about-us/"
            ])
        elif 'contact' in path.lower():
            variations.extend([
                f"{base_url}/contact",
                f"{base_url}/contact-us",
                f"{base_url}/contact/",
                f"{base_url}/contact-us/"
            ])
        
        # Remove duplicates while preserving order
        seen = set()
        unique_variations = []
        for url in variations:
            if url not in seen:
                seen.add(url)
                unique_variations.append(url)
        
        # Limit to max_retries
        return unique_variations[:max_retries]

    async def _attempt_scrape_url(
        self, 
        session: aiohttp.ClientSession, 
        url: str, 
        max_length: int
    ) -> Optional[ScrapedContent]:
        """Attempt to scrape a single URL with enhanced error handling"""
        try:
            # Add headers to avoid being blocked
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache"
            }
            
            async with session.get(url, headers=headers, timeout=15, allow_redirects=True) as response:
                print(f"Attempting to scrape {url} - Status: {response.status}")
                
                # Handle redirects
                final_url = str(response.url)
                if final_url != url:
                    print(f"Redirected from {url} to {final_url}")
                
                if response.status not in [200, 201, 202]:
                    print(f"Failed to scrape {url}: HTTP {response.status}")
                    return None
                
                html = await response.text()
                print(f"Scraped {url} - HTML length: {len(html)}")
                
                # Parse HTML
                soup = BeautifulSoup(html, 'html.parser')
                
                # Extract title
                title = ""
                title_tag = soup.find('title')
                if title_tag:
                    title = title_tag.get_text().strip()
                
                print(f"Title: {title}")
                
                # Extract main content using adaptive selectors
                content = self._extract_main_content_adaptive(soup)
                
                print(f"Content length: {len(content) if content else 0}")
                
                if not content or len(content) < 50:
                    print(f"Insufficient content extracted from {url}")
                    return None
                
                # Truncate content if needed
                if len(content) > max_length:
                    content = content[:max_length] + "..."
                
                return ScrapedContent(
                    url=final_url,  # Use final URL after redirects
                    title=title,
                    content=content,
                    relevance_score=1.0,  # Default relevance for all content
                    timestamp=datetime.now()
                )
                
        except Exception as e:
            print(f"Error scraping {url}: {str(e)}")
            return None

    async def _scrape_single_page(
        self, 
        session: aiohttp.ClientSession, 
        link: Dict, 
        query: str, 
        max_length: int,
        threshold: float,
        enable_url_variations: bool = True,
        max_retries: int = 3
    ) -> Optional[ScrapedContent]:
        """Scrape content from a single page"""
        try:
            url = link["url"]
            
            # Try multiple URL variations if enabled
            if enable_url_variations:
                url_variations = self._generate_url_variations(url, max_retries)
                print(f"Trying {len(url_variations)} URL variations for: {url}")
                
                for attempt_url in url_variations:
                    try:
                        result = await self._attempt_scrape_url_with_query(session, attempt_url, query, max_length, threshold)
                        if result:
                            print(f"Successfully scraped: {attempt_url}")
                            return result
                    except Exception as e:
                        print(f"Failed to scrape {attempt_url}: {str(e)}")
                        continue
                
                print(f"All URL variations failed for: {url}")
                return None
            else:
                # Try only the original URL
                try:
                    result = await self._attempt_scrape_url_with_query(session, url, query, max_length, threshold)
                    if result:
                        print(f"Successfully scraped: {url}")
                        return result
                except Exception as e:
                    print(f"Failed to scrape {url}: {str(e)}")
                    return None
                
        except Exception as e:
            print(f"Error scraping {url}: {str(e)}")
            return None

    async def _attempt_scrape_url_with_query(
        self, 
        session: aiohttp.ClientSession, 
        url: str, 
        query: str,
        max_length: int,
        threshold: float
    ) -> Optional[ScrapedContent]:
        """Attempt to scrape a single URL with query filtering"""
        try:
            # Add headers to avoid being blocked
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache"
            }
            
            async with session.get(url, headers=headers, timeout=15, allow_redirects=True) as response:
                print(f"Attempting to scrape {url} - Status: {response.status}")
                
                # Handle redirects
                final_url = str(response.url)
                if final_url != url:
                    print(f"Redirected from {url} to {final_url}")
                
                if response.status not in [200, 201, 202]:
                    print(f"Failed to scrape {url}: HTTP {response.status}")
                    return None
                
                html = await response.text()
                print(f"Scraped {url} - HTML length: {len(html)}")
                
                # Parse HTML
                soup = BeautifulSoup(html, 'html.parser')
                
                # Extract title
                title = ""
                title_tag = soup.find('title')
                if title_tag:
                    title = title_tag.get_text().strip()
                
                print(f"Title: {title}")
                
                # Extract main content using adaptive selectors
                content = self._extract_main_content_adaptive(soup)
                
                print(f"Content length: {len(content) if content else 0}")
                
                if not content or len(content) < 50:
                    print(f"Insufficient content extracted from {url}")
                    return None
                
                # Calculate relevance score
                relevance_score = self._calculate_content_relevance(content, query)
                
                if relevance_score < threshold:
                    print(f"Content relevance score {relevance_score} below threshold {threshold}")
                    return None
                
                # Truncate content if needed
                if len(content) > max_length:
                    content = content[:max_length] + "..."
                
                return ScrapedContent(
                    url=final_url,  # Use final URL after redirects
                    title=title,
                    content=content,
                    relevance_score=relevance_score,
                    timestamp=datetime.now()
                )
                
        except Exception as e:
            print(f"Error scraping {url}: {str(e)}")
            return None

    def _extract_main_content_adaptive(self, soup: BeautifulSoup) -> str:
        """Extract main content using adaptive selectors with fallback strategies"""
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "header", "footer", "aside"]):
            script.decompose()
        
        # Primary content selectors (specific)
        primary_selectors = [
            'main',
            'article',
            '.content',
            '.main-content',
            '#content',
            '#main',
            '.post-content',
            '.entry-content',
            '.privacy-policy',
            '.policy-content',
            '.legal-content',
            '.terms-content',
            '.privacy',
            '.terms',
            '.about-content',
            '.contact-content'
        ]
        
        # Fallback selectors (more general)
        fallback_selectors = [
            'section',
            '.container',
            '.wrapper',
            '.page-content',
            '.site-content',
            '.main',
            '.content-wrapper',
            '.text-content',
            '.body-content'
        ]
        
        # Try primary selectors first
        content = self._try_selectors(soup, primary_selectors, min_length=50)
        
        # If no content found, try fallback selectors
        if not content:
            content = self._try_selectors(soup, fallback_selectors, min_length=30)
        
        # If still no content, try flexible selectors (contains pattern matching)
        if not content:
            content = self._try_flexible_selectors(soup)
        
        # If no content found, try paragraphs
        if not content:
            content = self._extract_from_paragraphs(soup)
        
        # If still no content, use body
        if not content:
            body = soup.find('body')
            if body:
                content = body.get_text(separator=' ', strip=True)
        
        # Clean up content
        content = re.sub(r'\s+', ' ', content)  # Remove extra whitespace
        # Less aggressive character filtering to preserve more content
        content = re.sub(r'[^\w\s\.\,\!\?\;\:\-\(\)\[\]\{\}\"\']', '', content)
        
        return content.strip()

    def _try_selectors(self, soup: BeautifulSoup, selectors: List[str], min_length: int = 50) -> str:
        """Try multiple selectors and return the first one with sufficient content"""
        for selector in selectors:
            try:
                element = soup.select_one(selector)
                if element:
                    content = element.get_text(separator=' ', strip=True)
                    if len(content) > min_length:
                        return content
            except Exception as e:
                print(f"Error with selector {selector}: {str(e)}")
                continue
        return ""

    def _try_flexible_selectors(self, soup: BeautifulSoup) -> str:
        """Use flexible selectors that match partial class names"""
        import re
        
        # Common content-related patterns
        patterns = [
            r'content',
            r'main',
            r'article',
            r'text',
            r'body',
            r'page',
            r'post',
            r'entry'
        ]
        
        for pattern in patterns:
            try:
                # Find elements with class names containing the pattern
                elements = soup.find_all(class_=re.compile(pattern, re.IGNORECASE))
                for element in elements:
                    content = element.get_text(separator=' ', strip=True)
                    if len(content) > 100:  # Higher threshold for flexible selectors
                        return content
            except Exception as e:
                print(f"Error with flexible selector pattern {pattern}: {str(e)}")
                continue
        
        return ""

    def _extract_from_paragraphs(self, soup: BeautifulSoup) -> str:
        """Extract content from paragraphs as a fallback"""
        try:
            paragraphs = soup.find_all('p')
            if paragraphs:
                # Filter out very short paragraphs (likely navigation/menu items)
                meaningful_paragraphs = [
                    p.get_text(strip=True) for p in paragraphs 
                    if len(p.get_text(strip=True)) > 20
                ]
                if meaningful_paragraphs:
                    return ' '.join(meaningful_paragraphs)
        except Exception as e:
            print(f"Error extracting from paragraphs: {str(e)}")
        
        return ""

    def _extract_main_content(self, soup: BeautifulSoup) -> str:
        """Legacy method - now calls the adaptive version"""
        return self._extract_main_content_adaptive(soup)

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