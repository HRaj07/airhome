"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ListingCard } from "@/lib/types";
import { PROPERTY_TYPE_SHORT } from "@/lib/types";
import { useLocale } from "@/lib/locale-context";

/** Leaflet ships as a UMD/CommonJS bundle; depending on the bundler the namespace
 *  may or may not expose `default`, so accept either shape. */
async function loadLeaflet(): Promise<typeof LeafletNS> {
  const mod = (await import("leaflet")) as unknown as { default?: typeof LeafletNS } & typeof LeafletNS;
  return mod.default ?? mod;
}

/**
 * Search-results map with clickable price pins (Leaflet + OpenStreetMap tiles,
 * no API key). Leaflet touches `window` at import time, so it is loaded lazily
 * inside an effect — this component never runs on the server.
 */
export default function ListingsMap({
  listings,
  nights = 2,
  activeId,
  onHover,
}: {
  listings: ListingCard[];
  nights?: number;
  activeId?: number | null;
  onHover?: (id: number | null) => void;
}) {
  const { formatPrice } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const lastIdsRef = useRef<string>("");
  const [ready, setReady] = useState(false);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await loadLeaflet();
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: true, attributionControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      map.setView([20, 0], 2);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      setReady(true);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
      }
    };
  }, []);

  // Redraw pins whenever the listings, active pin, or currency change.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await loadLeaflet();
      const map = mapRef.current;
      const layer = layerRef.current;
      if (cancelled || !map || !layer) return;
      layer.clearLayers();

      const points = listings.filter((l) => l.latitude && l.longitude);
      points.forEach((l) => {
        const active = l.id === activeId;
        const icon = L.divIcon({
          className: "price-pin-wrapper",
          html: `<div class="price-pin${active ? " price-pin--active" : ""}">${formatPrice(l.price_per_night * nights)}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        const marker = L.marker([l.latitude, l.longitude], { icon, riseOnHover: true });
        const popupHtml = `
          <a href="/listing/${l.id}" class="map-popup">
            <div class="map-popup__img" style="background-image:url('${l.cover_photo_url}')"></div>
            <div class="map-popup__body">
              <div class="map-popup__title">${PROPERTY_TYPE_SHORT[l.property_type]} in ${l.neighborhood || l.city}</div>
              <div class="map-popup__meta">${l.review_count > 0 ? `★ ${l.rating_avg.toFixed(2)} (${l.review_count})` : "New"}</div>
              <div class="map-popup__price"><b>${formatPrice(l.price_per_night * nights)}</b> for ${nights} night${nights !== 1 ? "s" : ""}</div>
            </div>
          </a>`;
        marker.bindPopup(popupHtml, { closeButton: true, offset: [0, -8], maxWidth: 260 });
        marker.on("mouseover", () => onHover?.(l.id));
        marker.on("mouseout", () => onHover?.(null));
        marker.addTo(layer);
      });

      // Only re-fit the viewport when the set of results changes — not on hover highlights.
      const idsKey = points.map((l) => l.id).join(",");
      if (points.length > 0 && idsKey !== lastIdsRef.current) {
        lastIdsRef.current = idsKey;
        const bounds = L.latLngBounds(points.map((l) => [l.latitude, l.longitude] as [number, number]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
      // Leaflet needs a nudge when its container was hidden/resized during first paint.
      setTimeout(() => map.invalidateSize(), 50);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, listings, activeId, nights, formatPrice, onHover]);

  return <div ref={containerRef} className="h-full w-full rounded-2xl bg-neutral-100 dark:bg-neutral-800" aria-label="Map of search results" />;
}
