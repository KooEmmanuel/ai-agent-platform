import { NextRequest, NextResponse } from 'next/server'

// Use Railway URL in production, localhost in development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://kwickbuild.up.railway.app'
  : 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Marketplace Tools API called')
    console.log('🌐 API_BASE_URL:', API_BASE_URL)
    
    const authHeader = request.headers.get('authorization')
    console.log('🔐 Auth header received:', authHeader ? 'Yes' : 'No')
    
    if (!authHeader) {
      console.log('❌ No authorization header')
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const tool_type = searchParams.get('tool_type')
    
    console.log('🔍 Query params - category:', category, 'tool_type:', tool_type)
    
    // Build the target URL with query parameters
    const targetUrl = new URL(`${API_BASE_URL}/api/v1/tools/marketplace`)
    if (category) targetUrl.searchParams.append('category', category)
    if (tool_type) targetUrl.searchParams.append('tool_type', tool_type)
    
    console.log('🎯 Target URL:', targetUrl.toString())

    // Forward the request to our backend
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      }
    })
    
    const data = await response.json()
    
    console.log('📡 Backend response status:', response.status)
    console.log('📄 Backend response data length:', Array.isArray(data) ? data.length : 'Not an array')
    
    if (response.ok) {
      return NextResponse.json(data)
    } else {
      console.log('❌ Backend error:', data)
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch marketplace tools' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Marketplace Tools API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 