import { NextRequest, NextResponse } from 'next/server'

// Use Railway URL in production, localhost in development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://kwickbuild.up.railway.app'
  : 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Tool Types API called')
    
    const targetUrl = `${API_BASE_URL}/api/v1/tools/types/list`
    console.log('🎯 Target URL:', targetUrl)

    // Forward the request to our backend
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
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
        { error: data.detail || 'Failed to fetch tool types' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Tool Types API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 