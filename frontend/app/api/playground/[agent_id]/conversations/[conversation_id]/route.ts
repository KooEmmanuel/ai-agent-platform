import { NextRequest, NextResponse } from 'next/server'

// Use Railway URL in production, localhost in development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://kwickbuild.up.railway.app'
  : 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { agent_id: string; conversation_id: string } }
) {
  try {
    console.log('🔍 Playground Conversation Messages API called for Agent ID:', params.agent_id, 'Conversation ID:', params.conversation_id)
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const targetUrl = `${API_BASE_URL}/api/v1/playground/${params.agent_id}/conversations/${params.conversation_id}`
    console.log('🎯 Target URL:', targetUrl)

    // Forward the request to our backend
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      }
    })
    
    const data = await response.json()
    
    console.log('📡 Backend response status:', response.status)
    
    if (response.ok) {
      return NextResponse.json(data)
    } else {
      console.log('❌ Backend error:', data)
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch conversation messages' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Playground Conversation Messages API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { agent_id: string; conversation_id: string } }
) {
  try {
    console.log('🔍 Delete Playground Conversation API called for Agent ID:', params.agent_id, 'Conversation ID:', params.conversation_id)
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const targetUrl = `${API_BASE_URL}/api/v1/playground/${params.agent_id}/conversations/${params.conversation_id}`
    console.log('🎯 Target URL:', targetUrl)

    // Forward the request to our backend
    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      }
    })
    
    const data = await response.json()
    
    if (response.ok) {
      return NextResponse.json(data)
    } else {
      return NextResponse.json(
        { error: data.detail || 'Failed to delete conversation' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Delete Playground Conversation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 