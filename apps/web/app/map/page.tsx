import type { Metadata } from "next";
import { WorldRouteMap } from "@/components/map/map-loader";

export const metadata: Metadata = { title: "Route map" };

export default function MapPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 border-b border-border pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Route map</h1>
        <p className="max-w-2xl text-ink-muted">
          UK airports scaled by traffic, with the busiest routes drawn as arcs.
          Select an airport to see its network. Not a live flight-tracking
          display — FlightPulse UK visualises published CAA statistics.
        </p>
      </div>
      <div className="py-8">
        <WorldRouteMap />
      </div>
    </div>
  );
}
