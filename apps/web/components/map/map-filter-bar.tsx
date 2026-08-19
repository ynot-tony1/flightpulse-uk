"use client";

export type MapMode =
  | "PASSENGER_ROUTES"
  | "AIRPORT_TRAFFIC"
  | "PUNCTUALITY"
  | "AVERAGE_DELAY"
  | "DOMESTIC"
  | "INTERNATIONAL"
  | "FREIGHT"
  | "GROWTH";

const MODE_LABELS: Record<MapMode, string> = {
  PASSENGER_ROUTES: "Passenger routes",
  AIRPORT_TRAFFIC: "Airport traffic",
  PUNCTUALITY: "Punctuality",
  AVERAGE_DELAY: "Average delay",
  DOMESTIC: "Domestic",
  INTERNATIONAL: "International",
  FREIGHT: "Freight",
  GROWTH: "Growth",
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function MapFilterBar({
  year,
  month,
  mode,
  routeCount,
  onYearChange,
  onMonthChange,
  onModeChange,
  onRouteCountChange,
}: {
  year: number;
  month: number;
  mode: MapMode;
  routeCount: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onModeChange: (mode: MapMode) => void;
  onRouteCountChange: (count: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-paper-raised p-3">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-ink-muted">Mode</span>
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as MapMode)}
          className="rounded-md border border-border bg-paper px-2 py-1.5 text-sm outline-none focus:border-sky-500"
        >
          {Object.entries(MODE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-ink-muted">Period</span>
        <select
          value={month}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          className="rounded-md border border-border bg-paper px-2 py-1.5 text-sm outline-none focus:border-sky-500"
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="w-20 rounded-md border border-border bg-paper px-2 py-1.5 text-sm outline-none focus:border-sky-500"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-ink-muted">Routes shown</span>
        <select
          value={routeCount}
          onChange={(e) => onRouteCountChange(Number(e.target.value))}
          className="rounded-md border border-border bg-paper px-2 py-1.5 text-sm outline-none focus:border-sky-500"
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              Top {n}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
