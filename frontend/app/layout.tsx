import React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ClientProviders } from '../components/ui/ClientProviders'

const inter = Inter({ subsets: ['latin'] })

// Add Nata Sans font
const nataSans = {
  fontFamily: 'Nata Sans, sans-serif',
  src: `
    @font-face {
      font-family: 'Nata Sans';
      src: url('https://fonts.googleapis.com/css2?family=Nata+Sans:wght@400;500;600;700&display=swap');
      font-weight: 400 700;
      font-style: normal;
    }
  `
}

export const metadata: Metadata = {
  title: 'Kwickbuild Platform',
  description: 'Build, test, and deploy AI agents with powerful tools and integrations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.className} [--font-pacifico:var(--font-pacifico)] bg-white text-gray-900`}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
} 