import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@flightpulse/shared"],
  // Monorepo root, two levels up from apps/web — without this, Next.js's
  // file tracer scopes itself to apps/web and can't resolve `../../`
  // includes correctly during Vercel's remote build (works locally where
  // the ambient cwd happens to differ).
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // Next.js's serverless-function file tracer doesn't follow Prisma's
  // dynamic (non-static) require() for its query engine binary, so it gets
  // silently dropped from the deployed bundle unless explicitly included.
  outputFileTracingIncludes: {
    "/**": ["../../packages/database/generated/client/**/*.node"],
  },
};

export default nextConfig;
