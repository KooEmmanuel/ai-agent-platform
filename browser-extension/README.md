# AI Agent Assistant Browser Extension

A Chrome extension that brings your AI agents to any website. Access your organization's AI agents from any webpage with a floating chatbot interface.

## Features

- 🔐 **Secure Authentication** - Login with your existing platform credentials
- 🏢 **Organization Support** - Switch between different organizations
- 🤖 **Agent Selection** - Choose from available AI agents
- 💬 **Floating Chat** - Draggable, resizable chat interface on any website
- 🔄 **Real-time Streaming** - Same streaming experience as the web platform
- 💾 **Persistent State** - Remembers your selections across sessions
- 📱 **Responsive Design** - Works on all screen sizes

## Installation

### Development Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `browser-extension` folder
4. The extension will appear in your extensions list

### Production Installation

1. Download the extension from the Chrome Web Store (coming soon)
2. Click "Add to Chrome" when prompted

## Usage

1. **Login**: Click the extension icon and sign in with your platform credentials
2. **Select Organization**: Choose from your available organizations
3. **Choose Agent**: Select an AI agent to chat with
4. **Start Chatting**: The floating chatbot will appear on the current page
5. **Drag & Resize**: Move the chatbot anywhere and resize as needed
6. **Minimize**: Click the minimize button to hide the chat interface

## Architecture

```
browser-extension/
├── manifest.json          # Extension configuration
├── popup/                 # Login and organization selection
│   ├── index.html
│   ├── popup.css
│   └── popup.js
├── content-script/        # Floating chatbot UI
│   ├── chatbot.js
│   └── chatbot.css
├── background/            # Background service worker
│   └── background.js
├── shared/               # Shared utilities (future)
└── assets/               # Icons and images
```

## API Integration

The extension uses the same API endpoints as the web platform:

- Authentication: `/api/v1/auth/login`
- Organizations: `/api/v1/organizations`
- Agents: `/api/v1/organization-agents/organizations/{id}/agents`
- Conversations: `/api/v1/playground/organizations/{id}/conversations`
- Streaming: `/api/v1/playground/organizations/{id}/conversations/{id}/messages/stream`

## Development

### Prerequisites

- Chrome browser
- Access to the AI Agent Platform backend

### Setup

1. Clone the repository
2. Navigate to the `browser-extension` folder
3. Load the extension in Chrome developer mode
4. Ensure the backend is running and accessible

### Building

The extension is built using vanilla JavaScript and doesn't require a build process. Simply load the folder directly in Chrome.

## Permissions

- `storage` - Store user preferences and session data
- `activeTab` - Access current tab information
- `scripting` - Inject content scripts
- `<all_urls>` - Work on any website

## Security

- All API communication uses HTTPS
- JWT tokens are stored securely in Chrome's local storage
- No sensitive data is stored in plain text
- Content scripts are sandboxed and isolated

## Troubleshooting

### Extension Not Loading
- Check that all files are present in the extension folder
- Verify the manifest.json syntax is correct
- Check Chrome's developer console for errors

### Authentication Issues
- Ensure the backend is running and accessible
- Check your credentials are correct
- Verify the API endpoints are responding

### Chatbot Not Appearing
- Check that the content script is injected
- Look for JavaScript errors in the page console
- Verify the organization and agent are selected

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
