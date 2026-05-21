import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mc-heads.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
