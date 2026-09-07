"use client";

import { ReactElement, useEffect, useState } from "react";
import ListingCarousel from "@/components/ListingCarousel";
import ExperienceCarousel from "@/components/ExperienceCarousel";
import RowsSkeleton from "@/components/RowsSkeleton";
import { experiencesApi, listingsApi } from "@/lib/api";
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
    Promise.allSettled([listingsApi.featured(), experiencesApi.featured("experience"), experiencesApi.featured("service")])
      .then(([homes, exps, svcs]) => {
        if (homes.status === "fulfilled") setHomeRows(homes.value);
        if (exps.status === "fulfilled") setExperienceRows(exps.value);
        if (svcs.status === "fulfilled") setServiceRows(svcs.value);
      })
      .finally(() => setLoading(false));
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
