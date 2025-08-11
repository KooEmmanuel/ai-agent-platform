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
    console.log('🔍 Agent Tools GET API called for ID:', params.id)
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const targetUrl = `${API_BASE_URL}/api/v1/agents/${params.id}/tools`
    console.log('🎯 Target URL:', targetUrl)

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      }
    })
    
    console.log('📡 Backend response status:', response.status)
    
    const data = await response.json()
    
    if (response.ok) {
      return NextResponse.json(data)
    } else {
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch agent tools' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Agent Tools GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 Agent Tools POST API called for ID:', params.id)
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('📄 Request body:', body)

    const targetUrl = `${API_BASE_URL}/api/v1/agents/${params.id}/tools`
    console.log('🎯 Target URL:', targetUrl)

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })
    
    console.log('📡 Backend response status:', response.status)
    
    const data = await response.json()
    console.log('📄 Backend response data:', data)
    
    if (response.ok) {
      return NextResponse.json(data)
    } else {
      console.error('❌ Backend error:', data)
      return NextResponse.json(
        { error: data.detail || 'Failed to add tool to agent' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Agent Tools POST API error:', error)
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
    console.log('🔍 Agent Tools DELETE API called for ID:', params.id)
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('📄 Request body:', body)

    const targetUrl = `${API_BASE_URL}/api/v1/agents/${params.id}/tools`
    console.log('🎯 Target URL:', targetUrl)

    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })
    
    console.log('📡 Backend response status:', response.status)
    
    const data = await response.json()
    
    if (response.ok) {
      return NextResponse.json(data)
    } else {
      return NextResponse.json(
        { error: data.detail || 'Failed to remove tool from agent' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Agent Tools DELETE API error:', error)
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
    console.log('🔍 Agent Tools PUT API called for ID:', params.id)
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('📄 Request body:', body)

    const targetUrl = `${API_BASE_URL}/api/v1/agents/${params.id}/tools`
    console.log('🎯 Target URL:', targetUrl)

    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })
    
    console.log('📡 Backend response status:', response.status)
    
    const data = await response.json()
    
    if (response.ok) {
      return NextResponse.json(data)
    } else {
      return NextResponse.json(
        { error: data.detail || 'Failed to update tool configuration' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Agent Tools PUT API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 