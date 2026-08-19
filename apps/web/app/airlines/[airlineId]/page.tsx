import { getAirlineById } from "@/lib/data/airlines";
import { DatabasePendingNotice } from "@/components/ui/database-pending-notice";
import { ChartCard } from "@/components/charts/chart-card";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-border pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          {airline?.canonicalName ?? "Airline"}
        </h1>
        <p className="mt-1 text-ink-muted">{airline?.iataCode ?? "—"}</p>
      </div>

      <section className="grid grid-cols-1 gap-6 py-8 lg:grid-cols-2">
        <ChartCard title="Flights represented">
          <DatabasePendingNotice subject="This chart" />
        </ChartCard>
        <ChartCard title="Scheduled vs non-scheduled split">
          <DatabasePendingNotice subject="This chart" />
        </ChartCard>
      </section>
    </div>
  );
}
