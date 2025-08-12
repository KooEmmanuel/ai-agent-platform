// API client for Kwickbuild platform

// Use Railway URL in production, localhost in development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://kwickbuild.up.railway.app'
  : 'http://localhost:8000'

console.log('🔧 Environment:', process.env.NODE_ENV)
console.log('🌐 API_BASE_URL:', API_BASE_URL)
console.log('📡 NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL)

export interface User {
  id: number
  email: string
  name: string
  picture?: string
  is_verified: boolean
  created_at: string
}

export interface Agent {
  id: number
  name: string
  description?: string
  instructions: string
  model: string
  is_active: boolean
  tools: any[]
  context_config?: Record<string, any>
  created_at: string
  updated_at?: string
  tool_count: number
}

export interface Tool {
  id: number
  name: string
  description?: string
  category: string
  tool_type: string
  config: Record<string, any>
  parameters?: Record<string, any>
  is_public: boolean
  is_active: boolean
  created_at: string
  updated_at?: string
  user_id: number
  is_in_user_collection?: boolean
}

export interface Integration {
  id: number
  agent_id: number
  platform: string
  config: Record<string, any>
  webhook_url?: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface Conversation {
  id: number
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    created_at: string
  }>
  created_at: string
}

export interface PlaygroundResponse {
  response: string
  session_id: string
  conversation_id: number
  agent_id: number
  tools_used: string[]
  execution_time: number
}

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
    // Try to get token from localStorage
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token')
    }
  }

  private async refreshToken(): Promise<string | null> {
    try {
      // Import Firebase auth dynamically to avoid SSR issues
      const { auth } = await import('./firebase')
      const currentUser = auth.currentUser
      
      if (currentUser) {
        // Get a fresh ID token
        const idToken = await currentUser.getIdToken(true) // force refresh
        
        // Send to backend API route to get new access token
        const response = await fetch(`/api/v1/auth/firebase`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id_token: idToken })
        })
        
        if (response.ok) {
          const data = await response.json()
          this.token = data.access_token
          if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', data.access_token)
          }
          return data.access_token
        }
      }
      
      return null
    } catch (error) {
      console.error('Token refresh failed:', error)
      return null
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    forceNextJsRoute: boolean = false
  ): Promise<T> {
    // Use backend routes directly for dynamic routes that aren't working in frontend
    // Use frontend routes for static routes that are working
    const isDynamicRoute = endpoint.match(/\/\d+/) // Any route with a numeric ID
    
    let url: string
    if (forceNextJsRoute || !isDynamicRoute) {
      // For forced Next.js routes or static routes, use relative URLs that go through Next.js API routes
      url = `/api${endpoint.replace('/api/v1', '')}`
    } else {
      // For dynamic routes, use the full backend URL
      url = `${this.baseUrl}/api/v1${endpoint.replace('/api/v1', '')}`
    }
    
    console.log('🔍 API Request Details:', {
      originalEndpoint: endpoint,
      isDynamicRoute,
      forceNextJsRoute,
      baseUrl: this.baseUrl,
      finalUrl: url,
      method: options.method || 'GET',
      hasBody: !!options.body
    })
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    let response = await fetch(url, {
      ...options,
      headers,
    })

    // If unauthorized, try to refresh token and retry
    if (response.status === 401 || response.status === 403) {
      console.log('Token expired, attempting refresh...')
      const newToken = await this.refreshToken()
      
      if (newToken) {
        // Retry with new token
        headers.Authorization = `Bearer ${newToken}`
        response = await fetch(url, {
          ...options,
          headers,
        })
      } else {
        // If refresh fails, redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user')
          window.location.href = '/auth/login'
        }
      }
    }

    if (!response.ok) {
      console.error('❌ API Request Failed:', {
        url,
        status: response.status,
        statusText: response.statusText
      })
      
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      console.error('❌ Error response:', error)
      
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Authentication
  async firebaseAuth(idToken: string): Promise<{ access_token: string; user: User }> {
    const response = await this.request<{ access_token: string; user: User }>('/auth/firebase', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    })
    
    this.token = response.access_token
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', response.access_token)
    }
    
    return response
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me')
  }

  logout(): void {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  setToken(token: string): void {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  }

  // Credits
  async getCredits(): Promise<{
    total_credits: number
    used_credits: number
    available_credits: number
    usage_percentage: number
  }> {
    return this.request('/credits/balance')
  }

  // Agents
  async getAgents(): Promise<Agent[]> {
    return this.request<Agent[]>('/agents')
  }

  async getAgent(id: number): Promise<Agent> {
    return this.request<Agent>(`/agents/${id}`)
  }

  async createAgent(data: {
    name: string
    description?: string
    instructions: string
    model?: string
    tools?: any[]
    context_config?: Record<string, any>
  }): Promise<Agent> {
    return this.request<Agent>('/agents/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateAgent(id: number, data: Partial<{
    name: string
    description: string
    instructions: string
    model: string
    tools: any[]
    context_config: Record<string, any>
    is_active: boolean
  }>): Promise<Agent> {
    return this.request<Agent>(`/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteAgent(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/agents/${id}`, {
      method: 'DELETE',
    })
  }

  // Agent Tools Management
  async addToolToAgent(agentId: number, toolId: number, customConfig?: Record<string, any>): Promise<Agent> {
    console.log('🌐 API Client: Adding tool to agent', {
      agentId,
      toolId,
      customConfig,
      endpoint: `/agents/${agentId}/tools`
    })
    
    return this.request<Agent>(`/agents/${agentId}/tools`, {
      method: 'POST',
      body: JSON.stringify({ tool_id: toolId, custom_config: customConfig }),
    })
  }

  async removeToolFromAgent(agentId: number, toolIdentifier: string | number): Promise<Agent> {
    const body: any = {}
    
    if (typeof toolIdentifier === 'number') {
      body.tool_id = toolIdentifier
    } else {
      body.tool_name = toolIdentifier
    }
    
    return this.request<Agent>(`/agents/${agentId}/tools`, {
      method: 'DELETE',
      body: JSON.stringify(body),
    })
  }

  async getAgentTools(agentId: number): Promise<{
    agent_id: number
    agent_name: string
    tools: any[]
    tool_count: number
  }> {
    return this.request(`/agents/${agentId}/tools`)
  }

  // Tools
  async getTools(category?: string, tool_type?: string): Promise<Tool[]> {
    const params = new URLSearchParams()
    if (category) params.append('category', category)
    if (tool_type) params.append('tool_type', tool_type)
    
    return this.request<Tool[]>(`/tools/?${params.toString()}`)
  }

  async getTool(id: number): Promise<Tool> {
    return this.request<Tool>(`/tools/${id}`)
  }

  async getMarketplaceTools(category?: string, tool_type?: string): Promise<Tool[]> {
    const params = new URLSearchParams()
    if (category) params.append('category', category)
    if (tool_type) params.append('tool_type', tool_type)
    
    return this.request<Tool[]>(`/tools/marketplace?${params.toString()}`)
  }

  async addToolToCollection(toolId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/tools/${toolId}/add-to-collection`, {
      method: 'POST',
    })
  }

  async removeToolFromCollection(toolId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/tools/${toolId}/remove-from-collection`, {
      method: 'DELETE',
    })
  }

  async createTool(data: {
    name: string
    description?: string
    category: string
    tool_type: string
    config: Record<string, any>
    is_public?: boolean
  }): Promise<Tool> {
    return this.request<Tool>('/tools/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTool(id: number, data: Partial<{
    name: string
    description: string
    category: string
    tool_type: string
    config: Record<string, any>
    is_public: boolean
    is_active: boolean
  }>): Promise<Tool> {
    return this.request<Tool>(`/tools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteTool(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/tools/${id}`, {
      method: 'DELETE',
    })
  }

  // Integrations
  async getIntegrations(agent_id?: number, platform?: string): Promise<Integration[]> {
    const params = new URLSearchParams()
    if (agent_id) params.append('agent_id', agent_id.toString())
    if (platform) params.append('platform', platform)
    
    return this.request<Integration[]>(`/integrations/?${params.toString()}`)
  }

  async createIntegration(data: {
    agent_id: number
    platform: string
    config: Record<string, any>
    webhook_url?: string
  }): Promise<Integration> {
    return this.request<Integration>('/integrations/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Playground
  async chatWithAgent(
    agent_id: number,
    message: string,
    session_id?: string
  ): Promise<PlaygroundResponse> {
    return this.request<PlaygroundResponse>(`/playground/${agent_id}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, session_id }),
    })
  }

  async chatWithAgentStream(
    agent_id: number,
    message: string,
    session_id?: string,
    onChunk?: (chunk: any) => void,
    onError?: (error: any) => void,
    onComplete?: (data: any) => void
  ): Promise<void> {
    try {
      if (!this.token) {
        throw new Error('No valid authentication token')
      }

      const response = await fetch(`${this.baseUrl}/api/v1/playground/${agent_id}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({ message, session_id }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'error') {
                onError?.(data.content)
                return
              } else if (data.type === 'complete') {
                onComplete?.(data)
                return
              } else {
                onChunk?.(data)
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line, e)
            }
          }
        }
      }
    } catch (error) {
      onError?.(error)
    }
  }

  async getPlaygroundConversations(agent_id: number): Promise<Conversation[]> {
    return this.request<Conversation[]>(`/playground/${agent_id}/conversations`)
  }

  async createConversation(agent_id: number, title?: string): Promise<{
    id: number
    user_id: number
    agent_id: number
    session_id: string
    title: string
    created_at: string
    updated_at: string | null
  }> {
    console.log('📡 API Client: Creating conversation...')
    console.log('📋 Request details:', { agent_id, title })
    
    const response = await this.request<{
      id: number
      user_id: number
      agent_id: number
      session_id: string
      title: string
      created_at: string
      updated_at: string | null
    }>(`/conversations/`, {
      method: 'POST',
      body: JSON.stringify({
        agent_id: agent_id,
        title: title || `Playground Session - Agent ${agent_id}`
      })
    })
    
    console.log('✅ API Client: Conversation created successfully:', response)
    return response
  }

  async getConversationMessages(agent_id: number, conversation_id: number): Promise<{
    conversation_id: number
    agent_id: number
    messages: Array<{
      id: number
      role: 'user' | 'assistant'
      content: string
      created_at: string
      metadata: Record<string, any>
    }>
  }> {
    return this.request(`/playground/${agent_id}/conversations/${conversation_id}`)
  }

  async deleteConversation(agent_id: number, conversation_id: number): Promise<{ message: string }> {
    return this.request(`/playground/${agent_id}/conversations/${conversation_id}`, {
      method: 'DELETE'
    })
  }

  // Tool Categories and Types
  async getToolCategories(): Promise<{ categories: string[] }> {
    return this.request<{ categories: string[] }>('/tools/categories/list')
  }

  async getToolTypes(): Promise<{ types: string[] }> {
    return this.request<{ types: string[] }>('/tools/types/list')
  }

  // Platform Integrations
  async getSupportedPlatforms(): Promise<{
    platforms: Array<{
      id: string
      name: string
      description: string
      icon: string
      status: string
    }>
  }> {
    return this.request('/integrations/platforms/list')
  }

  // Billing
  async getBillingPlans(): Promise<Array<{
    id: number
    name: string
    display_name: string
    description: string
    price: number
    currency: string
    monthly_credits: number
    max_agents: number
    max_custom_tools: number
    features: string[]
    support_level: string
    custom_branding: boolean
    api_access: boolean
    is_current: boolean
  }>> {
    return this.request('/billing/plans')
  }

  async getSubscriptionStatus(): Promise<{
    plan_name: string
    display_name: string
    status: string
    current_period_end: string
    credits_remaining: number
    credits_total: number
    can_create_agents: boolean
    can_create_custom_tools: boolean
    agents_count: number
    agents_limit: number
    custom_tools_count: number
    custom_tools_limit: number
  }> {
    return this.request('/billing/subscription')
  }

  async updateToolConfig(
    agentId: number,
    toolIdentifier: string | number,
    customConfig: Record<string, any>
  ): Promise<Agent> {
    const body: any = {
      custom_config: customConfig,
    }
    
    if (typeof toolIdentifier === 'number') {
      body.tool_id = toolIdentifier
    } else {
      body.tool_name = toolIdentifier
    }
    
    return this.request<Agent>(`/agents/${agentId}/tools`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  async getToolConfigSchema(toolIdentifier: string | number): Promise<{
    tool_name: string
    tool_description: string
    parameters: Record<string, any>
    capabilities: string[]
    config_fields: Array<{
      name: string
      type: string
      label: string
      description: string
      default?: any
      min?: number
      max?: number
      required?: boolean
      sensitive?: boolean
      options?: string[]
    }>
  }> {
    // Use Next.js API route for config-schema to avoid CORS issues
    return this.request(`/tools/${toolIdentifier}/config-schema`, {}, true)
  }

  async getToolAgentConfig(toolId: number, agentId: number): Promise<{
    tool_id: number
    tool_name: string
    tool_description: string
    tool_category: string
    tool_type: string
    base_config: Record<string, any>
    current_config: Record<string, any>
    is_configured: boolean
    agent_id: number
    agent_name: string
  }> {
    // Use Next.js API route for agent-config to avoid CORS issues
    return this.request(`/tools/${toolId}/agent-config?agent_id=${agentId}`, {}, true)
  }

  // Knowledge Base methods
  async getKnowledgeBaseCollections(): Promise<Array<{
    id: number
    name: string
    description: string | null
    collection_type: string
    chroma_collection_name: string
    created_at: string
    updated_at: string
    document_count: number
    pages_extracted: number
  }>> {
    return this.request('/knowledge-base/collections', {}, true)
  }

  async createKnowledgeBaseCollection(collectionData: {
    name: string
    description?: string
    collection_type: string
  }): Promise<{
    id: number
    name: string
    description: string | null
    collection_type: string
    chroma_collection_name: string
    created_at: string
    updated_at: string
    document_count: number
    pages_extracted: number
  }> {
    return this.request('/knowledge-base/collections', {
      method: 'POST',
      body: JSON.stringify(collectionData),
    }, true)
  }

  async crawlWebsiteToCollection(collectionId: number, websiteData: {
    website_url: string
    max_pages: number
    max_depth: number
  }): Promise<{
    success: boolean
    message: string
    data: any
  }> {
    return this.request(`/knowledge-base/collections/${collectionId}/crawl-website`, {
      method: 'POST',
      body: JSON.stringify({
        collection_id: collectionId,
        ...websiteData
      }),
    }, true)
  }

  async uploadFileToCollection(collectionId: number, file: File): Promise<{
    success: boolean
    message: string
    data: any
  }> {
    const formData = new FormData()
    formData.append('file', file)
    
    return this.request(`/knowledge-base/collections/${collectionId}/upload-file`, {
      method: 'POST',
      body: formData,
    }, true)
  }

  async deleteKnowledgeBaseCollection(collectionId: number): Promise<{
    success: boolean
    message: string
  }> {
    return this.request(`/knowledge-base/collections/${collectionId}`, {
      method: 'DELETE',
    }, true)
  }
}

// Create a singleton instance with the correct base URL
export const apiClient = new ApiClient(API_BASE_URL)

// Initialize API client with current user's token
export const initializeApiClient = async () => {
  try {
    // Import Firebase auth dynamically to avoid SSR issues
    const { auth } = await import('./firebase')
    const currentUser = auth.currentUser
    
    if (currentUser) {
      // Get a fresh ID token
      const idToken = await currentUser.getIdToken()
      
      // Send to Next.js API route to get access token
      const response = await fetch(`/api/auth/firebase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id_token: idToken })
      })
      
      if (response.ok) {
        const data = await response.json()
        apiClient.setToken(data.access_token)
        return data.access_token
      }
    }
    
    return null
  } catch (error) {
    console.error('Failed to initialize API client:', error)
    return null
  }
} 