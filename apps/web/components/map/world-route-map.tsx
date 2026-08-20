"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ArcLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
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

// Layers from the OpenFreeMap "positron" (OpenMapTiles schema) style that
// only add clutter at country-level zoom for an aviation-traffic map —
// switched off entirely rather than just recoloured.
const HIDDEN_BASEMAP_LAYERS = [
  "building",
  "railway_transit",
  "railway_transit_dashline",
  "railway_service",
  "railway_service_dashline",
  "railway",
  "railway_dashline",
  "highway-name-path",
  "highway-name-minor",
  "highway-name-major",
  "highway-shield-non-us",
  "highway-shield-us-interstate",
  "road_shield_us",
  "waterway_line_label",
  "water_name_line_label",
  "label_village",
  "label_other",
  "airport",
  "boundary_disputed",
];

const RETAINED_LABEL_LAYERS = [
  "water_name_point_label",
  "label_town",
  "label_state",
  "label_city",
  "label_city_capital",
  "label_country_3",
  "label_country_2",
  "label_country_1",
];

function readCssColor(varName: string): string {
  if (typeof document === "undefined") return "#000000";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
}

function isDarkTheme(): boolean {
  if (typeof document === "undefined") return false;
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return true;
  if (attr === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const value = parseInt(full || "000000", 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * Recolours the third-party basemap to the site's own warm editorial
 * palette (and hides layers irrelevant to a national air-traffic view)
 * instead of leaving a generic grey/blue map dropped into a themed page.
 * Re-run on theme toggle since the map style has no CSS variables of
 * its own.
 */
function applyBasemapTheme(map: MapLibreMap) {
  const dark = isDarkTheme();
  const paper = readCssColor("--color-paper");
  const paperSubtle = readCssColor("--color-paper-subtle");
  const inkMuted = readCssColor("--color-ink-muted");
  const inkFaint = readCssColor("--color-ink-faint");
  const border = readCssColor("--color-border");
  const borderStrong = readCssColor("--color-border-strong");
  const water = dark ? "#182427" : "#ccd8d2";
  const park = dark ? "#1d2417" : "#e5e8d2";

  const setPaint = (id: string, prop: string, value: string | number) => {
    try {
      if (map.getLayer(id)) map.setPaintProperty(id, prop, value);
    } catch {
      // Property doesn't apply to this layer type — ignore.
    }
  };

  for (const id of HIDDEN_BASEMAP_LAYERS) {
    try {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
    } catch {
      // ignore
    }
  }

  setPaint("background", "background-color", paper);
  for (const id of [
    "park",
    "landcover_wood",
    "landuse_residential",
    "landcover_ice_shelf",
    "landcover_glacier",
  ]) {
    setPaint(id, "fill-color", id === "park" ? park : paperSubtle);
  }
  setPaint("water", "fill-color", water);
  setPaint("waterway", "line-color", water);

  setPaint("road_area_pier", "fill-color", paperSubtle);
  setPaint("road_pier", "line-color", border);
  for (const id of [
    "highway_path",
    "highway_minor",
    "highway_major_casing",
    "highway_major_inner",
    "highway_major_subtle",
    "highway_motorway_casing",
    "highway_motorway_inner",
    "highway_motorway_subtle",
    "highway_motorway_bridge_casing",
    "highway_motorway_bridge_inner",
  ]) {
    setPaint(id, "line-color", border);
    setPaint(id, "line-opacity", 0.6);
  }

  setPaint("aeroway-area", "fill-color", borderStrong);
  setPaint("aeroway-runway", "line-color", inkFaint);
  setPaint("aeroway-runway-casing", "line-color", border);
  setPaint("aeroway-taxiway", "line-color", border);

  setPaint("boundary_2", "line-color", borderStrong);
  setPaint("boundary_3", "line-color", border);

  for (const id of RETAINED_LABEL_LAYERS) {
    setPaint(
      id,
      "text-color",
      id.startsWith("label_country") ? inkMuted : inkFaint,
    );
    setPaint(id, "text-halo-color", paper);
    setPaint(id, "text-halo-width", 1.4);
  }
}

function widthFor(passengers: number, max: number): number {
  if (max <= 0) return 1;
  return 1 + Math.sqrt(passengers / max) * 13;
}

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
  const [themeTick, setThemeTick] = useState(0);

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

    map.on("load", () => {
      applyBasemapTheme(map);
      setLoaded(true);
    });

    const themeObserver = new MutationObserver(() => {
      applyBasemapTheme(map);
      setThemeTick((t) => t + 1);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    mapRef.current = map;
    overlayRef.current = overlay;

    return () => {
      themeObserver.disconnect();
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
  const maxRoutePassengers = useMemo(
    () => Math.max(1, ...routes.map((r) => r.passengers)),
    [routes],
  );
  const connectedCodes = useMemo(() => {
    if (!selectedAirport) return null;
    const set = new Set<string>([selectedAirport]);
    for (const r of routes) {
      set.add(r.originCode);
      set.add(r.destinationCode);
    }
    return set;
  }, [selectedAirport, routes]);

  useEffect(() => {
    if (!overlayRef.current) return;

    const accent = hexToRgb(readCssColor("--color-accent-500"));
    const accentDim = hexToRgb(readCssColor("--color-accent-400"));
    const amber = hexToRgb(readCssColor("--color-amber-500"));
    const ink = hexToRgb(readCssColor("--color-ink"));
    const inkFaint = hexToRgb(readCssColor("--color-ink-faint"));
    const paper = hexToRgb(readCssColor("--color-paper"));

    const layers = [
      new ArcLayer<MapRouteArc>({
        id: "routes",
        data: routes,
        getSourcePosition: (d) => [d.originLongitude, d.originLatitude],
        getTargetPosition: (d) => [
          d.destinationLongitude,
          d.destinationLatitude,
        ],
        getSourceColor: [...accent, 210],
        getTargetColor: [...accentDim, 160],
        getWidth: (d) => widthFor(d.passengers, maxRoutePassengers),
        greatCircle: true,
      }),
      new ScatterplotLayer<MapAirportPoint>({
        id: "airports",
        data: airports,
        getPosition: (d) => [d.longitude, d.latitude],
        getFillColor: (d) => {
          if (d.code === selectedAirport) return [...amber, 235];
          if (connectedCodes && !connectedCodes.has(d.code))
            return [...inkFaint, 110];
          return [...ink, 205];
        },
        getRadius: (d) => radiusFor(d.metricValue, maxMetric),
        radiusMinPixels: 3,
        radiusMaxPixels: 40,
        stroked: true,
        getLineColor: [...paper, 255],
        lineWidthMinPixels: 1,
        pickable: true,
        onClick: (info) => setSelectedAirport(info.object?.code ?? null),
      }),
      new TextLayer<MapAirportPoint>({
        id: "airport-labels",
        data: airports,
        getPosition: (d) => [d.longitude, d.latitude],
        getText: (d) => d.code,
        getSize: 12,
        getColor: (d) => {
          if (connectedCodes && !connectedCodes.has(d.code))
            return [...inkFaint, 140];
          return [...ink, 235];
        },
        getPixelOffset: [0, -14],
        fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
        fontWeight: 600,
        fontSettings: { sdf: true },
        outlineWidth: 2,
        outlineColor: [...paper, 255],
        billboard: true,
      }),
    ];

    overlayRef.current.setProps({ layers });
  }, [
    airports,
    routes,
    selectedAirport,
    connectedCodes,
    maxMetric,
    maxRoutePassengers,
    themeTick,
  ]);

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
      <div className="relative h-[600px] w-full overflow-hidden border-2 border-ink">
        <div
          ref={containerRef}
          className="h-full w-full"
          aria-label="Interactive UK aviation route map"
        />
        <MapLegend
          mode={mode}
          maxMetric={maxMetric}
          maxRoutePassengers={maxRoutePassengers}
        />
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
      <details className="border border-border p-4">
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
