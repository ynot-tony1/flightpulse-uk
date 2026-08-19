import { getOverviewSummary } from "@/lib/data/overview";
import { MetricCard } from "@/components/charts/metric-card";
import { ChartCard } from "@/components/charts/chart-card";
import { DatabasePendingNotice } from "@/components/ui/database-pending-notice";
import { Badge } from "@/components/ui/badge";
import {
  formatCompactNumber,
  formatMonthYear,
  formatPercentage,
} from "@flightpulse/shared";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const overview = await getOverviewSummary();
  const summary = overview.status === "ok" ? overview.data : null;
  const period = summary?.latestPeriod ?? null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-4 border-b border-border pb-10">
        <Badge tone="sky">
          {period
            ? `Latest period: ${formatMonthYear(period.year, period.month)}`
            : "Awaiting first CAA import"}
        </Badge>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          UK aviation, measured from official statistics.
        </h1>
        <p className="max-w-2xl text-lg text-ink-muted">
          Passenger traffic, routes, punctuality and airline activity across UK
          airports — built entirely from published CAA data, with every figure
          traceable back to its source publication.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/map"
            className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-600"
          >
            Explore the route map
          </Link>
          <Link
            href="/airports"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper-subtle"
          >
            Browse airports
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 py-8 sm:grid-cols-4">
        <MetricCard
          label="Passengers"
          value={
            summary?.totalPassengers
              ? formatCompactNumber(summary.totalPassengers)
              : "—"
          }
        />
        <MetricCard
          label="Aircraft movements"
          value={
            summary?.totalMovements
              ? formatCompactNumber(summary.totalMovements)
              : "—"
          }
        />
        <MetricCard
          label="Routes represented"
          value={
            summary?.routeCount ? formatCompactNumber(summary.routeCount) : "—"
          }
        />
        <MetricCard
          label="Airports represented"
          value={
            summary?.airportCount
              ? formatCompactNumber(summary.airportCount)
              : "—"
          }
        />
        <MetricCard
          label="Average delay"
          value={
            summary?.averageDelayMinutes != null
              ? summary.averageDelayMinutes.toFixed(1)
              : "—"
          }
          unit="min"
        />
        <MetricCard
          label="On-time performance"
          value={
            summary?.onTimePercentage != null
              ? formatPercentage(summary.onTimePercentage)
              : "—"
          }
        />
        <MetricCard
          label="Latest CAA update"
          value={
            summary?.latestUpdatePublicationDate
              ? new Date(
                  summary.latestUpdatePublicationDate,
                ).toLocaleDateString("en-GB")
              : "—"
          }
        />
        <MetricCard label="Data source" value="UK CAA" />
      </section>

      {overview.status !== "ok" && (
        <div className="pb-10">
          <DatabasePendingNotice subject="Dashboard metrics and charts" />
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 pb-16 lg:grid-cols-2">
        <ChartCard
          title="UK passenger trend"
          description="Monthly terminal passengers, all reporting airports."
          period={period ?? undefined}
        >
          <DatabasePendingNotice subject="This chart" />
        </ChartCard>
        <ChartCard
          title="Aircraft movement trend"
          description="Monthly aircraft movements, all reporting airports."
          period={period ?? undefined}
        >
          <DatabasePendingNotice subject="This chart" />
        </ChartCard>
        <ChartCard
          title="Average delay trend"
          description="Flight-weighted average delay across monitored airports."
          period={period ?? undefined}
        >
          <DatabasePendingNotice subject="This chart" />
        </ChartCard>
        <ChartCard
          title="On-time performance trend"
          description="Share of matched flights within 15 minutes of schedule."
          period={period ?? undefined}
        >
          <DatabasePendingNotice subject="This chart" />
        </ChartCard>
        <ChartCard
          title="Domestic vs international passengers"
          description="Split of terminal passenger traffic by route type."
          period={period ?? undefined}
        >
          <DatabasePendingNotice subject="This chart" />
        </ChartCard>
        <ChartCard
          title="Top UK airports by passengers"
          description="Ranked by latest monthly terminal passengers."
          period={period ?? undefined}
        >
          <DatabasePendingNotice subject="This chart" />
        </ChartCard>
      </section>
    </div>
  );
}
