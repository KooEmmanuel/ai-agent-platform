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
    console.log('🚀 FRONTEND API ROUTE CALLED: /api/agents/[id]')
    console.log('📋 Request URL:', request.url)
    console.log('🔍 Agent ID:', params.id)
    
    const authHeader = request.headers.get('authorization')
    console.log('🔐 Auth header received:', authHeader ? 'Yes' : 'No')
    
    if (!authHeader) {
      console.log('❌ No authorization header')
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const targetUrl = `${API_BASE_URL}api/v1/agents/${params.id}`
    console.log('🎯 Target URL:', targetUrl)
    console.log('🌐 API_BASE_URL:', API_BASE_URL)

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'Kwickbuild-Frontend/1.0',
      }
    })
    
    console.log('📡 Backend response status:', response.status)
    console.log('📡 Backend response headers:', Object.fromEntries(response.headers.entries()))
    
    const data = await response.json()
    console.log('📄 Backend response data:', data)
    
    if (response.ok) {
      console.log('✅ Returning successful response')
      return NextResponse.json(data)
    } else {
      console.log('❌ Backend error, returning error response')
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch agent' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Agent GET API error:', error)
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
    console.log('🔍 Agent PUT API called for ID:', params.id)
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('📄 Request body:', body)

    const targetUrl = `${API_BASE_URL}api/v1/agents/${params.id}`
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
        { error: data.detail || 'Failed to update agent' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Agent PUT API error:', error)
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
    console.log('🔍 Agent DELETE API called for ID:', params.id)
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const targetUrl = `${API_BASE_URL}api/v1/agents/${params.id}`
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
        { error: data.detail || 'Failed to delete agent' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Agent DELETE API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 