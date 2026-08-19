import { z } from "zod";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-response";
import { getMapAirports } from "@/lib/data/map";

const MODE_ALLOWLIST = [
  "PASSENGER_ROUTES",
  "AIRPORT_TRAFFIC",
  "PUNCTUALITY",
  "AVERAGE_DELAY",
  "DOMESTIC",
  "INTERNATIONAL",
  "FREIGHT",
  "GROWTH",
] as const;

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  mode: z.enum(MODE_ALLOWLIST).default("AIRPORT_TRAFFIC"),
});

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return jsonError("Invalid query parameters — year, month required", 400);
  }

  const result = await getMapAirports(parsed.data);
  if (result.status !== "ok") {
    return jsonOk({ items: [] }, { cacheSeconds: 30 });
  }
  return jsonOk({ items: result.data }, { cacheSeconds: 3600 });
}
