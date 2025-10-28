// Shared API Client for extension (popup and content script)
class ExtensionApiClient {
    constructor() {
        this.baseUrl = `${API_BASE_URL}/api/v1`;
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

        console.log('🌐 API Request:', {
            url,
            method: options.method || 'GET',
            headers,
            body: options.body
        });

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            console.log('📡 API Response:', {
                status: response.status,
                statusText: response.statusText,
                url: response.url
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                    console.error('❌ API Error Response:', errorData);
                } catch (parseError) {
                    console.error('❌ Failed to parse error response:', parseError);
                    errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
                }
                throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ API Success Response:', data);
            return data;
        } catch (error) {
            console.error('❌ API Request Failed:', error);
            throw error;
        }
    }

    async authenticate(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    async firebaseAuth(idToken) {
        return this.request('/auth/firebase', {
            method: 'POST',
            body: JSON.stringify({ id_token: idToken })
        });
    }

    async getOrganizations() {
        return this.request('/organizations/');
    }

    async getOrganizationAgents(organizationId) {
        return this.request(`/organization-agents/organizations/${organizationId}/agents`);
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }

    async createOrganizationConversation(organizationId, data) {
        return this.request(`/playground/organizations/${organizationId}/conversations`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async streamOrganizationMessage(organizationId, conversationId, message, onChunk, onError, onComplete) {
        const url = `${this.baseUrl}/playground/organizations/${organizationId}/conversations/${conversationId}/messages/stream`;
        
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        console.log('🌐 Streaming Request:', {
            url,
            method: 'POST',
            headers,
            body: { content: message }
        });

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({ content: message })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            console.log('📦 Received chunk:', data);
                            
                            if (data.type === 'error') {
                                onError(new Error(data.content));
                                return;
                            }
                            
                            onChunk(data);
                            
                            if (data.type === 'complete') {
                                onComplete(data);
                                return;
                            }
                        } catch (parseError) {
                            console.error('Failed to parse chunk:', line, parseError);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Streaming failed:', error);
            onError(error);
        }
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExtensionApiClient;
} else {
    window.ExtensionApiClient = ExtensionApiClient;
}
