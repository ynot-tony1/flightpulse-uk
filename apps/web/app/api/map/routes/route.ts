import { z } from "zod";
import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-response";
import { getMapRoutes } from "@/lib/data/map";

const ROUTE_COUNT_ALLOWLIST = [10, 25, 50, 100] as const;
const HARD_MAX_ROUTES = 200;

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  origin: z.string().length(3).optional(),
  count: z.coerce
    .number()
    .int()
    .refine((v) => ROUTE_COUNT_ALLOWLIST.includes(v as 10 | 25 | 50 | 100), {
      message: "count must be one of 10, 25, 50, 100",
    })
    .default(25),
});

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return jsonError(
      "Invalid query parameters — year, month required; count must be 10/25/50/100",
      400,
    );
  }

  const maxRoutes = Math.min(parsed.data.count, HARD_MAX_ROUTES);

  const result = await getMapRoutes({
    year: parsed.data.year,
    month: parsed.data.month,
    originCode: parsed.data.origin,
    maxRoutes,
  });

  if (result.status !== "ok") {
    return jsonOk({ items: [] }, { cacheSeconds: 30 });
  }
  return jsonOk({ items: result.data }, { cacheSeconds: 3600 });
}
