#!/usr/bin/env python3
"""
Seed script to create marketplace tools based on actual implementations
Run this script to populate the database with all 24 marketplace tools
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db, Tool, SYSTEM_USER_ID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete

# All 24 marketplace tools with their actual metadata
MARKETPLACE_TOOLS = [
    # Search Tools
    {
        "name": "web_search",
        "description": "Search the web using DuckDuckGo API with result filtering and formatting",
        "category": "Search",
        "tool_type": "API",
        "config": {
            "api_url": "https://api.duckduckgo.com/",
            "search_url": "https://html.duckduckgo.com/html/",
            "max_results": 10,
            "safe_search": True,
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query"
                    },
                    "result_type": {
                        "type": "string",
                        "description": "Type of results",
                        "enum": ["web", "news", "images"],
                        "default": "web"
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum number of results",
                        "default": 10
                    }
                },
                "required": ["query"]
            }
        },
        "is_public": True
    },
    {
        "name": "news_search",
        "description": "Search for latest news articles on any topic using multiple news APIs",
        "category": "Search",
        "tool_type": "API",
        "config": {
            "api_keys": {
                "newsapi": "YOUR_NEWS_API_KEY",
                "gnews": "YOUR_GNEWS_API_KEY",
                "bing": "YOUR_BING_API_KEY"
            },
            "default_language": "en",
            "max_results": 10,
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "News search query"
                    },
                    "api_source": {
                        "type": "string",
                        "description": "API source to use",
                        "enum": ["newsapi", "gnews", "bing"],
                        "default": "newsapi"
                    },
                    "language": {
                        "type": "string",
                        "description": "Language code",
                        "default": "en"
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum number of results",
                        "default": 10
                    }
                },
                "required": ["query"]
            }
        },
        "is_public": True
    },
    
    # Data Tools
    {
        "name": "weather_api",
        "description": "Get weather information using OpenWeatherMap API with forecasts and alerts",
        "category": "Data",
        "tool_type": "API",
        "config": {
            "api_key": "YOUR_OPENWEATHER_API_KEY",
            "base_url": "https://api.openweathermap.org/data/2.5",
            "units": "metric",
            "language": "en",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "Location for weather data"
                    },
                    "forecast_type": {
                        "type": "string",
                        "description": "Type of forecast",
                        "enum": ["current", "daily", "hourly"],
                        "default": "current"
                    },
                    "days": {
                        "type": "integer",
                        "description": "Number of days for forecast",
                        "default": 5
                    }
                },
                "required": ["location"]
            }
        },
        "is_public": True
    },
    {
        "name": "csv_processor",
        "description": "Process and analyze CSV data with various operations",
        "category": "Data",
        "tool_type": "Function",
        "config": {
            "max_file_size": 50 * 1024 * 1024,  # 50MB
            "supported_formats": ["csv", "xlsx", "json"],
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "Data operation to perform",
                        "enum": ["read", "write", "analyze", "transform", "filter", "sort"]
                    },
                    "file_path": {
                        "type": "string",
                        "description": "Path to CSV file"
                    },
                    "output_path": {
                        "type": "string",
                        "description": "Output file path"
                    }
                },
                "required": ["operation", "file_path"]
            }
        },
        "is_public": True
    },
    {
        "name": "database_query",
        "description": "Execute database queries safely with parameterized queries",
        "category": "Data",
        "tool_type": "Function",
        "config": {
            "connection_string": "YOUR_DATABASE_CONNECTION_STRING",
            "timeout": 30,
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "SQL query to execute"
                    },
                    "parameters": {
                        "type": "object",
                        "description": "Query parameters"
                    },
                    "operation_type": {
                        "type": "string",
                        "description": "Type of operation",
                        "enum": ["select", "insert", "update", "delete"],
                        "default": "select"
                    }
                },
                "required": ["query"]
            }
        },
        "is_public": True
    },
    {
        "name": "data_scraper",
        "description": "Scrape data from websites using various methods including CSS selectors",
        "category": "Data",
        "tool_type": "Function",
        "config": {
            "user_agent": "KooAgent Data Scraper 1.0",
            "timeout": 30,
            "max_pages": 10,
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "URL to scrape"
                    },
                    "selectors": {
                        "type": "object",
                        "description": "CSS selectors for data extraction"
                    },
                    "output_format": {
                        "type": "string",
                        "description": "Output format",
                        "enum": ["json", "csv", "xml"],
                        "default": "json"
                    }
                },
                "required": ["url"]
            }
        },
        "is_public": True
    },
    {
        "name": "file_processor",
        "description": "Process various file types including text, CSV, JSON, and images",
        "category": "Data",
        "tool_type": "Function",
        "config": {
            "max_file_size": 100 * 1024 * 1024,  # 100MB
            "supported_formats": ["txt", "json", "xml", "yaml", "csv", "xlsx", "docx"],
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "File operation",
                        "enum": ["read", "write", "convert", "validate", "compress", "extract"]
                    },
                    "file_path": {
                        "type": "string",
                        "description": "Path to file"
                    },
                    "output_path": {
                        "type": "string",
                        "description": "Output file path"
                    }
                },
                "required": ["operation", "file_path"]
            }
        },
        "is_public": True
    },
    {
        "name": "image_processor",
        "description": "Process images including resizing, filtering, and format conversion",
        "category": "Data",
        "tool_type": "Function",
        "config": {
            "max_file_size": 10 * 1024 * 1024,  # 10MB
            "supported_formats": ["jpg", "jpeg", "png", "gif", "bmp", "webp"],
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "Image operation",
                        "enum": ["resize", "crop", "rotate", "filter", "convert", "analyze"]
                    },
                    "image_path": {
                        "type": "string",
                        "description": "Path to image file"
                    },
                    "output_path": {
                        "type": "string",
                        "description": "Output file path"
                    },
                    "width": {
                        "type": "integer",
                        "description": "Target width"
                    },
                    "height": {
                        "type": "integer",
                        "description": "Target height"
                    }
                },
                "required": ["operation", "image_path"]
            }
        },
        "is_public": True
    },
    {
        "name": "pdf_processor",
        "description": "Process PDF files including text extraction and image extraction",
        "category": "Data",
        "tool_type": "Function",
        "config": {
            "max_file_size": 50 * 1024 * 1024,  # 50MB
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "PDF operation",
                        "enum": ["extract_text", "extract_images", "get_info", "split", "merge"]
                    },
                    "pdf_path": {
                        "type": "string",
                        "description": "Path to PDF file"
                    },
                    "output_path": {
                        "type": "string",
                        "description": "Output path"
                    }
                },
                "required": ["operation", "pdf_path"]
            }
        },
        "is_public": True
    },
    {
        "name": "text_analyzer",
        "description": "Perform various text analysis operations including sentiment analysis",
        "category": "Data",
        "tool_type": "Function",
        "config": {
            "max_text_length": 10000,
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "Text analysis operation",
                        "enum": ["sentiment", "keywords", "summary", "language_detect", "readability"]
                    },
                    "text": {
                        "type": "string",
                        "description": "Text to analyze"
                    },
                    "language": {
                        "type": "string",
                        "description": "Text language",
                        "default": "auto"
                    }
                },
                "required": ["operation", "text"]
            }
        },
        "is_public": True
    },
    {
        "name": "translation_service",
        "description": "Translate text between multiple languages using Deep Translator",
        "category": "Data",
        "tool_type": "Function",
        "config": {
            "default_source": "auto",
            "default_target": "en",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "Text to translate"
                    },
                    "source_language": {
                        "type": "string",
                        "description": "Source language code",
                        "default": "auto"
                    },
                    "target_language": {
                        "type": "string",
                        "description": "Target language code",
                        "default": "en"
                    }
                },
                "required": ["text", "target_language"]
            }
        },
        "is_public": True
    },
    
    # Analytics Tools
    {
        "name": "data_visualization",
        "description": "Create charts and graphs from data",
        "category": "Analytics",
        "tool_type": "Function",
        "config": {
            "default_style": "seaborn",
            "figure_size": [10, 6],
            "parameters": {
                "type": "object",
                "properties": {
                    "chart_type": {
                        "type": "string",
                        "description": "Type of chart",
                        "enum": ["bar", "line", "scatter", "pie", "histogram", "box", "heatmap"]
                    },
                    "data": {
                        "type": "object",
                        "description": "Data to visualize"
                    },
                    "title": {
                        "type": "string",
                        "description": "Chart title"
                    },
                    "x_label": {
                        "type": "string",
                        "description": "X-axis label"
                    },
                    "y_label": {
                        "type": "string",
                        "description": "Y-axis label"
                    }
                },
                "required": ["chart_type", "data"]
            }
        },
        "is_public": True
    },
    {
        "name": "statistical_analysis",
        "description": "Perform statistical analysis on datasets",
        "category": "Analytics",
        "tool_type": "Function",
        "config": {
            "confidence_level": 0.95,
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "Statistical operation",
                        "enum": ["descriptive", "hypothesis_test", "correlation", "regression", "distribution_test"]
                    },
                    "data": {
                        "type": "object",
                        "description": "Data for analysis"
                    },
                    "columns": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Columns to analyze"
                    }
                },
                "required": ["operation", "data"]
            }
        },
        "is_public": True
    },
    
    # Scheduling Tools
    {
        "name": "calendar_manager",
        "description": "Manage calendar operations including creating events and scheduling",
        "category": "Scheduling",
        "tool_type": "Function",
        "config": {
            "credentials_path": "path/to/credentials.json",
            "calendar_id": "primary",
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "Calendar operation",
                        "enum": ["create_event", "list_events", "update_event", "delete_event"]
                    },
                    "summary": {
                        "type": "string",
                        "description": "Event summary"
                    },
                    "start_time": {
                        "type": "string",
                        "description": "Event start time"
                    },
                    "end_time": {
                        "type": "string",
                        "description": "Event end time"
                    }
                },
                "required": ["operation"]
            }
        },
        "is_public": True
    },
    {
        "name": "reminder_tool",
        "description": "Set and manage reminders with notifications",
        "category": "Scheduling",
        "tool_type": "Function",
        "config": {
            "storage_file": "reminders.json",
            "default_timezone": "UTC",
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "Reminder operation",
                        "enum": ["create", "list", "update", "delete", "mark_completed"]
                    },
                    "title": {
                        "type": "string",
                        "description": "Reminder title"
                    },
                    "description": {
                        "type": "string",
                        "description": "Reminder description"
                    },
                    "due_date": {
                        "type": "string",
                        "description": "Due date"
                    },
                    "priority": {
                        "type": "string",
                        "description": "Priority level",
                        "enum": ["low", "medium", "high"],
                        "default": "medium"
                    }
                },
                "required": ["operation"]
            }
        },
        "is_public": True
    },
    {
        "name": "date_calculator",
        "description": "Perform date calculations and formatting operations",
        "category": "Scheduling",
        "tool_type": "Function",
        "config": {
            "default_timezone": "UTC",
            "default_date_format": "%Y-%m-%d",
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "Date operation",
                        "enum": ["add", "subtract", "format", "parse", "timezone_convert", "business_days"]
                    },
                    "date_input": {
                        "type": "string",
                        "description": "Input date string"
                    },
                    "years": {
                        "type": "integer",
                        "description": "Years to add/subtract"
                    },
                    "months": {
                        "type": "integer",
                        "description": "Months to add/subtract"
                    },
                    "days": {
                        "type": "integer",
                        "description": "Days to add/subtract"
                    }
                },
                "required": ["operation"]
            }
        },
        "is_public": True
    },
    
    # Communication Tools
    {
        "name": "email_sender",
        "description": "Send emails using SMTP with support for multiple email providers",
        "category": "Communication",
        "tool_type": "Function",
        "config": {
            "smtp_server": "smtp.gmail.com",
            "smtp_port": 587,
            "use_tls": True,
            "parameters": {
                "type": "object",
                "properties": {
                    "to_emails": {
                        "type": "string",
                        "description": "Recipient email addresses"
                    },
                    "subject": {
                        "type": "string",
                        "description": "Email subject"
                    },
                    "body": {
                        "type": "string",
                        "description": "Email body"
                    },
                    "cc_emails": {
                        "type": "string",
                        "description": "CC email addresses"
                    },
                    "bcc_emails": {
                        "type": "string",
                        "description": "BCC email addresses"
                    }
                },
                "required": ["to_emails", "subject", "body"]
            }
        },
        "is_public": True
    },
    {
        "name": "slack_integration",
        "description": "Send messages to Slack channels and manage Slack operations",
        "category": "Communication",
        "tool_type": "Webhook",
        "config": {
            "bot_token": "YOUR_SLACK_BOT_TOKEN",
            "webhook_url": "YOUR_SLACK_WEBHOOK_URL",
            "parameters": {
                "type": "object",
                "properties": {
                    "channel": {
                        "type": "string",
                        "description": "Slack channel"
                    },
                    "message": {
                        "type": "string",
                        "description": "Message to send"
                    },
                    "operation": {
                        "type": "string",
                        "description": "Slack operation",
                        "enum": ["send_message", "create_channel", "list_channels", "invite_users"],
                        "default": "send_message"
                    }
                },
                "required": ["channel", "message"]
            }
        },
        "is_public": True
    },
    {
        "name": "notification_service",
        "description": "Send various types of notifications including push notifications",
        "category": "Communication",
        "tool_type": "Function",
        "config": {
            "channels": ["email", "sms", "push", "webhook"],
            "parameters": {
                "type": "object",
                "properties": {
                    "channel": {
                        "type": "string",
                        "description": "Notification channel",
                        "enum": ["email", "sms", "push", "webhook"]
                    },
                    "message": {
                        "type": "string",
                        "description": "Notification message"
                    },
                    "recipient": {
                        "type": "string",
                        "description": "Recipient identifier"
                    },
                    "title": {
                        "type": "string",
                        "description": "Notification title"
                    }
                },
                "required": ["channel", "message", "recipient"]
            }
        },
        "is_public": True
    },
    {
        "name": "social_media",
        "description": "Interact with various social media platforms",
        "category": "Communication",
        "tool_type": "Function",
        "config": {
            "platforms": ["twitter", "facebook", "linkedin", "instagram"],
            "parameters": {
                "type": "object",
                "properties": {
                    "platform": {
                        "type": "string",
                        "description": "Social media platform",
                        "enum": ["twitter", "facebook", "linkedin", "instagram"]
                    },
                    "operation": {
                        "type": "string",
                        "description": "Social media operation",
                        "enum": ["post", "like", "comment", "share", "follow"]
                    },
                    "content": {
                        "type": "string",
                        "description": "Content to post"
                    }
                },
                "required": ["platform", "operation"]
            }
        },
        "is_public": True
    },
    
    # Integration Tools
    {
        "name": "google_sheets_integration",
        "description": "Read and write data to Google Sheets",
        "category": "Integration",
        "tool_type": "API",
        "config": {
            "credentials_path": "path/to/credentials.json",
            "scopes": ["https://www.googleapis.com/auth/spreadsheets"],
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "Sheets operation",
                        "enum": ["read_sheet", "write_sheet", "create_sheet", "update_cells"]
                    },
                    "spreadsheet_id": {
                        "type": "string",
                        "description": "Google Sheets spreadsheet ID"
                    },
                    "range": {
                        "type": "string",
                        "description": "Cell range (e.g., 'A1:D10')"
                    },
                    "data": {
                        "type": "array",
                        "description": "Data to write"
                    }
                },
                "required": ["operation", "spreadsheet_id"]
            }
        },
        "is_public": True
    },
    {
        "name": "payment_processor",
        "description": "Process payments, handle refunds, and manage payment analytics",
        "category": "Integration",
        "tool_type": "API",
        "config": {
            "providers": ["stripe", "paypal", "square"],
            "currency": "USD",
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "Payment operation",
                        "enum": ["charge", "refund", "get_transaction", "create_customer"]
                    },
                    "amount": {
                        "type": "number",
                        "description": "Transaction amount"
                    },
                    "currency": {
                        "type": "string",
                        "description": "Currency code",
                        "default": "USD"
                    },
                    "customer_id": {
                        "type": "string",
                        "description": "Customer identifier"
                    }
                },
                "required": ["operation"]
            }
        },
        "is_public": True
    },
    {
        "name": "webhook_handler",
        "description": "Handle webhooks including sending webhooks to external services",
        "category": "Integration",
        "tool_type": "Webhook",
        "config": {
            "timeout": 30,
            "max_retries": 3,
            "parameters": {
                "type": "object",
                "properties": {
                    "webhook_url": {
                        "type": "string",
                        "description": "Webhook URL"
                    },
                    "data": {
                        "type": "object",
                        "description": "Data to send"
                    },
                    "method": {
                        "type": "string",
                        "description": "HTTP method",
                        "enum": ["POST", "GET", "PUT", "DELETE"],
                        "default": "POST"
                    }
                },
                "required": ["webhook_url", "data"]
            }
        },
        "is_public": True
    },
    {
        "name": "zapier_webhook",
        "description": "Trigger Zapier automations via webhooks",
        "category": "Integration",
        "tool_type": "Webhook",
        "config": {
            "webhook_url": "YOUR_ZAPIER_WEBHOOK_URL",
            "timeout": 30,
            "parameters": {
                "type": "object",
                "properties": {
                    "data": {
                        "type": "object",
                        "description": "Data to send to Zapier"
                    },
                    "headers": {
                        "type": "object",
                        "description": "Additional headers"
                    }
                },
                "required": ["data"]
            }
        },
        "is_public": True
    }
]

async def seed_marketplace_tools():
    """Seed the database with marketplace tools"""
    async for db in get_db():
        try:
            # Delete existing system tools
            print("🗑️  Clearing existing system tools...")
            result = await db.execute(
                delete(Tool).where(Tool.user_id == SYSTEM_USER_ID)
            )
            deleted_count = result.rowcount
            print(f"   Deleted {deleted_count} existing system tools")
            
            await db.commit()
            
            # Create marketplace tools
            tools_created = 0
            print(f"\n🌱 Creating {len(MARKETPLACE_TOOLS)} marketplace tools...")
            
            for tool_data in MARKETPLACE_TOOLS:
                tool = Tool(
                    user_id=SYSTEM_USER_ID,
                    name=tool_data["name"],
                    description=tool_data["description"],
                    category=tool_data["category"],
                    tool_type=tool_data["tool_type"],
                    config=tool_data["config"],
                    is_public=tool_data["is_public"],
                    is_active=True,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                db.add(tool)
                tools_created += 1
                print(f"   ✅ {tool_data['name']} ({tool_data['category']} - {tool_data['tool_type']})")
            
            await db.commit()
            print(f"\n🎉 Successfully created {tools_created} marketplace tools!")
            
            # Print summary by category
            print("\n📊 Tools by Category:")
            categories = {}
            for tool_data in MARKETPLACE_TOOLS:
                cat = tool_data['category']
                if cat not in categories:
                    categories[cat] = []
                categories[cat].append(tool_data['name'])
            
            for category, tools in categories.items():
                print(f"   {category}: {len(tools)} tools")
                for tool_name in tools:
                    print(f"     • {tool_name}")
            
        except Exception as e:
            print(f"❌ Error seeding marketplace tools: {e}")
            await db.rollback()
            raise
        finally:
            await db.close()

if __name__ == "__main__":
    print("🚀 Seeding marketplace tools...")
    asyncio.run(seed_marketplace_tools())
    print("✅ Seeding completed!")