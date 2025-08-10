import { NextRequest, NextResponse } from 'next/server'

// Use Railway URL in production, localhost in development
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://kwickbuild.up.railway.app'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')

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
    const response = await fetch(`${API_BASE_URL}/api/v1/credits/balance`, {
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
        { error: data.detail || 'Failed to fetch credit balance' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Credit balance error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 