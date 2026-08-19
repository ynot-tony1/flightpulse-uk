import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@flightpulse/shared"],
  // Monorepo root — apps/web depends on sibling packages (packages/shared),
  // so the tracer needs to see the whole workspace, not just apps/web.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // Prisma's query engine binary is loaded via a dynamic (non-static)
  // require() that Next.js's file tracer doesn't follow, so it gets
  // silently dropped from the deployed function bundle unless explicitly
  // included. The client now generates into apps/web/generated/prisma
  // (co-located, not a sibling package) specifically to make this glob
  // simple and reliable.
  outputFileTracingIncludes: {
    "/**": ["./generated/prisma/**/*.node"],
  },
};

export default nextConfig;
