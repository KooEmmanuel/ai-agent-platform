// Background script for handling API communication and storage
class BackgroundService {
    constructor() {
        this.apiClient = new ExtensionApiClient();
        this.init();
    }

    init() {
        // Listen for messages from content scripts and popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });

        // Handle extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });

        // Handle tab updates
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'authenticate':
                    const authResult = await this.apiClient.authenticate(message.email, message.password);
                    sendResponse({ success: true, data: authResult });
                    break;

                case 'getOrganizations':
                    const orgs = await this.apiClient.getOrganizations();
                    sendResponse({ success: true, data: orgs });
                    break;

                case 'getOrganizationAgents':
                    const agents = await this.apiClient.getOrganizationAgents(message.organizationId);
                    sendResponse({ success: true, data: agents });
                    break;

                case 'createConversation':
                    const conversation = await this.apiClient.createOrganizationConversation(
                        message.organizationId,
                        message.conversationData
                    );
                    sendResponse({ success: true, data: conversation });
                    break;

                case 'streamMessage':
                    await this.handleStreamMessage(message, sendResponse);
                    break;

                case 'getStoredData':
                    const data = await this.getStoredData(message.keys);
                    sendResponse({ success: true, data });
                    break;

                case 'storeData':
                    await this.storeData(message.data);
                    sendResponse({ success: true });
                    break;

                case 'clearData':
                    await this.clearStoredData();
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Background service error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleStreamMessage(message, sendResponse) {
        try {
            await this.apiClient.streamOrganizationMessage(
                message.organizationId,
                message.conversationId,
                message.message,
                (chunk) => {
                    // Send chunk to content script
                    chrome.tabs.sendMessage(message.tabId, {
                        action: 'streamChunk',
                        chunk: chunk
                    });
                },
                (error) => {
                    // Send error to content script
                    chrome.tabs.sendMessage(message.tabId, {
                        action: 'streamError',
                        error: error.message
                    });
                },
                (data) => {
                    // Send completion to content script
                    chrome.tabs.sendMessage(message.tabId, {
                        action: 'streamComplete',
                        data: data
                    });
                }
            );
            
            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    handleInstallation(details) {
        if (details.reason === 'install') {
            // Set default settings
            this.setDefaultSettings();
        }
    }

    handleTabUpdate(tabId, changeInfo, tab) {
        // Inject content script if needed
        if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
            this.injectContentScript(tabId);
        }
    }

    async injectContentScript(tabId) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content-script/chatbot.js']
            });
            
            await chrome.scripting.insertCSS({
                target: { tabId: tabId },
                files: ['content-script/chatbot.css']
            });
        } catch (error) {
            // Content script already injected or tab not accessible
            console.log('Content script injection skipped:', error.message);
        }
    }

    async setDefaultSettings() {
        const defaultSettings = {
            theme: 'light',
            position: { x: 100, y: 100 },
            size: { width: 400, height: 600 },
            minimized: false,
            autoInject: true
        };
        
        await this.storeData({ settings: defaultSettings });
    }

    // Storage methods
    async getStoredData(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, (result) => {
                resolve(result);
            });
        });
    }

    async storeData(data) {
        return new Promise((resolve) => {
            chrome.storage.local.set(data, () => {
                resolve();
            });
        });
    }

    async clearStoredData() {
        return new Promise((resolve) => {
            chrome.storage.local.clear(() => {
                resolve();
            });
        });
    }
}

// API Client for background script
class ExtensionApiClient {
    constructor() {
        this.baseUrl = 'https://kwickbuild.up.railway.app/api/v1';
        this.token = null;
    }

    setToken(token) {
        this.token = token;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    async authenticate(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    async getOrganizations() {
        return this.request('/organizations');
    }

    async getOrganizationAgents(organizationId) {
        return this.request(`/organization-agents/organizations/${organizationId}/agents`);
    }

    async createOrganizationConversation(organizationId, conversationData) {
        return this.request(`/playground/organizations/${organizationId}/conversations`, {
            method: 'POST',
            body: JSON.stringify(conversationData)
        });
    }

    async streamOrganizationMessage(organizationId, conversationId, message, onChunk, onError, onComplete) {
        const url = `${this.baseUrl}/playground/organizations/${organizationId}/conversations/${conversationId}/messages/stream`;
        
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({ content: message, attachments: [] })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            onChunk(data);
                        } catch (e) {
                            console.error('Failed to parse SSE data:', e);
                        }
                    }
                }
            }

            onComplete({ success: true });
        } catch (error) {
            console.error('Streaming error:', error);
            onError(error);
        }
    }
}

// Initialize background service
new BackgroundService();
