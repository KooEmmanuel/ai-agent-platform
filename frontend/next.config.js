/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? 'https://kwickbuild.up.railway.app'
      : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ]
  },
}

module.exports = nextConfig 