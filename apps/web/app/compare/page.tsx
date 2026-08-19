import { DatabasePendingNotice } from "@/components/ui/database-pending-notice";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Compare" };
export const dynamic = "force-dynamic";

export default function ComparePage() {
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

      <div className="py-8">
        <DatabasePendingNotice subject="Airport comparison" />
      </div>
    </div>
  );
}
