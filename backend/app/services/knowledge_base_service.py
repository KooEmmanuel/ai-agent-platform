"""
Knowledge Base Service

Manages knowledge base collections, document uploads, and website crawling.
"""

import asyncio
import json
import logging
import hashlib
import os
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
import aiohttp
from bs4 import BeautifulSoup
import chromadb
from chromadb.config import Settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete
from fastapi import UploadFile

from app.core.database import KnowledgeBaseCollection, KnowledgeBaseDocument, User
# Import the crawler and extractor classes directly
import aiohttp
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin, urlparse

logger = logging.getLogger(__name__)

class WebsiteCrawler:
    """Handles website crawling and page discovery."""
    
    def __init__(self, config: Dict[str, Any]):
        self.user_agent = config.get('user_agent', 'KooAgent Website KB Crawler 1.0')
        self.timeout = config.get('timeout', 30)
        self.max_pages = config.get('max_pages', 100)
        self.max_depth = config.get('max_depth', 3)
        self.delay_between_requests = config.get('delay_between_requests', 1)
        self.respect_robots_txt = config.get('respect_robots_txt', True)
        
    async def discover_pages(self, base_url: str, **kwargs) -> List[str]:
        """Discover all pages on a website."""
        max_pages = kwargs.get('max_pages', self.max_pages)
        max_depth = kwargs.get('max_depth', self.max_depth)
        
        logger.info(f"🕷️ Starting page discovery for {base_url}")
        logger.info(f"📊 Max pages: {max_pages}, Max depth: {max_depth}")
        
        discovered_urls = set()
        to_visit = [(base_url, 0)]  # (url, depth)
        visited = set()
        
        while to_visit and len(discovered_urls) < max_pages:
            url, depth = to_visit.pop(0)
            
            if url in visited or depth > max_depth:
                continue
                
            visited.add(url)
            logger.info(f"🔍 Crawling {url} (depth: {depth}, discovered: {len(discovered_urls)})")
            
            try:
                # Fetch page
                page_data = await self.fetch_page(url)
                if not page_data:
                    continue
                    
                discovered_urls.add(url)
                logger.info(f"✅ Successfully discovered page: {url}")
                
                # Extract links for further crawling
                if depth < max_depth:
                    links = self._extract_links(page_data['html'], url)
                    logger.info(f"🔗 Found {len(links)} links on {url}")
                    for link in links:
                        if link not in visited and len(discovered_urls) < max_pages:
                            to_visit.append((link, depth + 1))
                            
                # Delay between requests
                if self.delay_between_requests > 0:
                    await asyncio.sleep(self.delay_between_requests)
                    
            except Exception as e:
                logger.error(f"Failed to process {url}: {str(e)}")
                continue
                
        return list(discovered_urls)
    
    async def fetch_page(self, url: str) -> Optional[Dict[str, Any]]:
        """Fetch a single page."""
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
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    if response.status != 200:
                        return None
                    
                    html_content = await response.text()
                    
                    # Extract title
                    soup = BeautifulSoup(html_content, 'html.parser')
                    title = soup.find('title')
                    title_text = title.get_text(strip=True) if title else ''
                    
                    return {
                        'url': url,
                        'html': html_content,
                        'title': title_text,
                        'status_code': response.status
                    }
                    
        except Exception as e:
            logger.error(f"Failed to fetch {url}: {str(e)}")
            return None
    
    def _extract_links(self, html_content: str, base_url: str) -> List[str]:
        """Extract links from HTML content."""
        soup = BeautifulSoup(html_content, 'html.parser')
        links = []
        
        logger.info(f"🔍 Extracting links from {base_url}")
        
        all_links = soup.find_all('a', href=True)
        logger.info(f"📋 Found {len(all_links)} total links in HTML")
        
        for i, link in enumerate(all_links):
            href = link['href']
            link_text = link.get_text(strip=True)[:50]  # First 50 chars of link text
            
            # Normalize URL
            full_url = urljoin(base_url, href)
            
            logger.info(f"🔗 Link {i+1}: {href} -> {full_url} (text: '{link_text}')")
            
            # Check if it's a valid link
            if self._is_valid_link(full_url, base_url):
                links.append(full_url)
                logger.info(f"✅ Valid link: {full_url}")
            else:
                logger.info(f"❌ Invalid link: {full_url}")
                
        logger.info(f"📊 Total valid links found: {len(links)}")
        return list(set(links))  # Remove duplicates
    
    def _is_valid_link(self, url: str, base_url: str) -> bool:
        """Check if a link should be crawled."""
        try:
            parsed_url = urlparse(url)
            parsed_base = urlparse(base_url)
            
            # Must be same domain
            if parsed_url.netloc != parsed_base.netloc:
                logger.debug(f"❌ Different domain: {parsed_url.netloc} vs {parsed_base.netloc}")
                return False
                
            # Skip common non-content URLs
            skip_patterns = [
                r'\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|exe|dmg)$',
                r'#.*$',  # Anchors
                r'javascript:',  # JavaScript
                r'mailto:',  # Email links
                r'tel:',  # Phone links
            ]
            
            for pattern in skip_patterns:
                if re.search(pattern, url, re.IGNORECASE):
                    logger.debug(f"❌ Skipped by pattern {pattern}: {url}")
                    return False
                    
            logger.debug(f"✅ Valid link: {url}")
            return True
            
        except Exception as e:
            logger.debug(f"❌ Exception validating link {url}: {str(e)}")
            return False

class RobustContentExtractor:
    """Extracts content using multiple strategies with fallbacks."""
    
    def __init__(self, config: Dict[str, Any]):
        self.min_content_length = config.get('min_content_length', 100)
        self.chunk_size = config.get('chunk_size', 1000)
        self.chunk_overlap = config.get('chunk_overlap', 200)
        
    async def extract_content(self, url: str, html_content: str) -> Optional[Dict[str, Any]]:
        """Extract content using multiple strategies."""
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "header", "footer"]):
                script.decompose()
            
            # Get text and clean it
            text = soup.get_text()
            
            # Clean up whitespace
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = '\n'.join(chunk for chunk in chunks if chunk)
            
            # Filter out very short lines
            lines = text.split('\n')
            filtered_lines = [line for line in lines if len(line) > 50]
            
            if filtered_lines:
                content = '\n\n'.join(filtered_lines)
                if len(content) >= self.min_content_length:
                    return {
                        'content': content,
                        'metadata': {'method': 'fallback', 'lines': len(filtered_lines)},
                        'confidence': 0.3
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"Content extraction failed: {str(e)}")
            return None

class KnowledgeBaseService:
    """Service for managing knowledge base collections and documents."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.chroma_client = chromadb.PersistentClient(path="./chroma_db")
        self.crawler = WebsiteCrawler({
            'user_agent': 'KooAgent Knowledge Base Crawler 1.0',
            'timeout': 30,
            'max_pages': 100,
            'max_depth': 3,
            'delay_between_requests': 1,
            'respect_robots_txt': True
        })
        self.extractor = RobustContentExtractor({
            'min_content_length': 100,
            'chunk_size': 1000,
            'chunk_overlap': 200
        })
    
    async def create_collection(self, user_id: int, name: str, description: str = None, collection_type: str = "mixed") -> Dict[str, Any]:
        """Create a new knowledge base collection."""
        try:
            # Use the user's name directly as the collection name
            chroma_collection_name = name
            
            # Create collection in database
            collection = KnowledgeBaseCollection(
                user_id=user_id,
                name=name,
                description=description,
                collection_type=collection_type,
                chroma_collection_name=chroma_collection_name,
                pages_extracted=0
            )
            
            self.db.add(collection)
            await self.db.commit()
            await self.db.refresh(collection)
            
            # Create ChromaDB collection
            self.chroma_client.create_collection(
                name=chroma_collection_name,
                metadata={
                    "user_id": user_id,
                    "collection_name": name,  # Store the original user-friendly name
                    "created_at": datetime.now().isoformat()
                }
            )
            
            logger.info(f"✅ Created knowledge base collection: {name} ({chroma_collection_name})")
            
            return {
                "id": collection.id,
                "name": collection.name,
                "description": collection.description,
                "collection_type": collection.collection_type,
                "chroma_collection_name": collection.chroma_collection_name,
                "created_at": collection.created_at.isoformat(),
                "updated_at": collection.updated_at.isoformat() if collection.updated_at else collection.created_at.isoformat(),
                "document_count": 0,
                "pages_extracted": 0
            }
            
        except Exception as e:
            logger.error(f"Failed to create collection: {str(e)}")
            raise Exception(f"Failed to create collection: {str(e)}")
    
    async def get_user_collections(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all collections for a user."""
        try:
            result = await self.db.execute(
                select(KnowledgeBaseCollection).where(KnowledgeBaseCollection.user_id == user_id)
            )
            collections = result.scalars().all()
            
            collection_data = []
            for collection in collections:
                # Get document count and pages extracted
                doc_result = await self.db.execute(
                    select(KnowledgeBaseDocument).where(KnowledgeBaseDocument.collection_id == collection.id)
                )
                documents = doc_result.scalars().all()
                doc_count = len(documents)
                
                # Count unique pages for website collections
                pages_extracted = 0
                try:
                    if collection.collection_type in ['website', 'mixed']:
                        # Count documents that are website documents (have source_url or document_type is 'website')
                        website_docs = [doc for doc in documents if doc.document_type == 'website' or doc.source_url]
                        pages_extracted = len(website_docs)
                        logger.info(f"Collection {collection.name}: {len(documents)} total docs, {pages_extracted} website docs")
                        logger.info(f"Document types: {[doc.document_type for doc in documents]}")
                except Exception as e:
                    logger.warning(f"Error calculating pages_extracted for collection {collection.name}: {e}")
                    pages_extracted = 0
                
                collection_data.append({
                    "id": collection.id,
                    "name": collection.name,
                    "description": collection.description,
                    "collection_type": collection.collection_type,
                    "chroma_collection_name": collection.chroma_collection_name,
                    "created_at": collection.created_at.isoformat(),
                    "updated_at": collection.updated_at.isoformat(),
                    "document_count": doc_count,
                    "pages_extracted": collection.pages_extracted
                })
            
            return collection_data
            
        except Exception as e:
            logger.error(f"Failed to get user collections: {str(e)}")
            raise Exception(f"Failed to get user collections: {str(e)}")
    
    async def crawl_website_to_collection(self, collection_id: int, website_url: str, max_pages: int = 50, max_depth: int = 3) -> Dict[str, Any]:
        """Crawl a website and add documents to a collection."""
        try:
            # Get collection
            result = await self.db.execute(
                select(KnowledgeBaseCollection).where(KnowledgeBaseCollection.id == collection_id)
            )
            collection = result.scalar_one_or_none()
            
            if not collection:
                raise Exception("Collection not found")
            
            logger.info(f"🕷️ Starting website crawl for {website_url} into collection {collection.name}")
            
            # Crawl website
            discovered_urls = await self.crawler.discover_pages(
                website_url, 
                max_pages=max_pages, 
                max_depth=max_depth
            )
            
            logger.info(f"📄 Discovered {len(discovered_urls)} pages")
            
            # Extract content from each page
            documents_added = 0
            for url in discovered_urls:
                try:
                    # Fetch page content
                    page_data = await self.crawler.fetch_page(url)
                    if not page_data:
                        continue
                    
                    # Extract content
                    content_result = await self.extractor.extract_content(url, page_data['html'])
                    if not content_result or not content_result.get('content'):
                        continue
                    
                    # Create document record
                    doc_id = hashlib.md5(url.encode()).hexdigest()
                    document = KnowledgeBaseDocument(
                        collection_id=collection_id,
                        title=page_data.get('title', url),
                        content=content_result['content'],
                        source_url=url,
                        document_type='website',
                        document_metadata={
                            'url': url,
                            'title': page_data.get('title', ''),
                            'content_length': len(content_result['content']),
                            'extraction_method': content_result.get('metadata', {}).get('method', 'unknown')
                        }
                    )
                    
                    self.db.add(document)
                    documents_added += 1
                    
                except Exception as e:
                    logger.warning(f"Failed to process {url}: {str(e)}")
                    continue
            
            await self.db.commit()
            
            # Update the collection's pages_extracted count
            if documents_added > 0:
                collection.pages_extracted += documents_added
                await self.db.commit()
                await self.db.refresh(collection)  # Refresh the object to get updated values
            
            # Add to ChromaDB
            await self._add_documents_to_chroma(collection.chroma_collection_name, collection_id)
            
            logger.info(f"✅ Added {documents_added} documents to collection {collection.name}")
            
            return {
                "collection_id": collection_id,
                "website_url": website_url,
                "pages_discovered": len(discovered_urls),
                "documents_added": documents_added,
                "collection_name": collection.name
            }
            
        except Exception as e:
            logger.error(f"Failed to crawl website: {str(e)}")
            raise Exception(f"Failed to crawl website: {str(e)}")
    
    async def upload_file_to_collection(self, collection_id: int, file: UploadFile) -> Dict[str, Any]:
        """Upload a file and add it to a collection."""
        try:
            # Get collection
            result = await self.db.execute(
                select(KnowledgeBaseCollection).where(KnowledgeBaseCollection.id == collection_id)
            )
            collection = result.scalar_one_or_none()
            
            if not collection:
                raise Exception("Collection not found")
            
            # Create upload directory
            upload_dir = Path(f"uploads/knowledge_base/{collection_id}")
            upload_dir.mkdir(parents=True, exist_ok=True)
            
            # Save file
            file_path = upload_dir / file.filename
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            # For now, we'll extract text from the file
            # In a full implementation, you'd want to handle different file types
            file_content = content.decode('utf-8', errors='ignore')
            
            # Create document record
            document = KnowledgeBaseDocument(
                collection_id=collection_id,
                title=file.filename,
                content=file_content,
                file_path=str(file_path),
                document_type='file',
                document_metadata={
                    'filename': file.filename,
                    'file_size': len(content),
                    'content_length': len(file_content)
                }
            )
            
            self.db.add(document)
            await self.db.commit()
            
            # Add to ChromaDB
            await self._add_documents_to_chroma(collection.chroma_collection_name, collection_id)
            
            logger.info(f"✅ Uploaded file {file.filename} to collection {collection.name}")
            
            return {
                "collection_id": collection_id,
                "filename": file.filename,
                "file_size": len(content),
                "content_length": len(file_content),
                "collection_name": collection.name
            }
            
        except Exception as e:
            logger.error(f"Failed to upload file: {str(e)}")
            raise Exception(f"Failed to upload file: {str(e)}")
    
    async def query_collection(self, collection_id: int, query: str, top_k: int = 5) -> Dict[str, Any]:
        """Query a collection for relevant documents."""
        try:
            # Get collection
            result = await self.db.execute(
                select(KnowledgeBaseCollection).where(KnowledgeBaseCollection.id == collection_id)
            )
            collection = result.scalar_one_or_none()
            
            if not collection:
                raise Exception("Collection not found")
            
            # Query ChromaDB
            chroma_collection = self.chroma_client.get_collection(collection.chroma_collection_name)
            
            results = chroma_collection.query(
                query_texts=[query],
                n_results=top_k
            )
            
            # Format results
            formatted_results = []
            if results['documents'] and results['documents'][0]:
                for i, doc in enumerate(results['documents'][0]):
                    formatted_results.append({
                        'content': doc,
                        'metadata': results['metadatas'][0][i] if results['metadatas'] and results['metadatas'][0] else {},
                        'distance': results['distances'][0][i] if results['distances'] and results['distances'][0] else 0
                    })
            
            return {
                "collection_id": collection_id,
                "collection_name": collection.name,
                "query": query,
                "results": formatted_results,
                "total_results": len(formatted_results)
            }
            
        except Exception as e:
            logger.error(f"Failed to query collection: {str(e)}")
            raise Exception(f"Failed to query collection: {str(e)}")
    
    async def _add_documents_to_chroma(self, chroma_collection_name: str, collection_id: int):
        """Add documents from database to ChromaDB."""
        try:
            # Get documents from database
            result = await self.db.execute(
                select(KnowledgeBaseDocument).where(KnowledgeBaseDocument.collection_id == collection_id)
            )
            documents = result.scalars().all()
            
            if not documents:
                return
            
            # Prepare documents for ChromaDB
            ids = []
            texts = []
            metadatas = []
            
            for doc in documents:
                doc_id = f"doc_{doc.id}"
                ids.append(doc_id)
                texts.append(doc.content)
                metadatas.append({
                    'title': doc.title,
                    'document_type': doc.document_type,
                    'source_url': doc.source_url or '',
                    'file_path': doc.file_path or '',
                    'created_at': doc.created_at.isoformat()
                })
            
            # Add to ChromaDB
            chroma_collection = self.chroma_client.get_collection(chroma_collection_name)
            chroma_collection.add(
                ids=ids,
                documents=texts,
                metadatas=metadatas
            )
            
            logger.info(f"✅ Added {len(documents)} documents to ChromaDB collection {chroma_collection_name}")
            
        except Exception as e:
            logger.error(f"Failed to add documents to ChromaDB: {str(e)}")
            raise Exception(f"Failed to add documents to ChromaDB: {str(e)}") 

    async def delete_collection(self, collection_id: int, user_id: int) -> Dict[str, Any]:
        """Delete a collection and all its documents."""
        try:
            # Get collection and verify ownership
            result = await self.db.execute(
                select(KnowledgeBaseCollection).where(
                    and_(
                        KnowledgeBaseCollection.id == collection_id,
                        KnowledgeBaseCollection.user_id == user_id
                    )
                )
            )
            collection = result.scalar_one_or_none()
            
            if not collection:
                raise Exception("Collection not found or access denied")
            
            # Delete all documents in the collection
            await self.db.execute(
                delete(KnowledgeBaseDocument).where(
                    KnowledgeBaseDocument.collection_id == collection_id
                )
            )
            
            # Delete the collection
            await self.db.execute(
                delete(KnowledgeBaseCollection).where(
                    KnowledgeBaseCollection.id == collection_id
                )
            )
            
            # Delete ChromaDB collection
            try:
                self.chroma_client.delete_collection(collection.chroma_collection_name)
                logger.info(f"✅ Deleted ChromaDB collection: {collection.chroma_collection_name}")
            except Exception as e:
                logger.warning(f"Failed to delete ChromaDB collection: {e}")
            
            await self.db.commit()
            
            logger.info(f"✅ Deleted collection: {collection.name} (ID: {collection_id})")
            
            return {
                "success": True,
                "message": f"Collection '{collection.name}' deleted successfully"
            }
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to delete collection: {str(e)}")
            raise Exception(f"Failed to delete collection: {str(e)}") 