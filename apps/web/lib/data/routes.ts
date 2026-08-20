import { withDatabase } from "@/lib/db";

export async function getLatestRoutePeriod() {
  return withDatabase(async (db) => {
    const release = await db.ingestionSourceRelease.findFirst({
      where: {
        status: "imported",
        sourceDataset: { datasetCode: "caa_airport_statistics" },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return release ? { year: release.year, month: release.month } : null;
  });
}

export async function listTopRoutes(
  period: { year: number; month: number } | null,
  limit = 25,
) {
  return withDatabase(async (db) => {
    if (!period) return [];
    return db.routeMonthlyMetric.findMany({
      where: { year: period.year, month: period.month },
      orderBy: { passengers: "desc" },
      take: limit,
      include: {
        route: { include: { originAirport: true, destinationAirport: true } },
      },
    });
  });
}

export async function getRouteByAirportCodes(
  originCode: string,
  destinationCode: string,
) {
  return withDatabase(async (db) => {
    const [origin, destination] = await Promise.all([
      db.airport.findFirst({
        where: { canonicalCode: originCode.toUpperCase() },
      }),
      db.airport.findFirst({
        where: { canonicalCode: destinationCode.toUpperCase() },
      }),
    ]);
    if (!origin || !destination) return null;

    return db.route.findFirst({
      where: {
        OR: [
          { originAirportId: origin.id, destinationAirportId: destination.id },
          { originAirportId: destination.id, destinationAirportId: origin.id },
        ],
      },
      include: {
        originAirport: true,
        destinationAirport: true,
        monthlyMetrics: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 60,
        },
      },
    });
  });
}
