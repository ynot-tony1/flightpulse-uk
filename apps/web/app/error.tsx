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
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
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
          className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-ink hover:bg-paper-subtle"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
