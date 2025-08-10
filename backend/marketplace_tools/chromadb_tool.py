"""
ChromaDB Document Store Tool
Allows uploading files, extracting them into ChromaDB collections, and querying for agent use.
"""

import chromadb
from chromadb.config import Settings
import os
import tempfile
import hashlib
from typing import Dict, List, Any, Optional, Union
import json
from datetime import datetime
import mimetypes
import PyPDF2
import docx
import csv
import io
import base64

class ChromaDBTool:
    def __init__(self):
        self.name = "chromadb_tool"
        self.description = "Upload files, extract them into ChromaDB collections, and query for agent use"
        self.category = "Data Storage"
        self.tool_type = "vector_database"
        
    def get_config_schema(self) -> Dict[str, Any]:
        """Get the configuration schema for this tool"""
        return {
            "name": "ChromaDB Document Store",
            "description": "Upload and query documents using ChromaDB vector database",
            "parameters": {
                "collection_name": {
                    "type": "string",
                    "description": "Name of the ChromaDB collection to use",
                    "default": "documents"
                },
                "embedding_model": {
                    "type": "string",
                    "description": "Embedding model to use (default: all-MiniLM-L6-v2)",
                    "default": "all-MiniLM-L6-v2"
                },
                "chunk_size": {
                    "type": "integer",
                    "description": "Size of text chunks for embedding",
                    "default": 1000
                },
                "chunk_overlap": {
                    "type": "integer",
                    "description": "Overlap between text chunks",
                    "default": 200
                },
                "persist_directory": {
                    "type": "string",
                    "description": "Directory to persist ChromaDB data",
                    "default": "./chroma_db"
                }
            },
            "required": ["collection_name"]
        }

    def _get_chroma_client(self, config: Dict[str, Any]):
        """Get ChromaDB client"""
        persist_directory = config.get("persist_directory", "./chroma_db")
        
        # Ensure directory exists
        os.makedirs(persist_directory, exist_ok=True)
        
        return chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )

    def _get_collection(self, config: Dict[str, Any]):
        """Get or create ChromaDB collection"""
        client = self._get_chroma_client(config)
        collection_name = config.get("collection_name", "documents")
        
        try:
            collection = client.get_collection(collection_name)
        except:
            # Create collection if it doesn't exist
            collection = client.create_collection(
                name=collection_name,
                metadata={"description": "Document collection for AI agent queries"}
            )
        
        return collection

    def _extract_text_from_file(self, file_content: bytes, file_name: str) -> str:
        """Extract text from various file types"""
        file_extension = os.path.splitext(file_name)[1].lower()
        
        try:
            if file_extension == '.txt':
                return file_content.decode('utf-8')
            
            elif file_extension == '.pdf':
                return self._extract_pdf_text(file_content)
            
            elif file_extension == '.docx':
                return self._extract_docx_text(file_content)
            
            elif file_extension == '.csv':
                return self._extract_csv_text(file_content)
            
            elif file_extension == '.json':
                return self._extract_json_text(file_content)
            
            else:
                # Try to decode as text
                try:
                    return file_content.decode('utf-8')
                except:
                    return f"Binary file: {file_name} (content not extractable)"
                    
        except Exception as e:
            return f"Error extracting text from {file_name}: {str(e)}"

    def _extract_pdf_text(self, file_content: bytes) -> str:
        """Extract text from PDF file"""
        text = ""
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        except Exception as e:
            text = f"Error reading PDF: {str(e)}"
        return text

    def _extract_docx_text(self, file_content: bytes) -> str:
        """Extract text from DOCX file"""
        text = ""
        try:
            doc = docx.Document(io.BytesIO(file_content))
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
        except Exception as e:
            text = f"Error reading DOCX: {str(e)}"
        return text

    def _extract_csv_text(self, file_content: bytes) -> str:
        """Extract text from CSV file"""
        text = ""
        try:
            csv_content = file_content.decode('utf-8')
            csv_reader = csv.reader(io.StringIO(csv_content))
            for row in csv_reader:
                text += ", ".join(row) + "\n"
        except Exception as e:
            text = f"Error reading CSV: {str(e)}"
        return text

    def _extract_json_text(self, file_content: bytes) -> str:
        """Extract text from JSON file"""
        try:
            json_data = json.loads(file_content.decode('utf-8'))
            return json.dumps(json_data, indent=2)
        except Exception as e:
            return f"Error reading JSON: {str(e)}"

    def _chunk_text(self, text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
        """Split text into chunks"""
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            
            # If this isn't the last chunk, try to break at a sentence boundary
            if end < len(text):
                # Look for sentence endings
                for i in range(end, max(start + chunk_size - 100, start), -1):
                    if text[i] in '.!?':
                        end = i + 1
                        break
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = end - chunk_overlap
            if start >= len(text):
                break
        
        return chunks

    async def upload_file(self, config: Dict[str, Any], file_content: bytes, file_name: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Upload and process a file into ChromaDB"""
        try:
            # Extract text from file
            text = self._extract_text_from_file(file_content, file_name)
            
            if not text.strip():
                return {
                    "success": False,
                    "error": "No text content extracted from file"
                }
            
            # Get collection
            collection = self._get_collection(config)
            
            # Chunk text
            chunk_size = config.get("chunk_size", 1000)
            chunk_overlap = config.get("chunk_overlap", 200)
            chunks = self._chunk_text(text, chunk_size, chunk_overlap)
            
            # Prepare documents for insertion
            documents = []
            metadatas = []
            ids = []
            
            file_hash = hashlib.md5(file_content).hexdigest()
            timestamp = datetime.now().isoformat()
            
            for i, chunk in enumerate(chunks):
                chunk_id = f"{file_hash}_{i}"
                
                documents.append(chunk)
                metadatas.append({
                    "file_name": file_name,
                    "file_hash": file_hash,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "upload_timestamp": timestamp,
                    "file_size": len(file_content),
                    **(metadata or {})
                })
                ids.append(chunk_id)
            
            # Add to collection
            collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            
            return {
                "success": True,
                "message": f"File uploaded successfully: {file_name}",
                "file_name": file_name,
                "chunks_created": len(chunks),
                "total_chunks": len(chunks),
                "file_hash": file_hash
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error uploading file: {str(e)}"
            }

    async def query_documents(self, config: Dict[str, Any], query: str, n_results: int = 5, filter_metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Query documents from ChromaDB"""
        try:
            # Get collection
            collection = self._get_collection(config)
            
            # Prepare where filter
            where_filter = None
            if filter_metadata:
                where_filter = {}
                for key, value in filter_metadata.items():
                    where_filter[key] = value
            
            # Query collection
            results = collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where_filter,
                include=["documents", "metadatas", "distances"]
            )
            
            if not results['documents'] or not results['documents'][0]:
                return {
                    "success": False,
                    "error": "No relevant documents found"
                }
            
            # Format results
            formatted_results = []
            for i, (doc, metadata, distance) in enumerate(zip(
                results['documents'][0],
                results['metadatas'][0],
                results['distances'][0]
            )):
                formatted_results.append({
                    "content": doc,
                    "metadata": metadata,
                    "similarity_score": 1 - distance,  # Convert distance to similarity
                    "rank": i + 1
                })
            
            return {
                "success": True,
                "query": query,
                "results": formatted_results,
                "total_results": len(formatted_results),
                "summary": f"Found {len(formatted_results)} relevant document chunks"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error querying documents: {str(e)}"
            }

    async def list_collections(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """List all collections"""
        try:
            client = self._get_chroma_client(config)
            collections = client.list_collections()
            
            collection_info = []
            for collection in collections:
                collection_info.append({
                    "name": collection.name,
                    "count": collection.count(),
                    "metadata": collection.metadata
                })
            
            return {
                "success": True,
                "collections": collection_info,
                "total_collections": len(collection_info)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error listing collections: {str(e)}"
            }

    async def delete_collection(self, config: Dict[str, Any], collection_name: str = None) -> Dict[str, Any]:
        """Delete a collection"""
        try:
            client = self._get_chroma_client(config)
            collection_name = collection_name or config.get("collection_name", "documents")
            
            client.delete_collection(collection_name)
            
            return {
                "success": True,
                "message": f"Collection '{collection_name}' deleted successfully"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error deleting collection: {str(e)}"
            }

    async def get_collection_stats(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Get statistics about the current collection"""
        try:
            collection = self._get_collection(config)
            
            # Get all documents to analyze
            results = collection.get()
            
            if not results['documents']:
                return {
                    "success": True,
                    "collection_name": collection.name,
                    "total_documents": 0,
                    "total_chunks": 0,
                    "files": []
                }
            
            # Analyze files
            files = {}
            for metadata in results['metadatas']:
                file_name = metadata.get('file_name', 'unknown')
                if file_name not in files:
                    files[file_name] = {
                        "chunks": 0,
                        "upload_timestamp": metadata.get('upload_timestamp'),
                        "file_size": metadata.get('file_size', 0)
                    }
                files[file_name]["chunks"] += 1
            
            return {
                "success": True,
                "collection_name": collection.name,
                "total_documents": len(files),
                "total_chunks": len(results['documents']),
                "files": [
                    {
                        "name": file_name,
                        "chunks": file_info["chunks"],
                        "upload_timestamp": file_info["upload_timestamp"],
                        "file_size": file_info["file_size"]
                    }
                    for file_name, file_info in files.items()
                ]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error getting collection stats: {str(e)}"
            }

# Create tool instance
chromadb_tool = ChromaDBTool() 