import type { NextConfig } from "next";
import { LEGACY_PATH_REDIRECTS } from "./src/lib/legacyRedirects";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.youthcamping.in',
      },
      {
        protocol: 'https',
        hostname: 'vl-prod-static.b-cdn.net',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'https',
        hostname: 'youthcamping.online',
      },
      {
        protocol: 'https',
        hostname: 'www.youthcamping.online',
      },
      {
        protocol: 'https',
        hostname: 'www.youthcamping.in',
      },
      {
        protocol: 'https',
        hostname: 'youthcamping.in',
      }
    ],
  },
  async rewrites() {
    return [
      {
        source: "/tours",
        destination: "/trips",
      },
      {
        source: "/tours/:slug*",
        destination: "/trips/:slug*",
      },
      {
        source: "/group-trips",
        destination: "/trips?type=group",
      },
      {
        source: "/tour-packages",
        destination: "/trips?type=packages",
      },
      {
        source: "/offers",
        destination: "/sale-of-season",
      },
      {
        source: "/gift-voucher",
        destination: "/sale-of-season",
      },
    ];
  },
  async redirects() {
    return [
      ...LEGACY_PATH_REDIRECTS.map((rule) => ({
        source: rule.source,
        destination: rule.destination,
        statusCode: 301 as const,
      })),
    ];
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
