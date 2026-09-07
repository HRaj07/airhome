"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ListingCard, MapPin } from "@/lib/types";
import type { MapBounds } from "@/lib/api";
import { useLocale } from "@/lib/locale-context";

/** Leaflet ships as a UMD/CommonJS bundle; depending on the bundler the namespace
 *  may or may not expose `default`, so accept either shape. */
async function loadLeaflet(): Promise<typeof LeafletNS> {
  const mod = (await import("leaflet")) as unknown as { default?: typeof LeafletNS } & typeof LeafletNS;
  return mod.default ?? mod;
}

/** Pins closer than this (in screen pixels) are merged into one cluster pin. */
const CLUSTER_RADIUS_PX = 56;

/** A result set spanning more degrees than this is too wide to be a useful view. */
const MAX_FRAME_SPAN_DEG = 30;

/**
 * Choose what the map should frame on a fresh search. An unfiltered browse can
 * return listings on three continents, and fitting all of them shows a
 * zoomed-out world map with two cluster pins — useless. Airbnb always frames
 * one area, so when the results are spread that wide we frame the city with
 * the most of them and let the rest sit off-screen, reachable by zooming out.
 */
function framePoints(points: MapPin[]): MapPin[] {
  if (points.length < 2) return points;
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
  if (span <= MAX_FRAME_SPAN_DEG) return points;

  const byCity = new Map<string, MapPin[]>();
  for (const p of points) {
    const key = p.city || `${Math.round(p.latitude)},${Math.round(p.longitude)}`;
    const group = byCity.get(key);
    if (group) group.push(p);
    else byCity.set(key, [p]);
  }
  let biggest: MapPin[] | null = null;
  for (const group of byCity.values()) if (!biggest || group.length > biggest.length) biggest = group;
  return biggest ?? points;
}

/**
 * Search-results map: a price pin on every home in view, clusters where they
 * would overlap, and — like the real site — the map *is* the search area:
 * panning or zooming reports the new bounds so the list can follow it.
 *
 * `pins` is every match in the viewport (from /listings/map); `listings` is the
 * current page, used for the rich popup when a pin has a card loaded.
 */
