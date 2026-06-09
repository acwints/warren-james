import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "*.googleusercontent.com",
        protocol: "https",
      },
    ],
  },
};

export default nextConfig;
