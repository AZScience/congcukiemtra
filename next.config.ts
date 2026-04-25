import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'kiemtranoibo.ntt.edu.vn',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        '6000-firebase-studio-1766398994980.cluster-fdkw7vjj7bgguspe3fbbc25tra.cloudworkstations.dev',
        '9000-firebase-studio-1766398994980.cluster-fdkw7vjj7bgguspe3fbbc25tra.cloudworkstations.dev',
        'localhost:9002',
        '*.cloudworkstations.dev'
      ]
    }
  },
  // Add allowedDevOrigins to fix the cross-origin warning in dev environment
  allowedDevOrigins: [
    '6000-firebase-studio-1766398994980.cluster-fdkw7vjj7bgguspe3fbbc25tra.cloudworkstations.dev',
    '9000-firebase-studio-1766398994980.cluster-fdkw7vjj7bgguspe3fbbc25tra.cloudworkstations.dev',
    '172.17.144.1'
  ] as any,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
