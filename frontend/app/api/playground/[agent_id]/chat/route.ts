import { NextRequest, NextResponse } from 'next/server'

// Use Railway URL in production, localhost in development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://kwickbuild.up.railway.app'
  : 'http://localhost:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: { agent_id: string } }
) {
  try {
    console.log('🔍 Playground Chat API called for Agent ID:', params.agent_id)
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const targetUrl = `${API_BASE_URL}/api/v1/playground/${params.agent_id}/chat`
    console.log('🎯 Target URL:', targetUrl)

    // Forward the request to our backend
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })
    
    const data = await response.json()
    
    console.log('📡 Backend response status:', response.status)
    
    if (response.ok) {
      return NextResponse.json(data)
    } else {
      console.log('❌ Backend error:', data)
      return NextResponse.json(
        { error: data.detail || 'Failed to send message to agent' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Playground Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 