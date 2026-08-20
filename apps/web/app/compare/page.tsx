import { DatabasePendingNotice } from "@/components/ui/database-pending-notice";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { RankingBarChart } from "@/components/charts/ranking-bar-chart";
import { getAirportComparison } from "@/lib/data/compare";
import { formatCompactNumber, formatPercentage } from "@flightpulse/shared";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Compare" };
export const dynamic = "force-dynamic";

function Row({
  label,
  unit = "",
  values,
  format,
}: {
  label: string;
  unit?: string;
  values: (number | null)[];
  format?: (n: number) => string;
}) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 text-sm font-medium text-ink-muted">{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className="px-4 py-3 text-right tabular-nums text-sm text-ink"
        >
          {v != null
            ? `${format ? format(v) : formatCompactNumber(v)}${unit}`
            : "—"}
        </td>
      ))}
    </tr>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ airports?: string }>;
}) {
  const params = await searchParams;
  const codes = (params.airports ?? "LHR,MAN,EDI")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 4);

  const result = codes.length >= 2 ? await getAirportComparison(codes) : null;
  const rows = result && result.status === "ok" ? result.data : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 border-b border-border pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Compare airports
        </h1>
        <p className="max-w-2xl text-ink-muted">
          Select 2–4 airports to compare passenger traffic, movements,
          punctuality and route networks side by side. FlightPulse UK does not
          generate an opaque overall airport score — every comparison metric is
          shown individually and labelled.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 py-6" method="get">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="airports"
            className="text-xs font-medium text-ink-muted"
          >
            Airport codes (comma-separated, 2–4)
          </label>
          <input
            id="airports"
            name="airports"
            defaultValue={params.airports ?? "LHR,MAN,EDI"}
            placeholder="e.g. LHR,MAN,EDI"
            className="w-72 rounded-md border border-border bg-paper px-3 py-2 text-sm outline-none focus:border-sky-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
        >
          Compare
        </button>
      </form>

      {codes.length < 2 ? (
        <EmptyState
          title="Enter 2–4 airport codes"
          description="Add at least two comma-separated IATA or ICAO codes above, e.g. LHR,MAN,EDI."
        />
      ) : !rows ? (
        <DatabasePendingNotice subject="Airport comparison" />
      ) : rows.length < 2 ? (
        <EmptyState
          title="Not enough matching airports"
          description={`Only ${rows.length} of the codes entered matched a known airport. Check the codes and try again.`}
        />
      ) : (
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-paper-subtle text-xs uppercase tracking-wide text-ink-faint">
                    <th className="px-4 py-3 font-medium">Metric</th>
                    {rows.map((a) => (
                      <th
                        key={a.canonicalCode}
                        className="px-4 py-3 text-right font-medium"
                      >
                        {a.displayName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <Row
                    label="Terminal passengers"
                    values={rows.map((a) => a.terminalPassengers)}
                  />
                  <Row
                    label="Aircraft movements"
                    values={rows.map((a) => a.aircraftMovements)}
                  />
                  <Row
                    label="Domestic passengers"
                    values={rows.map((a) => a.domesticPassengers)}
                  />
                  <Row
                    label="International passengers"
                    values={rows.map((a) => a.internationalPassengers)}
                  />
                  <Row
                    label="Freight"
                    unit=" t"
                    values={rows.map((a) => a.freightTonnes)}
                  />
                  <Row
                    label="Routes represented"
                    values={rows.map((a) => a.routeCount)}
                  />
                  <Row
                    label="Average delay"
                    unit=" min"
                    values={rows.map((a) => a.averageDelayMinutes)}
                    format={(n) => n.toFixed(1)}
                  />
                  <Row
                    label="On-time performance"
                    values={rows.map((a) => a.onTimePercentage)}
                    format={(n) => formatPercentage(n)}
                  />
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-ink">
              Terminal passengers
            </h3>
            <RankingBarChart
              data={rows.map((a) => ({
                label: a.displayName.replace(/ Airport$/, ""),
                value: a.terminalPassengers ?? 0,
              }))}
              valueLabel="Passengers"
            />
          </Card>
        </div>
      )}
    </div>
  );
}
