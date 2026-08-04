"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

// Marketplace map for Find Work: a pin per outward code with a job count,
// not a pin per exact address — see migration 0044's comment for the
// privacy reasoning (outward-code precision, never a full postcode).
// Same Leaflet + OSM setup as components/quote/RouteMap.tsx (no API key,
// no billing) — see that file's comment for the tile-usage policy this
// project follows.

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export type MapPin = {
  outcode: string;
  lat: number;
  lng: number;
  jobIds: string[];
  label: string;
};

export function JobsMap({ pins, onSelectJob }: { pins: MapPin[]; onSelectJob?: (jobId: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || pins.length === 0) return;

    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(container, { zoomControl: true, attributionControl: true });
        L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(mapRef.current);
      }

      const map = mapRef.current;
      map.eachLayer((layer) => {
        if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
      });

      pins.forEach((pin) => {
        const count = pin.jobIds.length;
        const marker = L.marker([pin.lat, pin.lng], {
          icon: L.divIcon({
            className: "",
            html: `<span style="display:flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 6px;border-radius:9999px;background:#EA580C;color:#fff;font:700 12px/1 system-ui;border:2px solid #fff;box-shadow:0 1px 4px rgba(15,16,36,.4)">${count}</span>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        })
          .addTo(map)
          .bindTooltip(pin.label);

        if (onSelectJob) {
          marker.on("click", () => onSelectJob(pin.jobIds[0]));
        }
      });

      const points: [number, number][] = pins.map((p) => [p.lat, p.lng]);
      if (points.length > 1) {
        map.fitBounds(L.latLngBounds(points), { padding: [28, 28] });
      } else {
        map.setView(points[0], 11);
      }

      map.invalidateSize();
    })();

    return () => {
      cancelled = true;
    };
  }, [pins, onSelectJob]);

  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
    },
    []
  );

  if (pins.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-sm text-ink-700">
        No mappable jobs right now.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`Map of ${pins.length} job location${pins.length === 1 ? "" : "s"}`}
      className="h-96 w-full overflow-hidden rounded-2xl border border-brand-100"
    />
  );
}
