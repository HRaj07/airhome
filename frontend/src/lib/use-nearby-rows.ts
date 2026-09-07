"use client";

import { useEffect, useState } from "react";
import { getApproximateLocation } from "./geo";

/** Coordinates as the featured-row endpoints expect them. */
export interface RowCoords {
  latitude: number;
  longitude: number;
}

/** Fetches one set of carousel rows, generic when called without coordinates. */
export type RowFetcher<Row> = (coords?: RowCoords) => Promise<Row[]>;

export interface NearbyRows<Row> {
  rows: Row[];
  loading: boolean;
}

/**
 * Carousel rows in two phases: the generic "busiest cities" set first, then the
 * cities nearest the visitor once a location is known.
 *
 * The page paints immediately rather than waiting on geolocation, which may sit
 * behind a permission prompt the guest never answers. Localised rows then swap
 * in underneath them.
 *
 * The `localised` flag is what makes this correct, and it is the reason this
 * lives in one place instead of three. The two requests race, and the localised
 * one usually wins: after the first page load the IP lookup behind
 * getApproximateLocation is served from localStorage, so it resolves with no
 * network at all, while the generic request is still in flight. Without the
 * flag the generic response lands second and overwrites the near-you rows,
 * which showed every visitor the single busiest city (Lagos) no matter where
 * they were. Once localised rows are in, the generic response is discarded.
 *
 * @param fetcher Stable reference (useCallback) — it re-runs the effect.
 * @param enabled Pass false to skip loading entirely, e.g. while showing search
 *   results instead of carousels.
 */
export function useNearbyRows<Row>(fetcher: RowFetcher<Row>, enabled = true): NearbyRows<Row> {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let localised = false;
    setLoading(true);

    fetcher()
      .then((generic) => {
        if (!cancelled && !localised) setRows(generic);
      })
      .catch(() => {
        if (!cancelled && !localised) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    getApproximateLocation()
      .then((pos) => (pos ? fetcher({ latitude: pos.latitude, longitude: pos.longitude }) : null))
      .then((near) => {
        if (cancelled || !near || !near.length) return;
        localised = true;
        setRows(near);
      })
      .catch(() => {
        // No location (denied, unavailable, offline) — the generic rows stand.
      });

    return () => {
      cancelled = true;
    };
  }, [fetcher, enabled]);

  return { rows, loading };
}
