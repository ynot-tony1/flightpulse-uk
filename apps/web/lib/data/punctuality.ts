import { withDatabase } from "@/lib/db";

export interface PunctualityFilters {
  year?: number;
  month?: number;
  airportCode?: string;
}

export async function listAirportPunctuality(
  filters: PunctualityFilters,
  limit = 50,
) {
  return withDatabase(async (db) => {
    const airport = filters.airportCode
      ? await db.airport.findFirst({
          where: { canonicalCode: filters.airportCode.toUpperCase() },
        })
      : null;

    return db.punctualityMetric.findMany({
      where: {
        destinationAirportId: null, // airport-level rows only
        ...(filters.year ? { year: filters.year } : {}),
        ...(filters.month ? { month: filters.month } : {}),
        ...(airport ? { airportId: airport.id } : {}),
      },
      orderBy: [
        { year: "desc" },
        { month: "desc" },
        { averageDelayMinutes: "asc" },
      ],
      take: limit,
      include: { airport: true },
    });
  });
}
