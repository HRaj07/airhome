"use client";

import { SlidersHorizontal } from "lucide-react";
import type { Amenity } from "@/lib/types";

/** Quick amenity toggles shown under the header on the results page, like Airbnb's chip row. */
export default function FilterChips({
  amenities,
  selectedIds,
  onToggle,
  onOpenFilters,
  filtersActive,
}: {
  amenities: Amenity[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onOpenFilters: () => void;
  filtersActive: boolean;
}) {
  const quick = amenities.filter((a) => ["Washer", "Wifi", "Free parking", "Kitchen", "Air conditioning", "Pets allowed", "Pool", "Dedicated workspace"].includes(a.name));

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-4 py-2.5 text-sm transition-colors ${
      active
        ? "border-ink bg-neutral-100 font-semibold dark:border-white dark:bg-neutral-800"
        : "border-neutral-300 hover:border-ink dark:border-neutral-600 dark:hover:border-white"
    }`;

  return (
    <div className="sticky top-20 z-30 -mx-4 border-b border-neutral-100 bg-white px-4 dark:border-neutral-900 dark:bg-neutral-950 sm:mx-0 sm:px-0">
      <div className="scrollbar-none flex items-center gap-2 overflow-x-auto py-4">
      <button onClick={onOpenFilters} className={`${chip(filtersActive)} flex items-center gap-2`}>
        <SlidersHorizontal size={16} /> Filters
      </button>
      <span className="mx-1 h-6 w-px shrink-0 bg-neutral-300 dark:bg-neutral-700" />
      {quick.map((a) => (
        <button key={a.id} onClick={() => onToggle(a.id)} className={chip(selectedIds.includes(a.id))}>
          {a.name === "Washer" ? "Washing machine" : a.name}
        </button>
      ))}
      </div>
    </div>
  );
}
