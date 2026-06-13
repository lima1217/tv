/** @type {import('next').NextConfig} */
/* eslint-disable @typescript-eslint/no-var-requires */

const runtimeCaching = require('next-pwa/cache');

const apiRuntimeCache = runtimeCaching.find(
  (cache) => cache.options?.cacheName === 'apis'
);

if (apiRuntimeCache) {
  apiRuntimeCache.urlPattern = ({ url }) => {
    const isSameOrigin = self.origin === url.origin;
    if (!isSameOrigin) return false;

    const pathname = url.pathname;
    if (!pathname.startsWith('/api/')) return false;
    const privateApiPrefixes = [
      '/api/admin/',
      '/api/change-password',
      '/api/favorites',
      '/api/login',
      '/api/logout',
      '/api/playrecords',
      '/api/searchhistory',
      '/api/skipconfigs',
    ];
    if (privateApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      return false;
    }

    return true;
  };
}

const nextConfig = {
  output: 'standalone',
  eslint: {
    dirs: ['src'],
  },

  reactStrictMode: false,
  swcMinify: false,

  experimental: {
    instrumentationHook: process.env.NODE_ENV === 'production',
  },

  // Uncoment to add domain whitelist
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },

  webpack(config) {
    // Grab the existing rule that handles SVG imports
    const fileLoaderRule = config.module.rules.find((rule) =>
      rule.test?.test?.('.svg')
    );

    config.module.rules.push(
      // Reapply the existing rule, but only for svg imports ending in ?url
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      // Convert all other *.svg imports to React components
      {
        test: /\.svg$/i,
        issuer: { not: /\.(css|scss|sass)$/ },
        resourceQuery: { not: /url/ }, // exclude if *.svg?url
        loader: '@svgr/webpack',
        options: {
          dimensions: false,
          titleProp: true,
        },
      }
    );

    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    fileLoaderRule.exclude = /\.svg$/i;

    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      tls: false,
      crypto: false,
    };

    return config;
  },
};

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  runtimeCaching,
  skipWaiting: true,
});

module.exports = withPWA(nextConfig);
