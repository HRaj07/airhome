"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import FiltersModal, { FiltersButton, FilterValue } from "@/components/FiltersModal";
import ListingGrid from "@/components/ListingGrid";
import ListingCarousel from "@/components/ListingCarousel";
import { amenitiesApi, listingsApi } from "@/lib/api";
import { fromISODate, nightsBetween } from "@/lib/date";
import type { Amenity, FeaturedRow, ListingCard } from "@/lib/types";

const EMPTY_FILTERS: FilterValue = { minPrice: "", maxPrice: "", propertyType: "", amenityIds: [] };

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const location = searchParams.get("location") || "";
  const checkIn = searchParams.get("check_in") || "";
  const checkOut = searchParams.get("check_out") || "";
  const guests = Number(searchParams.get("guests")) || 0;

  const [filters, setFilters] = useState<FilterValue>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [amenities, setAmenities] = useState<Amenity[]>([]);

  const filtersActive =
    !!filters.minPrice || !!filters.maxPrice || !!filters.propertyType || filters.amenityIds.length > 0;
  const hasSearch = !!location || !!checkIn || !!checkOut || guests > 0 || filtersActive;

  const nights = checkIn && checkOut ? Math.max(1, nightsBetween(fromISODate(checkIn), fromISODate(checkOut))) : 2;

  // ---- homepage carousels ----
  const [rows, setRows] = useState<FeaturedRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);

  // ---- search results ----
  const [results, setResults] = useState<ListingCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    amenitiesApi.list().then(setAmenities).catch(() => setAmenities([]));
  }, []);

  useEffect(() => {
    if (hasSearch) return;
    setRowsLoading(true);
    listingsApi
      .featured()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setRowsLoading(false));
  }, [hasSearch]);

  const fetchResults = useCallback(
    async (pageNum: number, replace: boolean) => {
      const current = ++requestId.current;
      setLoading(true);
      try {
        const res = await listingsApi.search({
          location: location || undefined,
          check_in: checkIn || undefined,
          check_out: checkOut || undefined,
          guests: guests > 0 ? guests : undefined,
          min_price: filters.minPrice ? Number(filters.minPrice) : undefined,
          max_price: filters.maxPrice ? Number(filters.maxPrice) : undefined,
          property_type: filters.propertyType || undefined,
          amenities: filters.amenityIds.length ? filters.amenityIds.join(",") : undefined,
          page: pageNum,
          limit: 18,
        });
        if (current !== requestId.current) return; // stale response
        setResults((prev) => (replace ? res.items : [...prev, ...res.items]));
        setTotal(res.total);
        setHasMore(res.has_more);
        setPage(pageNum);
      } catch {
        if (current === requestId.current) {
          setResults([]);
          setTotal(0);
          setHasMore(false);
        }
      } finally {
        if (current === requestId.current) setLoading(false);
      }
    },
    [location, checkIn, checkOut, guests, filters]
  );

  useEffect(() => {
    if (!hasSearch) return;
    fetchResults(1, true);
  }, [hasSearch, fetchResults]);

  return (
    <div className="mx-auto max-w-[1760px] px-4 sm:px-6 lg:px-10">
      {hasSearch ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 py-6">
            <h1 className="text-lg font-semibold">
              {loading && results.length === 0
                ? "Searching..."
                : `${total} ${total === 1 ? "stay" : "stays"}${location ? ` in ${location}` : ""}`}
              {checkIn && checkOut && (
                <span className="ml-2 text-sm font-normal text-hof dark:text-neutral-400">
                  · {nights} night{nights !== 1 ? "s" : ""}
                </span>
              )}
            </h1>
            <FiltersButton active={filtersActive} onClick={() => setFiltersOpen(true)} />
          </div>
          <ListingGrid
            listings={results}
            nights={nights}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={() => fetchResults(page + 1, false)}
            emptyMessage="No stays match your search"
          />
        </>
      ) : (
        <div className="py-6">
          <div className="mb-2 flex justify-end">
            <FiltersButton active={false} onClick={() => setFiltersOpen(true)} />
          </div>
          {rowsLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse py-3">
                  <div className="mb-4 h-6 w-64 rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="flex gap-4 overflow-hidden">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <div key={j} className="w-[232px] shrink-0">
                        <div className="aspect-[1/0.95] rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
                        <div className="mt-3 h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                        <div className="mt-2 h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            : rows.map((row) => <ListingCarousel key={row.city} title={row.title} city={row.city} listings={row.items} />)}
          {!rowsLoading && rows.length === 0 && (
            <p className="py-24 text-center text-hof dark:text-neutral-400">
              No listings yet. Run the backend seed script to load demo data.
            </p>
          )}
        </div>
      )}

      {filtersOpen && (
        <FiltersModal
          amenities={amenities}
          value={filters}
          onClose={() => setFiltersOpen(false)}
          onApply={(v) => {
            setFilters(v);
            setFiltersOpen(false);
          }}
        />
      )}
    </div>
  );
}
