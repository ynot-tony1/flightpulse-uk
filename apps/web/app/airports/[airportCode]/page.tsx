import { getAirportByCode } from "@/lib/data/airports";
import { DatabasePendingNotice } from "@/components/ui/database-pending-notice";
import { ChartCard } from "@/components/charts/chart-card";
import { MetricCard } from "@/components/charts/metric-card";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

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
        <MetricCard label="Latest monthly passengers" value="—" />
        <MetricCard label="Rolling 12-month passengers" value="—" />
        <MetricCard label="Aircraft movements" value="—" />
        <MetricCard label="Destinations" value="—" />
      </section>

      <section className="grid grid-cols-1 gap-6 pb-8 lg:grid-cols-2">
        <ChartCard title="Traffic trend" description="Monthly passengers.">
          <DatabasePendingNotice subject="This chart" />
        </ChartCard>
        <ChartCard
          title="Seasonal pattern"
          description="Average passengers by month."
        >
          <DatabasePendingNotice subject="This chart" />
        </ChartCard>
      </section>

      <section className="pb-8">
        <ChartCard
          title="Punctuality"
          description="CAA punctuality statistics cover selected monitored airports and should not be interpreted as complete coverage of every UK airport."
        >
          <DatabasePendingNotice subject="Punctuality data" />
        </ChartCard>
      </section>

      <section className="pb-16">
        <ChartCard
          title="Top destinations"
          description="Destination, country, passengers, change."
        >
          <DatabasePendingNotice subject="Route data" />
        </ChartCard>
      </section>
    </div>
  );
}
