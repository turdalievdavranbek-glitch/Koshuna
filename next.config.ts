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
  async headers() {
    return [
      {
        source: "/download/koshuna.apk",
        headers: [
          {
            key: "Content-Type",
            value: "application/vnd.android.package-archive",
          },
          {
            key: "Content-Disposition",
            value: 'attachment; filename="koshuna.apk"',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
