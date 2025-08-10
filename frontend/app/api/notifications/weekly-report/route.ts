import { NextRequest, NextResponse } from 'next/server'

// Use Railway URL in production, localhost in development
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://kwickbuild.up.railway.app'
  : 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Notifications Weekly Report API called')

    const authHeader = request.headers.get('authorization')
    console.log('🔐 Auth header received:', authHeader ? 'Yes' : 'No')

    if (!authHeader) {
      console.log('❌ No authorization header')
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('📝 Request body:', body)

    const targetUrl = `${API_BASE_URL}/api/v1/notifications/weekly-report`
    console.log('🎯 Target URL:', targetUrl)

    // Forward the request to our backend
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()

    console.log('📡 Backend response status:', response.status)

    if (response.ok) {
      return NextResponse.json(data)
    } else {
      console.log('❌ Backend error:', data)
      return NextResponse.json(
        { error: data.detail || 'Failed to send weekly report' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Notifications Weekly Report API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 