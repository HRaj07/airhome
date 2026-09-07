"use client";

import { ReactElement, useCallback } from "react";
import ListingCarousel from "@/components/ListingCarousel";
import ExperienceCarousel from "@/components/ExperienceCarousel";
import RowsSkeleton from "@/components/RowsSkeleton";
import { experiencesApi, listingsApi } from "@/lib/api";
import { useNearbyRows, type RowCoords } from "@/lib/use-nearby-rows";
import type { ExperienceRow, FeaturedRow } from "@/lib/types";

/**
 * The "All" tab: a mix of home, experience and service carousel rows, like
 * Airbnb's landing page. Searching from the header always lands on the
 * dedicated tab (/homes, /experiences, /services).
 */
export default function HomePage() {
  // Three independent row sets, each loading generic-then-near-you. They share
  // a single geolocation lookup; see getApproximateLocation.
  const homes = useNearbyRows<FeaturedRow>(useCallback((c?: RowCoords) => listingsApi.featured(c), []));
  const experiences = useNearbyRows<ExperienceRow>(
    useCallback((c?: RowCoords) => experiencesApi.featured("experience", c), [])
  );
  const services = useNearbyRows<ExperienceRow>(
    useCallback((c?: RowCoords) => experiencesApi.featured("service", c), [])
  );

  const homeRows = homes.rows;
  const experienceRows = experiences.rows;
  const serviceRows = services.rows;
  const loading = homes.loading && experiences.loading && services.loading;

  if (loading) {
    return (
      <div className="mx-auto max-w-[1760px] px-4 py-6 sm:px-6 lg:px-10 xl:px-16">
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
    <div className="mx-auto max-w-[1760px] px-4 py-6 sm:px-6 lg:px-10 xl:px-16">
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
