"use client";

import { SlidersHorizontal } from "lucide-react";
import type { Amenity } from "@/lib/types";
import type { FilterValue } from "./FiltersModal";
import { useLocale } from "@/lib/locale-context";

/**
 * The quick-filter row under the header on the results page — the same eight
 * chips, in the same order, as airbnb.co.in. Six are amenities; "Instant Book"
 * is a listing flag and "1+ bathrooms" is a numeric floor, so each chip says
 * which kind it is rather than pretending everything is an amenity.
 */
type Chip =
  | { kind: "amenity"; label: string; amenity: string }
  | { kind: "instant" }
  | { kind: "bathrooms"; min: number };

const CHIPS: Chip[] = [
  { kind: "amenity", label: "Washing machine", amenity: "Washing machine" },
  { kind: "amenity", label: "Wifi", amenity: "Wifi" },
  { kind: "amenity", label: "Free parking", amenity: "Free parking" },
  { kind: "amenity", label: "Kitchen", amenity: "Kitchen" },
  { kind: "amenity", label: "Air conditioning", amenity: "Air conditioning" },
  { kind: "instant" },
  { kind: "amenity", label: "Allows pets", amenity: "Allows pets" },
  { kind: "bathrooms", min: 1 },
];

export default function FilterChips({
  amenities,
  value,
  onChange,
  onOpenFilters,
  filtersActive,
}: {
  amenities: Amenity[];
  value: FilterValue;
  onChange: (next: FilterValue) => void;
  onOpenFilters: () => void;
  filtersActive: boolean;
}) {
  const { t } = useLocale();
  const byName = new Map(amenities.map((a) => [a.name, a.id]));

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-4 py-2.5 text-sm transition-colors ${
      active
        ? "border-ink bg-neutral-100 font-semibold dark:border-white dark:bg-neutral-800"
        : "border-neutral-300 hover:border-ink dark:border-neutral-600 dark:hover:border-white"
    }`;

  function toggleAmenity(id: number) {
    onChange({
      ...value,
      amenityIds: value.amenityIds.includes(id) ? value.amenityIds.filter((a) => a !== id) : [...value.amenityIds, id],
    });
  }

  return (
    <div className="sticky top-20 z-30 -mx-4 border-b border-neutral-100 bg-white px-4 dark:border-neutral-900 dark:bg-neutral-950 sm:mx-0 sm:px-0">
      <div className="scrollbar-none flex items-center gap-2 overflow-x-auto py-4">
        <button onClick={onOpenFilters} className={`${chip(filtersActive)} flex items-center gap-2`}>
          <SlidersHorizontal size={16} /> {t("Filters")}
        </button>
        <span className="mx-1 h-6 w-px shrink-0 bg-neutral-300 dark:bg-neutral-700" />

        {CHIPS.map((c, i) => {
          if (c.kind === "instant") {
            return (
              <button key={i} onClick={() => onChange({ ...value, instantBook: !value.instantBook })} className={chip(value.instantBook)}>
                {t("Instant Book")}
              </button>
            );
          }
          if (c.kind === "bathrooms") {
            const active = value.minBathrooms >= c.min;
            return (
              <button key={i} onClick={() => onChange({ ...value, minBathrooms: active ? 0 : c.min })} className={chip(active)}>
                {c.min}+ {t("bathrooms")}
              </button>
            );
          }
          const id = byName.get(c.amenity);
          if (id === undefined) return null; // amenity not seeded — never show a dead chip
          return (
            <button key={i} onClick={() => toggleAmenity(id)} className={chip(value.amenityIds.includes(id))}>
              {t(c.label)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
