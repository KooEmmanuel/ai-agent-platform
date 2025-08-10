import React from 'react';
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
  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src="/ilogo.png"
        alt="Kwickbuild Logo"
        width={height * 2.5}
        height={height * 2.5}
        style={{ 
          flexShrink: 0,
          objectFit: 'contain'
        }}
        priority
      />
    </div>
  )
} 