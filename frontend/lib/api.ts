// API client for Drixai platform

// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

console.log('🔧 Environment:', process.env.NODE_ENV)
console.log('🌐 API_BASE_URL:', API_BASE_URL)

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
  display_name?: string
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
  title?: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    created_at: string
  }>
  created_at: string
  workspace_id?: number
}

export interface PlaygroundResponse {
  response: string
  session_id: string
  conversation_id: number
  agent_id: number
  tools_used: string[]
  execution_time: number
}

export interface Workspace {
  id: number
  name: string
  description?: string
  parent_id?: number
  color?: string
  icon?: string
  is_default: boolean
  created_at: string
  updated_at: string
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
        
        // Send directly to backend to get new access token
        const response = await fetch(`${this.baseUrl}/api/v1/auth/firebase`, {
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
    // Clean endpoint - remove /api/v1 prefix if present
    const cleanEndpoint = endpoint.replace(/^\/api\/v1/, '')
    const url = `${this.baseUrl}/api/v1${cleanEndpoint}`
    
    console.log('🔍 API Request:', {
      endpoint: cleanEndpoint,
      url,
      method: options.method || 'GET',
      hasBody: !!options.body
    })
    
    const headers: Record<string, string> = {
      ...options.headers as Record<string, string>,
    }
    
    // Only set Content-Type for JSON, let browser handle FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
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

    console.log('📊 API Response:', {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    if (!response.ok) {
      console.error('❌ API Request Failed:', {
        url,
        status: response.status,
        statusText: response.statusText
      })
      
      let errorMessage = `HTTP ${response.status}`
      
      try {
        const error = await response.json()
        console.error('❌ Error response:', error)
        
        // Try different possible error message fields
        errorMessage = error.detail || error.message || error.error || `HTTP ${response.status}`
      } catch (parseError) {
        console.error('❌ Failed to parse error response:', parseError)
        // If JSON parsing fails, try to get text response
        try {
          const textResponse = await response.text()
          console.error('❌ Text error response:', textResponse)
          errorMessage = textResponse || `HTTP ${response.status}`
        } catch (textError) {
          console.error('❌ Failed to get text response:', textError)
        }
      }
      
      throw new Error(errorMessage)
    }

    const data = await response.json()
    console.log('📦 API Response Data:', data)
    return data
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

  async updateUserProfile(data: {
    name?: string
    email?: string
  }): Promise<User> {
    return this.request<User>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
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

  async getConversations(): Promise<Array<{
    id: number
    agent_id: number
    user_id: number
    messages: Array<{
      id: number
      content: string
      role: string
      timestamp: string
    }>
    created_at: string
    updated_at: string
  }>> {
    return this.request('/conversations')
  }

  async getAgent(id: number): Promise<Agent> {
    return this.request<Agent>(`/agents/${id}`)
  }

  async getAvailableModels(): Promise<{
    models: Array<{
      id: string
      name: string
      description: string
      context_window: number
      cost_per_1k_tokens: number
    }>
  }> {
    return this.request('/agents/models')
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
    session_id?: string,
    collections?: string[],
    workspace_id?: number
  ): Promise<PlaygroundResponse> {
    return this.request<PlaygroundResponse>(`/playground/${agent_id}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, session_id, collections, workspace_id }),
    })
  }

  async chatWithAgentStream(
    agent_id: number,
    message: string,
    session_id?: string,
    onChunk?: (chunk: any) => void,
    onError?: (error: any) => void,
    onComplete?: (data: any) => void,
    workspace_id?: number,
    collections?: string[]
  ): Promise<void> {
    try {
      if (!this.token) {
        throw new Error('No valid authentication token')
      }

      const requestBody = { message, session_id, workspace_id, collections }
      console.log('📤 Sending request body:', requestBody)
      
      const response = await fetch(`${this.baseUrl}/api/v1/playground/${agent_id}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`
        
        try {
          const error = await response.json()
          console.error('❌ Streaming error response:', error)
          errorMessage = error.detail || error.message || error.error || errorMessage
        } catch (parseError) {
          console.error('❌ Failed to parse streaming error response:', parseError)
          try {
            const textResponse = await response.text()
            console.error('❌ Streaming text error response:', textResponse)
            errorMessage = textResponse || errorMessage
          } catch (textError) {
            console.error('❌ Failed to get streaming text response:', textError)
          }
        }
        
        throw new Error(errorMessage)
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
    session_id: string
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

  async renameConversation(conversation_id: number, new_title: string): Promise<{ message: string }> {
    return this.request(`/playground/conversations/${conversation_id}/rename`, {
      method: 'PATCH',
      body: JSON.stringify({ title: new_title })
    })
  }

  // Workspaces
  async getWorkspaces(agent_id: number): Promise<Workspace[]> {
    return this.request<Workspace[]>(`/playground/${agent_id}/workspaces`)
  }

  async createWorkspace(agent_id: number, data: {
    name: string
    description?: string
    parent_id?: number
    color?: string
    icon?: string
  }): Promise<Workspace> {
    return this.request<Workspace>(`/playground/${agent_id}/workspaces`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateWorkspace(agent_id: number, workspace_id: number, data: {
    name?: string
    description?: string
    color?: string
    icon?: string
  }): Promise<Workspace> {
    return this.request<Workspace>(`/playground/${agent_id}/workspaces/${workspace_id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteWorkspace(agent_id: number, workspace_id: number): Promise<{ message: string }> {
    return this.request(`/playground/${agent_id}/workspaces/${workspace_id}`, {
      method: 'DELETE'
    })
  }

  async getPlaygroundConversationsWithWorkspace(agent_id: number, workspace_id?: number): Promise<Conversation[]> {
    const params = new URLSearchParams()
    if (workspace_id !== undefined) {
      params.append('workspace_id', workspace_id.toString())
    }
    return this.request<Conversation[]>(`/playground/${agent_id}/conversations?${params.toString()}`)
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
    return this.request(`/tools/${toolIdentifier}/config-schema`)
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
    return this.request(`/tools/${toolId}/agent-config?agent_id=${agentId}`)
  }

  // Google Suite tool execution
  async executeGoogleSuiteTool(operation: string, params?: Record<string, any>): Promise<{
    success: boolean
    result?: any
    error?: string
  }> {
    return this.request('/tools/google_suite_tool/execute', {
      method: 'POST',
      body: JSON.stringify({
        operation,
        ...params
      })
    })
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
    return this.request('/knowledge-base/collections')
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
    })
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
    })
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
    })
  }

  async deleteKnowledgeBaseCollection(collectionId: number): Promise<{
    success: boolean
    message: string
  }> {
    return this.request(`/knowledge-base/collections/${collectionId}`, {
      method: 'DELETE',
    })
  }

  // Web Widget methods
  async getWebWidgetScript(integrationId: number): Promise<{
    script: string
    integration_id: number
    agent_id: number
    platform: string
  }> {
    return this.request(`/web-widget/script/${integrationId}`)
  }

  async updateIntegration(integrationId: number, data: {
    config?: Record<string, any>
    webhook_url?: string
    is_active?: boolean
  }): Promise<Integration> {
    return this.request(`/integrations/${integrationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteIntegration(integrationId: number): Promise<{ message: string }> {
    return this.request(`/integrations/${integrationId}`, {
      method: 'DELETE',
    })
  }

  // Analytics
  async getAnalyticsOverview(): Promise<{
    total_agents: number
    total_conversations: number
    total_messages: number
    active_integrations: number
    recent_activity: Array<{
      type: string
      description: string
      timestamp: string
    }>
  }> {
    return this.request('/analytics/overview')
  }

  // Billing
  async getCreditsBalance(): Promise<{
    total_credits: number
    used_credits: number
    available_credits: number
    usage_percentage: number
  }> {
    return this.request('/credits/balance')
  }

  async getCreditTransactions(limit?: number): Promise<Array<{
    id: number
    amount: number
    type: string
    description: string
    timestamp: string
    status: string
  }>> {
    const endpoint = limit ? `/credits/transactions?limit=${limit}` : '/credits/transactions'
    return this.request(endpoint)
  }

  async estimateCreditCost(request: {
    operation_type: string
    tool_name?: string
    expected_tokens?: number
    is_custom_tool?: boolean
  }): Promise<{
    estimated_cost: number
    base_cost: number
    tool_cost: number
    operation: string
    has_sufficient_credits: boolean
  }> {
    return this.request('/credits/estimate', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

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



  // File Management Methods
  async uploadFile(file: File, agentId?: number, folderPath?: string): Promise<{
    success: boolean
    file_id?: number
    blob_url?: string
    original_name?: string
    file_size?: number
    mime_type?: string
    error?: string
  }> {
    const formData = new FormData()
    formData.append('file', file)
    if (agentId) formData.append('agent_id', agentId.toString())
    if (folderPath) formData.append('folder_path', folderPath)

    return this.request('/files/upload', {
      method: 'POST',
      body: formData,
    })
  }

  async getFiles(agentId?: number, folderPath?: string, fileType?: string): Promise<Array<{
    id: number
    original_name: string
    stored_name: string
    blob_url: string
    file_size: number
    mime_type: string
    file_extension: string
    folder_path: string
    is_public: boolean
    created_at: string
    expires_at?: string
  }>> {
    const params = new URLSearchParams()
    if (agentId) params.append('agent_id', agentId.toString())
    if (folderPath) params.append('folder_path', folderPath)
    if (fileType) params.append('file_type', fileType)

    const endpoint = `/files/list${params.toString() ? `?${params.toString()}` : ''}`
    return this.request(endpoint)
  }

  async getSharedFiles(): Promise<Array<{
    id: number
    original_name: string
    blob_url: string
    file_size: number
    mime_type: string
    file_extension: string
    folder_path: string
    owner_user_id: number
    permission: string
    shared_at: string
    created_at: string
  }>> {
    return this.request('/files/shared')
  }

  async shareFile(fileId: number, sharedWithUserId: number, permission: string = 'view'): Promise<{
    success: boolean
    message?: string
    permission?: string
    error?: string
  }> {
    return this.request('/files/share', {
      method: 'POST',
      body: JSON.stringify({
        file_id: fileId,
        shared_with_user_id: sharedWithUserId,
        permission: permission
      }),
    })
  }

  async deleteFile(fileId: number): Promise<{
    success: boolean
    message?: string
    error?: string
  }> {
    return this.request(`/files/${fileId}`, {
      method: 'DELETE',
    })
  }

  async downloadFile(fileId: number): Promise<{
    download_url: string
    filename: string
  }> {
    return this.request(`/files/${fileId}/download`)
  }

  async getFileInfo(fileId: number): Promise<{
    id: number
    original_name: string
    stored_name: string
    blob_url: string
    file_size: number
    mime_type: string
    file_extension: string
    folder_path: string
    is_public: boolean
    created_at: string
    expires_at?: string
  }> {
    return this.request(`/files/${fileId}/info`)
  }

  // Project Management API methods
  async getProjects(integrationId?: number, status?: string) {
    const params = new URLSearchParams()
    if (integrationId) params.append('integration_id', integrationId.toString())
    if (status) params.append('status', status)
    
    const queryString = params.toString()
    return this.request(`/project-management/projects${queryString ? `?${queryString}` : ''}`)
  }

  async getProject(projectId: number) {
    return this.request(`/project-management/projects/${projectId}`)
  }

  async createProject(projectData: any) {
    return this.request('/project-management/projects', { 
      method: 'POST', 
      body: JSON.stringify(projectData) 
    })
  }

  async updateProject(projectId: number, projectData: any) {
    return this.request(`/project-management/projects/${projectId}`, { 
      method: 'PUT', 
      body: JSON.stringify(projectData) 
    })
  }

  async deleteProject(projectId: number) {
    return this.request(`/project-management/projects/${projectId}`, { method: 'DELETE' })
  }

  async getProjectTasks(projectId: number, status?: string, assigneeId?: number) {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (assigneeId) params.append('assignee_id', assigneeId.toString())
    
    const queryString = params.toString()
    return this.request(`/project-management/projects/${projectId}/tasks${queryString ? `?${queryString}` : ''}`)
  }

  async createTask(taskData: any) {
    return this.request('/project-management/tasks', { 
      method: 'POST', 
      body: JSON.stringify(taskData) 
    })
  }

  async updateTask(taskId: number, taskData: any) {
    return this.request(`/project-management/tasks/${taskId}`, { 
      method: 'PUT', 
      body: JSON.stringify(taskData) 
    })
  }

  async deleteTask(taskId: number) {
    return this.request(`/project-management/tasks/${taskId}`, { method: 'DELETE' })
  }

  async createTimeEntry(timeData: any) {
    return this.request('/project-management/time-entries', { 
      method: 'POST', 
      body: JSON.stringify(timeData) 
    })
  }

  async deleteTimeEntry(timeEntryId: number) {
    return this.request(`/project-management/time-entries/${timeEntryId}`, { method: 'DELETE' })
  }

  async recalculateTaskHours(taskId: number) {
    return this.request(`/project-management/tasks/${taskId}/recalculate-hours`, { method: 'POST' })
  }

  async getProjectTimeEntries(projectId: number, startDate?: string, endDate?: string) {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const queryString = params.toString()
    return this.request(`/project-management/projects/${projectId}/time-entries${queryString ? `?${queryString}` : ''}`)
  }

  async getProjectAnalytics(projectId: number) {
    return this.request(`/project-management/projects/${projectId}/analytics`)
  }

  // Template API methods
  async getProjectTemplates() {
    return this.request('/project-management/templates')
  }

  async getProjectTemplate(templateId: string) {
    return this.request(`/project-management/templates/${templateId}`)
  }

  async createProjectFromTemplate(data: {
    integration_id: number
    name: string
    template_id: string
    start_date?: string
    custom_settings?: any
  }) {
    return this.request('/project-management/projects/from-template', {
      method: 'POST',
      body: JSON.stringify(data)
    })
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
      
      // Send directly to backend to get access token
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/firebase`, {
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