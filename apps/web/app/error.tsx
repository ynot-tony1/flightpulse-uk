"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8">
      <p className="text-sm font-medium tracking-wide text-rose-500">Error</p>
      <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight text-ink">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-ink-muted">
        This page hit an unexpected error. It may be transient — try again, or
        check the{" "}
        <Link href="/status" className="underline hover:text-ink">
          system status
        </Link>{" "}
        page.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="bg-ink px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-paper transition-colors hover:bg-accent-600"
        >
          Try again
        </button>
        <Link
          href="/"
          className="border border-ink px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-paper-subtle"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
