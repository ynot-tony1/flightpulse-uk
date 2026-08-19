import { listAirportPunctuality } from "@/lib/data/punctuality";
import { DatabasePendingNotice } from "@/components/ui/database-pending-notice";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Punctuality" };
export const dynamic = "force-dynamic";

export default async function PunctualityPage() {
  const result = await listAirportPunctuality({});

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 border-b border-border pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Punctuality</h1>
        <p className="max-w-2xl text-ink-muted">
          Average delay and on-time performance by airport, route and airline,
          from official CAA punctuality statistics.
        </p>
        <Badge tone="amber" className="w-fit">
          CAA punctuality statistics cover selected monitored airports and
          should not be interpreted as complete coverage of every UK airport.
        </Badge>
      </div>

      <div className="py-8">
        {result.status !== "ok" || result.data.length === 0 ? (
          <DatabasePendingNotice subject="Punctuality rankings" />
        ) : null}
      </div>
    </div>
  );
}
