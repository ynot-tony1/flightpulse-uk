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

    const allMatching = await db.airport.findMany({ where });
    const totalCount = allMatching.length;

    const latestRelease = await db.ingestionSourceRelease.findFirst({
      where: {
        status: "imported",
        sourceDataset: { datasetCode: "caa_airport_statistics" },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    const metricByAirport = new Map<
      string,
      { passengers: number | null; movements: number | null }
    >();
    if (latestRelease) {
      const metrics = await db.airportMonthlyMetric.findMany({
        where: {
          year: latestRelease.year,
          month: latestRelease.month,
          metricCode: {
            in: ["terminal_passengers", "aircraft_movements_total"],
          },
          airportId: { in: allMatching.map((a) => a.id) },
        },
      });
      for (const m of metrics) {
        const entry = metricByAirport.get(m.airportId) ?? {
          passengers: null,
          movements: null,
        };
        if (m.metricCode === "terminal_passengers") entry.passengers = m.value;
        if (m.metricCode === "aircraft_movements_total")
          entry.movements = m.value;
        metricByAirport.set(m.airportId, entry);
      }
    }

    const withMetrics = allMatching.map((a) => ({
      airport: a,
      passengers: metricByAirport.get(a.id)?.passengers ?? null,
      movements: metricByAirport.get(a.id)?.movements ?? null,
    }));

    withMetrics.sort((a, b) => {
      if (filters.sort === "passengers")
        return (b.passengers ?? -1) - (a.passengers ?? -1);
      if (filters.sort === "movements")
        return (b.movements ?? -1) - (a.movements ?? -1);
      return a.airport.displayName.localeCompare(b.airport.displayName);
    });

    const page = withMetrics.slice(
      (filters.page - 1) * filters.pageSize,
      filters.page * filters.pageSize,
    );

    const items: AirportSummary[] = page.map(
      ({ airport: a, passengers, movements }) => ({
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
        latestMonthlyPassengers: passengers,
        latestMonthlyMovements: movements,
      }),
    );

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
