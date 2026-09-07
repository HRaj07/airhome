"use client";

import { ReactElement, useEffect, useState } from "react";
import ListingCarousel from "@/components/ListingCarousel";
import ExperienceCarousel from "@/components/ExperienceCarousel";
import RowsSkeleton from "@/components/RowsSkeleton";
import { experiencesApi, listingsApi } from "@/lib/api";
import { getApproximateLocation } from "@/lib/geo";
import type { ExperienceRow, FeaturedRow } from "@/lib/types";

/**
 * The "All" tab: a mix of home, experience and service carousel rows, like
 * Airbnb's landing page. Searching from the header always lands on the
 * dedicated tab (/homes, /experiences, /services).
 */
export default function HomePage() {
  const [homeRows, setHomeRows] = useState<FeaturedRow[]>([]);
  const [experienceRows, setExperienceRows] = useState<ExperienceRow[]>([]);
  const [serviceRows, setServiceRows] = useState<ExperienceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Set once a location-ranked response has been applied. The generic rows
    // are three requests batched together while the localised ones are a
    // single request off a cached IP lookup, so the localised answer usually
    // arrives FIRST — without these flags the slower generic batch landed
    // afterwards and overwrote it, which is why a reload kept showing Lagos.
    const localised = { homes: false, experiences: false, services: false };

    // Paint the generic (busiest-cities) rows straight away rather than holding
    // the page behind a geolocation round-trip that may be waiting on a
    // permission prompt.
    Promise.allSettled([listingsApi.featured(), experiencesApi.featured("experience"), experiencesApi.featured("service")])
      .then(([homes, exps, svcs]) => {
        if (cancelled) return;
        if (!localised.homes && homes.status === "fulfilled") setHomeRows(homes.value);
        if (!localised.experiences && exps.status === "fulfilled") setExperienceRows(exps.value);
        if (!localised.services && svcs.status === "fulfilled") setServiceRows(svcs.value);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Then localise: once we know roughly where the visitor is, swap every row
    // set for the cities nearest them, the way the real landing page opens on
    // somewhere you could actually drive to.
    getApproximateLocation()
      .then((pos) => {
        if (!pos || cancelled) return;
        const coords = { latitude: pos.latitude, longitude: pos.longitude };
        listingsApi
          .featured(coords)
          .then((rows) => {
            if (cancelled || !rows.length) return;
            localised.homes = true;
            setHomeRows(rows);
          })
          .catch(() => {});
        experiencesApi
          .featured("experience", coords)
          .then((rows) => {
            if (cancelled || !rows.length) return;
            localised.experiences = true;
            setExperienceRows(rows);
          })
          .catch(() => {});
        experiencesApi
          .featured("service", coords)
          .then((rows) => {
            if (cancelled || !rows.length) return;
            localised.services = true;
            setServiceRows(rows);
          })
          .catch(() => {});
      })
      .catch(() => {
        // No location (denied, unavailable, offline) — the generic rows stand.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1760px] px-4 py-6 sm:px-6 lg:px-10">
        <RowsSkeleton />
      </div>
    );
  }

  // Interleave: 3 home rows, an experience row, 2 home rows, a service row, ... so the
  // page reads like Airbnb's mixed landing page rather than three separate lists.
  const sections: ReactElement[] = [];
  let h = 0;
  let e = 0;
  let s = 0;
  while (h < homeRows.length || e < experienceRows.length || s < serviceRows.length) {
    for (let i = 0; i < 2 && h < homeRows.length; i++, h++) {
      const row = homeRows[h];
      sections.push(<ListingCarousel key={`h-${row.city}`} title={row.title} city={row.city} listings={row.items} />);
    }
    if (e < experienceRows.length) {
      sections.push(<ExperienceCarousel key={`e-${experienceRows[e].key}`} row={experienceRows[e]} />);
      e++;
    }
    if (s < serviceRows.length) {
      sections.push(<ExperienceCarousel key={`s-${serviceRows[s].key}`} row={serviceRows[s]} />);
      s++;
    }
  }

  return (
    <div className="mx-auto max-w-[1760px] px-4 py-6 sm:px-6 lg:px-10">
      {sections.length === 0 ? (
        <p className="py-24 text-center text-hof dark:text-neutral-400">
          No listings yet. Run the backend seed script (<code>python -m app.seed</code>) to load demo data.
        </p>
      ) : (
        sections
      )}
    </div>
  );
}
