import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Transparently proxies /api requests to backend URL (Render in production, or BACKEND_URL env override)
    const backendUrl = process.env.BACKEND_URL || 'https://azwari.onrender.com';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/order/:path*',
        destination: '/track',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
