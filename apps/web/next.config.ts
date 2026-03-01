import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@molgame/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
