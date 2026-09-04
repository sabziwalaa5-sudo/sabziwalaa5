import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      { source: "/app", destination: "/", permanent: false },
      { source: "/app/", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
