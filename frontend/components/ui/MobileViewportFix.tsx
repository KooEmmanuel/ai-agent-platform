'use client'

import { useEffect } from 'react'

export function MobileViewportFix() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    let viewportHeight = window.innerHeight
    let isKeyboardOpen = false

    // Handle viewport changes (keyboard open/close)
    const handleResize = () => {
      const newViewportHeight = window.innerHeight
      
      // If viewport got smaller (keyboard opened)
      if (newViewportHeight < viewportHeight) {
        isKeyboardOpen = true
      }
      // If viewport got larger (keyboard closed)
      else if (newViewportHeight > viewportHeight && isKeyboardOpen) {
        isKeyboardOpen = false
        // Keyboard closed - adjust viewport
        setTimeout(() => {
          window.scrollTo(0, 0)
          // Force viewport adjustment
          document.body.style.height = '100vh'
          document.documentElement.style.height = '100vh'
        }, 100)
      }
      
      viewportHeight = newViewportHeight
    }

    // Handle focus events
    const handleFocusOut = (event: FocusEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setTimeout(() => {
          window.scrollTo(0, 0)
          // Ensure proper viewport height
          document.body.style.height = '100vh'
          document.documentElement.style.height = '100vh'
        }, 150)
      }
    }

    // Handle blur events (when user clicks "Done" on keyboard)
    const handleBlur = (event: FocusEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setTimeout(() => {
          window.scrollTo(0, 0)
          // Force viewport adjustment
          document.body.style.height = '100vh'
          document.documentElement.style.height = '100vh'
        }, 100)
      }
    }

    // Add event listeners
    window.addEventListener('resize', handleResize)
    document.addEventListener('focusout', handleFocusOut)
    document.addEventListener('blur', handleBlur, true)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('focusout', handleFocusOut)
      document.removeEventListener('blur', handleBlur, true)
    }
  }, [])

  return null // This component doesn't render anything
} 