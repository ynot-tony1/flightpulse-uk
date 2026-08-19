import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

/**
 * Shared API envelope helpers. Every route must go through these so errors
 * never leak a raw database message and every response carries a request
 * ID for log correlation (section 50).
 */

export function jsonOk<T>(data: T, init?: { cacheSeconds?: number }) {
  const response = NextResponse.json({ data, requestId: randomUUID() });
  if (init?.cacheSeconds) {
    response.headers.set(
      "Cache-Control",
      `public, s-maxage=${init.cacheSeconds}, stale-while-revalidate=${init.cacheSeconds * 2}`,
    );
  }
  return response;
}

export function jsonError(message: string, status: number) {
  const requestId = randomUUID();
  console.error(
    JSON.stringify({ event: "api_error", message, status, requestId }),
  );
  return NextResponse.json(
    { error: { code: String(status), message, requestId } },
    { status },
  );
}

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
