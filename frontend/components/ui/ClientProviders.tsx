'use client'

import React from 'react'
import { ToastProvider } from './Toast'

interface ClientProvidersProps {
  children: React.ReactNode
}

export const ClientProviders: React.FC<ClientProvidersProps> = ({ children }) => {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  )
} 