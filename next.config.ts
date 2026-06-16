import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
}
export default nextConfig
