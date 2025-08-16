import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['firebase'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  output: 'export',
  trailingSlash: true,
  basePath: '/shift-time',
  assetPrefix: '/shift-time/',
  poweredByHeader: false,
  compress: true,
  generateEtags: false,
  reactStrictMode: true,
  images: {
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
  },
  // Disable server-side features for static export
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  // Ensure all assets use the correct base path
  distDir: 'out',
  // Force all public assets to use basePath
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
