import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during production builds (test app only)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during build (test app only)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
