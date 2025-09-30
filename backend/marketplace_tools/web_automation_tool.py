"""
Web Automation Tool

A powerful tool for automating web interactions using Playwright.
Supports form filling, clicking, navigation, screenshot capture, and more.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
import base64
import io
from PIL import Image

from .base import BaseTool

logger = logging.getLogger(__name__)

class WebAutomationTool(BaseTool):
    """
    Web Automation Tool for browser automation and web interactions.
    
    Features:
    - Form filling and submission
    - Clicking elements and navigation
    - Screenshot capture
    - Data extraction
    - PDF generation
    - JavaScript execution
    - Network request interception
    - Mobile device emulation
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.name = "Web Automation Tool"
        self.description = "Automate web interactions, form filling, and browser tasks"
        self.category = "Automation"
        self.tool_type = "Browser"
        
        # Browser configuration
        self.headless = config.get('headless', True)
        self.browser_type = config.get('browser_type', 'chromium')  # chromium, firefox, webkit
        self.viewport_width = config.get('viewport_width', 1280)
        self.viewport_height = config.get('viewport_height', 720)
        self.user_agent = config.get('user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        self.timeout = config.get('timeout', 30000)  # 30 seconds
        
        # Mobile device emulation
        self.mobile_device = config.get('mobile_device', None)
        self.mobile_devices = {
            'iPhone 12': {'width': 390, 'height': 844, 'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'},
            'iPhone 13': {'width': 390, 'height': 844, 'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)'},
            'Samsung Galaxy S21': {'width': 384, 'height': 854, 'user_agent': 'Mozilla/5.0 (Linux; Android 11; SM-G991B)'},
            'iPad': {'width': 768, 'height': 1024, 'user_agent': 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)'}
        }
        
        # Browser instance (will be set during execution)
        self.browser = None
        self.context = None
        self.page = None
    
    def get_config_schema(self) -> Dict[str, Any]:
        """Get the configuration schema for this tool"""
        return {
            "name": "Web Automation Tool",
            "description": "Automate web interactions, form filling, and browser tasks",
            "parameters": {
                "headless": {
                    "type": "boolean",
                    "description": "Run browser in headless mode",
                    "default": True
                },
                "browser_type": {
                    "type": "string",
                    "description": "Browser type to use",
                    "enum": ["chromium", "firefox", "webkit"],
                    "default": "chromium"
                },
                "viewport_width": {
                    "type": "integer",
                    "description": "Browser viewport width",
                    "default": 1280,
                    "min": 320,
                    "max": 3840
                },
                "viewport_height": {
                    "type": "integer",
                    "description": "Browser viewport height",
                    "default": 720,
                    "min": 240,
                    "max": 2160
                },
                "user_agent": {
                    "type": "string",
                    "description": "Custom user agent string",
                    "default": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                },
                "timeout": {
                    "type": "integer",
                    "description": "Default timeout in milliseconds",
                    "default": 30000,
                    "min": 1000,
                    "max": 300000
                },
                "mobile_device": {
                    "type": "string",
                    "description": "Mobile device to emulate",
                    "enum": ["iPhone 12", "iPhone 13", "Samsung Galaxy S21", "iPad", "None"],
                    "default": "None"
                }
            },
            "capabilities": [
                "form_filling",
                "clicking_elements",
                "navigation",
                "screenshot_capture",
                "data_extraction",
                "pdf_generation",
                "javascript_execution",
                "network_interception",
                "mobile_emulation"
            ],
            "config_fields": [
                {
                    "name": "headless",
                    "type": "checkbox",
                    "label": "Headless Mode",
                    "description": "Run browser in headless mode (no visible window)",
                    "default": True,
                    "required": False
                },
                {
                    "name": "browser_type",
                    "type": "select",
                    "label": "Browser Type",
                    "description": "Choose the browser engine to use",
                    "options": ["chromium", "firefox", "webkit"],
                    "default": "chromium",
                    "required": False
                },
                {
                    "name": "viewport_width",
                    "type": "number",
                    "label": "Viewport Width",
                    "description": "Browser window width in pixels",
                    "default": 1280,
                    "min": 320,
                    "max": 3840,
                    "required": False
                },
                {
                    "name": "viewport_height",
                    "type": "number",
                    "label": "Viewport Height",
                    "description": "Browser window height in pixels",
                    "default": 720,
                    "min": 240,
                    "max": 2160,
                    "required": False
                },
                {
                    "name": "mobile_device",
                    "type": "select",
                    "label": "Mobile Device Emulation",
                    "description": "Emulate a mobile device",
                    "options": ["None", "iPhone 12", "iPhone 13", "Samsung Galaxy S21", "iPad"],
                    "default": "None",
                    "required": False
                }
            ]
        }
    
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute web automation tasks.
        
        Args:
            action: Type of action to perform (navigate, fill_form, click, screenshot, extract_data, etc.)
            url: URL to navigate to
            form_data: Dictionary of form fields to fill
            selector: CSS selector for element to interact with
            text: Text to type or click
            screenshot_path: Path to save screenshot
            pdf_path: Path to save PDF
            wait_for: Element selector to wait for
            javascript: JavaScript code to execute
            mobile_device: Mobile device to emulate
            viewport: Custom viewport settings
            headers: Custom headers to set
            cookies: Cookies to set
            
        Returns:
            Dictionary containing automation results
        """
        action = kwargs.get('action', 'navigate')
        url = kwargs.get('url', '')
        
        if not url and action in ['navigate', 'fill_form', 'click', 'screenshot', 'extract_data']:
            return self._format_error("URL is required for this action")
        
        try:
            async with async_playwright() as p:
                # Launch browser
                browser = await self._launch_browser(p, kwargs)
                context = await self._create_context(browser, kwargs)
                page = await context.new_page()
                
                # Set up page
                await self._setup_page(page, kwargs)
                
                # Navigate to URL if provided
                if url:
                    await page.goto(url, wait_until='networkidle', timeout=self.timeout)
                    logger.info(f"🌐 Navigated to: {url}")
                
                # Execute the requested action
                result = await self._execute_action(page, action, kwargs)
                
                # Clean up
                await browser.close()
                
                return self._format_success(result, {
                    'action': action,
                    'url': url,
                    'timestamp': datetime.utcnow().isoformat()
                })
                
        except Exception as e:
            logger.error(f"Web automation error: {str(e)}")
            return self._format_error(f"Web automation failed: {str(e)}")
    
    async def _launch_browser(self, playwright, kwargs: Dict[str, Any]) -> Browser:
        """Launch browser with specified configuration."""
        browser_type = kwargs.get('browser_type', self.browser_type)
        headless = kwargs.get('headless', self.headless)
        
        if browser_type == 'chromium':
            browser = await playwright.chromium.launch(headless=headless)
        elif browser_type == 'firefox':
            browser = await playwright.firefox.launch(headless=headless)
        elif browser_type == 'webkit':
            browser = await playwright.webkit.launch(headless=headless)
        else:
            browser = await playwright.chromium.launch(headless=headless)
        
        logger.info(f"🚀 Launched {browser_type} browser (headless: {headless})")
        return browser
    
    async def _create_context(self, browser: Browser, kwargs: Dict[str, Any]) -> BrowserContext:
        """Create browser context with specified settings."""
        # Get viewport settings
        viewport = kwargs.get('viewport', {})
        width = viewport.get('width', self.viewport_width)
        height = viewport.get('height', self.viewport_height)
        
        # Mobile device emulation
        mobile_device = kwargs.get('mobile_device', self.mobile_device)
        if mobile_device and mobile_device != 'None' and mobile_device in self.mobile_devices:
            device = self.mobile_devices[mobile_device]
            width = device['width']
            height = device['height']
            user_agent = device['user_agent']
        else:
            user_agent = kwargs.get('user_agent', self.user_agent)
        
        # Create context
        context = await browser.new_context(
            viewport={'width': width, 'height': height},
            user_agent=user_agent
        )
        
        # Set headers if provided
        headers = kwargs.get('headers', {})
        if headers:
            await context.set_extra_http_headers(headers)
        
        # Set cookies if provided
        cookies = kwargs.get('cookies', [])
        if cookies:
            await context.add_cookies(cookies)
        
        logger.info(f"📱 Created context: {width}x{height} (mobile: {mobile_device})")
        return context
    
    async def _setup_page(self, page: Page, kwargs: Dict[str, Any]):
        """Set up page with additional configurations."""
        # Set timeout
        timeout = kwargs.get('timeout', self.timeout)
        page.set_default_timeout(timeout)
        
        # Set up request interception if needed
        if kwargs.get('intercept_requests', False):
            await page.route("**/*", self._handle_request)
        
        # Set up console logging
        page.on("console", lambda msg: logger.info(f"🖥️ Console: {msg.text}"))
        page.on("pageerror", lambda error: logger.error(f"❌ Page error: {error}"))
    
    async def _handle_request(self, route):
        """Handle intercepted requests."""
        request = route.request
        logger.info(f"🌐 Request: {request.method} {request.url}")
        await route.continue_()
    
    async def _execute_action(self, page: Page, action: str, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the specified action."""
        if action == 'navigate':
            return await self._action_navigate(page, kwargs)
        elif action == 'fill_form':
            return await self._action_fill_form(page, kwargs)
        elif action == 'click':
            return await self._action_click(page, kwargs)
        elif action == 'screenshot':
            return await self._action_screenshot(page, kwargs)
        elif action == 'extract_data':
            return await self._action_extract_data(page, kwargs)
        elif action == 'generate_pdf':
            return await self._action_generate_pdf(page, kwargs)
        elif action == 'execute_javascript':
            return await self._action_execute_javascript(page, kwargs)
        elif action == 'wait_for_element':
            return await self._action_wait_for_element(page, kwargs)
        elif action == 'scroll':
            return await self._action_scroll(page, kwargs)
        elif action == 'hover':
            return await self._action_hover(page, kwargs)
        else:
            return {'error': f'Unknown action: {action}'}
    
    async def _action_navigate(self, page: Page, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Navigate to a URL."""
        url = kwargs.get('url')
        wait_for = kwargs.get('wait_for')
        
        await page.goto(url, wait_until='networkidle')
        
        if wait_for:
            await page.wait_for_selector(wait_for)
        
        return {
            'action': 'navigate',
            'url': url,
            'title': await page.title(),
            'status': 'success'
        }
    
    async def _action_fill_form(self, page: Page, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Fill form fields."""
        form_data = kwargs.get('form_data', {})
        submit = kwargs.get('submit', False)
        submit_selector = kwargs.get('submit_selector', 'input[type="submit"], button[type="submit"]')
        
        filled_fields = []
        
        for field_name, value in form_data.items():
            try:
                # Try different selectors for the field
                selectors = [
                    f'input[name="{field_name}"]',
                    f'textarea[name="{field_name}"]',
                    f'select[name="{field_name}"]',
                    f'#{field_name}',
                    f'[name="{field_name}"]'
                ]
                
                filled = False
                for selector in selectors:
                    try:
                        element = await page.wait_for_selector(selector, timeout=5000)
                        if element:
                            await element.fill(str(value))
                            filled_fields.append(field_name)
                            filled = True
                            break
                    except:
                        continue
                
                if not filled:
                    logger.warning(f"Could not find field: {field_name}")
                    
            except Exception as e:
                logger.error(f"Error filling field {field_name}: {str(e)}")
        
        # Submit form if requested
        if submit:
            try:
                await page.click(submit_selector)
                await page.wait_for_load_state('networkidle')
            except Exception as e:
                logger.error(f"Error submitting form: {str(e)}")
        
        return {
            'action': 'fill_form',
            'filled_fields': filled_fields,
            'total_fields': len(form_data),
            'submitted': submit,
            'status': 'success'
        }
    
    async def _action_click(self, page: Page, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Click an element."""
        selector = kwargs.get('selector')
        text = kwargs.get('text')
        wait_for = kwargs.get('wait_for')
        
        if selector:
            await page.click(selector)
        elif text:
            await page.click(f'text="{text}"')
        else:
            return {'error': 'Either selector or text must be provided'}
        
        if wait_for:
            await page.wait_for_selector(wait_for)
        
        return {
            'action': 'click',
            'selector': selector,
            'text': text,
            'status': 'success'
        }
    
    async def _action_screenshot(self, page: Page, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Take a screenshot."""
        screenshot_path = kwargs.get('screenshot_path', 'screenshot.png')
        full_page = kwargs.get('full_page', True)
        
        screenshot_bytes = await page.screenshot(
            path=screenshot_path,
            full_page=full_page
        )
        
        # Convert to base64 for API response
        screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
        
        return {
            'action': 'screenshot',
            'path': screenshot_path,
            'base64': screenshot_base64,
            'full_page': full_page,
            'status': 'success'
        }
    
    async def _action_extract_data(self, page: Page, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Extract data from the page."""
        selectors = kwargs.get('selectors', {})
        extract_all_links = kwargs.get('extract_all_links', False)
        extract_all_images = kwargs.get('extract_all_images', False)
        
        extracted_data = {}
        
        # Extract data using provided selectors
        for key, selector in selectors.items():
            try:
                elements = await page.query_selector_all(selector)
                if len(elements) == 1:
                    extracted_data[key] = await elements[0].text_content()
                else:
                    extracted_data[key] = [await el.text_content() for el in elements]
            except Exception as e:
                logger.error(f"Error extracting {key}: {str(e)}")
                extracted_data[key] = None
        
        # Extract all links if requested
        if extract_all_links:
            links = await page.evaluate("""
                () => Array.from(document.querySelectorAll('a')).map(a => ({
                    text: a.textContent.trim(),
                    href: a.href,
                    title: a.title
                }))
            """)
            extracted_data['links'] = links
        
        # Extract all images if requested
        if extract_all_images:
            images = await page.evaluate("""
                () => Array.from(document.querySelectorAll('img')).map(img => ({
                    src: img.src,
                    alt: img.alt,
                    title: img.title,
                    width: img.width,
                    height: img.height
                }))
            """)
            extracted_data['images'] = images
        
        return {
            'action': 'extract_data',
            'data': extracted_data,
            'status': 'success'
        }
    
    async def _action_generate_pdf(self, page: Page, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Generate PDF from the page."""
        pdf_path = kwargs.get('pdf_path', 'page.pdf')
        pdf_options = kwargs.get('pdf_options', {})
        
        pdf_bytes = await page.pdf(
            path=pdf_path,
            **pdf_options
        )
        
        # Convert to base64 for API response
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        return {
            'action': 'generate_pdf',
            'path': pdf_path,
            'base64': pdf_base64,
            'status': 'success'
        }
    
    async def _action_execute_javascript(self, page: Page, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute JavaScript on the page."""
        javascript = kwargs.get('javascript', '')
        
        if not javascript:
            return {'error': 'JavaScript code is required'}
        
        try:
            result = await page.evaluate(javascript)
            return {
                'action': 'execute_javascript',
                'result': result,
                'status': 'success'
            }
        except Exception as e:
            return {
                'action': 'execute_javascript',
                'error': str(e),
                'status': 'error'
            }
    
    async def _action_wait_for_element(self, page: Page, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Wait for an element to appear."""
        selector = kwargs.get('selector')
        timeout = kwargs.get('timeout', self.timeout)
        
        if not selector:
            return {'error': 'Selector is required'}
        
        try:
            await page.wait_for_selector(selector, timeout=timeout)
            return {
                'action': 'wait_for_element',
                'selector': selector,
                'status': 'success'
            }
        except Exception as e:
            return {
                'action': 'wait_for_element',
                'error': str(e),
                'status': 'timeout'
            }
    
    async def _action_scroll(self, page: Page, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Scroll the page."""
        direction = kwargs.get('direction', 'down')
        amount = kwargs.get('amount', 500)
        
        if direction == 'down':
            await page.evaluate(f"window.scrollBy(0, {amount})")
        elif direction == 'up':
            await page.evaluate(f"window.scrollBy(0, -{amount})")
        elif direction == 'top':
            await page.evaluate("window.scrollTo(0, 0)")
        elif direction == 'bottom':
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        
        return {
            'action': 'scroll',
            'direction': direction,
            'amount': amount,
            'status': 'success'
        }
    
    async def _action_hover(self, page: Page, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Hover over an element."""
        selector = kwargs.get('selector')
        
        if not selector:
            return {'error': 'Selector is required'}
        
        try:
            await page.hover(selector)
            return {
                'action': 'hover',
                'selector': selector,
                'status': 'success'
            }
        except Exception as e:
            return {
                'action': 'hover',
                'error': str(e),
                'status': 'error'
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
                'Navigate to websites',
                'Fill web forms automatically',
                'Click buttons and links',
                'Extract data from web pages',
                'Take screenshots',
                'Generate PDFs from web pages',
                'Execute JavaScript code',
                'Mobile device emulation',
                'Multi-browser support (Chromium, Firefox, WebKit)',
                'Headless and headed browser modes'
            ],
            'supported_actions': [
                'navigate',
                'fill_form', 
                'click',
                'extract_data',
                'screenshot',
                'pdf',
                'evaluate_js'
            ],
            'supported_browsers': ['chromium', 'firefox', 'webkit'],
            'parameters': {
                'action': 'Action to perform (required)',
                'url': 'URL to navigate to (for navigate action)',
                'form_data': 'Form data to fill (for fill_form action)',
                'selector': 'CSS selector for click or extract actions',
                'extract_selectors': 'Selectors for data extraction',
                'screenshot_path': 'Path to save screenshot',
                'pdf_path': 'Path to save PDF',
                'javascript': 'JavaScript code to execute',
                'wait_time': 'Time to wait after action (milliseconds)'
            }
        }