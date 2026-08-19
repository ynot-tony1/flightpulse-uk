import Link from "next/link";
import { X } from "lucide-react";
import type { MapAirportPoint } from "@/lib/data/map";
import { formatCompactNumber } from "@flightpulse/shared";

export function MapSidePanel({
  airport,
  onClose,
}: {
  airport: MapAirportPoint;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-3 top-3 w-64 rounded-lg border border-border bg-paper-raised p-4 shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-ink">{airport.name}</p>
          <p className="text-sm text-ink-muted">{airport.code}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close airport panel"
          className="text-ink-faint hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
      <p className="mt-3 tabular-nums text-lg font-semibold text-ink">
        {airport.metricValue != null
          ? formatCompactNumber(airport.metricValue)
          : "—"}
      </p>
      <Link
        href={`/airports/${airport.code}`}
        className="mt-3 inline-block text-sm text-sky-500 hover:underline"
      >
        View airport →
      </Link>
    </div>
  );
}
