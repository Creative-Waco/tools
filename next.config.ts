import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
