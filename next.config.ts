import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  outputFileTracingRoot: import.meta.dirname,
  devIndicators: false,
};

export default nextConfig;
