"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import FiltersModal, { FilterValue } from "@/components/FiltersModal";
import FilterChips from "@/components/FilterChips";
import ListingCard from "@/components/ListingCard";
import ListingCarousel from "@/components/ListingCarousel";
import EmptyState from "@/components/EmptyState";
import RowsSkeleton from "@/components/RowsSkeleton";
import { amenitiesApi, listingsApi } from "@/lib/api";
import { fromISODate, nightsBetween, formatShort } from "@/lib/date";
import type { Amenity, FeaturedRow, ListingCard as ListingCardType } from "@/lib/types";
import { useLocale } from "@/lib/locale-context";

// Leaflet is browser-only; never render the map on the server.
const ListingsMap = dynamic(() => import("@/components/ListingsMap"), { ssr: false });

const EMPTY_FILTERS: FilterValue = { minPrice: "", maxPrice: "", propertyType: "", amenityIds: [] };

export default function HomesPage() {
  return (
    <Suspense fallback={null}>
      <HomesContent />
    </Suspense>
  );
}

function HomesContent() {
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const location = searchParams.get("location") || "";
  const checkIn = searchParams.get("check_in") || "";
  const checkOut = searchParams.get("check_out") || "";
  const guests = Number(searchParams.get("guests")) || 0;
  // Any query string at all (even an empty search) means "show me results".
  const hasSearch = searchParams.toString().length > 0;

  const nights = checkIn && checkOut ? Math.max(1, nightsBetween(fromISODate(checkIn), fromISODate(checkOut))) : 2;

  const [filters, setFilters] = useState<FilterValue>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const filtersActive = !!filters.minPrice || !!filters.maxPrice || !!filters.propertyType;

  const [rows, setRows] = useState<FeaturedRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);

  const [results, setResults] = useState<ListingCardType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const requestId = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

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
        if (current !== requestId.current) return;
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

  // Infinite scroll for the results grid.
  useEffect(() => {
    if (!hasSearch || !hasMore || loading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchResults(page + 1, false);
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasSearch, hasMore, loading, page, fetchResults]);

  const handleHover = useCallback((id: number | null) => setActiveId(id), []);

  function toggleAmenity(id: number) {
    setFilters((f) => ({
      ...f,
      amenityIds: f.amenityIds.includes(id) ? f.amenityIds.filter((a) => a !== id) : [...f.amenityIds, id],
    }));
  }

  if (!hasSearch) {
    return (
      <div className="mx-auto max-w-[1760px] px-4 py-6 sm:px-6 lg:px-10">
        {rowsLoading ? (
          <RowsSkeleton />
        ) : (
          rows.map((row) => <ListingCarousel key={row.city} title={row.title} city={row.city} listings={row.items} />)
        )}
      </div>
    );
  }

  const heading =
    loading && results.length === 0
      ? "Searching..."
      : `${total === 0 ? "0" : total > 1000 ? "1,000+" : total} ${total === 1 ? t("home") : t("homes")}${location ? ` · ${location}` : ""}`;

  return (
    <div className="mx-auto max-w-[1760px] px-4 sm:px-6 lg:px-10">
      <FilterChips
        amenities={amenities}
        selectedIds={filters.amenityIds}
        onToggle={toggleAmenity}
        onOpenFilters={() => setFiltersOpen(true)}
        filtersActive={filtersActive}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,46%)]">
        <div>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-[22px] font-semibold">{heading}</h1>
            {checkIn && checkOut && (
              <p className="text-sm text-hof dark:text-neutral-400">
                {formatShort(fromISODate(checkIn))} – {formatShort(fromISODate(checkOut))} · {nights} night{nights !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {!loading && results.length === 0 ? (
            <EmptyState title={t("No exact matches")} description={t("Try changing or removing some of your filters or adjusting your search area.")} />
          ) : (
            <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((l) => (
                <div
                  key={l.id}
                  onMouseEnter={() => setActiveId(l.id)}
                  onMouseLeave={() => setActiveId(null)}
                  className={`rounded-2xl transition-shadow ${activeId === l.id ? "ring-2 ring-ink/10 dark:ring-white/20" : ""}`}
                >
                  <ListingCard listing={l} nights={nights} />
                </div>
              ))}
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={`s-${i}`} className="animate-pulse">
                    <div className="aspect-[1/0.95] rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
                    <div className="mt-3 h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                ))}
            </div>
          )}
          <div ref={sentinelRef} className="h-1" />
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-24 h-[calc(100vh-7rem)] overflow-hidden rounded-2xl">
            <ListingsMap listings={results} nights={nights} activeId={activeId} onHover={handleHover} />
          </div>
        </div>
      </div>

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
