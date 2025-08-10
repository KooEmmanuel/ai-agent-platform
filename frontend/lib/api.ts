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
    options: RequestInit = {}
  ): Promise<T> {
    // Use backend routes directly for dynamic routes that aren't working in frontend
    // Use frontend routes for static routes that are working
    const isDynamicRoute = endpoint.match(/\/\d+/) // Any route with a numeric ID
    
    const url = isDynamicRoute 
      ? `/api/v1${endpoint.replace('/api/v1', '')}`
      : `/api${endpoint.replace('/api/v1', '')}`
    
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
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
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
    return this.request<Agent>(`/agents/${agentId}/tools`, {
      method: 'POST',
      body: JSON.stringify({ tool_id: toolId, custom_config: customConfig }),
    })
  }

  async removeToolFromAgent(agentId: number, toolId: number): Promise<Agent> {
    return this.request<Agent>(`/agents/${agentId}/tools`, {
      method: 'DELETE',
      body: JSON.stringify({ tool_id: toolId }),
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

  async getPlaygroundConversations(agent_id: number): Promise<Conversation[]> {
    return this.request<Conversation[]>(`/playground/${agent_id}/conversations`)
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
    toolId: number,
    customConfig: Record<string, any>
  ): Promise<Agent> {
    return this.request<Agent>(`/agents/${agentId}/tools`, {
      method: 'PUT',
      body: JSON.stringify({
        tool_id: toolId,
        custom_config: customConfig,
      }),
    })
  }

  async getToolConfigSchema(toolId: number): Promise<{
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
    return this.request(`/tools/${toolId}/config-schema`)
  }
}

// Create a singleton instance
export const apiClient = new ApiClient()

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