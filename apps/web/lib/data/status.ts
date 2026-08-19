import { hasDatabase, withDatabase } from "@/lib/db";

export interface SystemStatus {
  applicationHealthy: true;
  databaseConfigured: boolean;
  databaseHealthy: boolean;
  latestAirportStatisticsPeriod: { year: number; month: number } | null;
  latestPunctualityPeriod: { year: number; month: number } | null;
  latestAirlineStatisticsPeriod: { year: number; month: number } | null;
  lastSuccessfulImportAt: string | null;
  gitCommit: string | null;
}

async function latestReleaseFor(datasetCode: string) {
  return withDatabase(async (db) => {
    return db.ingestionSourceRelease.findFirst({
      where: { status: "imported", sourceDataset: { datasetCode } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
  });
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const dbConfigured = hasDatabase();

  const [airportRelease, punctualityRelease, airlineRelease] =
    await Promise.all([
      latestReleaseFor("caa_airport_statistics"),
      latestReleaseFor("caa_punctuality_statistics"),
      latestReleaseFor("caa_airline_statistics"),
    ]);

  const databaseHealthy = [
    airportRelease,
    punctualityRelease,
    airlineRelease,
  ].some((r) => r.status === "ok");

  const toPeriod = (r: Awaited<ReturnType<typeof latestReleaseFor>>) =>
    r.status === "ok" && r.data
      ? { year: r.data.year, month: r.data.month }
      : null;

  return {
    applicationHealthy: true,
    databaseConfigured: dbConfigured,
    databaseHealthy: dbConfigured && databaseHealthy,
    latestAirportStatisticsPeriod: toPeriod(airportRelease),
    latestPunctualityPeriod: toPeriod(punctualityRelease),
    latestAirlineStatisticsPeriod: toPeriod(airlineRelease),
    lastSuccessfulImportAt: null,
    gitCommit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  };
}
