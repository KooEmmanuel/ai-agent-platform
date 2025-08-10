import React, { useState } from 'react';
import Image from 'next/image';

export default function KwickbuildLogo({
  className = "",
  width = 400,
  height = 120,
}: {
  className?: string
  width?: number
  height?: number
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className={`flex items-center ${className}`} style={{ minHeight: height, maxHeight: height }}>
      {!imageError ? (
        <Image
          src="/ilogo.png"
          alt="Kwickbuild Logo"
          width={height * 2.5}
          height={height * 2.5}
          style={{ 
            flexShrink: 0,
            objectFit: 'contain',
            maxHeight: height,
            maxWidth: height * 2.5
          }}
          priority
          onError={(e) => {
            console.error('Logo image failed to load:', e);
            setImageError(true);
          }}
        />
      ) : (
        <div className={`flex items-center gap-4 ${className}`}>
          <svg
            width={height * 0.6}
            height={height * 0.8}
            viewBox="0 0 100 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4DD0E1" />
                <stop offset="50%" stopColor="#29B6F6" />
                <stop offset="100%" stopColor="#1976D2" />
              </linearGradient>
            </defs>

            {/* Building blocks representing construction/building */}
            <rect x="10" y="45" width="25" height="25" rx="4" fill="url(#gradient1)" />
            <rect x="40" y="30" width="25" height="40" rx="4" fill="url(#gradient1)" opacity="0.8" />
            <rect x="70" y="15" width="25" height="55" rx="4" fill="url(#gradient1)" opacity="0.9" />

            {/* Connecting elements to show building/construction */}
            <rect x="35" y="52" width="10" height="4" rx="2" fill="url(#gradient1)" opacity="0.6" />
            <rect x="65" y="37" width="10" height="4" rx="2" fill="url(#gradient1)" opacity="0.6" />
          </svg>

          <div className="text-2xl font-bold tracking-wide">
            <span
              className="bg-gradient-to-r from-cyan-400 via-blue-500 to-blue-700 bg-clip-text text-transparent"
              style={{ 
                fontFamily: "Nata Sans, system-ui, -apple-system, sans-serif",
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                display: 'inline-block'
              }}
            >
              KWICKBUILD
            </span>
          </div>
        </div>
      )}
    </div>
  )
} 