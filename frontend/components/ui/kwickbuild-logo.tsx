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
        <div 
          className="flex items-center justify-center bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-lg"
          style={{ 
            width: height * 2.5, 
            height: height,
            fontSize: `${Math.max(height * 0.3, 12)}px`
          }}
        >
          KWICKBUILD
        </div>
      )}
    </div>
  )
} 