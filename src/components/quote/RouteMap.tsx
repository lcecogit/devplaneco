"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

// Route map for the quote sidebar: a marker per stop and a straight polyline
// between them.
//
// WHY LEAFLET + OSM: no API key, no account, no billing — same reasoning as
// postcodes.io for geocoding. Google Maps / Mapbox would need a key in the
// client bundle and a billing account this project doesn't have.
//
// TILE USAGE POLICY: openstreetmap.org's tile servers are run on donated
// infrastructure and have a published usage policy
// (https://operations.osmfoundation.org/policies/tiles/). Low-traffic use
// like ours is explicitly fine; heavy or commercial-scale use is not. If this
// site gets real traffic, switch TILE_URL to a paid/self-hosted provider
// (Thunderforest, MapTiler, Stadia, or our own tile cache) — it's a one-line
// change here, everything else stays. Attribution below is REQUIRED by ODbL
// and must not be removed.
//
// The polyline is a straight line between stops, not a routed path — it
// matches what lib/geo/distance.ts actually measures. Drawing a road-following
// route here while pricing off great-circle distance would be misleading.

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export type MapStop = {
  lat: number;
  lng: number;
  label: string;
};

export function RouteMap({ stops }: { stops: MapStop[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || stops.length === 0) return;

    let cancelled = false;

    // Leaflet touches `window` at import time, so it can only be loaded in
    // the browser — hence the dynamic import rather than a top-level one.
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(container, {
          zoomControl: true,
          scrollWheelZoom: false, // don't hijack page scroll in a sidebar
          attributionControl: true,
        });
        L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(
          mapRef.current
        );
      }

      const map = mapRef.current;

      // Clear previous markers/lines before redrawing — the route changes
      // whenever the visitor edits an address or adds a stop.
      map.eachLayer((layer) => {
        if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
      });

      const points: [number, number][] = stops.map((stop) => [stop.lat, stop.lng]);

      stops.forEach((stop, index) => {
        L.marker([stop.lat, stop.lng], {
          icon: L.divIcon({
            className: "",
            html: `<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:#5B3DF6;color:#fff;font:700 12px/1 system-ui;border:2px solid #fff;box-shadow:0 1px 4px rgba(15,16,36,.4)">${index + 1}</span>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          }),
        })
          .addTo(map)
          .bindTooltip(stop.label);
      });

      if (points.length > 1) {
        L.polyline(points, { color: "#5B3DF6", weight: 3, opacity: 0.75 }).addTo(map);
        map.fitBounds(L.latLngBounds(points), { padding: [28, 28] });
      } else {
        map.setView(points[0], 12);
      }

      // The container is sized by CSS that may not have settled when the map
      // initialised; without this the tiles render into a 0-height box.
      map.invalidateSize();
    })();

    return () => {
      cancelled = true;
    };
  }, [stops]);

  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
    },
    []
  );

  if (stops.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-brand-50 text-xs text-ink-700">
        Add your addresses to see the route
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`Route map from ${stops[0].label} to ${stops[stops.length - 1].label}`}
      className="h-40 w-full overflow-hidden rounded-xl border border-brand-100"
    />
  );
}
