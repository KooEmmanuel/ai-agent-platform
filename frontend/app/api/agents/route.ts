import { NextRequest, NextResponse } from 'next/server'

// Use Railway URL in production, localhost in development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://kwickbuild.up.railway.app'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')

// Log the API URL for debugging
console.log('API_BASE_URL:', API_BASE_URL)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Agents API called')
    console.log('🌐 API_BASE_URL:', API_BASE_URL)
    console.log('🔧 Environment:', process.env.NODE_ENV)
    console.log('📡 NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL)
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.log('❌ No authorization header')
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const targetUrl = `${API_BASE_URL}/api/v1/agents`
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
    
    if (response.ok) {
      return NextResponse.json(data)
    } else {
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch agents' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Agents API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 