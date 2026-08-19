import { withDatabase, type DataResult } from "@/lib/db";

export interface OverviewSummary {
  latestPeriod: { year: number; month: number } | null;
  totalPassengers: number | null;
  totalMovements: number | null;
  routeCount: number | null;
  airportCount: number | null;
  averageDelayMinutes: number | null;
  onTimePercentage: number | null;
  latestUpdatePublicationDate: string | null;
}

export async function getOverviewSummary(): Promise<
  DataResult<OverviewSummary>
> {
  return withDatabase(async (db) => {
    const latestRelease = await db.ingestionSourceRelease.findFirst({
      where: { status: "imported" },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    if (!latestRelease) {
      return {
        latestPeriod: null,
        totalPassengers: null,
        totalMovements: null,
        routeCount: null,
        airportCount: null,
        averageDelayMinutes: null,
        onTimePercentage: null,
        latestUpdatePublicationDate: null,
      };
    }

    const { year, month } = latestRelease;

    const [passengers, movements, routeCount, airportCount, punctuality] =
      await Promise.all([
        db.airportMonthlyMetric.aggregate({
          where: { year, month, metricCode: "terminal_passengers" },
          _sum: { value: true },
        }),
        db.airportMonthlyMetric.aggregate({
          where: { year, month, metricCode: "aircraft_movements_total" },
          _sum: { value: true },
        }),
        db.routeMonthlyMetric.count({ where: { year, month } }),
        db.airport.count({ where: { caaReportingAirport: true } }),
        db.punctualityMetric.findMany({
          where: { year, month, destinationAirportId: null },
          select: {
            averageDelayMinutes: true,
            onTimePercentage: true,
            flightsMatched: true,
          },
        }),
      ]);

    const weighted = punctuality.reduce(
      (acc, p) => {
        const weight = p.flightsMatched ?? 0;
        if (p.averageDelayMinutes != null && weight > 0) {
          acc.delaySum += p.averageDelayMinutes * weight;
          acc.delayWeight += weight;
        }
        if (p.onTimePercentage != null && weight > 0) {
          acc.onTimeSum += p.onTimePercentage * weight;
          acc.onTimeWeight += weight;
        }
        return acc;
      },
      { delaySum: 0, delayWeight: 0, onTimeSum: 0, onTimeWeight: 0 },
    );

    return {
      latestPeriod: { year, month },
      totalPassengers: passengers._sum.value ?? null,
      totalMovements: movements._sum.value ?? null,
      routeCount,
      airportCount,
      averageDelayMinutes:
        weighted.delayWeight > 0
          ? weighted.delaySum / weighted.delayWeight
          : null,
      onTimePercentage:
        weighted.onTimeWeight > 0
          ? weighted.onTimeSum / weighted.onTimeWeight
          : null,
      latestUpdatePublicationDate:
        latestRelease.publicationDate?.toISOString() ?? null,
    };
  });
}
