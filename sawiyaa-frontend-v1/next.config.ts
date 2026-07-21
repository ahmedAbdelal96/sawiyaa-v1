import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
// Turbopack is the default bundler in Next.js 16, so we keep its SVG handling
// aligned with the icon barrel used throughout the app.

const nextConfig: NextConfig = {
  /* config options here */
  webpack(config) {
    const assetRule = config.module.rules.find(
      (rule: { test?: RegExp }) => rule?.test instanceof RegExp && rule.test.test(".svg"),
    ) as { exclude?: RegExp | RegExp[] } | undefined;

    if (assetRule) {
      assetRule.exclude = /\.svg$/i;
    }

    config.module.rules.push({
      test: /\.svg$/i,
      use: ["@svgr/webpack"],
    });

    return config;
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:locale(en|ar)/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, no-cache, must-revalidate, max-age=0",
          },
        ],
      },
      {
        source: "/:locale(en|ar)/(patient|practitioner)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, no-cache, must-revalidate, max-age=0",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(self), geolocation=(), payment=(self), usb=(), display-capture=(self), fullscreen=(self)",
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
      {
        source: '/article-covers/:path*',
        destination: `${apiTarget}/api/v1/article-covers/:path*`,
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
};

export default withNextIntl(nextConfig);
