import { NextRequest, NextResponse } from 'next/server'

// Use Railway URL in production, localhost in development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://kwickbuild.up.railway.app'
  : 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 Tool Config Schema API called for ID:', params.id)
    
    const authHeader = request.headers.get('authorization')
    console.log('🔐 Auth header received:', authHeader ? 'Yes' : 'No')
    
    if (!authHeader) {
      console.log('❌ No authorization header')
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }
    
    const targetUrl = `${API_BASE_URL}/api/v1/tools/${params.id}/config-schema`
    console.log('🎯 Target URL:', targetUrl)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    }

    // Forward the request to our backend
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
    })
    
    const data = await response.json()
    
    console.log('📡 Backend response status:', response.status)
    
    if (response.ok) {
      return NextResponse.json(data)
    } else {
      console.log('❌ Backend error:', data)
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch tool config schema' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Tool Config Schema API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 