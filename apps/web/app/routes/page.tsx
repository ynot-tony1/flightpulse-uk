import { DatabasePendingNotice } from "@/components/ui/database-pending-notice";
import { Card } from "@/components/ui/card";
import { formatCompactNumber, formatMonthYear } from "@flightpulse/shared";
import { getLatestRoutePeriod, listTopRoutes } from "@/lib/data/routes";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Routes" };
export const dynamic = "force-dynamic";

export default async function RoutesPage({
  searchParams,
}: {
  searchParams: Promise<{ origin?: string; destination?: string }>;
}) {
  const params = await searchParams;

  if (params.origin && params.destination) {
    redirect(
      `/routes/${params.origin.toUpperCase()}/${params.destination.toUpperCase()}`,
    );
  }

  const period = await getLatestRoutePeriod();
  const topRoutes =
    period.status === "ok"
      ? await listTopRoutes(period.data, 25)
      : { status: "unavailable" as const, reason: "" };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 border-b border-border pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Routes</h1>
        <p className="max-w-2xl text-ink-muted">
          Search any UK airport pair — e.g. Manchester → Amsterdam, Heathrow →
          New York JFK — for passenger volume, seasonality and punctuality where
          CAA data supports it.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 py-6" method="get">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="origin"
            className="text-xs font-medium text-ink-muted"
          >
            Origin
          </label>
          <input
            id="origin"
            name="origin"
            defaultValue={params.origin}
            placeholder="e.g. MAN"
            className="w-40 rounded-md border border-border bg-paper px-3 py-2 text-sm outline-none focus:border-sky-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="destination"
            className="text-xs font-medium text-ink-muted"
          >
            Destination
          </label>
          <input
            id="destination"
            name="destination"
            defaultValue={params.destination}
            placeholder="e.g. AMS"
            className="w-40 rounded-md border border-border bg-paper px-3 py-2 text-sm outline-none focus:border-sky-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
        >
          Search route
        </button>
      </form>

      {topRoutes.status !== "ok" || topRoutes.data.length === 0 ? (
        <DatabasePendingNotice subject="Route listings and rankings" />
      ) : (
        <>
          <p className="pb-3 text-sm text-ink-muted">
            Top routes by passenger volume,{" "}
            {period.status === "ok" && period.data
              ? formatMonthYear(period.data.year, period.data.month)
              : ""}
            .
          </p>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-paper-subtle text-xs uppercase tracking-wide text-ink-faint">
                    <th className="px-4 py-3 font-medium">Route</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Passengers</th>
                  </tr>
                </thead>
                <tbody>
                  {topRoutes.data.map((rm) => (
                    <tr
                      key={rm.id}
                      className="border-b border-border last:border-0 hover:bg-paper-subtle"
                    >
                      <td className="px-4 py-3 font-medium text-ink">
                        <Link
                          href={`/routes/${rm.route.originAirport.canonicalCode}/${rm.route.destinationAirport.canonicalCode}`}
                          className="hover:text-sky-500"
                        >
                          {rm.route.originAirport.displayName} →{" "}
                          {rm.route.destinationAirport.displayName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 capitalize text-ink-muted">
                        {rm.route.routeType}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-ink-muted">
                        {rm.passengers != null
                          ? formatCompactNumber(rm.passengers)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
