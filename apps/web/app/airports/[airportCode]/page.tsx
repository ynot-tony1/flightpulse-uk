import {
  getAirportByCode,
  getAirportMonthlyMetrics,
} from "@/lib/data/airports";
import { listAirportPunctuality } from "@/lib/data/punctuality";
import {
  getAirportDestinations,
  getLatestRoutePeriod,
} from "@/lib/data/routes";
import { DatabasePendingNotice } from "@/components/ui/database-pending-notice";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartCard } from "@/components/charts/chart-card";
import { MetricCard } from "@/components/charts/metric-card";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { Card } from "@/components/ui/card";
import {
  formatCompactNumber,
  formatMonthYear,
  formatPercentage,
} from "@flightpulse/shared";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ airportCode: string }>;
}): Promise<Metadata> {
  const { airportCode } = await params;
  return { title: airportCode.toUpperCase() };
}

export default async function AirportDetailPage({
  params,
}: {
  params: Promise<{ airportCode: string }>;
}) {
  const { airportCode } = await params;
  const result = await getAirportByCode(airportCode);

  if (result.status === "ok" && result.data === null) {
    notFound();
  }

  const airport = result.status === "ok" ? result.data : null;

  const routePeriod = await getLatestRoutePeriod();

  const [passengerMetrics, movementMetrics, punctuality, destinations] =
    await Promise.all([
      airport
        ? getAirportMonthlyMetrics(airport.id, "terminal_passengers")
        : Promise.resolve({ status: "unavailable" as const, reason: "" }),
      airport
        ? getAirportMonthlyMetrics(airport.id, "aircraft_movements_total")
        : Promise.resolve({ status: "unavailable" as const, reason: "" }),
      airport
        ? listAirportPunctuality({ airportCode: airport.canonicalCode })
        : Promise.resolve({ status: "unavailable" as const, reason: "" }),
      airport && routePeriod.status === "ok"
        ? getAirportDestinations(airport.id, routePeriod.data, 10)
        : Promise.resolve({ status: "unavailable" as const, reason: "" }),
    ]);

  const passengerPoints =
    passengerMetrics.status === "ok"
      ? [...passengerMetrics.data].reverse().map((m) => ({
          label: `${MONTH_ABBR[m.month - 1]} ${String(m.year).slice(2)}`,
          value: m.value,
        }))
      : [];
  const latestPassengers =
    passengerMetrics.status === "ok" ? passengerMetrics.data[0] : null;
  const latestMovements =
    movementMetrics.status === "ok" ? movementMetrics.data[0] : null;
  const rolling12 =
    passengerMetrics.status === "ok" && passengerMetrics.data.length >= 12
      ? passengerMetrics.data.slice(0, 12).reduce((sum, m) => sum + m.value, 0)
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-border pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          {airport?.displayName ?? airportCode.toUpperCase()}
        </h1>
        <p className="mt-1 text-ink-muted">
          {airport?.iataCode ?? "—"} · {airport?.icaoCode ?? "—"}
        </p>
      </div>

      {result.status !== "ok" && (
        <div className="py-8">
          <DatabasePendingNotice
            subject={`Statistics for ${airportCode.toUpperCase()}`}
          />
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 py-8 sm:grid-cols-4">
        <MetricCard
          label="Latest monthly passengers"
          value={
            latestPassengers ? formatCompactNumber(latestPassengers.value) : "—"
          }
        />
        <MetricCard
          label="Rolling 12-month passengers"
          value={rolling12 != null ? formatCompactNumber(rolling12) : "—"}
        />
        <MetricCard
          label="Aircraft movements"
          value={
            latestMovements ? formatCompactNumber(latestMovements.value) : "—"
          }
        />
        <MetricCard
          label="Punctuality monitored"
          value={airport?.punctualityMonitored ? "Yes" : "No"}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 pb-8 lg:grid-cols-2">
        <ChartCard
          title="Traffic trend"
          description="Monthly terminal passengers."
        >
          {passengerPoints.length > 0 ? (
            <TrendLineChart data={passengerPoints} valueLabel="Passengers" />
          ) : (
            <DatabasePendingNotice subject="This chart" />
          )}
        </ChartCard>
        <ChartCard
          title="Seasonal pattern"
          description="Average passengers by month."
        >
          <EmptyState
            title="Not enough history yet"
            description="Seasonality needs at least 12 months of imported data to compute a meaningful monthly average."
          />
        </ChartCard>
      </section>

      <section className="pb-16">
        <ChartCard
          title="Punctuality"
          description="CAA punctuality statistics cover selected monitored airports and should not be interpreted as complete coverage of every UK airport."
        >
          {punctuality.status === "ok" && punctuality.data.length > 0 ? (
            <div className="space-y-2">
              {punctuality.data.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0"
                >
                  <span className="text-ink-muted">
                    {formatMonthYear(p.year, p.month)}
                  </span>
                  <span className="tabular-nums text-ink">
                    {p.averageDelayMinutes != null
                      ? `${p.averageDelayMinutes.toFixed(1)} min avg delay`
                      : "—"}
                    {p.onTimePercentage != null
                      ? ` · ${formatPercentage(p.onTimePercentage)} on time`
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="CAA punctuality statistics are not available for this airport in the selected period"
              description="Not every UK airport is covered by CAA's punctuality monitoring."
            />
          )}
        </ChartCard>
      </section>

      <section className="pb-16">
        <h2 className="mb-4 text-lg font-semibold text-ink">
          Top destinations
        </h2>
        {destinations.status === "ok" && destinations.data.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-paper-subtle text-xs uppercase tracking-wide text-ink-faint">
                    <th className="px-4 py-3 font-medium">Destination</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Passengers</th>
                  </tr>
                </thead>
                <tbody>
                  {destinations.data.map((rm) => {
                    const isOrigin = rm.route.originAirportId === airport?.id;
                    const other = isOrigin
                      ? rm.route.destinationAirport
                      : rm.route.originAirport;
                    return (
                      <tr
                        key={rm.id}
                        className="border-b border-border last:border-0 hover:bg-paper-subtle"
                      >
                        <td className="px-4 py-3 font-medium text-ink">
                          <Link
                            href={`/routes/${rm.route.originAirport.canonicalCode}/${rm.route.destinationAirport.canonicalCode}`}
                            className="hover:text-sky-500"
                          >
                            {other.displayName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 capitalize text-ink-muted">
                          {rm.route.routeType}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-ink-muted">
                          {rm.passengers != null
                            ? formatCompactNumber(rm.passengers)
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <DatabasePendingNotice subject="Route data" />
        )}
      </section>
    </div>
  );
}
