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

export async function getRoutePunctuality(
  originAirportId: string,
  destinationAirportId: string,
  limit = 24,
) {
  return withDatabase(async (db) => {
    // CAA's punctuality summary reports each route from the reporting
    // airport's side only, so a route could be filed as either
    // origin->destination or destination->origin depending on which one is
    // the CAA-monitored reporting airport — check both directions.
    return db.punctualityMetric.findMany({
      where: {
        OR: [
          { airportId: originAirportId, destinationAirportId },
          {
            airportId: destinationAirportId,
            destinationAirportId: originAirportId,
          },
        ],
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: limit,
    });
  });
}
