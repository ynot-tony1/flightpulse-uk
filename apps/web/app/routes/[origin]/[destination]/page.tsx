import { getRouteByAirportCodes } from "@/lib/data/routes";
import { getAirportMonthlyMetrics } from "@/lib/data/airports";
import { DatabasePendingNotice } from "@/components/ui/database-pending-notice";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartCard } from "@/components/charts/chart-card";
import { MetricCard } from "@/components/charts/metric-card";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { RankingBarChart } from "@/components/charts/ranking-bar-chart";
import { formatCompactNumber, formatSignedPercentage, greatCircleDistanceKm, percentageChange } from "@flightpulse/shared";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ origin: string; destination: string }>;
}): Promise<Metadata> {
  const { origin, destination } = await params;
  return { title: `${origin.toUpperCase()} → ${destination.toUpperCase()}` };
}

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ origin: string; destination: string }>;
}) {
  const { origin, destination } = await params;
  const result = await getRouteByAirportCodes(origin, destination);

  if (result.status === "ok" && result.data === null) {
    notFound();
  }

  const route = result.status === "ok" ? result.data : null;
  const metrics = route ? [...route.monthlyMetrics].reverse() : [];
  const latest = route?.monthlyMetrics[0] ?? null;
  const previous = route?.monthlyMetrics[1] ?? null;
  const change =
    latest?.passengers != null && previous?.passengers != null
      ? percentageChange(previous.passengers, latest.passengers)
      : null;
  const peak = route?.monthlyMetrics.length
    ? [...route.monthlyMetrics].sort((a, b) => (b.passengers ?? 0) - (a.passengers ?? 0))[0]
    : null;
  const distanceKm = route
    ? greatCircleDistanceKm(
        { latitude: route.originAirport.latitude, longitude: route.originAirport.longitude },
        { latitude: route.destinationAirport.latitude, longitude: route.destinationAirport.longitude },
      )
    : null;

  const [originMetrics, destinationMetrics] = route
    ? await Promise.all([
        getAirportMonthlyMetrics(route.originAirportId, "terminal_passengers", 1),
        getAirportMonthlyMetrics(route.destinationAirportId, "terminal_passengers", 1),
      ])
    : [null, null];
  const originTotal = originMetrics && originMetrics.status === "ok" ? (originMetrics.data[0]?.value ?? null) : null;
  const destinationTotal =
    destinationMetrics && destinationMetrics.status === "ok" ? (destinationMetrics.data[0]?.value ?? null) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-8 text-2xl font-semibold tracking-tight">
        <span>{route?.originAirport.displayName ?? origin.toUpperCase()}</span>
        <span className="text-ink-faint">→</span>
        <span>{route?.destinationAirport.displayName ?? destination.toUpperCase()}</span>
      </div>
      <p className="pt-2 text-sm text-ink-muted">Approximate great-circle distance — not actual flown distance.</p>

      {result.status !== "ok" && (
        <div className="py-8">
          <DatabasePendingNotice subject="Route statistics" />
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 py-8 sm:grid-cols-4">
        <MetricCard label="Passengers (latest month)" value={latest?.passengers != null ? formatCompactNumber(latest.passengers) : "—"} />
        <MetricCard
          label="Change vs previous month"
          value={change?.percentageChange != null ? formatSignedPercentage(change.percentageChange) : "—"}
          tone={change?.percentageChange != null ? (change.percentageChange >= 0 ? "positive" : "negative") : "neutral"}
        />
        <MetricCard label="Peak month" value={peak ? `${MONTH_ABBR[peak.month - 1]} ${peak.year}` : "—"} />
        <MetricCard label="Distance" value={distanceKm != null ? distanceKm.toFixed(0) : "—"} unit="km" />
      </section>

      <section className="grid grid-cols-1 gap-6 pb-16 lg:grid-cols-2">
        <ChartCard title="Historical traffic">
          {metrics.length > 0 ? (
            <TrendLineChart
              data={metrics.map((m) => ({ label: `${MONTH_ABBR[m.month - 1]} ${String(m.year).slice(2)}`, value: m.passengers ?? 0 }))}
              valueLabel="Passengers"
            />
          ) : (
            <DatabasePendingNotice subject="This chart" />
          )}
        </ChartCard>
        <ChartCard title="Seasonality">
          <EmptyState
            title="Not enough history yet"
            description="Seasonality needs at least 12 months of imported data to compute a meaningful monthly average."
          />
        </ChartCard>
        <ChartCard title="Punctuality history" description="Only shown where CAA publishes matching route-level punctuality.">
          <EmptyState
            title="No route-level punctuality data imported yet"
            description="Only airport-level punctuality has been imported so far — route-level detail is a planned next step."
          />
        </ChartCard>
        <ChartCard title="Airport comparison" description="Origin vs destination airport latest-month terminal passengers.">
          {route && originTotal != null && destinationTotal != null ? (
            <RankingBarChart
              data={[
                { label: route.originAirport.displayName.replace(/ Airport$/, ""), value: originTotal },
                { label: route.destinationAirport.displayName.replace(/ Airport$/, ""), value: destinationTotal },
              ]}
              valueLabel="Passengers"
            />
          ) : (
            <DatabasePendingNotice subject="This chart" />
          )}
        </ChartCard>
      </section>
    </div>
  );
}
