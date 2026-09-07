"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Tag } from "lucide-react";
import FiltersModal, { EMPTY_FILTERS, FilterValue } from "@/components/FiltersModal";
import FilterChips from "@/components/FilterChips";
import ListingCard from "@/components/ListingCard";
import ListingCarousel from "@/components/ListingCarousel";
import EmptyState from "@/components/EmptyState";
import RowsSkeleton from "@/components/RowsSkeleton";
import { amenitiesApi, destinationsApi, listingsApi, type MapBounds, type SearchParams } from "@/lib/api";
import { fromISODate, nightsBetween, formatShort } from "@/lib/date";
import { getApproximateLocation } from "@/lib/geo";
import type { Amenity, Destination, FeaturedRow, ListingCard as ListingCardType, MapPin } from "@/lib/types";
import { useLocale } from "@/lib/locale-context";

// Leaflet is browser-only; never render the map on the server.
const ListingsMap = dynamic(() => import("@/components/ListingsMap"), { ssr: false });

export default function HomesPage() {
  return (
    <Suspense fallback={null}>
      <HomesContent />
    </Suspense>
  );
}

/** Read the map viewport out of the URL, if the user has moved the map. */
function boundsFromParams(sp: URLSearchParams): MapBounds | null {
  const n = (k: string) => {
    const v = sp.get(k);
    return v === null || v === "" ? NaN : Number(v);
  };
  const b = { sw_lat: n("sw_lat"), sw_lng: n("sw_lng"), ne_lat: n("ne_lat"), ne_lng: n("ne_lng") };
  return Object.values(b).some((x) => Number.isNaN(x)) ? null : b;
}

function HomesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();

  const location = searchParams.get("location") || "";
  const checkIn = searchParams.get("check_in") || "";
  const checkOut = searchParams.get("check_out") || "";
  const guests = Number(searchParams.get("guests")) || 0;
  const bounds = useMemo(() => boundsFromParams(searchParams), [searchParams]);
  // Any query string at all (even an empty search) means "show me results".
  const hasSearch = searchParams.toString().length > 0;

  const nights = checkIn && checkOut ? Math.max(1, nightsBetween(fromISODate(checkIn), fromISODate(checkOut))) : 2;

  const [filters, setFilters] = useState<FilterValue>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [popular, setPopular] = useState<Destination[]>([]);
  const filtersActive = !!filters.minPrice || !!filters.maxPrice || !!filters.propertyType;

  const [rows, setRows] = useState<FeaturedRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);

  const [results, setResults] = useState<ListingCardType[]>([]);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [searchAsMove, setSearchAsMove] = useState(true);
  const [pendingBounds, setPendingBounds] = useState<MapBounds | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const requestId = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    amenitiesApi.list().then(setAmenities).catch(() => setAmenities([]));
    destinationsApi.search(undefined, 8).then(setPopular).catch(() => setPopular([]));
  }, []);

  useEffect(() => {
    if (hasSearch) return;
    let cancelled = false;
    // Set once the location-ranked rows are in. The localised request often
    // beats the generic one (its IP lookup is cached), so without this flag the
    // generic response landed second and overwrote the near-you rows.
    let localised = false;
    setRowsLoading(true);

    // Same two-phase load as the home page: paint the generic rows straight
    // away, then swap in near-you rows once coordinates arrive (if they do).
    listingsApi
      .featured()
      .then((generic) => {
        if (!cancelled && !localised) setRows(generic);
      })
      .catch(() => {
        if (!cancelled && !localised) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setRowsLoading(false);
      });

    getApproximateLocation()
      .then((pos) => pos && listingsApi.featured({ latitude: pos.latitude, longitude: pos.longitude }))
      .then((localisedRows) => {
        if (cancelled || !localisedRows || !localisedRows.length) return;
        localised = true;
        setRows(localisedRows);
      })
      .catch(() => {
        // No location (denied, unavailable, offline) — the generic rows stand.
      });

    return () => {
      cancelled = true;
    };
  }, [hasSearch]);

  // The filter set shared by the list and the map, so pins always agree with cards.
  const baseParams = useMemo<SearchParams>(
    () => ({
      location: location || undefined,
      check_in: checkIn || undefined,
      check_out: checkOut || undefined,
      guests: guests > 0 ? guests : undefined,
      min_price: filters.minPrice ? Number(filters.minPrice) : undefined,
      max_price: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      property_type: filters.propertyType || undefined,
      amenities: filters.amenityIds.length ? filters.amenityIds.join(",") : undefined,
      instant_book: filters.instantBook || undefined,
      min_bathrooms: filters.minBathrooms || undefined,
      ...(bounds ?? {}),
    }),
    [location, checkIn, checkOut, guests, filters, bounds]
  );

  // The map re-frames only when the *search* changes, not when the map itself
  // moved and caused a refetch — otherwise every pan would snap back.
  const fitKey = useMemo(
    () =>
      JSON.stringify([location, checkIn, checkOut, guests, filters.minPrice, filters.maxPrice, filters.propertyType, filters.amenityIds, filters.instantBook, filters.minBathrooms]),
    [location, checkIn, checkOut, guests, filters]
  );

  const fetchResults = useCallback(
    async (pageNum: number, replace: boolean) => {
      const current = ++requestId.current;
      setLoading(true);
      try {
        const res = await listingsApi.search({ ...baseParams, page: pageNum, limit: 18 });
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
    [baseParams]
  );

  useEffect(() => {
    if (!hasSearch) return;
    fetchResults(1, true);
    // Pins for everything in view, not just this page.
    listingsApi.mapPins(baseParams).then(setPins).catch(() => setPins([]));
  }, [hasSearch, fetchResults, baseParams]);

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

  /** Write the viewport into the URL so the list follows it (and refresh/back keep it). */
  const applyBounds = useCallback(
    (b: MapBounds) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("sw_lat", b.sw_lat.toFixed(5));
      next.set("sw_lng", b.sw_lng.toFixed(5));
      next.set("ne_lat", b.ne_lat.toFixed(5));
      next.set("ne_lng", b.ne_lng.toFixed(5));
      next.delete("search");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      setPendingBounds(null);
    },
    [router, pathname, searchParams]
  );

  const handleBoundsChange = useCallback(
    (b: MapBounds) => {
      if (searchAsMove) applyBounds(b);
      else setPendingBounds(b);
    },
    [searchAsMove, applyBounds]
  );

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

  // Airbnb writes "Over 1,000 homes" when the count is large and exact otherwise.
  const heading =
    loading && results.length === 0
      ? `${t("Searching")}...`
      : total > 1000
      ? `${t("Over")} 1,000 ${t("homes")}`
      : `${total} ${total === 1 ? t("home") : t("homes")}${bounds ? ` ${t("in map area")}` : location ? ` ${t("in")} ${location}` : ""}`;

  return (
    <div className="mx-auto max-w-[1760px] px-4 sm:px-6 lg:px-10">
      <FilterChips
        amenities={amenities}
        value={filters}
        onChange={setFilters}
        onOpenFilters={() => setFiltersOpen(true)}
        filtersActive={filtersActive}
      />

      <div className={`grid grid-cols-1 gap-6 ${mapExpanded ? "" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,46%)]"}`}>
        {!mapExpanded && (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 pt-2">
              <h1 className="text-[22px] font-semibold">{heading}</h1>
              <div className="flex items-center gap-4">
                {checkIn && checkOut && (
                  <p className="text-sm text-hof dark:text-neutral-400">
                    {formatShort(fromISODate(checkIn))} – {formatShort(fromISODate(checkOut))} · {nights}{" "}
                    {nights === 1 ? t("night") : t("nights")}
                  </p>
                )}
                <p className="flex items-center gap-1.5 text-sm text-ink dark:text-neutral-200">
                  <Tag size={15} className="fill-rausch text-rausch" />
                  {t("Prices include all fees")}
                </p>
              </div>
            </div>

            {!loading && results.length === 0 ? (
              <div>
                <EmptyState
                  title={t("No exact matches")}
                  description={t("Try changing or removing some of your filters or adjusting your search area.")}
                />
                {popular.length > 0 && (
                  <div className="pb-8">
                    <p className="mb-3 text-center text-sm font-semibold">Popular destinations</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {popular
                        .filter((d) => d.kind === "city")
                        .map((d) => (
                          <Link
                            key={`${d.city}-${d.country}`}
                            href={`/homes?location=${encodeURIComponent(d.city)}`}
                            className="rounded-full border border-neutral-300 px-4 py-2 text-sm transition-colors hover:border-ink dark:border-neutral-600 dark:hover:border-white"
                          >
                            {d.label} <span className="text-hof dark:text-neutral-400">· {d.count}</span>
                          </Link>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 2xl:grid-cols-3">
                {results.map((l) => (
                  <div key={l.id} onMouseEnter={() => setActiveId(l.id)} onMouseLeave={() => setActiveId(null)}>
                    <ListingCard listing={l} checkIn={checkIn || undefined} checkOut={checkOut || undefined} layout="result" />
                  </div>
                ))}
                {loading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={`s-${i}`} className="animate-pulse">
                      <div className="aspect-[1/0.86] rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
                      <div className="mt-3 h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                      <div className="mt-2 h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
                    </div>
                  ))}
              </div>
            )}
            <div ref={sentinelRef} className="h-1" />
          </div>
        )}

        <div className={mapExpanded ? "block" : "hidden lg:block"}>
          <div className={`sticky top-[9.5rem] overflow-hidden rounded-2xl ${mapExpanded ? "h-[calc(100vh-11rem)]" : "h-[calc(100vh-11rem)]"}`}>
            <ListingsMap
              pins={pins}
              listings={results}
              nights={nights}
              activeId={activeId}
              onHover={handleHover}
              onBoundsChange={handleBoundsChange}
              onExpandToggle={() => setMapExpanded((v) => !v)}
              expanded={mapExpanded}
              fitKey={fitKey}
            />

            {/* Airbnb's "Search as I move the map" toggle / "Search this area" button */}
            <div className="pointer-events-none absolute inset-x-0 top-4 z-[1000] flex justify-center">
              {searchAsMove || !pendingBounds ? (
                <label className="pointer-events-auto flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-md dark:bg-neutral-900">
                  <input type="checkbox" checked={searchAsMove} onChange={(e) => setSearchAsMove(e.target.checked)} className="accent-ink" />
                  {t("Search as I move the map")}
                </label>
              ) : (
                <button
                  type="button"
                  onClick={() => applyBounds(pendingBounds)}
                  className="pointer-events-auto rounded-lg bg-white px-4 py-2 text-sm font-semibold shadow-md hover:bg-neutral-50 dark:bg-neutral-900"
                >
                  {t("Search this area")}
                </button>
              )}
            </div>
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
