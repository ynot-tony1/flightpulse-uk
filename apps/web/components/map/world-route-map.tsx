"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ArcLayer, ScatterplotLayer } from "@deck.gl/layers";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapAirportPoint, MapRouteArc } from "@/lib/data/map";
import { MapLegend } from "./map-legend";
import { MapFilterBar, type MapMode } from "./map-filter-bar";
import { MapSidePanel } from "./map-side-panel";

const DEFAULT_LAT = Number(
  process.env.NEXT_PUBLIC_DEFAULT_MAP_LATITUDE ?? "54.5",
);
const DEFAULT_LON = Number(
  process.env.NEXT_PUBLIC_DEFAULT_MAP_LONGITUDE ?? "-3.5",
);
const DEFAULT_ZOOM = Number(process.env.NEXT_PUBLIC_DEFAULT_MAP_ZOOM ?? "5");
const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
  "https://tiles.openfreemap.org/styles/positron";

function radiusFor(value: number | null, max: number): number {
  if (!value || max <= 0) return 4000;
  return 4000 + Math.sqrt(value / max) * 26000;
}

export function WorldRouteMap({
  initialYear,
  initialMonth,
}: {
  initialYear?: number;
  initialMonth?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);

  const now = new Date();
  const [year, setYear] = useState(initialYear ?? now.getFullYear());
  const [month, setMonth] = useState(initialMonth ?? now.getMonth() + 1);
  const [mode, setMode] = useState<MapMode>("AIRPORT_TRAFFIC");
  const [routeCount, setRouteCount] = useState(25);
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null);
  const [airports, setAirports] = useState<MapAirportPoint[]>([]);
  const [routes, setRoutes] = useState<MapRouteArc[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [DEFAULT_LON, DEFAULT_LAT],
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    map.addControl(overlay as unknown as maplibregl.IControl);

    map.on("load", () => setLoaded(true));

    mapRef.current = map;
    overlayRef.current = overlay;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      mode,
    });
    fetch(`/api/map/airports?${params}`)
      .then((r) => r.json())
      .then((body) => setAirports(body?.data?.items ?? []))
      .catch(() => setAirports([]));
  }, [year, month, mode]);

  useEffect(() => {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      count: String(routeCount),
    });
    if (selectedAirport) params.set("origin", selectedAirport);
    fetch(`/api/map/routes?${params}`)
      .then((r) => r.json())
      .then((body) => setRoutes(body?.data?.items ?? []))
      .catch(() => setRoutes([]));
  }, [year, month, routeCount, selectedAirport]);

  const maxMetric = useMemo(
    () => Math.max(1, ...airports.map((a) => a.metricValue ?? 0)),
    [airports],
  );

  useEffect(() => {
    if (!overlayRef.current) return;

    const layers = [
      new ArcLayer<MapRouteArc>({
        id: "routes",
        data: routes,
        getSourcePosition: (d) => [d.originLongitude, d.originLatitude],
        getTargetPosition: (d) => [
          d.destinationLongitude,
          d.destinationLatitude,
        ],
        getSourceColor: [31, 111, 184, 160],
        getTargetColor: [63, 140, 216, 160],
        getWidth: (d) => Math.max(1, Math.log10(d.passengers + 1)),
        greatCircle: true,
      }),
      new ScatterplotLayer<MapAirportPoint>({
        id: "airports",
        data: airports,
        getPosition: (d) => [d.longitude, d.latitude],
        getFillColor: (d) =>
          d.code === selectedAirport ? [200, 135, 26, 220] : [15, 88, 143, 200],
        getRadius: (d) => radiusFor(d.metricValue, maxMetric),
        radiusMinPixels: 3,
        radiusMaxPixels: 40,
        pickable: true,
        onClick: (info) => setSelectedAirport(info.object?.code ?? null),
      }),
    ];

    overlayRef.current.setProps({ layers });
  }, [airports, routes, selectedAirport, maxMetric]);

  const selected = airports.find((a) => a.code === selectedAirport) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <MapFilterBar
        year={year}
        month={month}
        mode={mode}
        routeCount={routeCount}
        onYearChange={setYear}
        onMonthChange={setMonth}
        onModeChange={setMode}
        onRouteCountChange={setRouteCount}
      />
      <div className="relative h-[600px] w-full overflow-hidden rounded-lg border border-border">
        <div
          ref={containerRef}
          className="h-full w-full"
          aria-label="Interactive UK aviation route map"
        />
        <MapLegend mode={mode} />
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-paper/60 text-sm text-ink-muted">
            Loading map…
          </div>
        )}
        {loaded && airports.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-paper/80 p-6 text-center text-sm text-ink-muted">
            No airport data available for this period yet — the map will
            populate once CockroachDB is connected and CAA data has been
            imported.
          </div>
        )}
        {selected && (
          <MapSidePanel
            airport={selected}
            onClose={() => setSelectedAirport(null)}
          />
        )}
      </div>

      {/* Accessible alternative to the map: a plain table of the same airports */}
      <details className="rounded-lg border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium text-ink">
          View airport data as a table (accessible alternative to the map)
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-ink-muted">
                <th className="py-2 pr-4">Airport</th>
                <th className="py-2 pr-4">Value</th>
              </tr>
            </thead>
            <tbody>
              {airports.map((a) => (
                <tr
                  key={a.code}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-2 pr-4">
                    {a.name} ({a.code})
                  </td>
                  <td className="py-2 pr-4 tabular-nums">
                    {a.metricValue ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
