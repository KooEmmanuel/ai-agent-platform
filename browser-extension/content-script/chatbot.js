// Content script for floating chatbot UI
class FloatingChatbot {
    constructor() {
        console.log('🏗️ FloatingChatbot constructor called');
        this.isVisible = false;
        this.isMinimized = false;
        this.currentOrg = null;
        this.currentAgent = null;
        this.conversations = new Map();
        
        console.log('🏗️ Creating ExtensionApiClient...');
        if (typeof ExtensionApiClient !== 'undefined') {
            this.apiClient = new ExtensionApiClient();
            console.log('🏗️ ExtensionApiClient created:', this.apiClient);
        } else {
            console.log('⚠️ ExtensionApiClient not available, creating mock client');
            this.apiClient = {
                setToken: (token) => console.log('Mock setToken called with:', token),
                request: () => Promise.reject(new Error('API client not available'))
            };
        }
        
        this.init();
    }

    async init() {
        console.log('🏗️ FloatingChatbot.init() called');
        
        // Get token from storage and set it on API client
        await this.initializeApiClient();

        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('📨 Content script received message:', message);
            
            if (message.action === 'openChatbot') {
                console.log('🤖 Opening chatbot with:', {
                    organization: message.organization,
                    agent: message.agent
                });
                
                this.currentOrg = message.organization;
                this.currentAgent = message.agent;
                this.show();
                
                // Send response back to popup
                sendResponse({ success: true });
            }
        });

        // Check if chatbot should be restored
        await this.checkStoredState();
        
        // Add a simple test button to see if content script is working
        this.addTestButton();
    }

    addTestButton() {
        console.log('🧪 Adding test button...');
        
        // Remove existing test button if any
        const existing = document.getElementById('extension-test-btn');
        if (existing) {
            existing.remove();
        }
        
        const testBtn = document.createElement('button');
        testBtn.id = 'extension-test-btn';
        testBtn.textContent = '🤖 Test Extension';
        testBtn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        
        testBtn.onclick = () => {
            console.log('🧪 Test button clicked!');
            this.show();
        };
        
        document.body.appendChild(testBtn);
        console.log('✅ Test button added');
    }

    async initializeApiClient() {
        try {
            console.log('🔑 Initializing API client...');
            const result = await this.getStoredData(['token']);
            if (result.token) {
                this.apiClient.setToken(result.token);
                console.log('✅ API client initialized with token');
            } else {
                console.log('⚠️ No token found for API client');
            }
        } catch (error) {
            console.error('Failed to initialize API client:', error);
        }
    }

    async checkStoredState() {
        try {
            const result = await this.getStoredData(['selectedOrg', 'selectedAgent', 'isVisible']);
            
            if (result.selectedOrg && result.selectedAgent && result.isVisible) {
                this.currentOrg = result.selectedOrg;
                this.currentAgent = result.selectedAgent;
                this.show();
            }
        } catch (error) {
            console.error('Failed to restore chatbot state:', error);
        }
    }

    show() {
        console.log('🎯 FloatingChatbot.show() called');
        console.log('🎯 Current state:', {
            isVisible: this.isVisible,
            currentOrg: this.currentOrg,
            currentAgent: this.currentAgent
        });
        
        if (this.isVisible) {
            console.log('⚠️ Chatbot already visible, skipping');
            return;
        }

        console.log('🏗️ Creating chatbot UI...');
        this.createChatbotUI();
        this.isVisible = true;
        this.storeState();
        console.log('✅ Chatbot UI created and visible');
    }

    hide() {
        if (!this.isVisible) return;

        const chatbot = document.getElementById('ai-agent-chatbot');
        if (chatbot) {
            chatbot.remove();
        }

        this.isVisible = false;
        this.storeState();
    }

    createChatbotUI() {
        // Remove existing chatbot if any
        const existing = document.getElementById('ai-agent-chatbot');
        if (existing) {
            existing.remove();
        }

        // Create chatbot container
        const chatbot = document.createElement('div');
        chatbot.id = 'ai-agent-chatbot';
        chatbot.innerHTML = `
            <div class="chatbot-container">
                <div class="chatbot-header">
                    <div class="chatbot-title">
                        <span class="agent-icon">🤖</span>
                        <div class="title-text">
                            <div class="agent-name">${this.currentAgent?.name || 'AI Agent'}</div>
                            <div class="org-name">${this.currentOrg?.name || 'Organization'}</div>
                        </div>
                    </div>
                    <div class="chatbot-controls">
                        <button class="control-btn minimize-btn" title="Minimize">−</button>
                        <button class="control-btn close-btn" title="Close">×</button>
                    </div>
                </div>
                
                <div class="chatbot-body">
                    <div class="chatbot-messages" id="chatbot-messages">
                        <div class="welcome-message">
                            <div class="welcome-icon">👋</div>
                            <div class="welcome-text">
                                <h3>Hello! I'm ${this.currentAgent?.name || 'your AI assistant'}</h3>
                                <p>How can I help you today?</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="chatbot-input-container">
                        <div class="input-wrapper">
                            <textarea 
                                id="chatbot-input" 
                                placeholder="Type your message..." 
                                rows="1"
                            ></textarea>
                            <button id="chatbot-send" class="send-btn" disabled>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                                </svg>
                            </button>
                        </div>
                        <div class="input-footer">
                            <span class="typing-indicator" id="typing-indicator" style="display: none;">
                                AI is typing...
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add to page
        document.body.appendChild(chatbot);

        // Setup event listeners
        this.setupEventListeners();
        
        // Make it draggable
        this.makeDraggable();
    }

    setupEventListeners() {
        const chatbot = document.getElementById('ai-agent-chatbot');
        const input = document.getElementById('chatbot-input');
        const sendBtn = document.getElementById('chatbot-send');
        const minimizeBtn = chatbot.querySelector('.minimize-btn');
        const closeBtn = chatbot.querySelector('.close-btn');

        // Input handling
        input.addEventListener('input', () => {
            this.adjustTextareaHeight(input);
            sendBtn.disabled = !input.value.trim();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Send button
        sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });

        // Control buttons
        minimizeBtn.addEventListener('click', () => {
            this.toggleMinimize();
        });

        closeBtn.addEventListener('click', () => {
            this.hide();
        });

        // Click outside to focus input
        chatbot.addEventListener('click', (e) => {
            if (e.target === chatbot || e.target.classList.contains('chatbot-container')) {
                input.focus();
            }
        });
    }

    makeDraggable() {
        const chatbot = document.getElementById('ai-agent-chatbot');
        const header = chatbot.querySelector('.chatbot-header');
        
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('control-btn')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(chatbot.style.left) || 0;
            startTop = parseInt(chatbot.style.top) || 0;
            
            chatbot.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            chatbot.style.left = (startLeft + deltaX) + 'px';
            chatbot.style.top = (startTop + deltaY) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                chatbot.style.cursor = 'default';
                this.storePosition();
            }
        });
    }

    async sendMessage() {
        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();
        
        if (!message || !this.currentAgent) return;

        // Clear input
        input.value = '';
        this.adjustTextareaHeight(input);
        document.getElementById('chatbot-send').disabled = true;

        // Add user message to chat
        this.addMessage('user', message);

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Get or create conversation
            const conversationId = await this.getOrCreateConversation();
            
            // Send message to API
            await this.streamMessage(conversationId, message);
            
        } catch (error) {
            console.error('Failed to send message:', error);
            this.addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
        } finally {
            this.hideTypingIndicator();
        }
    }

    async getOrCreateConversation() {
        const key = `${this.currentOrg.id}-${this.currentAgent.id}`;
        
        if (this.conversations.has(key)) {
            return this.conversations.get(key);
        }

        try {
            // Create new conversation
            const conversation = await this.apiClient.createOrganizationConversation(
                this.currentOrg.id,
                {
                    agent_id: this.currentAgent.id,
                    first_user_message: 'Hello'
                }
            );
            
            this.conversations.set(key, conversation.id);
            return conversation.id;
            
        } catch (error) {
            console.error('Failed to create conversation:', error);
            throw error;
        }
    }

    async streamMessage(conversationId, message) {
        const messagesContainer = document.getElementById('chatbot-messages');
        
        // Create assistant message container
        const assistantMessage = document.createElement('div');
        assistantMessage.className = 'message assistant-message';
        assistantMessage.innerHTML = `
            <div class="message-content">
                <div class="message-text"></div>
            </div>
        `;
        messagesContainer.appendChild(assistantMessage);
        
        const messageText = assistantMessage.querySelector('.message-text');
        let fullResponse = '';

        try {
            await this.apiClient.streamOrganizationMessage(
                this.currentOrg.id,
                conversationId,
                message,
                (chunk) => {
                    if (chunk.type === 'content') {
                        fullResponse += chunk.content;
                        messageText.textContent = fullResponse;
                        this.scrollToBottom();
                    }
                },
                (error) => {
                    console.error('Streaming error:', error);
                    messageText.textContent = 'Sorry, I encountered an error while responding.';
                },
                (data) => {
                    console.log('Stream completed:', data);
                }
            );
        } catch (error) {
            console.error('Streaming failed:', error);
            messageText.textContent = 'Sorry, I encountered an error while responding.';
        }
    }

    addMessage(type, content) {
        const messagesContainer = document.getElementById('chatbot-messages');
        
        // Remove welcome message if it exists
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const message = document.createElement('div');
        message.className = `message ${type}-message`;
        message.innerHTML = `
            <div class="message-content">
                <div class="message-text">${this.escapeHtml(content)}</div>
            </div>
        `;
        
        messagesContainer.appendChild(message);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        document.getElementById('typing-indicator').style.display = 'block';
    }

    hideTypingIndicator() {
        document.getElementById('typing-indicator').style.display = 'none';
    }

    adjustTextareaHeight(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('chatbot-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    toggleMinimize() {
        const chatbot = document.getElementById('ai-agent-chatbot');
        const body = chatbot.querySelector('.chatbot-body');
        
        this.isMinimized = !this.isMinimized;
        
        if (this.isMinimized) {
            body.style.display = 'none';
            chatbot.classList.add('minimized');
        } else {
            body.style.display = 'block';
            chatbot.classList.remove('minimized');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Storage methods
    async storeState() {
        const state = {
            isVisible: this.isVisible,
            isMinimized: this.isMinimized,
            selectedOrg: this.currentOrg,
            selectedAgent: this.currentAgent
        };
        
        return new Promise((resolve) => {
            chrome.storage.local.set(state, resolve);
        });
    }

    async getStoredData(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, resolve);
        });
    }

    async storePosition() {
        const chatbot = document.getElementById('ai-agent-chatbot');
        if (chatbot) {
            const position = {
                left: parseInt(chatbot.style.left) || 0,
                top: parseInt(chatbot.style.top) || 0
            };
            
            return new Promise((resolve) => {
                chrome.storage.local.set({ chatbotPosition: position }, resolve);
            });
        }
    }
}

// Initialize chatbot when content script loads
console.log('🚀 Content script loaded on:', window.location.href);
console.log('🚀 ExtensionApiClient available:', typeof ExtensionApiClient !== 'undefined');

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 DOM loaded, initializing chatbot');
        new FloatingChatbot();
    });
} else {
    console.log('🚀 DOM already loaded, initializing chatbot immediately');
    new FloatingChatbot();
}
