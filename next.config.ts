import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async rewrites() {
    return [
      { source: "/privacy", destination: "/privacy.html" },
      { source: "/delete-account", destination: "/delete-account.html" },
    ];
  },
};

export default nextConfig;
