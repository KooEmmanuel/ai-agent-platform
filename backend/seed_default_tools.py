#!/usr/bin/env python3
"""
Seed script to create default tools for the platform
Run this script to populate the database with useful default tools
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db, Tool, SYSTEM_USER_ID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

# Default tools configuration - Updated to match marketplace tool names
DEFAULT_TOOLS = [
    # Search Tools
    {
        "name": "web_search",
        "description": "Search the web for current information using DuckDuckGo",
        "category": "Search",
        "tool_type": "Function",
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
                        "description": "Type of results (web, news, images)",
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
        "description": "Search for latest news articles on any topic",
        "category": "Search",
        "tool_type": "Function",
        "config": {
            "api_keys": {
                "newsapi": "YOUR_NEWS_API_KEY",
                "gnews": "YOUR_GNEWS_API_KEY",
                "bing": "YOUR_BING_API_KEY"
            },
            "default_source": "newsapi",
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
    {
        "name": "weather_api",
        "description": "Get current weather information for any location",
        "category": "Data",
        "tool_type": "Function",
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
                        "description": "City name, coordinates, or location query"
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
    
    # Scheduling Tools
    {
        "name": "calendar_manager",
        "description": "Create and manage calendar events using Google Calendar",
        "category": "Scheduling",
        "tool_type": "Function",
        "config": {
            "credentials_path": "path/to/credentials.json",
            "token_path": "token.pickle",
            "calendar_id": "primary",
            "scopes": ["https://www.googleapis.com/auth/calendar"],
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "Calendar operation to perform",
                        "enum": ["create_event", "list_events", "update_event", "delete_event", "check_availability"]
                    },
                    "summary": {
                        "type": "string",
                        "description": "Event summary/title"
                    },
                    "start_time": {
                        "type": "string",
                        "description": "Event start time (ISO format)"
                    },
                    "end_time": {
                        "type": "string",
                        "description": "Event end time (ISO format)"
                    },
                    "description": {
                        "type": "string",
                        "description": "Event description"
                    },
                    "location": {
                        "type": "string",
                        "description": "Event location"
                    }
                },
                "required": ["operation"]
            }
        },
        "is_public": True
    },
    {
        "name": "reminder_tool",
        "description": "Set and manage reminders with various notification options",
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
                        "enum": ["create", "list", "update", "delete", "get", "mark_completed", "snooze"]
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
                        "description": "Due date and time (ISO format)"
                    },
                    "priority": {
                        "type": "string",
                        "description": "Priority level",
                        "enum": ["low", "medium", "high"],
                        "default": "medium"
                    },
                    "category": {
                        "type": "string",
                        "description": "Reminder category"
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
            "default_datetime_format": "%Y-%m-%d %H:%M:%S",
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "Date operation to perform",
                        "enum": ["add", "subtract", "format", "parse", "timezone_convert", "business_days", "date_range", "age_calculation", "week_info", "month_info"]
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
                    },
                    "timezone": {
                        "type": "string",
                        "description": "Timezone for date operations"
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
        "description": "Send emails using SMTP with support for multiple providers",
        "category": "Communication",
        "tool_type": "Function",
        "config": {
            "smtp_server": "smtp.gmail.com",
            "smtp_port": 587,
            "use_tls": True,
            "username": "YOUR_EMAIL",
            "password": "YOUR_APP_PASSWORD",
            "from_email": "YOUR_EMAIL",
            "from_name": "Your Name",
            "parameters": {
                "type": "object",
                "properties": {
                    "to_emails": {
                        "type": "string",
                        "description": "Recipient email addresses (comma-separated)"
                    },
                    "subject": {
                        "type": "string",
                        "description": "Email subject"
                    },
                    "body": {
                        "type": "string",
                        "description": "Email body (plain text)"
                    },
                    "html_body": {
                        "type": "string",
                        "description": "Email body (HTML format)"
                    },
                    "cc_emails": {
                        "type": "string",
                        "description": "CC email addresses (comma-separated)"
                    },
                    "bcc_emails": {
                        "type": "string",
                        "description": "BCC email addresses (comma-separated)"
                    }
                },
                "required": ["to_emails", "subject", "body"]
            }
        },
        "is_public": True
    },
    {
        "name": "slack_integration",
        "description": "Send messages and manage Slack channels",
        "category": "Communication",
        "tool_type": "Function",
        "config": {
            "bot_token": "YOUR_SLACK_BOT_TOKEN",
            "webhook_url": "YOUR_SLACK_WEBHOOK_URL",
            "default_channel": "#general",
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "Slack operation to perform",
                        "enum": ["send_message", "create_channel", "list_channels", "get_channel_info", "invite_users", "upload_file", "add_reaction", "pin_message", "get_user_info", "list_users"]
                    },
                    "channel": {
                        "type": "string",
                        "description": "Slack channel name or ID"
                    },
                    "message": {
                        "type": "string",
                        "description": "Message to send"
                    },
                    "user_ids": {
                        "type": "string",
                        "description": "User IDs to invite (comma-separated)"
                    }
                },
                "required": ["operation"]
            }
        },
        "is_public": True
    },
    
    # Data Processing Tools
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
                        "description": "CSV operation to perform",
                        "enum": ["read", "write", "filter", "sort", "analyze", "transform", "validate", "merge", "sample", "clean"]
                    },
                    "file_path": {
                        "type": "string",
                        "description": "Path to CSV file"
                    },
                    "output_path": {
                        "type": "string",
                        "description": "Output file path"
                    },
                    "filters": {
                        "type": "object",
                        "description": "Filter conditions"
                    },
                    "sort_columns": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Columns to sort by"
                    }
                },
                "required": ["operation", "file_path"]
            }
        },
        "is_public": True
    },
    {
        "name": "data_visualization",
        "description": "Create charts and graphs from data",
        "category": "Data",
        "tool_type": "Function",
        "config": {
            "default_style": "seaborn",
            "figure_size": [10, 6],
            "dpi": 100,
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "Visualization operation",
                        "enum": ["create_chart", "export_chart", "create_dashboard", "statistical_plot", "interactive_chart"]
                    },
                    "chart_type": {
                        "type": "string",
                        "description": "Type of chart to create",
                        "enum": ["bar", "line", "scatter", "pie", "histogram", "box", "heatmap", "area"]
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
                "required": ["operation", "chart_type", "data"]
            }
        },
        "is_public": True
    },
    {
        "name": "statistical_analysis",
        "description": "Perform statistical analysis on datasets",
        "category": "Data",
        "tool_type": "Function",
        "config": {
            "confidence_level": 0.95,
            "random_state": 42,
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "Statistical operation",
                        "enum": ["descriptive", "hypothesis_test", "correlation", "regression", "distribution_test", "outlier_detection", "anova", "chi_square", "normality_test"]
                    },
                    "data": {
                        "type": "object",
                        "description": "Data for analysis"
                    },
                    "columns": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Columns to analyze"
                    },
                    "test_type": {
                        "type": "string",
                        "description": "Type of statistical test"
                    },
                    "alpha": {
                        "type": "number",
                        "description": "Significance level",
                        "default": 0.05
                    }
                },
                "required": ["operation", "data"]
            }
        },
        "is_public": True
    },
    
    # Integration Tools
    {
        "name": "zapier_webhook",
        "description": "Trigger Zapier automations via webhooks",
        "category": "Integration",
        "tool_type": "Function",
        "config": {
            "webhook_url": "YOUR_ZAPIER_WEBHOOK_URL",
            "timeout": 30,
            "max_retries": 3,
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
                    },
                    "method": {
                        "type": "string",
                        "description": "HTTP method",
                        "enum": ["POST", "GET", "PUT", "DELETE"],
                        "default": "POST"
                    }
                },
                "required": ["data"]
            }
        },
        "is_public": True
    },
    {
        "name": "google_sheets_integration",
        "description": "Read and write data to Google Sheets",
        "category": "Integration",
        "tool_type": "Function",
        "config": {
            "credentials_path": "path/to/credentials.json",
            "token_path": "sheets_token.pickle",
            "scopes": ["https://www.googleapis.com/auth/spreadsheets"],
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "Sheets operation",
                        "enum": ["read_sheet", "write_sheet", "create_sheet", "update_cells", "format_range", "clear_range", "get_sheet_info", "batch_update"]
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
    
    # Additional Tools
    {
        "name": "text_analyzer",
        "description": "Analyze and process text with various NLP operations",
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
                        "enum": ["sentiment", "keywords", "summary", "language_detect", "readability", "word_count", "entities", "topics"]
                    },
                    "text": {
                        "type": "string",
                        "description": "Text to analyze"
                    },
                    "language": {
                        "type": "string",
                        "description": "Text language (optional)",
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
        "description": "Translate text between different languages",
        "category": "Data",
        "tool_type": "Function",
        "config": {
            "api_key": "YOUR_TRANSLATION_API_KEY",
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
    {
        "name": "image_processor",
        "description": "Process and manipulate images with various operations",
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
                        "enum": ["resize", "crop", "rotate", "filter", "convert", "analyze", "compress", "watermark"]
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
                        "description": "Target width for resize/crop"
                    },
                    "height": {
                        "type": "integer",
                        "description": "Target height for resize/crop"
                    }
                },
                "required": ["operation", "image_path"]
            }
        },
        "is_public": True
    },
    {
        "name": "pdf_processor",
        "description": "Extract text and data from PDF files",
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
                        "enum": ["extract_text", "extract_images", "get_info", "split", "merge", "convert"]
                    },
                    "pdf_path": {
                        "type": "string",
                        "description": "Path to PDF file"
                    },
                    "output_path": {
                        "type": "string",
                        "description": "Output path for results"
                    },
                    "page_range": {
                        "type": "string",
                        "description": "Page range (e.g., '1-5')"
                    }
                },
                "required": ["operation", "pdf_path"]
            }
        },
        "is_public": True
    },
    {
        "name": "file_processor",
        "description": "Process various file types and formats",
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
                        "enum": ["read", "write", "convert", "validate", "compress", "extract", "analyze"]
                    },
                    "file_path": {
                        "type": "string",
                        "description": "Path to file"
                    },
                    "output_path": {
                        "type": "string",
                        "description": "Output file path"
                    },
                    "format": {
                        "type": "string",
                        "description": "Target format for conversion"
                    }
                },
                "required": ["operation", "file_path"]
            }
        },
        "is_public": True
    },
    {
        "name": "data_scraper",
        "description": "Scrape and extract data from websites",
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
                    },
                    "follow_links": {
                        "type": "boolean",
                        "description": "Follow internal links",
                        "default": false
                    }
                },
                "required": ["url"]
            }
        },
        "is_public": True
    },
    {
        "name": "webhook_handler",
        "description": "Handle and process webhook requests",
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
                        "description": "Webhook URL to call"
                    },
                    "method": {
                        "type": "string",
                        "description": "HTTP method",
                        "enum": ["POST", "GET", "PUT", "DELETE"],
                        "default": "POST"
                    },
                    "headers": {
                        "type": "object",
                        "description": "HTTP headers"
                    },
                    "payload": {
                        "type": "object",
                        "description": "Request payload"
                    }
                },
                "required": ["webhook_url"]
            }
        },
        "is_public": True
    },
    {
        "name": "notification_service",
        "description": "Send notifications via various channels",
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
                    },
                    "priority": {
                        "type": "string",
                        "description": "Notification priority",
                        "enum": ["low", "normal", "high"],
                        "default": "normal"
                    }
                },
                "required": ["channel", "message", "recipient"]
            }
        },
        "is_public": True
    },
    {
        "name": "social_media",
        "description": "Post and interact with social media platforms",
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
                        "enum": ["post", "like", "comment", "share", "follow", "get_posts"]
                    },
                    "content": {
                        "type": "string",
                        "description": "Content to post"
                    },
                    "media_path": {
                        "type": "string",
                        "description": "Path to media file"
                    }
                },
                "required": ["platform", "operation"]
            }
        },
        "is_public": True
    },
    {
        "name": "payment_processor",
        "description": "Process payments and handle transactions",
        "category": "Integration",
        "tool_type": "Function",
        "config": {
            "providers": ["stripe", "paypal", "square"],
            "currency": "USD",
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "description": "Payment operation",
                        "enum": ["charge", "refund", "get_transaction", "create_customer", "get_balance"]
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
                    },
                    "description": {
                        "type": "string",
                        "description": "Transaction description"
                    }
                },
                "required": ["operation"]
            }
        },
        "is_public": True
    }
]

async def seed_default_tools():
    """Seed the database with default tools"""
    async for db in get_db():
        try:
            # Check if default tools already exist
            existing_tools = await db.execute(
                text("SELECT COUNT(*) FROM tools WHERE user_id = :user_id"),
                {"user_id": SYSTEM_USER_ID}
            )
            count = existing_tools.scalar()
            
            if count > 0:
                print(f"Default tools already exist ({count} tools found). Skipping seed.")
                return
            
            # Create default tools
            tools_created = 0
            for tool_data in DEFAULT_TOOLS:
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
            
            await db.commit()
            print(f"✅ Successfully created {tools_created} default tools!")
            
            # Print summary
            print("\n📋 Default Tools Created:")
            for tool_data in DEFAULT_TOOLS:
                print(f"  • {tool_data['name']} ({tool_data['category']} - {tool_data['tool_type']})")
            
        except Exception as e:
            print(f"❌ Error seeding default tools: {e}")
            await db.rollback()
            raise
        finally:
            await db.close()

if __name__ == "__main__":
    print("🌱 Seeding default tools...")
    asyncio.run(seed_default_tools())
    print("✅ Seed completed!") 