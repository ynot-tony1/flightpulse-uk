import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8">
      <p className="text-sm font-medium tracking-wide text-accent-500">404</p>
      <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight text-ink">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-3 max-w-md text-ink-muted">
        The airport, route or page you&apos;re looking for doesn&apos;t exist or
        hasn&apos;t been imported yet.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="bg-ink px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-paper transition-colors hover:bg-accent-600"
        >
          Back to dashboard
        </Link>
        <Link
          href="/airports"
          className="border border-ink px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-paper-subtle"
        >
          Browse airports
        </Link>
      </div>
    </div>
  );
}
