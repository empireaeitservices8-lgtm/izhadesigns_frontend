import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    qualities: [75, 80, 85],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    // Determine backend base URL:
    // 1. Explicit BACKEND_URL from environment variable
    // 2. In production (e.g. Vercel deployment), default to Render backend: https://izhadesigns-backend.onrender.com
    // 3. In local development, default to local Express backend on port 5000
    const backendBase = (
      process.env.BACKEND_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://izhadesigns-backend.onrender.com"
        : `http://127.0.0.1:${process.env.BACKEND_PORT || "5000"}`)
    ).replace(/\/$/, "");

    return [
      {
        source: "/api/:path*",
        destination: `${backendBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
