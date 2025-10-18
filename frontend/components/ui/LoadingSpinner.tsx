import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'white' | 'blue' | 'gray'
  className?: string
}

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'blue',
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  }
  
  const colorClasses = {
    white: 'border-white',
    blue: 'border-blue-600',
    gray: 'border-gray-600'
  }

  return (
    <div 
      className={`animate-spin rounded-full border-2 border-transparent border-t-2 ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
    />
  )
}
