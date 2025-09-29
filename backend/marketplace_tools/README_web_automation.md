# Web Automation Tool

A powerful browser automation tool built with Playwright that enables complex web interactions, form filling, data extraction, and more.

## Features

### 🚀 Core Capabilities
- **Form Filling**: Automatically fill and submit web forms
- **Element Interaction**: Click, hover, and interact with page elements
- **Navigation**: Navigate to URLs with custom headers and cookies
- **Screenshot Capture**: Take full-page or viewport screenshots
- **PDF Generation**: Convert web pages to PDF documents
- **Data Extraction**: Extract text, links, images, and structured data
- **JavaScript Execution**: Run custom JavaScript on pages
- **Mobile Emulation**: Test on mobile devices (iPhone, Android, iPad)

### 🌐 Browser Support
- **Chromium** (default) - Fast and reliable
- **Firefox** - Cross-browser testing
- **WebKit** - Safari compatibility

### 📱 Mobile Device Emulation
- iPhone 12/13
- Samsung Galaxy S21
- iPad
- Custom viewport sizes

## Usage Examples

### 1. Basic Navigation
```python
result = await tool.execute(
    action='navigate',
    url='https://example.com'
)
```

### 2. Form Filling
```python
result = await tool.execute(
    action='fill_form',
    url='https://example.com/contact',
    form_data={
        'name': 'John Doe',
        'email': 'john@example.com',
        'message': 'Hello World!'
    },
    submit=True
)
```

### 3. Screenshot Capture
```python
result = await tool.execute(
    action='screenshot',
    url='https://example.com',
    screenshot_path='screenshot.png',
    full_page=True
)
```

### 4. Data Extraction
```python
result = await tool.execute(
    action='extract_data',
    url='https://example.com',
    selectors={
        'title': 'h1',
        'description': '.description',
        'price': '.price'
    },
    extract_all_links=True,
    extract_all_images=True
)
```

### 5. PDF Generation
```python
result = await tool.execute(
    action='generate_pdf',
    url='https://example.com',
    pdf_path='document.pdf',
    pdf_options={
        'format': 'A4',
        'print_background': True
    }
)
```

### 6. JavaScript Execution
```python
result = await tool.execute(
    action='execute_javascript',
    url='https://example.com',
    javascript='return document.title;'
)
```

### 7. Mobile Device Testing
```python
result = await tool.execute(
    action='navigate',
    url='https://example.com',
    mobile_device='iPhone 12',
    screenshot_path='mobile_screenshot.png'
)
```

## Configuration Options

### Browser Settings
- `headless`: Run browser in headless mode (default: True)
- `browser_type`: Choose browser engine (chromium, firefox, webkit)
- `viewport_width`: Browser window width (default: 1280)
- `viewport_height`: Browser window height (default: 720)
- `timeout`: Default timeout in milliseconds (default: 30000)

### Mobile Emulation
- `mobile_device`: Emulate mobile device (iPhone 12, iPhone 13, Samsung Galaxy S21, iPad)
- Custom viewport settings for specific devices

### Advanced Features
- `headers`: Custom HTTP headers
- `cookies`: Set browser cookies
- `intercept_requests`: Enable request interception
- `wait_for`: Wait for specific elements to load

## Action Types

### Navigation Actions
- `navigate`: Navigate to a URL
- `wait_for_element`: Wait for an element to appear
- `scroll`: Scroll the page (up, down, top, bottom)

### Interaction Actions
- `click`: Click on elements
- `hover`: Hover over elements
- `fill_form`: Fill form fields
- `execute_javascript`: Run JavaScript code

### Data Actions
- `extract_data`: Extract data using CSS selectors
- `screenshot`: Capture page screenshots
- `generate_pdf`: Convert page to PDF

## Selector Examples

### CSS Selectors
```python
selectors = {
    'title': 'h1',
    'price': '.price',
    'description': '#description',
    'button': 'button[type="submit"]',
    'input': 'input[name="email"]'
}
```

### Form Field Selectors
The tool automatically tries multiple selectors for form fields:
- `input[name="field_name"]`
- `textarea[name="field_name"]`
- `select[name="field_name"]`
- `#field_name`
- `[name="field_name"]`

## Error Handling

The tool includes comprehensive error handling:
- **Timeout errors**: When elements don't appear within the specified time
- **Selector errors**: When CSS selectors don't match any elements
- **Navigation errors**: When URLs are unreachable
- **Form errors**: When form fields can't be found or filled

## Performance Tips

1. **Use headless mode** for better performance
2. **Set appropriate timeouts** based on page complexity
3. **Use specific selectors** instead of generic ones
4. **Enable request interception** only when needed
5. **Close browsers** properly to avoid memory leaks

## Security Considerations

- **Sandboxed execution**: Each automation runs in isolation
- **No persistent data**: Browser state is cleared between runs
- **Secure defaults**: Headless mode by default
- **Input validation**: All inputs are validated before execution

## Troubleshooting

### Common Issues

1. **Element not found**: Check CSS selectors and page structure
2. **Timeout errors**: Increase timeout values for slow pages
3. **Form submission fails**: Verify form structure and submit selectors
4. **Screenshot issues**: Check file permissions and disk space

### Debug Mode
Set `headless=False` to see the browser in action:
```python
result = await tool.execute(
    action='navigate',
    url='https://example.com',
    headless=False
)
```

## Integration with Other Tools

The Web Automation Tool can be combined with:
- **Data Scraper Tool**: For complex data extraction
- **PDF Generator Tool**: For document creation
- **Email Tool**: For sending automated reports
- **Notification Tool**: For alerting on automation results

## Examples for Common Use Cases

### E-commerce Automation
```python
# Fill out a product order form
result = await tool.execute(
    action='fill_form',
    url='https://shop.example.com/checkout',
    form_data={
        'first_name': 'John',
        'last_name': 'Doe',
        'email': 'john@example.com',
        'address': '123 Main St',
        'city': 'New York',
        'zip': '10001',
        'card_number': '4111111111111111',
        'expiry': '12/25',
        'cvv': '123'
    },
    submit=True
)
```

### Social Media Automation
```python
# Post to a social media platform
result = await tool.execute(
    action='fill_form',
    url='https://social.example.com/post',
    form_data={
        'content': 'Hello from automation!',
        'privacy': 'public'
    },
    submit=True
)
```

### Data Collection
```python
# Extract product information
result = await tool.execute(
    action='extract_data',
    url='https://shop.example.com/product/123',
    selectors={
        'name': '.product-title',
        'price': '.price',
        'description': '.product-description',
        'rating': '.rating',
        'availability': '.stock-status'
    }
)
```

This tool provides powerful web automation capabilities that can handle complex scenarios while maintaining reliability and performance.