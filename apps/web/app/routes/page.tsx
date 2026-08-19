import { DatabasePendingNotice } from "@/components/ui/database-pending-notice";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Routes" };
export const dynamic = "force-dynamic";

export default async function RoutesPage({
  searchParams,
}: {
  searchParams: Promise<{ origin?: string; destination?: string }>;
}) {
  const params = await searchParams;

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

      <DatabasePendingNotice subject="Route listings and rankings" />
    </div>
  );
}
