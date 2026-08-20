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
    <div className="absolute right-3 top-3 w-64 border-2 border-ink bg-paper-raised p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-serif text-lg font-medium text-ink">
            {airport.name}
          </p>
          <p className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            {airport.code}
          </p>
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
      <p className="mt-3 font-serif text-2xl font-medium tabular-nums text-ink">
        {airport.metricValue != null
          ? formatCompactNumber(airport.metricValue)
          : "—"}
      </p>
      <Link
        href={`/airports/${airport.code}`}
        className="mt-3 inline-block text-xs font-semibold uppercase tracking-wider text-accent-500 hover:underline"
      >
        View airport →
      </Link>
    </div>
  );
}