export default function ListingsMap({
  pins,
  listings,
  nights = 2,
  activeId,
  onHover,
  onBoundsChange,
  onExpandToggle,
  expanded = false,
  fitKey = "",
}: {
  pins: MapPin[];
  listings: ListingCard[];
  nights?: number;
  activeId?: number | null;
  onHover?: (id: number | null) => void;
  /** Fires (debounced) after the user pans or zooms. Not fired for programmatic fits. */
  onBoundsChange?: (bounds: MapBounds) => void;
  onExpandToggle?: () => void;
  expanded?: boolean;
  /** Changes when a *new search* is made (not when the map itself drives a
   *  refetch). The map re-frames the results only when this changes, so
   *  panning never snaps back. */
  fitKey?: string;
}) {
  const { formatPrice } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const fittedKeyRef = useRef<string | null>(null);
  const programmaticMoveRef = useRef(false);
  const [ready, setReady] = useState(false);

  // Latest callbacks in refs, so the map's listeners never go stale without
  // re-binding on every render.
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await loadLeaflet();
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, { zoomControl: false, scrollWheelZoom: true, attributionControl: true });
      // Carto's Voyager tiles: the light, label-rich style closest to the
      // Google basemap Airbnb uses. Free for this kind of use, no API key.
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);
      L.control.zoom({ position: "topright" }).addTo(map);
      map.setView([20, 0], 2);

      let timer: ReturnType<typeof setTimeout> | null = null;
      map.on("moveend", () => {
        if (programmaticMoveRef.current) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          const b = map.getBounds();
          onBoundsChangeRef.current?.({
            sw_lat: b.getSouth(),
            sw_lng: b.getWest(),
            ne_lat: b.getNorth(),
            ne_lng: b.getEast(),
          });
        }, 350);
      });

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

  // The container changes width when the list is hidden; Leaflet must be told.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const t = setTimeout(() => map.invalidateSize(), 60);
    return () => clearTimeout(t);
  }, [expanded, ready]);

  // Draw (and re-cluster) pins whenever the pin set, hover state, currency or zoom change.
  useEffect(() => {
    let cancelled = false;
    let detach: (() => void) | null = null;

    (async () => {
      const L = await loadLeaflet();
      const map = mapRef.current;
      const layer = layerRef.current;
      if (cancelled || !map || !layer) return;

      const points = pins.filter((p) => p.latitude && p.longitude);
      const cards = new Map(listings.map((l) => [l.id, l]));

      function render() {
        if (!map || !layer) return;
        layer.clearLayers();

        // Greedy screen-space clustering at the current zoom level.
        const clusters: { items: MapPin[]; x: number; y: number }[] = [];
        for (const p of points) {
          const pt = map.latLngToLayerPoint([p.latitude, p.longitude]);
          const near = clusters.find((c) => Math.hypot(c.x - pt.x, c.y - pt.y) < CLUSTER_RADIUS_PX);
          if (near) near.items.push(p);
          else clusters.push({ items: [p], x: pt.x, y: pt.y });
        }

        for (const cluster of clusters) {
          if (cluster.items.length === 1) {
            const p = cluster.items[0];
            const active = p.id === activeId;
            const icon = L.divIcon({
              className: "price-pin-wrapper",
              html: `<div class="price-pin${active ? " price-pin--active" : ""}">${formatPrice(p.price_per_night * nights)}</div>`,
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            });
            const marker = L.marker([p.latitude, p.longitude], { icon, riseOnHover: true });
            const card = cards.get(p.id);
            const rating = card
              ? card.review_count > 0
                ? `★ ${card.rating_avg.toFixed(2)} (${card.review_count})`
                : "New"
              : "";
            marker.bindPopup(
              `<a href="/listing/${p.id}" class="map-popup">
                 ${card?.cover_photo_url ? `<div class="map-popup__img" style="background-image:url('${card.cover_photo_url}')"></div>` : ""}
                 <div class="map-popup__body">
                   <div class="map-popup__title">${card ? `${card.title}` : `Home in ${p.city}`}</div>
                   <div class="map-popup__meta">${rating || p.city}</div>
                   <div class="map-popup__price"><b>${formatPrice(p.price_per_night * nights)}</b> for ${nights} night${nights !== 1 ? "s" : ""}</div>
                 </div>
               </a>`,
              { closeButton: true, offset: [0, -8], maxWidth: 260 }
            );
            marker.on("mouseover", () => onHoverRef.current?.(p.id));
            marker.on("mouseout", () => onHoverRef.current?.(null));
            marker.addTo(layer);
          } else {
            const lat = cluster.items.reduce((s, p) => s + p.latitude, 0) / cluster.items.length;
            const lng = cluster.items.reduce((s, p) => s + p.longitude, 0) / cluster.items.length;
            const hasActive = activeId != null && cluster.items.some((p) => p.id === activeId);
            const icon = L.divIcon({
              className: "price-pin-wrapper",
              html: `<div class="price-pin cluster-pin${hasActive ? " price-pin--active" : ""}">${cluster.items.length} homes</div>`,
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            });
            const marker = L.marker([lat, lng], { icon, riseOnHover: true });
            marker.on("click", () => {
              const bounds = L.latLngBounds(cluster.items.map((p) => [p.latitude, p.longitude] as [number, number]));
              map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
            });
            marker.addTo(layer);
          }
        }
      }

      // Frame the results only when a *new search* arrives, never on hover,
      // zoom, or a map-driven refetch — otherwise every pan would snap back.
      if (points.length > 0 && fitKey !== fittedKeyRef.current) {
        fittedKeyRef.current = fitKey;
        programmaticMoveRef.current = true;
        map.fitBounds(L.latLngBounds(framePoints(points).map((p) => [p.latitude, p.longitude] as [number, number])), {
          padding: [40, 40],
          maxZoom: 13,
        });
        setTimeout(() => {
          programmaticMoveRef.current = false;
        }, 400);
      }

      render();
      map.on("zoomend", render);
      detach = () => map.off("zoomend", render);
      setTimeout(() => map.invalidateSize(), 50);
    })();

    return () => {
      cancelled = true;
      detach?.();
    };
  }, [ready, pins, listings, activeId, nights, formatPrice, fitKey]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full bg-neutral-100 dark:bg-neutral-800" aria-label="Map of search results" />
      {onExpandToggle && (
        <button
          type="button"
          onClick={onExpandToggle}
          aria-label={expanded ? "Show list" : "Expand map"}
          className="absolute left-4 top-4 z-[1000] flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-md hover:scale-105 dark:bg-neutral-900 dark:text-white"
        >
          {expanded ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
          )}
        </button>
      )}
    </div>
  );
}
