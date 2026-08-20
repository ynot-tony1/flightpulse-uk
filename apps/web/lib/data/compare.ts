import { withDatabase } from "@/lib/db";

export interface AirportComparisonRow {
  canonicalCode: string;
  displayName: string;
  terminalPassengers: number | null;
  aircraftMovements: number | null;
  domesticPassengers: number | null;
  internationalPassengers: number | null;
  freightTonnes: number | null;
  averageDelayMinutes: number | null;
  onTimePercentage: number | null;
  routeCount: number | null;
}

const METRIC_CODES = [
  "terminal_passengers",
  "aircraft_movements_total",
  "domestic_passengers",
  "international_passengers",
  "freight_tonnes",
] as const;

export async function getAirportComparison(codes: string[]) {
  return withDatabase(async (db) => {
    const upperCodes = codes.map((c) => c.toUpperCase());
    const airports = await db.airport.findMany({ where: { canonicalCode: { in: upperCodes } } });
    if (airports.length === 0) return [];

    const rows: AirportComparisonRow[] = [];

    for (const airport of airports) {
      const latestMetric = await db.airportMonthlyMetric.findFirst({
        where: { airportId: airport.id, metricCode: "terminal_passengers" },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      });
      if (!latestMetric) {
        rows.push({
          canonicalCode: airport.canonicalCode,
          displayName: airport.displayName,
          terminalPassengers: null,
          aircraftMovements: null,
          domesticPassengers: null,
          internationalPassengers: null,
          freightTonnes: null,
          averageDelayMinutes: null,
          onTimePercentage: null,
          routeCount: null,
        });
        continue;
      }

      const { year, month } = latestMetric;
      const metrics = await db.airportMonthlyMetric.findMany({
        where: { airportId: airport.id, year, month, metricCode: { in: [...METRIC_CODES] } },
      });
      const byCode = Object.fromEntries(metrics.map((m) => [m.metricCode, m.value]));

      const punctuality = await db.punctualityMetric.findFirst({
        where: { airportId: airport.id, destinationAirportId: null },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      });

      const routeCount = await db.routeMonthlyMetric.count({
        where: { year, month, route: { OR: [{ originAirportId: airport.id }, { destinationAirportId: airport.id }] } },
      });

      rows.push({
        canonicalCode: airport.canonicalCode,
        displayName: airport.displayName,
        terminalPassengers: byCode["terminal_passengers"] ?? null,
        aircraftMovements: byCode["aircraft_movements_total"] ?? null,
        domesticPassengers: byCode["domestic_passengers"] ?? null,
        internationalPassengers: byCode["international_passengers"] ?? null,
        freightTonnes: byCode["freight_tonnes"] ?? null,
        averageDelayMinutes: punctuality?.averageDelayMinutes ?? null,
        onTimePercentage: punctuality?.onTimePercentage ?? null,
        routeCount,
      });
    }

    return upperCodes.map((code) => rows.find((r) => r.canonicalCode === code)).filter((r): r is AirportComparisonRow => !!r);
  });
}
