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
  }
  // Temporarily enable TypeScript checks to see detailed errors
  // typescript: {
  //   ignoreBuildErrors: true
  // }
}

module.exports = nextConfig 