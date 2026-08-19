import { PrismaClient } from "@/generated/prisma";

/**
 * Server-only Prisma singleton. DATABASE_URL is intentionally unset until
 * CockroachDB Cloud provisioning is complete (see
 * docs/deployment.md#deferred-database-setup) — callers must go through
 * `withDatabase` so the rest of the app degrades to an explicit "not yet
 * connected" state instead of crashing or fabricating data.
 */

declare global {
  var __flightpulsePrisma: PrismaClient | undefined;
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPrisma(): PrismaClient {
  if (!global.__flightpulsePrisma) {
    global.__flightpulsePrisma = new PrismaClient();
  }
  return global.__flightpulsePrisma;
}

export type DataResult<T> =
  { status: "ok"; data: T } | { status: "unavailable"; reason: string };

/**
 * Runs `fn` against Prisma only if a database is configured and reachable.
 * Never throws — a connection failure becomes an explicit "unavailable"
 * result that pages render as a DatabasePendingNotice rather than a 500.
 */
export async function withDatabase<T>(
  fn: (db: PrismaClient) => Promise<T>,
): Promise<DataResult<T>> {
  if (!hasDatabase()) {
    return {
      status: "unavailable",
      reason: "DATABASE_URL is not configured yet",
    };
  }
  try {
    const data = await fn(getPrisma());
    return { status: "ok", data };
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "database_query_failed",
        message: error instanceof Error ? error.message : "unknown error",
      }),
    );
    return { status: "unavailable", reason: "Database query failed" };
  }
}
