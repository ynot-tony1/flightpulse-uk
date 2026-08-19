import { withDatabase } from "@/lib/db";

export async function listAirlines(query?: string, limit = 50) {
  return withDatabase(async (db) => {
    return db.airline.findMany({
      where: {
        active: true,
        ...(query
          ? { canonicalName: { contains: query, mode: "insensitive" as const } }
          : {}),
      },
      orderBy: { canonicalName: "asc" },
      take: limit,
    });
  });
}

export async function getAirlineById(id: string) {
  return withDatabase(async (db) => {
    return db.airline.findUnique({
      where: { id },
      include: {
        monthlyMetrics: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 24,
        },
      },
    });
  });
}
