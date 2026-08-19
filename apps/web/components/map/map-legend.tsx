import type { MapMode } from "./map-filter-bar";

const MODE_DESCRIPTIONS: Record<MapMode, string> = {
  PASSENGER_ROUTES: "Circle size: passengers. Arc width: route passengers.",
  AIRPORT_TRAFFIC: "Circle size: terminal passengers.",
  PUNCTUALITY: "Circle size: on-time performance.",
  AVERAGE_DELAY: "Circle size: average delay.",
  DOMESTIC: "Domestic passenger traffic only.",
  INTERNATIONAL: "International passenger traffic only.",
  FREIGHT: "Circle size: freight tonnage.",
  GROWTH: "Circle size: passenger growth.",
};

export function MapLegend({ mode }: { mode: MapMode }) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-border bg-paper-raised/95 px-3 py-2 text-xs text-ink-muted shadow-sm">
      {MODE_DESCRIPTIONS[mode]}
    </div>
  );
}
