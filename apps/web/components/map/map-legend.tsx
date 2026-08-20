import { formatCompactNumber } from "@flightpulse/shared";
import type { MapMode } from "./map-filter-bar";

const METRIC_LABEL: Record<MapMode, string> = {
  PASSENGER_ROUTES: "passengers",
  AIRPORT_TRAFFIC: "terminal passengers",
  PUNCTUALITY: "on-time performance",
  AVERAGE_DELAY: "average delay",
  DOMESTIC: "domestic passengers",
  INTERNATIONAL: "international passengers",
  FREIGHT: "freight tonnage",
  GROWTH: "passenger growth",
};

export function MapLegend({
  mode,
  maxMetric,
  maxRoutePassengers,
}: {
  mode: MapMode;
  maxMetric: number;
  maxRoutePassengers: number;
}) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 border border-ink bg-paper-raised/95 px-3 py-2.5 text-xs text-ink-muted">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink">
        Reading this map
      </p>
      <div className="flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink" />
        <span className="inline-block h-3 w-3 rounded-full bg-ink" />
        <span>
          Airport size — {METRIC_LABEL[mode]}, up to{" "}
          {formatCompactNumber(maxMetric)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="inline-block h-[1.5px] w-4 bg-accent-500" />
        <span className="inline-block h-[3.5px] w-4 bg-accent-500" />
        <span>
          Route width — passengers, up to{" "}
          {formatCompactNumber(maxRoutePassengers)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
        <span>Selected airport</span>
      </div>
    </div>
  );
}
