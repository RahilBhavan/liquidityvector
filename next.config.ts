import type { NextConfig } from 'next';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_BACKEND_URL) {
  console.warn('⚠️  WARNING: NEXT_PUBLIC_BACKEND_URL is not defined. Defaulting to http://localhost:8000 which may not work in production.');
}

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Proxy API requests to Python backend
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;