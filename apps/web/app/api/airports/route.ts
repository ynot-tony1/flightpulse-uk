import { z } from "zod";
import { NextRequest } from "next/server";
import {
  jsonError,
  jsonOk,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "@/lib/api-response";
import { listAirports } from "@/lib/data/airports";

const SORT_ALLOWLIST = ["passengers", "movements", "name"] as const;

const querySchema = z.object({
  q: z.string().max(100).optional(),
  nation: z.string().max(50).optional(),
  sort: z.enum(SORT_ALLOWLIST).default("passengers"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return jsonError("Invalid query parameters", 400);
  }

  const result = await listAirports({
    query: parsed.data.q,
    ukNation: parsed.data.nation,
    sort: parsed.data.sort,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
  });

  if (result.status !== "ok") {
    return jsonOk(
      {
        items: [],
        totalCount: 0,
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
      },
      { cacheSeconds: 30 },
    );
  }

  return jsonOk(
    {
      items: result.data.items,
      totalCount: result.data.totalCount,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    },
    { cacheSeconds: 3600 },
  );
}
