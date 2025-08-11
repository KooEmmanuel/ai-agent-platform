import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('🔍 Test POST API called')
  
  try {
    const body = await request.json()
    console.log('📄 Test POST body:', body)
    
    return NextResponse.json({ 
      message: 'Test POST successful',
      received: body 
    })
  } catch (error) {
    console.error('Test POST error:', error)
    return NextResponse.json(
      { error: 'Test POST failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  console.log('🔍 Test GET API called')
  return NextResponse.json({ message: 'Test GET successful' })
} 