// API client for AgentFlow platform

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

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
    return this.request<Agent[]>('/agents/')
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