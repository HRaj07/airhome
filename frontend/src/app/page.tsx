"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchBar, { SearchValue } from "@/components/SearchBar";
import CategoryRow from "@/components/CategoryRow";
import FiltersModal, { FiltersButton, FilterValue } from "@/components/FiltersModal";
import ListingGrid from "@/components/ListingGrid";
import { amenitiesApi, listingsApi } from "@/lib/api";
import type { Amenity, ListingCard, PropertyType } from "@/lib/types";

const EMPTY_FILTERS: FilterValue = { minPrice: "", maxPrice: "", propertyType: "", amenityIds: [] };

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState<SearchValue>({
    location: searchParams.get("location") || "",
    checkIn: searchParams.get("check_in") || "",
    checkOut: searchParams.get("check_out") || "",
    guests: Number(searchParams.get("guests")) || 1,
  });
  const [filters, setFilters] = useState<FilterValue>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [amenities, setAmenities] = useState<Amenity[]>([]);

  const [listings, setListings] = useState<ListingCard[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  useEffect(() => {
    amenitiesApi.list().then(setAmenities).catch(() => setAmenities([]));
  }, []);

  const fetchListings = useCallback(
    async (pageNum: number, replace: boolean) => {
      const currentRequest = ++requestId.current;
      setLoading(true);
      try {
        const res = await listingsApi.search({
          location: search.location || undefined,
          check_in: search.checkIn || undefined,
          check_out: search.checkOut || undefined,
          guests: search.guests > 1 ? search.guests : undefined,
          min_price: filters.minPrice ? Number(filters.minPrice) : undefined,
          max_price: filters.maxPrice ? Number(filters.maxPrice) : undefined,
          property_type: filters.propertyType || undefined,
          amenities: filters.amenityIds.length ? filters.amenityIds.join(",") : undefined,
          page: pageNum,
          limit: 15,
        });
        if (currentRequest !== requestId.current) return; // stale response, ignore
        setListings((prev) => (replace ? res.items : [...prev, ...res.items]));
        setHasMore(res.has_more);
        setPage(pageNum);
      } catch {
        if (currentRequest === requestId.current) {
          setListings([]);
          setHasMore(false);
        }
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    },
    [search, filters]
  );

  useEffect(() => {
    fetchListings(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters]);

  function handleSearch(v: SearchValue) {
    setSearch(v);
    const params = new URLSearchParams();
    if (v.location) params.set("location", v.location);
    if (v.checkIn) params.set("check_in", v.checkIn);
    if (v.checkOut) params.set("check_out", v.checkOut);
    if (v.guests > 1) params.set("guests", String(v.guests));
    router.push(`/?${params.toString()}`, { scroll: false });
  }

  function handleCategorySelect(pt: PropertyType | "") {
    setFilters((f) => ({ ...f, propertyType: pt }));
  }

  const filtersActive =
    !!filters.minPrice || !!filters.maxPrice || !!filters.propertyType || filters.amenityIds.length > 0;

  return (
    <div>
      <div className="border-b border-neutral-200 bg-white px-4 py-6 dark:border-neutral-800 dark:bg-neutral-950 sm:px-8">
        <SearchBar initial={search} onSearch={handleSearch} />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="flex items-center justify-between">
          <CategoryRow selected={filters.propertyType} onSelect={handleCategorySelect} />
        </div>
        <div className="flex justify-end py-4">
          <FiltersButton active={filtersActive} onClick={() => setFiltersOpen(true)} />
        </div>

        <ListingGrid
          listings={listings}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={() => fetchListings(page + 1, false)}
          emptyMessage="No listings match your search"
        />
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
