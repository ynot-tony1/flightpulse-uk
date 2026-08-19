import { listAirports } from "@/lib/data/airports";
import { DatabasePendingNotice } from "@/components/ui/database-pending-notice";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Airports" };
export const dynamic = "force-dynamic";

const UK_NATIONS = ["England", "Scotland", "Wales", "Northern Ireland"];

export default async function AirportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    nation?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const result = await listAirports({
    query: params.q,
    ukNation: params.nation,
    sort: (params.sort as "passengers" | "movements" | "name") ?? "passengers",
    page,
    pageSize: 24,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 border-b border-border pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Airports</h1>
        <p className="max-w-2xl text-ink-muted">
          Every CAA-reporting UK airport, searchable by name, IATA/ICAO code,
          nation, and traffic volume.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3 py-6" method="get">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-xs font-medium text-ink-muted">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={params.q}
            placeholder="Airport name, IATA or ICAO"
            className="w-64 rounded-md border border-border bg-paper px-3 py-2 text-sm outline-none focus:border-sky-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="nation"
            className="text-xs font-medium text-ink-muted"
          >
            UK nation
          </label>
          <select
            id="nation"
            name="nation"
            defaultValue={params.nation ?? ""}
            className="rounded-md border border-border bg-paper px-3 py-2 text-sm outline-none focus:border-sky-500"
          >
            <option value="">All nations</option>
            {UK_NATIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sort" className="text-xs font-medium text-ink-muted">
            Sort by
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={params.sort ?? "passengers"}
            className="rounded-md border border-border bg-paper px-3 py-2 text-sm outline-none focus:border-sky-500"
          >
            <option value="passengers">Passengers</option>
            <option value="movements">Aircraft movements</option>
            <option value="name">Airport name</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
        >
          Apply filters
        </button>
      </form>

      {result.status !== "ok" || result.data.items.length === 0 ? (
        <DatabasePendingNotice subject="Airport listings" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.data.items.map((airport) => (
            <Link key={airport.id} href={`/airports/${airport.canonicalCode}`}>
              <Card className="p-5 transition-shadow hover:shadow-md">
                <p className="font-semibold text-ink">{airport.displayName}</p>
                <p className="text-sm text-ink-muted">
                  {airport.iataCode ?? "—"} · {airport.icaoCode ?? "—"}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
