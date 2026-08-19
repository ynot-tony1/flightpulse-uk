import { withDatabase, type DataResult } from "@/lib/db";
import type { PrismaClient } from "@/generated/prisma";

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

export interface TrendPoint {
  label: string;
  value: number;
}

export interface RankingPoint {
  label: string;
  value: number;
}

async function latestImportedRelease(db: PrismaClient, datasetCode: string) {
  return db.ingestionSourceRelease.findFirst({
    where: { status: "imported", sourceDataset: { datasetCode } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

export async function getOverviewSummary(): Promise<DataResult<OverviewSummary>> {
  return withDatabase(async (db) => {
    const airportRelease = await latestImportedRelease(db, "caa_airport_statistics");
    const punctualityRelease = await latestImportedRelease(db, "caa_punctuality_statistics");

    if (!airportRelease) {
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

    const { year, month } = airportRelease;

    const [passengers, movements, routeCount, airportCount] = await Promise.all([
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
    ]);

    let averageDelayMinutes: number | null = null;
    let onTimePercentage: number | null = null;

    if (punctualityRelease) {
      const punctuality = await db.punctualityMetric.findMany({
        where: { year: punctualityRelease.year, month: punctualityRelease.month, destinationAirportId: null },
        select: { averageDelayMinutes: true, onTimePercentage: true, flightsMatched: true },
      });

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

      averageDelayMinutes = weighted.delayWeight > 0 ? weighted.delaySum / weighted.delayWeight : null;
      onTimePercentage = weighted.onTimeWeight > 0 ? weighted.onTimeSum / weighted.onTimeWeight : null;
    }

    return {
      latestPeriod: { year, month },
      totalPassengers: passengers._sum.value ?? null,
      totalMovements: movements._sum.value ?? null,
      routeCount,
      airportCount,
      averageDelayMinutes,
      onTimePercentage,
      latestUpdatePublicationDate: airportRelease.publicationDate?.toISOString() ?? null,
    };
  });
}

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export async function getMetricTrend(metricCode: string, months = 24): Promise<DataResult<TrendPoint[]>> {
  return withDatabase(async (db) => {
    const rows = await db.airportMonthlyMetric.groupBy({
      by: ["year", "month"],
      where: { metricCode },
      _sum: { value: true },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    return rows.slice(-months).map((r) => ({
      label: `${MONTH_ABBR[r.month - 1]} ${String(r.year).slice(2)}`,
      value: r._sum.value ?? 0,
    }));
  });
}

export async function getTopAirportsByMetric(metricCode: string, limit = 10): Promise<DataResult<RankingPoint[]>> {
  return withDatabase(async (db) => {
    const airportRelease = await latestImportedRelease(db, "caa_airport_statistics");
    if (!airportRelease) return [];

    const rows = await db.airportMonthlyMetric.findMany({
      where: { year: airportRelease.year, month: airportRelease.month, metricCode },
      orderBy: { value: "desc" },
      take: limit,
      include: { airport: { select: { displayName: true } } },
    });

    return rows.map((r) => ({ label: r.airport.displayName.replace(/ Airport$/, ""), value: r.value }));
  });
}

export async function getPunctualityTrend(
  metric: "averageDelayMinutes" | "onTimePercentage",
  months = 24,
): Promise<DataResult<TrendPoint[]>> {
  return withDatabase(async (db) => {
    const rows = await db.punctualityMetric.findMany({
      where: { destinationAirportId: null },
      select: { year: true, month: true, averageDelayMinutes: true, onTimePercentage: true, flightsMatched: true },
    });

    const byPeriod = new Map<string, { sum: number; weight: number; year: number; month: number }>();
    for (const r of rows) {
      const value = metric === "averageDelayMinutes" ? r.averageDelayMinutes : r.onTimePercentage;
      const weight = r.flightsMatched ?? 0;
      if (value == null || weight <= 0) continue;
      const key = `${r.year}-${r.month}`;
      const bucket = byPeriod.get(key) ?? { sum: 0, weight: 0, year: r.year, month: r.month };
      bucket.sum += value * weight;
      bucket.weight += weight;
      byPeriod.set(key, bucket);
    }

    const points = Array.from(byPeriod.values())
      .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month))
      .map((b) => ({
        label: `${MONTH_ABBR[b.month - 1]} ${String(b.year).slice(2)}`,
        value: b.weight > 0 ? b.sum / b.weight : 0,
      }));

    return points.slice(-months);
  });
}

export interface TrafficSplit {
  domestic: number;
  international: number;
}

export async function getTrafficSplit(): Promise<DataResult<TrafficSplit | null>> {
  return withDatabase(async (db) => {
    const airportRelease = await latestImportedRelease(db, "caa_airport_statistics");
    if (!airportRelease) return null;

    const [domestic, international] = await Promise.all([
      db.airportMonthlyMetric.aggregate({
        where: { year: airportRelease.year, month: airportRelease.month, metricCode: "domestic_passengers" },
        _sum: { value: true },
      }),
      db.airportMonthlyMetric.aggregate({
        where: { year: airportRelease.year, month: airportRelease.month, metricCode: "international_passengers" },
        _sum: { value: true },
      }),
    ]);

    if (!domestic._sum.value && !international._sum.value) return null;
    return { domestic: domestic._sum.value ?? 0, international: international._sum.value ?? 0 };
  });
}
