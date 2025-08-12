import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://kwickbuild.up.railway.app'
  : 'http://localhost:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the authorization header from the request
    const authHeader = request.headers.get('authorization')
    
    // Get the form data (query parameters)
    const formData = await request.formData()
    
    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/api/v1/knowledge-base/collections/${params.id}/query`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader || '',
      },
      body: formData,
    })

    const data = await response.json()
    
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Knowledge base query API error:', error)
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    )
  }
} 