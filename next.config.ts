import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  outputFileTracingRoot: import.meta.dirname,
  devIndicators: false,
  // Clerk production-key local testing via https://local.tools.creativewaco.org
  allowedDevOrigins: ["local.tools.creativewaco.org"],
};

export default nextConfig;
