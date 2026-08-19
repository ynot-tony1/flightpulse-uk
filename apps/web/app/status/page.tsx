import { getSystemStatus } from "@/lib/data/status";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMonthYear } from "@flightpulse/shared";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "System status" };
export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

export default async function StatusPage() {
  const status = await getSystemStatus();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">System status</h1>
      <p className="mt-2 text-ink-muted">
        Live operational state of FlightPulse UK. No credentials, hostnames or
        connection details are ever shown here.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Application</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge tone="emerald">Healthy</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Database</CardTitle>
          </CardHeader>
          <CardContent>
            {!status.databaseConfigured ? (
              <Badge tone="amber">Not yet configured</Badge>
            ) : status.databaseHealthy ? (
              <Badge tone="emerald">Connected</Badge>
            ) : (
              <Badge tone="rose">Unreachable</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent>
          <Row
            label="Latest airport-statistics period"
            value={
              status.latestAirportStatisticsPeriod
                ? formatMonthYear(
                    status.latestAirportStatisticsPeriod.year,
                    status.latestAirportStatisticsPeriod.month,
                  )
                : "None imported yet"
            }
          />
          <Row
            label="Latest punctuality period"
            value={
              status.latestPunctualityPeriod
                ? formatMonthYear(
                    status.latestPunctualityPeriod.year,
                    status.latestPunctualityPeriod.month,
                  )
                : "None imported yet"
            }
          />
          <Row
            label="Latest airline-statistics period"
            value={
              status.latestAirlineStatisticsPeriod
                ? formatMonthYear(
                    status.latestAirlineStatisticsPeriod.year,
                    status.latestAirlineStatisticsPeriod.month,
                  )
                : "None imported yet"
            }
          />
          <Row
            label="Current Git commit"
            value={status.gitCommit ?? "unavailable"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
