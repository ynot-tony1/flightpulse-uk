import { withDatabase, type DataResult } from "@/lib/db";
import type { AirportSummary } from "@flightpulse/shared";

export interface AirportListFilters {
  query?: string;
  ukNation?: string;
  sort: "passengers" | "movements" | "name";
  page: number;
  pageSize: number;
}

export async function listAirports(
  filters: AirportListFilters,
): Promise<DataResult<{ items: AirportSummary[]; totalCount: number }>> {
  return withDatabase(async (db) => {
    const where = {
      caaReportingAirport: true,
      ...(filters.query
        ? {
            OR: [
              {
                displayName: {
                  contains: filters.query,
                  mode: "insensitive" as const,
                },
              },
              { iataCode: { equals: filters.query.toUpperCase() } },
              { icaoCode: { equals: filters.query.toUpperCase() } },
            ],
          }
        : {}),
      ...(filters.ukNation ? { ukNation: filters.ukNation } : {}),
    };

    const [rows, totalCount] = await Promise.all([
      db.airport.findMany({
        where,
        orderBy:
          filters.sort === "name"
            ? { displayName: "asc" }
            : { displayName: "asc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      db.airport.count({ where }),
    ]);

    const items: AirportSummary[] = rows.map((a) => ({
      id: a.id,
      canonicalCode: a.canonicalCode,
      iataCode: a.iataCode,
      icaoCode: a.icaoCode,
      displayName: a.displayName,
      municipality: a.municipality,
      ukNation: a.ukNation,
      countryCode: a.countryCode,
      latitude: a.latitude,
      longitude: a.longitude,
      punctualityMonitored: a.punctualityMonitored,
      latestMonthlyPassengers: null,
      latestMonthlyMovements: null,
    }));

    return { items, totalCount };
  });
}

export async function getAirportByCode(code: string) {
  return withDatabase(async (db) => {
    return db.airport.findFirst({
      where: {
        OR: [
          { canonicalCode: code.toUpperCase() },
          { iataCode: code.toUpperCase() },
          { icaoCode: code.toUpperCase() },
        ],
      },
    });
  });
}

export async function getAirportMonthlyMetrics(
  airportId: string,
  metricCode: string,
  limitMonths = 60,
) {
  return withDatabase(async (db) => {
    return db.airportMonthlyMetric.findMany({
      where: { airportId, metricCode },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: limitMonths,
    });
  });
}
