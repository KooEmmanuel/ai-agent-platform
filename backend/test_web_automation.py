#!/usr/bin/env python3
"""
Test script for the Web Automation Tool
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from marketplace_tools.web_automation_tool import WebAutomationTool

async def test_web_automation():
    """Test the Web Automation Tool with various actions."""
    print("🧪 Testing Web Automation Tool...")
    
    # Initialize the tool
    config = {
        'headless': True,
        'browser_type': 'chromium',
        'viewport_width': 1280,
        'viewport_height': 720
    }
    
    tool = WebAutomationTool(config)
    
    # Test 1: Navigate to a website
    print("\n1. Testing navigation...")
    result = await tool.execute(
        action='navigate',
        url='https://httpbin.org/forms/post'
    )
    print(f"✅ Navigation result: {result.get('success', False)}")
    
    # Test 2: Fill a form
    print("\n2. Testing form filling...")
    result = await tool.execute(
        action='fill_form',
        url='https://httpbin.org/forms/post',
        form_data={
            'custname': 'John Doe',
            'custtel': '123-456-7890',
            'custemail': 'john@example.com',
            'size': 'large',
            'topping': 'bacon',
            'delivery': '19:30',
            'comments': 'Please deliver to the back door.'
        },
        submit=True
    )
    print(f"✅ Form filling result: {result.get('success', False)}")
    if result.get('success'):
        print(f"   Filled fields: {result.get('result', {}).get('filled_fields', [])}")
    
    # Test 3: Take a screenshot
    print("\n3. Testing screenshot...")
    result = await tool.execute(
        action='screenshot',
        url='https://example.com',
        screenshot_path='test_screenshot.png',
        full_page=True
    )
    print(f"✅ Screenshot result: {result.get('success', False)}")
    
    # Test 4: Extract data
    print("\n4. Testing data extraction...")
    result = await tool.execute(
        action='extract_data',
        url='https://example.com',
        selectors={
            'title': 'h1',
            'paragraph': 'p'
        },
        extract_all_links=True
    )
    print(f"✅ Data extraction result: {result.get('success', False)}")
    if result.get('success'):
        data = result.get('result', {}).get('data', {})
        print(f"   Extracted title: {data.get('title', 'N/A')}")
        print(f"   Found {len(data.get('links', []))} links")
    
    # Test 5: Generate PDF
    print("\n5. Testing PDF generation...")
    result = await tool.execute(
        action='generate_pdf',
        url='https://example.com',
        pdf_path='test_page.pdf'
    )
    print(f"✅ PDF generation result: {result.get('success', False)}")
    
    # Test 6: Execute JavaScript
    print("\n6. Testing JavaScript execution...")
    result = await tool.execute(
        action='execute_javascript',
        url='https://example.com',
        javascript='return document.title + " - " + window.location.href;'
    )
    print(f"✅ JavaScript execution result: {result.get('success', False)}")
    if result.get('success'):
        js_result = result.get('result', {}).get('result', 'N/A')
        print(f"   JavaScript result: {js_result}")
    
    print("\n🎉 Web Automation Tool tests completed!")

if __name__ == "__main__":
    asyncio.run(test_web_automation())