import { NextRequest, NextResponse } from 'next/server'

// Use Railway URL in production, localhost in development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://kwickbuild.up.railway.app/'
  : 'http://localhost:8000/'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const targetUrl = `${API_BASE_URL}api/v1/conversations/${params.id}`
    console.log('🎯 Target URL:', targetUrl)

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'Kwickbuild-Frontend/1.0',
      }
    })
    
    const data = await response.json()
    
    if (response.ok) {
      return NextResponse.json(data)
    } else {
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch conversation' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Conversation GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 Conversation PUT API called for ID:', params.id)
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('📄 Request body:', body)

    const targetUrl = `${API_BASE_URL}api/v1/conversations/${params.id}`
    console.log('🎯 Target URL:', targetUrl)

    const response = await fetch(targetUrl, {
      method: 'PUT',
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
        { error: data.detail || 'Failed to update conversation' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Conversation PUT API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 Conversation DELETE API called for ID:', params.id)
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const targetUrl = `${API_BASE_URL}api/v1/conversations/${params.id}`
    console.log('🎯 Target URL:', targetUrl)

    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'Kwickbuild-Frontend/1.0',
      }
    })
    
    console.log('📡 Backend response status:', response.status)
    
    const data = await response.json()
    console.log('📄 Backend response data:', data)
    
    if (response.ok) {
      return NextResponse.json(data)
    } else {
      return NextResponse.json(
        { error: data.detail || 'Failed to delete conversation' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Conversation DELETE API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 