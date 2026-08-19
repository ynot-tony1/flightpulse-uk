import { getRouteByAirportCodes } from "@/lib/data/routes";
import { DatabasePendingNotice } from "@/components/ui/database-pending-notice";
import { ChartCard } from "@/components/charts/chart-card";
import { MetricCard } from "@/components/charts/metric-card";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-8 text-2xl font-semibold tracking-tight">
        <span>{origin.toUpperCase()}</span>
        <span className="text-ink-faint">→</span>
        <span>{destination.toUpperCase()}</span>
      </div>
      <p className="pt-2 text-sm text-ink-muted">
        Approximate great-circle distance — not actual flown distance.
      </p>

      {result.status !== "ok" && (
        <div className="py-8">
          <DatabasePendingNotice subject="Route statistics" />
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 py-8 sm:grid-cols-4">
        <MetricCard label="Passengers (period)" value="—" />
        <MetricCard label="Change vs previous period" value="—" />
        <MetricCard label="Peak month" value="—" />
        <MetricCard label="Distance" value="—" unit="km" />
      </section>

      <section className="grid grid-cols-1 gap-6 pb-16 lg:grid-cols-2">
        <ChartCard title="Historical traffic">
          <DatabasePendingNotice subject="This chart" />
        </ChartCard>
        <ChartCard title="Seasonality">
          <DatabasePendingNotice subject="This chart" />
        </ChartCard>
        <ChartCard
          title="Punctuality history"
          description="Only shown where CAA publishes matching route-level punctuality."
        >
          <DatabasePendingNotice subject="Punctuality data" />
        </ChartCard>
        <ChartCard
          title="Airport comparison"
          description="Origin vs destination airport totals."
        >
          <DatabasePendingNotice subject="This chart" />
        </ChartCard>
      </section>
    </div>
  );
}
