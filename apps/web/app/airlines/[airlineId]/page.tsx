import { getAirlineById } from "@/lib/data/airlines";
import { DatabasePendingNotice } from "@/components/ui/database-pending-notice";
import { ChartCard } from "@/components/charts/chart-card";
import { MetricCard } from "@/components/charts/metric-card";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { RankingBarChart } from "@/components/charts/ranking-bar-chart";
import { formatCompactNumber } from "@flightpulse/shared";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ airlineId: string }>;
}): Promise<Metadata> {
  const { airlineId } = await params;
  return { title: `Airline ${airlineId}` };
}

export default async function AirlineDetailPage({
  params,
}: {
  params: Promise<{ airlineId: string }>;
}) {
  const { airlineId } = await params;
  const result = await getAirlineById(airlineId);

  if (result.status === "ok" && result.data === null) {
    notFound();
  }
  const airline = result.status === "ok" ? result.data : null;
  const metrics = airline?.monthlyMetrics ?? [];

  const flightsTotal = [...metrics.filter((m) => m.metricCode === "flights_total" && m.serviceCategory === null)].reverse();
  const latestFlights = flightsTotal[flightsTotal.length - 1] ?? null;
  const latestUtilisation = metrics.find((m) => m.metricCode === "aircraft_utilisation_hours") ?? null;

  const latestPeriod = metrics[0] ? { year: metrics[0].year, month: metrics[0].month } : null;
  const scheduledVsNonScheduled = latestPeriod
    ? metrics.filter(
        (m) => m.metricCode === "flights_total" && m.year === latestPeriod.year && m.month === latestPeriod.month && m.serviceCategory,
      )
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-border pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{airline?.canonicalName ?? "Airline"}</h1>
        <p className="mt-1 text-ink-muted">{airline?.iataCode ?? "—"}</p>
      </div>

      {result.status !== "ok" && (
        <div className="py-8">
          <DatabasePendingNotice subject="Airline statistics" />
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 py-8 sm:grid-cols-4">
        <MetricCard label="Latest month flights" value={latestFlights ? formatCompactNumber(latestFlights.value) : "—"} />
        <MetricCard
          label="Aircraft utilisation"
          value={latestUtilisation ? latestUtilisation.value.toFixed(1) : "—"}
          unit={latestUtilisation ? "hrs/day" : undefined}
        />
        <MetricCard label="Months of data" value={String(new Set(metrics.map((m) => `${m.year}-${m.month}`)).size || "—")} />
        <MetricCard label="Data source" value="UK CAA" />
      </section>

      <section className="grid grid-cols-1 gap-6 py-8 lg:grid-cols-2">
        <ChartCard title="Flights represented" description="Total flights per month (all services).">
          {flightsTotal.length > 0 ? (
            <TrendLineChart
              data={flightsTotal.map((m) => ({ label: `${MONTH_ABBR[m.month - 1]} ${String(m.year).slice(2)}`, value: m.value }))}
              valueLabel="Flights"
            />
          ) : (
            <DatabasePendingNotice subject="This chart" />
          )}
        </ChartCard>
        <ChartCard title="Scheduled vs non-scheduled split" description="Latest available month.">
          {scheduledVsNonScheduled.length > 0 ? (
            <RankingBarChart
              data={scheduledVsNonScheduled.map((m) => ({
                label: m.serviceCategory === "scheduled" ? "Scheduled" : "Non-scheduled",
                value: m.value,
              }))}
              valueLabel="Flights"
            />
          ) : (
            <DatabasePendingNotice subject="This chart" />
          )}
        </ChartCard>
      </section>
    </div>
  );
}
