import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serve static files from media storage
  async rewrites() {
    return [
      {
        source: '/media/storage/:path*',
        destination: '/workspace/applens/media/storage/:path*'
      }
    ];
  },
  // Expose static files
  output: 'standalone'
};

export default nextConfig;
