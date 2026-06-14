import type { NextConfig } from 'next'

// Driven by .env.production (NEXT_PUBLIC_BASE_PATH) so the value is inlined
// into client bundles and kept in sync with `basePath`. Empty in `next dev`.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

const config: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: basePath || undefined,
  images: {
    unoptimized: true,
  },
}

export default config
