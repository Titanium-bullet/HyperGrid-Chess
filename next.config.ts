import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lichess1.org', pathname: '/assets/piece/**' },
    ],
  },
}

export default config
