'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function GoogleCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const error = searchParams.get('error')

        if (error) {
          setStatus('error')
          setMessage(`Authentication failed: ${error}`)
          return
        }

        if (!code) {
          setStatus('error')
          setMessage('No authorization code received')
          return
        }

        // Send the authorization code to the backend to exchange for tokens
        try {
          console.log('🔄 OAuth Callback - Starting token exchange...')
          console.log('🔄 OAuth Callback - Authorization code:', code ? 'RECEIVED' : 'MISSING')
          
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
          const authToken = localStorage.getItem('auth_token')
          
          console.log('🔄 OAuth Callback - API Base URL:', apiBaseUrl)
          console.log('🔄 OAuth Callback - Auth token exists:', !!authToken)
          
          if (!authToken) {
            setStatus('error')
            setMessage('You must be logged in to authenticate with Google')
            return
          }

          console.log('🔄 OAuth Callback - Sending request to backend...')
          const response = await fetch(`${apiBaseUrl}/api/v1/tools/google_suite_tool/execute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              operation: 'authenticate',
              auth_code: code
            })
          })

          console.log('🔄 OAuth Callback - Response status:', response.status)
          const result = await response.json()
          console.log('🔄 OAuth Callback - Response result:', result)
          
          if (result.success && result.result?.success) {
            setStatus('success')
            setMessage('Google authentication successful! You can now use Google Suite tools.')
            console.log('✅ OAuth Callback - Authentication successful!')
            
            // Close the popup window if opened in popup
            if (window.opener) {
              console.log('🔄 OAuth Callback - Sending message to parent window...')
              window.opener.postMessage({ 
                type: 'GOOGLE_AUTH_SUCCESS', 
                code,
                result: result.result 
              }, '*')
              window.close()
            } else {
              // Redirect back to the main app
              setTimeout(() => {
                router.push('/dashboard/tools')
              }, 2000)
            }
          } else {
            console.error('❌ OAuth Callback - Authentication failed:', result)
            setStatus('error')
            setMessage(result.result?.error || 'Authentication failed')
          }
        } catch (error) {
          console.error('❌ OAuth Callback - Error:', error)
          setStatus('error')
          setMessage(`Failed to authenticate: ${error}`)
        }
      } catch (error) {
        setStatus('error')
        setMessage(`Error: ${error}`)
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Processing Authentication...
              </h2>
              <p className="text-gray-600">
                Please wait while we complete your Google authentication.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="rounded-full h-12 w-12 bg-green-100 mx-auto mb-4 flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Authentication Successful!
              </h2>
              <p className="text-gray-600 mb-4">
                {message}
              </p>
              <button
                onClick={() => router.push('/dashboard/tools')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Go to Tools
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="rounded-full h-12 w-12 bg-red-100 mx-auto mb-4 flex items-center justify-center">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Authentication Failed
              </h2>
              <p className="text-gray-600 mb-4">
                {message}
              </p>
              <button
                onClick={() => router.push('/dashboard/tools')}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}