import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // stage-2 commit round-trips the full edited dataset as JSON
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
