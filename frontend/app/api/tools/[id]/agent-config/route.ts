import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')
    
    if (!agentId) {
      return NextResponse.json(
        { error: 'agent_id parameter is required' },
        { status: 400 }
      )
    }

    // Get auth token from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      )
    }

    // Proxy the request to the backend
    const backendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://kwickbuild.up.railway.app'
      : 'http://localhost:8000'
    
    const response = await fetch(
      `${backendUrl}/api/v1/tools/${params.id}/agent-config?agent_id=${agentId}`,
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        errorData,
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error in agent-config API route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 