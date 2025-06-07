/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: []
  },
  output: 'standalone',
  // Build optimizations for CI/Docker builds  
  eslint: {
    ignoreDuringBuilds: true
  },
  webpack: (config) => {
    const path = require('path');
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  }
  // Temporarily enable TypeScript checks to see detailed errors
  // typescript: {
  //   ignoreBuildErrors: true
  // }
}

module.exports = nextConfig 