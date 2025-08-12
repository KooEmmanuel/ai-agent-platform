import { NextRequest, NextResponse } from 'next/server'

// Use Railway URL in production, localhost in development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://kwickbuild.up.railway.app/'
  : 'http://localhost:8000/'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    // Forward the request to our backend
    const response = await fetch(`${API_BASE_URL}api/v1/conversations/`, {
      method: 'GET',
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
        { error: data.detail || 'Failed to fetch conversations' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Conversations API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Conversations POST API called')
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('📄 Request body:', body)

    const targetUrl = `${API_BASE_URL}api/v1/conversations`
    console.log('🎯 Target URL:', targetUrl)

    // Forward the request to our backend
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'Kwickbuild-Frontend/1.0',
      },
      body: JSON.stringify(body)
    })
    
    console.log('📡 Backend response status:', response.status)
    
    const data = await response.json()
    console.log('📄 Backend response data:', data)
    
    if (response.ok) {
      return NextResponse.json(data)
    } else {
      return NextResponse.json(
        { error: data.detail || 'Failed to create conversation' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Conversations POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 