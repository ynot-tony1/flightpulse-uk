import { withDatabase } from "@/lib/db";

export interface MapAirportPoint {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  metricValue: number | null;
}

export interface MapRouteArc {
  originCode: string;
  destinationCode: string;
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  passengers: number;
}

const METRIC_CODE_BY_MODE: Record<string, string> = {
  AIRPORT_TRAFFIC: "terminal_passengers",
  FREIGHT: "freight_tonnes",
  DOMESTIC: "domestic_passengers",
  INTERNATIONAL: "international_passengers",
  GROWTH: "terminal_passengers",
};

export async function getMapAirports(params: {
  year: number;
  month: number;
  mode: string;
}) {
  return withDatabase(async (db) => {
    const metricCode =
      METRIC_CODE_BY_MODE[params.mode] ?? "terminal_passengers";

    const airports = await db.airport.findMany({
      where: { caaReportingAirport: true },
      select: {
        canonicalCode: true,
        displayName: true,
        latitude: true,
        longitude: true,
        id: true,
      },
    });

    const metrics = await db.airportMonthlyMetric.findMany({
      where: { year: params.year, month: params.month, metricCode },
      select: { airportId: true, value: true },
    });
    const metricByAirport = new Map(metrics.map((m) => [m.airportId, m.value]));

    const points: MapAirportPoint[] = airports.map((a) => ({
      code: a.canonicalCode,
      name: a.displayName,
      latitude: a.latitude,
      longitude: a.longitude,
      metricValue: metricByAirport.get(a.id) ?? null,
    }));

    return points;
  });
}

export async function getMapRoutes(params: {
  year: number;
  month: number;
  originCode?: string;
  maxRoutes: number;
}) {
  return withDatabase(async (db) => {
    const origin = params.originCode
      ? await db.airport.findFirst({
          where: { canonicalCode: params.originCode.toUpperCase() },
        })
      : null;

    const metrics = await db.routeMonthlyMetric.findMany({
      where: {
        year: params.year,
        month: params.month,
        ...(origin
          ? {
              route: {
                OR: [
                  { originAirportId: origin.id },
                  { destinationAirportId: origin.id },
                ],
              },
            }
          : {}),
      },
      orderBy: { passengers: "desc" },
      take: params.maxRoutes,
      include: {
        route: { include: { originAirport: true, destinationAirport: true } },
      },
    });

    const arcs: MapRouteArc[] = metrics
      .filter((m) => m.passengers != null)
      .map((m) => ({
        originCode: m.route.originAirport.canonicalCode,
        destinationCode: m.route.destinationAirport.canonicalCode,
        originLatitude: m.route.originAirport.latitude,
        originLongitude: m.route.originAirport.longitude,
        destinationLatitude: m.route.destinationAirport.latitude,
        destinationLongitude: m.route.destinationAirport.longitude,
        passengers: m.passengers as number,
      }));

    return arcs;
  });
}
