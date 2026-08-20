import { listAirportPunctuality } from "@/lib/data/punctuality";
import { DatabasePendingNotice } from "@/components/ui/database-pending-notice";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatMonthYear, formatPercentage } from "@flightpulse/shared";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Punctuality" };
export const dynamic = "force-dynamic";

export default async function PunctualityPage() {
  const result = await listAirportPunctuality({});

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 border-b border-border pb-8">
        <h1 className="font-serif text-4xl font-medium tracking-tight">
          Punctuality
        </h1>
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
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-paper-subtle text-xs uppercase tracking-wide text-ink-faint">
                    <th className="px-4 py-3 font-medium">Airport</th>
                    <th className="px-4 py-3 font-medium">Period</th>
                    <th className="px-4 py-3 font-medium">Flights matched</th>
                    <th className="px-4 py-3 font-medium">Average delay</th>
                    <th className="px-4 py-3 font-medium">On-time</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-0 hover:bg-paper-subtle"
                    >
                      <td className="px-4 py-3 font-medium text-ink">
                        <Link
                          href={`/airports/${row.airport.canonicalCode}`}
                          className="hover:text-accent-500"
                        >
                          {row.airport.displayName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        {formatMonthYear(row.year, row.month)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-ink-muted">
                        {row.flightsMatched ?? "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-ink-muted">
                        {row.averageDelayMinutes != null
                          ? `${row.averageDelayMinutes.toFixed(1)} min`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-ink-muted">
                        {row.onTimePercentage != null
                          ? formatPercentage(row.onTimePercentage)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
