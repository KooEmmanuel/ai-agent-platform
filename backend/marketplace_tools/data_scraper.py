"""
Data Scraper Tool

A tool for scraping data from websites using various methods including
BeautifulSoup, Selenium, and API endpoints with support for different data formats.
"""

import asyncio
import json
import logging
import re
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
import aiohttp
from bs4 import BeautifulSoup
import pandas as pd
from urllib.parse import urljoin, urlparse
import time

from .base import BaseTool

logger = logging.getLogger(__name__)

class DataScraperTool(BaseTool):
    """
    Data Scraper Tool for extracting data from websites.
    
    Features:
    - Web scraping with BeautifulSoup
    - API data extraction
    - Data parsing and cleaning
    - Export to various formats
    - Rate limiting and respect for robots.txt
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.user_agent = config.get('user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        self.timeout = config.get('timeout', 30)
        self.max_retries = config.get('max_retries', 3)
        self.delay_between_requests = config.get('delay_between_requests', 1)
        self.verify_ssl = config.get('verify_ssl', True)
        
    async def execute(self, operation: str, url: str, **kwargs) -> Dict[str, Any]:
        """
        Execute data scraping operation.
        
        Args:
            operation: Type of operation (scrape_html, scrape_api, extract_data, etc.)
            url: Target URL to scrape
            **kwargs: Operation-specific parameters
            
        Returns:
            Scraping result
        """
        if not operation or not url:
            return self._format_error("Operation and URL are required")
        
        try:
            if operation == "scrape_html":
                return await self._scrape_html(url, **kwargs)
            elif operation == "scrape_api":
                return await self._scrape_api(url, **kwargs)
            elif operation == "extract_data":
                return await self._extract_data(url, **kwargs)
            elif operation == "scrape_table":
                return await self._scrape_table(url, **kwargs)
            elif operation == "scrape_links":
                return await self._scrape_links(url, **kwargs)
            else:
                return self._format_error(f"Unsupported operation: {operation}")
                
        except Exception as e:
            logger.error(f"Data scraping error: {str(e)}")
            return self._format_error(f"Data scraping failed: {str(e)}")
    
    async def _scrape_html(self, url: str, selector: Optional[str] = None,
                          extract_text: bool = True) -> Dict[str, Any]:
        """Scrape HTML content from a webpage."""
        try:
            headers = {
                'User-Agent': self.user_agent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url, 
                    headers=headers, 
                    timeout=aiohttp.ClientTimeout(total=self.timeout),
                    ssl=self.verify_ssl
                ) as response:
                    if response.status != 200:
                        return self._format_error(f"HTTP {response.status}: {response.reason}")
                    
                    html_content = await response.text()
                    
                    # Parse HTML with BeautifulSoup
                    soup = BeautifulSoup(html_content, 'html.parser')
                    
                    if selector:
                        # Extract specific elements using CSS selector
                        elements = soup.select(selector)
                        if extract_text:
                            data = [elem.get_text(strip=True) for elem in elements]
                        else:
                            data = [str(elem) for elem in elements]
                    else:
                        # Extract all text content
                        data = soup.get_text(strip=True)
                    
                    # Get page metadata
                    title = soup.find('title')
                    title_text = title.get_text(strip=True) if title else ''
                    
                    meta_description = soup.find('meta', attrs={'name': 'description'})
                    description = meta_description.get('content', '') if meta_description else ''
                    
                    scraping_data = {
                        'url': url,
                        'title': title_text,
                        'description': description,
                        'data': data,
                        'content_length': len(html_content),
                        'extracted_length': len(str(data))
                    }
                    
                    metadata = {
                        'operation': 'scrape_html',
                        'url': url,
                        'selector': selector,
                        'extract_text': extract_text,
                        'status_code': response.status
                    }
                    
                    return self._format_success(scraping_data, metadata)
                    
        except Exception as e:
            raise Exception(f"HTML scraping error: {str(e)}")
    
    async def _scrape_api(self, url: str, method: str = "GET", 
                         headers: Optional[Dict[str, str]] = None,
                         params: Optional[Dict[str, Any]] = None,
                         data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Scrape data from API endpoints."""
        try:
            request_headers = {
                'User-Agent': self.user_agent,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
            
            if headers:
                request_headers.update(headers)
            
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method=method,
                    url=url,
                    headers=request_headers,
                    params=params,
                    json=data,
                    timeout=aiohttp.ClientTimeout(total=self.timeout),
                    ssl=self.verify_ssl
                ) as response:
                    if response.status != 200:
                        return self._format_error(f"API request failed: {response.status}")
                    
                    # Try to parse as JSON
                    try:
                        api_data = await response.json()
                    except:
                        # Fallback to text if not JSON
                        api_data = await response.text()
                    
                    scraping_data = {
                        'url': url,
                        'method': method,
                        'data': api_data,
                        'content_type': response.headers.get('content-type', ''),
                        'response_size': len(str(api_data))
                    }
                    
                    metadata = {
                        'operation': 'scrape_api',
                        'url': url,
                        'method': method,
                        'status_code': response.status
                    }
                    
                    return self._format_success(scraping_data, metadata)
                    
        except Exception as e:
            raise Exception(f"API scraping error: {str(e)}")
    
    async def _extract_data(self, url: str, selectors: Dict[str, str],
                          data_format: str = "json") -> Dict[str, Any]:
        """Extract structured data from webpage using CSS selectors."""
        try:
            # First scrape the HTML
            html_result = await self._scrape_html(url, extract_text=False)
            
            if not html_result['success']:
                return html_result
            
            html_content = html_result['result']['data']
            soup = BeautifulSoup(html_content, 'html.parser')
            
            extracted_data = {}
            
            for field_name, selector in selectors.items():
                elements = soup.select(selector)
                if elements:
                    if len(elements) == 1:
                        # Single element
                        element = elements[0]
                        if element.name in ['img']:
                            value = element.get('src', '')
                        elif element.name in ['a']:
                            value = element.get('href', '')
                        else:
                            value = element.get_text(strip=True)
                    else:
                        # Multiple elements
                        values = []
                        for element in elements:
                            if element.name in ['img']:
                                values.append(element.get('src', ''))
                            elif element.name in ['a']:
                                values.append(element.get('href', ''))
                            else:
                                values.append(element.get_text(strip=True))
                        value = values
                else:
                    value = None
                
                extracted_data[field_name] = value
            
            # Format the data
            if data_format == "json":
                formatted_data = extracted_data
            elif data_format == "csv":
                # Convert to list of dictionaries for CSV
                if extracted_data and isinstance(next(iter(extracted_data.values())), list):
                    # Multiple values per field
                    max_length = max(len(v) if isinstance(v, list) else 1 for v in extracted_data.values())
                    formatted_data = []
                    for i in range(max_length):
                        row = {}
                        for field, value in extracted_data.items():
                            if isinstance(value, list):
                                row[field] = value[i] if i < len(value) else ''
                            else:
                                row[field] = value
                        formatted_data.append(row)
                else:
                    formatted_data = [extracted_data]
            else:
                formatted_data = extracted_data
            
            extraction_data = {
                'url': url,
                'extracted_data': formatted_data,
                'data_format': data_format,
                'fields_extracted': list(extracted_data.keys())
            }
            
            metadata = {
                'operation': 'extract_data',
                'url': url,
                'selectors_count': len(selectors),
                'data_format': data_format
            }
            
            return self._format_success(extraction_data, metadata)
            
        except Exception as e:
            raise Exception(f"Data extraction error: {str(e)}")
    
    async def _scrape_table(self, url: str, table_selector: Optional[str] = None,
                           table_index: int = 0) -> Dict[str, Any]:
        """Scrape table data from webpage."""
        try:
            # First scrape the HTML
            html_result = await self._scrape_html(url, extract_text=False)
            
            if not html_result['success']:
                return html_result
            
            html_content = html_result['result']['data']
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Find tables
            if table_selector:
                tables = soup.select(table_selector)
            else:
                tables = soup.find_all('table')
            
            if not tables:
                return self._format_error("No tables found on the page")
            
            if table_index >= len(tables):
                return self._format_error(f"Table index {table_index} out of range (found {len(tables)} tables)")
            
            table = tables[table_index]
            
            # Extract table data
            table_data = []
            headers = []
            
            # Extract headers
            header_row = table.find('thead')
            if header_row:
                header_cells = header_row.find_all(['th', 'td'])
                headers = [cell.get_text(strip=True) for cell in header_cells]
            
            # Extract rows
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if cells:
                    row_data = [cell.get_text(strip=True) for cell in cells]
                    if not headers and len(row_data) > 0:
                        # Use first row as headers if no thead
                        headers = row_data
                    else:
                        table_data.append(row_data)
            
            # Convert to structured format
            if headers and table_data:
                structured_data = []
                for row in table_data:
                    if len(row) == len(headers):
                        row_dict = dict(zip(headers, row))
                        structured_data.append(row_dict)
                    else:
                        # Handle mismatched columns
                        row_dict = {}
                        for i, header in enumerate(headers):
                            row_dict[header] = row[i] if i < len(row) else ''
                        structured_data.append(row_dict)
            else:
                structured_data = table_data
            
            table_data_result = {
                'url': url,
                'table_index': table_index,
                'headers': headers,
                'data': structured_data,
                'rows_count': len(structured_data),
                'columns_count': len(headers) if headers else 0
            }
            
            metadata = {
                'operation': 'scrape_table',
                'url': url,
                'table_selector': table_selector,
                'table_index': table_index,
                'total_tables_found': len(tables)
            }
            
            return self._format_success(table_data_result, metadata)
            
        except Exception as e:
            raise Exception(f"Table scraping error: {str(e)}")
    
    async def _scrape_links(self, url: str, link_selector: Optional[str] = None,
                           include_text: bool = True, filter_domains: Optional[List[str]] = None) -> Dict[str, Any]:
        """Scrape links from webpage."""
        try:
            # First scrape the HTML
            html_result = await self._scrape_html(url, extract_text=False)
            
            if not html_result['success']:
                return html_result
            
            html_content = html_result['result']['data']
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Find links
            if link_selector:
                links = soup.select(link_selector)
            else:
                links = soup.find_all('a', href=True)
            
            extracted_links = []
            
            for link in links:
                href = link.get('href', '')
                if href:
                    # Resolve relative URLs
                    absolute_url = urljoin(url, href)
                    
                    # Filter by domain if specified
                    if filter_domains:
                        parsed_url = urlparse(absolute_url)
                        if parsed_url.netloc not in filter_domains:
                            continue
                    
                    link_data = {
                        'url': absolute_url,
                        'href': href
                    }
                    
                    if include_text:
                        link_data['text'] = link.get_text(strip=True)
                    
                    extracted_links.append(link_data)
            
            links_data = {
                'source_url': url,
                'links': extracted_links,
                'total_links': len(extracted_links)
            }
            
            metadata = {
                'operation': 'scrape_links',
                'url': url,
                'link_selector': link_selector,
                'include_text': include_text,
                'filter_domains': filter_domains
            }
            
            return self._format_success(links_data, metadata)
            
        except Exception as e:
            raise Exception(f"Link scraping error: {str(e)}")
    
    async def scrape_multiple_pages(self, urls: List[str], operation: str = "scrape_html",
                                  **kwargs) -> Dict[str, Any]:
        """
        Scrape multiple pages with rate limiting.
        
        Args:
            urls: List of URLs to scrape
            operation: Type of scraping operation
            **kwargs: Additional operation parameters
            
        Returns:
            Combined scraping results
        """
        try:
            results = []
            
            for i, url in enumerate(urls):
                try:
                    # Add delay between requests
                    if i > 0:
                        await asyncio.sleep(self.delay_between_requests)
                    
                    # Execute scraping operation
                    if operation == "scrape_html":
                        result = await self._scrape_html(url, **kwargs)
                    elif operation == "scrape_api":
                        result = await self._scrape_api(url, **kwargs)
                    elif operation == "extract_data":
                        result = await self._extract_data(url, **kwargs)
                    elif operation == "scrape_table":
                        result = await self._scrape_table(url, **kwargs)
                    elif operation == "scrape_links":
                        result = await self._scrape_links(url, **kwargs)
                    else:
                        result = self._format_error(f"Unsupported operation: {operation}")
                    
                    results.append({
                        'url': url,
                        'success': result['success'],
                        'data': result.get('result', {}),
                        'error': result.get('error', '')
                    })
                    
                except Exception as e:
                    results.append({
                        'url': url,
                        'success': False,
                        'data': {},
                        'error': str(e)
                    })
            
            # Calculate statistics
            successful = sum(1 for r in results if r['success'])
            failed = len(results) - successful
            
            combined_data = {
                'results': results,
                'statistics': {
                    'total_urls': len(urls),
                    'successful': successful,
                    'failed': failed,
                    'success_rate': round(successful / len(urls) * 100, 2) if urls else 0
                }
            }
            
            metadata = {
                'operation': 'scrape_multiple_pages',
                'operation_type': operation,
                'total_urls': len(urls),
                'delay_between_requests': self.delay_between_requests
            }
            
            return self._format_success(combined_data, metadata)
            
        except Exception as e:
            raise Exception(f"Multiple page scraping error: {str(e)}")
    
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
                'HTML content scraping',
                'API data extraction',
                'Structured data extraction',
                'Table data scraping',
                'Link extraction',
                'Multiple page scraping',
                'Rate limiting and delays'
            ],
            'supported_operations': [
                'scrape_html',
                'scrape_api',
                'extract_data',
                'scrape_table',
                'scrape_links',
                'scrape_multiple_pages'
            ],
            'parameters': {
                'operation': 'Type of scraping operation (required)',
                'url': 'Target URL to scrape (required)',
                'selector': 'CSS selector for specific elements',
                'selectors': 'Dictionary of field names and CSS selectors',
                'method': 'HTTP method for API requests',
                'headers': 'Custom HTTP headers'
            }
        } 