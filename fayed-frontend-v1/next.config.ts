import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
  async rewrites() {
    const apiTarget = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:7000';

    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiTarget}/api/v1/:path*`,
      },
      // Socket.IO transport for realtime chat. We proxy it to the backend so the frontend can
      // keep using a same-origin API baseURL in dev/LAN setups (NEXT_PUBLIC_API_URL=/api/v1).
      {
        source: '/socket.io',
        destination: `${apiTarget}/socket.io`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${apiTarget}/socket.io/:path*`,
      },
      {
        source: '/api/docs',
        destination: `${apiTarget}/api/docs`,
      },
      {
        source: '/api/docs/:path*',
        destination: `${apiTarget}/api/docs/:path*`,
      },
    ];
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
    
    turbopack: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  
};

export default withNextIntl(nextConfig);
