"use client";

import { useState } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import type { Amenity, PropertyType } from "@/lib/types";
import { PROPERTY_TYPE_LABELS } from "@/lib/types";
import { useLocale } from "@/lib/locale-context";
import AmenityIcon from "./AmenityIcon";

export interface FilterValue {
  /** In USD, like every stored price — the inputs take the viewer's currency. */
  minPrice: string;
  maxPrice: string;
  propertyType: PropertyType | "";
  amenityIds: number[];
  /** Airbnb's "Instant Book" chip: only listings that confirm immediately. */
  instantBook: boolean;
  /** "1+ bathrooms" chip; 0 means no floor. */
  minBathrooms: number;
}

export const EMPTY_FILTERS: FilterValue = {
  minPrice: "",
  maxPrice: "",
  propertyType: "",
  amenityIds: [],
  instantBook: false,
  minBathrooms: 0,
};

export default function FiltersModal({
  amenities,
  value,
  onApply,
  onClose,
}: {
  amenities: Amenity[];
  value: FilterValue;
  onApply: (v: FilterValue) => void;
  onClose: () => void;
}) {
  const { currency } = useLocale();
  const rate = currency.rate || 1;
  const [draft, setDraft] = useState<FilterValue>(value);
  // Prices are stored in USD but shown in the viewer's currency everywhere else,
  // so a guest browsing in rupees who typed "5000" here was silently asking for
  // $5,000 a night and getting nothing back. The inputs hold whole units of the
  // selected currency and convert once, on Apply.
  const toLocal = (usd: string) => (usd ? String(Math.round(Number(usd) * rate)) : "");
  const [price, setPrice] = useState({ min: toLocal(value.minPrice), max: toLocal(value.maxPrice) });
  const toUsd = (local: string) => (local ? (Number(local) / rate).toFixed(2) : "");

  function toggleAmenity(id: number) {
    setDraft((d) => ({
      ...d,
      amenityIds: d.amenityIds.includes(id) ? d.amenityIds.filter((a) => a !== id) : [...d.amenityIds, id],
    }));
  }

  function clearAll() {
    setDraft(EMPTY_FILTERS);
    setPrice({ min: "", max: "" });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-2xl bg-white dark:bg-neutral-900 sm:rounded-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4 dark:border-neutral-700 dark:bg-neutral-900">
          <button onClick={onClose} aria-label="Close filters">
            <X size={20} />
          </button>
          <h2 className="font-semibold">Filters</h2>
          <span className="w-5" />
        </div>

        <div className="space-y-6 px-5 py-6">
          <section>
            <h3 className="mb-3 font-semibold">Price range per night</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-hof">Minimum</label>
                <input
                  type="number"
                  min={0}
                  placeholder={`${currency.symbol}0`}
                  value={price.min}
                  onChange={(e) => setPrice({ ...price, min: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-800"
                />
              </div>
              <span className="pt-5 text-hof">–</span>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-hof">Maximum</label>
                <input
                  type="number"
                  min={0}
                  placeholder={`${currency.symbol}${Math.round(1000 * rate).toLocaleString()}+`}
                  value={price.max}
                  onChange={(e) => setPrice({ ...price, max: e.target.value })}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-800"
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-semibold">Type of place</h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => setDraft({ ...draft, propertyType: draft.propertyType === pt ? "" : pt })}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                    draft.propertyType === pt
                      ? "border-ink bg-neutral-100 dark:border-white dark:bg-neutral-800"
                      : "border-neutral-300 hover:border-ink dark:border-neutral-600"
                  }`}
                >
                  {PROPERTY_TYPE_LABELS[pt]}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-semibold">Amenities</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {amenities.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAmenity(a.id)}
                  className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left text-sm transition-colors ${
                    draft.amenityIds.includes(a.id)
                      ? "border-ink bg-neutral-100 dark:border-white dark:bg-neutral-800"
                      : "border-neutral-300 hover:border-ink dark:border-neutral-600"
                  }`}
                >
                  <AmenityIcon icon={a.icon} size={20} />
                  {a.name}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between border-t border-neutral-200 bg-white px-5 py-4 dark:border-neutral-700 dark:bg-neutral-900">
          <button onClick={clearAll} className="text-sm font-semibold underline">
            Clear all
          </button>
          <button
            onClick={() => onApply({ ...draft, minPrice: toUsd(price.min), maxPrice: toUsd(price.max) })}
            className="rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-ink"
          >
            Show results
          </button>
        </div>
      </div>
    </div>
  );
}

export function FiltersButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:border-ink dark:border-neutral-600"
    >
      <SlidersHorizontal size={16} />
      Filters
      {active && <span className="h-2 w-2 rounded-full bg-rausch" />}
    </button>
  );
}
