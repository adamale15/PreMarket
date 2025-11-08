/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    // Enable if needed for your use case
  },
  // Path aliases are configured in tsconfig.json
};

module.exports = nextConfig;

