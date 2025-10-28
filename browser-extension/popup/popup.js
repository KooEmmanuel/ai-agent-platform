// Popup script for login and organization selection
class PopupApp {
    constructor() {
        this.apiClient = new ExtensionApiClient();
        this.currentUser = null;
        this.organizations = [];
        this.agents = [];
        this.currentOrg = null;
        
        this.init();
    }

    async init() {
        // Check if user is already logged in
        const token = await this.getStoredToken();
        if (token) {
            try {
                this.apiClient.setToken(token);
                await this.loadUserData();
                this.showOrgScreen();
            } catch (error) {
                console.error('Token validation failed:', error);
                await this.clearStoredData();
                this.showLoginScreen();
            }
        } else {
            this.showLoginScreen();
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Google login button
        document.getElementById('google-login-btn').addEventListener('click', () => {
            this.handleGoogleLogin();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Back to organizations button
        document.getElementById('back-to-orgs-btn').addEventListener('click', () => {
            this.showOrgScreen();
        });
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('login-btn');
        const errorDiv = document.getElementById('login-error');

        if (!email || !password) {
            this.showError(errorDiv, 'Please enter both email and password');
            return;
        }

        this.setLoading(loginBtn, true);
        this.hideError(errorDiv);

        try {
            console.log('🔐 Attempting login with:', { email, password: '***' });
            const response = await this.apiClient.authenticate(email, password);
            console.log('🔐 Login response:', response);
            
            if (response.access_token) {
                await this.storeToken(response.access_token);
                this.apiClient.setToken(response.access_token);
                this.currentUser = response.user;
                
                await this.loadUserData();
                this.showOrgScreen();
            } else {
                console.error('❌ Invalid response structure:', response);
                throw new Error('Invalid response from server. Expected access_token but got: ' + JSON.stringify(response));
            }
        } catch (error) {
            console.error('❌ Login failed:', error);
            let errorMessage = 'Login failed. Please try again.';
            
            if (error.message.includes('401')) {
                errorMessage = 'Invalid email or password. Please check your credentials.';
            } else if (error.message.includes('403')) {
                errorMessage = 'Access denied. Please contact support.';
            } else if (error.message.includes('500')) {
                errorMessage = 'Server error. Please try again later.';
            } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.showError(errorDiv, errorMessage);
        } finally {
            this.setLoading(loginBtn, false);
        }
    }

    async handleGoogleLogin() {
        const googleBtn = document.getElementById('google-login-btn');
        const errorDiv = document.getElementById('login-error');

        this.setLoading(googleBtn, true);
        this.hideError(errorDiv);

        try {
            console.log('🔐 Starting Google OAuth flow...');
            
            // Open the web platform for Google login
            const webPlatformUrl = 'https://www.drixai.com/auth/login';
            
            console.log('🔐 Opening web platform for Google login:', webPlatformUrl);
            
            // Open the web platform in a new tab for Google login
            chrome.tabs.create({ url: webPlatformUrl }, (tab) => {
                console.log('🔐 Opened tab:', tab.id);
                
                // Show instructions to the user
                this.showError(errorDiv, 'Please click "Continue with Google" on the Drixai login page, complete OAuth, then return here and click "Check Login Status" below.');
                
                // Add a button to check login status
                this.addCheckLoginButton();
                
                // Also show a success message to make it clear what to do next
                setTimeout(() => {
                    this.showError(errorDiv, '✅ Drixai login page opened! Complete Google login there, then click "Check Login Status" below.');
                }, 500);
            });
            
        } catch (error) {
            console.error('❌ Google login failed:', error);
            this.showError(errorDiv, error.message || 'Google login failed. Please try again.');
        } finally {
            this.setLoading(googleBtn, false);
        }
    }

    addCheckLoginButton() {
        // Remove any existing check button first
        const existingButton = document.getElementById('check-login-btn');
        if (existingButton) {
            existingButton.remove();
        }
        
        const checkButton = document.createElement('button');
        checkButton.id = 'check-login-btn';
        checkButton.textContent = 'Check Login Status';
        checkButton.className = 'btn btn-primary';
        checkButton.style.marginTop = '16px';
        checkButton.style.width = '100%';
        checkButton.onclick = () => this.checkForAuthToken();
        
        // Add the button after the Google login button
        const googleBtn = document.getElementById('google-login-btn');
        googleBtn.parentNode.insertBefore(checkButton, googleBtn.nextSibling);
    }

    async checkForAuthToken() {
        const checkButton = document.getElementById('check-login-btn');
        if (checkButton) {
            checkButton.disabled = true;
            checkButton.textContent = 'Checking...';
        }
        
        try {
            console.log('🔍 Checking for auth token...');
            
            // First, try to get token from localStorage of the web platform
            // We'll inject a script into the web platform to get the token
            const tabs = await chrome.tabs.query({ url: 'https://www.drixai.com/*' });
            
            if (tabs.length > 0) {
                console.log('🔍 Found web platform tab, trying to get token...');
                
                try {
                    // Inject script to get token and check current page
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        func: () => {
                            return {
                                token: localStorage.getItem('auth_token'),
                                user: localStorage.getItem('user'),
                                currentUrl: window.location.href,
                                isDashboard: window.location.pathname.includes('/dashboard'),
                                hasToast: document.querySelector('[data-testid="toast"]') !== null || 
                                         document.querySelector('.toast') !== null ||
                                         document.querySelector('[role="alert"]') !== null,
                                toastText: (() => {
                                    const toast = document.querySelector('[data-testid="toast"]') || 
                                                document.querySelector('.toast') || 
                                                document.querySelector('[role="alert"]');
                                    return toast ? toast.textContent : '';
                                })(),
                                isAlreadyLoggedIn: (() => {
                                    const bodyText = document.body.textContent || '';
                                    return bodyText.includes('Already logged in') || 
                                           bodyText.includes('Redirecting to dashboard');
                                })()
                            };
                        }
                    });
                    
                    const data = results[0].result;
                    console.log('🔍 Retrieved data from web platform:', data);
                    
                    // Check if user is already logged in and on dashboard
                    if (data.isDashboard && data.token) {
                        console.log('✅ User already logged in and on dashboard');
                        await this.handleSuccessfulLogin(data);
                        return;
                    }
                    
                    // Check if there's a token (user logged in but might be redirecting)
                    if (data.token) {
                        console.log('✅ User has token, checking if redirecting...');
                        
                        // If on login page but has token, wait a bit for potential redirect
                        if (data.currentUrl.includes('/auth/login')) {
                            console.log('⏳ User on login page with token, waiting for redirect...');
                            this.showError(document.getElementById('login-error'), '✅ You appear to be logged in! Waiting for redirect to complete...');
                            
                            // Wait 3 seconds and check again
                            setTimeout(async () => {
                                await this.checkForAuthToken();
                            }, 3000);
                            return;
                        }
                        
                        // User has token, proceed with login
                        await this.handleSuccessfulLogin(data);
                        return;
                    }
                    
                    // Check if there's a toast indicating "already logged in"
                    if (data.hasToast || data.isAlreadyLoggedIn) {
                        console.log('🔔 Toast or "already logged in" text detected:', data.toastText);
                        this.showError(document.getElementById('login-error'), '✅ You are already logged in! Waiting for redirect to complete...');
                        
                        // Wait 3 seconds and check again
                        setTimeout(async () => {
                            await this.checkForAuthToken();
                        }, 3000);
                        return;
                    }
                    
                } catch (scriptError) {
                    console.log('🔍 Could not access web platform localStorage:', scriptError);
                }
            }
            
            // Fallback: try to get current user with existing token
            const response = await this.apiClient.getCurrentUser();
            
            if (response && response.id) {
                console.log('✅ User authenticated via API:', response);
                this.currentUser = response;
                await this.loadUserData();
                this.showOrgScreen();
            } else {
                console.log('❌ No valid user found');
                this.showError(document.getElementById('login-error'), 'Please complete Google login in the web platform first, then try again.');
            }
        } catch (error) {
            console.error('❌ Token check failed:', error);
            this.showError(document.getElementById('login-error'), 'Please complete Google login in the web platform first, then try again.');
        } finally {
            // Reset button state
            if (checkButton) {
                checkButton.disabled = false;
                checkButton.textContent = 'Check Login Status';
            }
        }
    }

    async handleSuccessfulLogin(data) {
        // Store the token in extension storage
        await this.storeToken(data.token);
        this.apiClient.setToken(data.token);
        
        if (data.user) {
            this.currentUser = JSON.parse(data.user);
        } else {
            // Get user info from backend
            const userResponse = await this.apiClient.getCurrentUser();
            this.currentUser = userResponse;
        }
        
        console.log('✅ User authenticated:', this.currentUser);
        await this.loadUserData();
        this.showOrgScreen();
    }

    async loadUserData() {
        try {
            // Load organizations
            console.log('📋 Loading user organizations...');
            this.organizations = await this.apiClient.getOrganizations();
            console.log('📋 Organizations loaded:', this.organizations);
            this.renderOrganizations();
        } catch (error) {
            console.error('❌ Failed to load user data:', error);
            
            // If it's a 403 error, it might mean the user has no organizations
            if (error.message.includes('403')) {
                console.log('📋 User has no organizations, showing empty state');
                this.organizations = [];
                this.renderOrganizations();
            } else {
                throw error;
            }
        }
    }

    async handleLogout() {
        await this.clearStoredData();
        this.currentUser = null;
        this.organizations = [];
        this.agents = [];
        this.currentOrg = null;
        this.showLoginScreen();
    }

    async loadAgents(orgId) {
        try {
            this.agents = await this.apiClient.getOrganizationAgents(orgId);
            this.renderAgents();
        } catch (error) {
            console.error('Failed to load agents:', error);
            this.showError(document.getElementById('agent-error'), 'Failed to load agents');
        }
    }

    renderOrganizations() {
        const orgsList = document.getElementById('orgs-list');
        
        if (this.organizations.length === 0) {
            orgsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🏢</div>
                    <h3>No Organizations</h3>
                    <p>You don't belong to any organizations yet.</p>
                    <p style="font-size: 12px; color: #9ca3af; margin-top: 8px;">
                        Ask an organization admin to invite you, or create a new organization on the web platform.
                    </p>
                </div>
            `;
            return;
        }

        orgsList.innerHTML = this.organizations.map(org => `
            <div class="org-item" data-org-id="${org.id}">
                <div class="org-icon">🏢</div>
                <div class="org-info">
                    <div class="org-name">${org.name}</div>
                    <div class="org-description">${org.description || 'No description'}</div>
                    <div class="org-meta">${org.member_count} members</div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        orgsList.querySelectorAll('.org-item').forEach(item => {
            item.addEventListener('click', () => {
                const orgId = parseInt(item.dataset.orgId);
                const org = this.organizations.find(o => o.id === orgId);
                this.selectOrganization(org);
            });
        });
    }

    renderAgents() {
        const agentsList = document.getElementById('agents-list');
        
        if (this.agents.length === 0) {
            agentsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🤖</div>
                    <h3>No Agents</h3>
                    <p>This organization doesn't have any agents yet.</p>
                </div>
            `;
            return;
        }

        agentsList.innerHTML = this.agents.map(agent => `
            <div class="agent-item" data-agent-id="${agent.id}">
                <div class="agent-icon">🤖</div>
                <div class="agent-info">
                    <div class="agent-name">${agent.name}</div>
                    <div class="agent-description">${agent.description || 'No description'}</div>
                    <div class="agent-meta">Model: ${agent.model}</div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        agentsList.querySelectorAll('.agent-item').forEach(item => {
            item.addEventListener('click', () => {
                const agentId = parseInt(item.dataset.agentId);
                const agent = this.agents.find(a => a.id === agentId);
                this.selectAgent(agent);
            });
        });
    }

    async selectOrganization(org) {
        this.currentOrg = org;
        document.getElementById('current-org-name').textContent = org.name;
        
        // Load agents for this organization
        await this.loadAgents(org.id);
        this.showAgentScreen();
    }

    async selectAgent(agent) {
        console.log('🤖 Agent selected:', agent);
        console.log('🏢 Current organization:', this.currentOrg);
        
        // Store selected organization and agent
        await this.storeSelectedOrg(this.currentOrg);
        await this.storeSelectedAgent(agent);
        
        console.log('💾 Stored organization and agent data');
        
        // Close popup and inject chatbot
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                console.log('📤 Sending message to tab:', tabs[0].id);
                console.log('📤 Message data:', {
                    action: 'openChatbot',
                    organization: this.currentOrg,
                    agent: agent
                });
                
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'openChatbot',
                    organization: this.currentOrg,
                    agent: agent
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('❌ Failed to send message:', chrome.runtime.lastError.message);
                        // Try to inject the chatbot directly if message fails
                        this.injectChatbotDirectly(tabs[0].id, this.currentOrg, agent);
                    } else {
                        console.log('✅ Message sent successfully:', response);
                    }
                });
                
                // Close popup after a short delay to allow message to be sent
                setTimeout(() => {
                    window.close();
                }, 100);
            } else {
                console.error('❌ No active tab found');
            }
        });
    }

    injectChatbotDirectly(tabId, orgData, agentData) {
        console.log('🔄 Attempting direct injection for tab:', tabId);
        console.log('🔄 With data:', { orgData, agentData });
        
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (org, agent) => {
                console.log('🔄 Direct injection called with:', { org, agent });
                
                // Create a simple chatbot UI directly
                const chatbot = document.createElement('div');
                chatbot.id = 'ai-agent-chatbot';
                chatbot.style.cssText = `
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    width: 400px;
                    height: 600px;
                    background: white;
                    border: 2px solid #007bff;
                    border-radius: 12px;
                    z-index: 999999;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                `;
                
                chatbot.innerHTML = `
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; border-radius: 12px 12px 0 0; flex-shrink: 0;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div>
                                <div style="font-weight: bold; font-size: 16px;">🤖 ${agent.name}</div>
                                <div style="font-size: 12px; opacity: 0.8;">${org.name}</div>
                            </div>
                            <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='none'">×</button>
                        </div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; height: calc(100% - 60px);">
                        <!-- Messages Area -->
                        <div id="chatbot-messages" style="flex: 1; overflow-y: auto; padding: 16px; background: #f8f9fa;">
                            <div style="background: #e3f2fd; padding: 12px; border-radius: 12px; margin-bottom: 12px; border-left: 4px solid #2196f3;">
                                <div style="font-weight: 600; margin-bottom: 4px; color: #1976d2;">👋 Hello!</div>
                                <div style="color: #424242; line-height: 1.4;">I'm ${agent.name} from ${org.name}. How can I help you today?</div>
                            </div>
                        </div>
                        
                        <!-- Input Area -->
                        <div style="padding: 16px; background: white; border-top: 1px solid #e0e0e0; flex-shrink: 0;">
                            <div style="display: flex; gap: 8px; align-items: flex-end;">
                                <textarea id="chatbot-input" placeholder="Type your message..." style="flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 20px; resize: none; font-family: inherit; font-size: 14px; line-height: 1.4; min-height: 20px; max-height: 100px; outline: none; transition: border-color 0.2s;" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault(); this.nextElementSibling.click();}" oninput="this.style.height='auto'; this.style.height=Math.min(this.scrollHeight, 100)+'px';"></textarea>
                                <button id="chatbot-send" style="background: #007bff; color: white; border: none; padding: 12px; border-radius: 50%; cursor: pointer; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; flex-shrink: 0;" onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'" onclick="sendMessage()">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                // Remove existing chatbot if any
                const existing = document.getElementById('ai-agent-chatbot');
                if (existing) {
                    existing.remove();
                }
                
                document.body.appendChild(chatbot);
                
                // Add interactive functionality
                const input = chatbot.querySelector('#chatbot-input');
                const sendBtn = chatbot.querySelector('#chatbot-send');
                const messagesContainer = chatbot.querySelector('#chatbot-messages');
                
                // Send message function
                window.sendMessage = function() {
                    const message = input.value.trim();
                    if (!message) return;
                    
                    // Add user message
                    addMessage('user', message);
                    
                    // Clear input
                    input.value = '';
                    input.style.height = 'auto';
                    
                    // Simulate AI response (for now)
                    setTimeout(() => {
                        addMessage('assistant', `Thanks for your message: "${message}". This is a demo response from ${agent.name}. The full AI functionality will be implemented next!`);
                    }, 1000);
                };
                
                // Add message function
                function addMessage(type, content) {
                    const messageDiv = document.createElement('div');
                    messageDiv.style.cssText = `
                        margin-bottom: 12px;
                        display: flex;
                        ${type === 'user' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
                    `;
                    
                    const messageContent = document.createElement('div');
                    messageContent.style.cssText = `
                        max-width: 80%;
                        padding: 12px 16px;
                        border-radius: 18px;
                        font-size: 14px;
                        line-height: 1.4;
                        ${type === 'user' 
                            ? 'background: #007bff; color: white; border-bottom-right-radius: 4px;' 
                            : 'background: #e3f2fd; color: #424242; border-bottom-left-radius: 4px; border-left: 4px solid #2196f3;'
                        }
                    `;
                    
                    messageContent.textContent = content;
                    messageDiv.appendChild(messageContent);
                    messagesContainer.appendChild(messageDiv);
                    
                    // Scroll to bottom
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
                
                // Focus input
                input.focus();
                
                console.log('✅ Direct chatbot injection successful');
            },
            args: [orgData, agentData]
        }, (result) => {
            if (chrome.runtime.lastError) {
                console.error('❌ Direct injection failed:', chrome.runtime.lastError.message);
            } else {
                console.log('✅ Direct injection successful');
            }
        });
    }

    showLoginScreen() {
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('org-screen').style.display = 'none';
        document.getElementById('agent-screen').style.display = 'none';
    }

    showOrgScreen() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('org-screen').style.display = 'block';
        document.getElementById('agent-screen').style.display = 'none';
    }

    showAgentScreen() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('org-screen').style.display = 'none';
        document.getElementById('agent-screen').style.display = 'block';
    }

    setLoading(button, loading) {
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
    }

    hideError(element) {
        element.style.display = 'none';
    }

    // Storage methods
    async storeToken(token) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ token }, resolve);
        });
    }

    async getStoredToken() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['token'], (result) => {
                resolve(result.token);
            });
        });
    }

    async storeSelectedOrg(org) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ selectedOrg: org }, resolve);
        });
    }

    async storeSelectedAgent(agent) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ selectedAgent: agent }, resolve);
        });
    }

    async clearStoredData() {
        return new Promise((resolve) => {
            chrome.storage.local.clear(resolve);
        });
    }
}

// Initialize the popup app
document.addEventListener('DOMContentLoaded', () => {
    new PopupApp();
});

