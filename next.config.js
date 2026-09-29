/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    FIREBASE_PROJECT_ID: 'roi-appointments',
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'fallback-secret-key-for-development-only',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3001',
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        child_process: false,
        tls: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig
