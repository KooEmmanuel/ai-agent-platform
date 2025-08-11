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
    console.log('🚀 FRONTEND API ROUTE CALLED: /api/web-widget/script/[id]')
    console.log('📋 Request URL:', request.url)
    console.log('🔍 Integration ID:', params.id)
    
    const authHeader = request.headers.get('authorization')
    console.log('🔐 Auth header received:', authHeader ? 'Yes' : 'No')
    
    if (!authHeader) {
      console.log('❌ No authorization header')
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const targetUrl = `${API_BASE_URL}api/v1/web-widget/script/${params.id}`
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
    console.log('📄 Backend response data keys:', Object.keys(data))
    console.log('📄 Script preview (first 100 chars):', data.script ? data.script.substring(0, 100) : 'No script')
    
    if (response.ok) {
      console.log('✅ Returning successful response')
      // Ensure the script is properly formatted as a string
      const responseData = {
        ...data,
        script: data.script || ''
      }
      return NextResponse.json(responseData)
    } else {
      console.log('❌ Backend error, returning error response')
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch widget script' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Web widget script GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 