import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@flightpulse/shared"],
  // Next.js's serverless-function file tracer doesn't follow Prisma's
  // dynamic (non-static) require() for its query engine binary, so it gets
  // silently dropped from the deployed bundle unless explicitly included.
  outputFileTracingIncludes: {
    "/**": ["../../packages/database/generated/client/**/*.node"],
  },
};

export default nextConfig;
