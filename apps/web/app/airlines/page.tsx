import { listAirlines } from "@/lib/data/airlines";
import { DatabasePendingNotice } from "@/components/ui/database-pending-notice";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Airlines" };
export const dynamic = "force-dynamic";

export default async function AirlinesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const result = await listAirlines(params.q);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 border-b border-border pb-8">
        <h1 className="font-serif text-4xl font-medium tracking-tight">
          Airlines
        </h1>
        <p className="max-w-2xl text-ink-muted">
          UK airline activity from official CAA airline statistics — scheduled
          and non-scheduled services, aircraft utilisation, and punctuality
          where reliably linked.
        </p>
      </div>

      <form className="py-6" method="get">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Search airlines"
          className="w-72 border border-border bg-paper px-3 py-2 text-sm outline-none focus:border-accent-500"
        />
      </form>

      {result.status !== "ok" || result.data.length === 0 ? (
        <DatabasePendingNotice subject="Airline listings" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.data.map((airline) => (
            <Link key={airline.id} href={`/airlines/${airline.id}`}>
              <Card className="p-5 transition-colors hover:border-border-strong">
                <p className="font-semibold text-ink">
                  {airline.canonicalName}
                </p>
                <p className="text-sm text-ink-muted">
                  {airline.iataCode ?? "—"}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
