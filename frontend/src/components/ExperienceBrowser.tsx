"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ExperienceCarousel from "./ExperienceCarousel";
import ExperienceCard from "./ExperienceCard";
import EmptyState from "./EmptyState";
import RowsSkeleton from "./RowsSkeleton";
import { destinationsApi, experiencesApi } from "@/lib/api";
import { useNearbyRows, type RowCoords } from "@/lib/use-nearby-rows";
import Link from "next/link";
import { fromISODate, formatShort } from "@/lib/date";
import type { Destination, ExperienceCard as ExperienceCardType, ExperienceKind, ExperienceRow } from "@/lib/types";

/**
 * The Experiences and Services tabs share this component: carousel rows when
 * idle, a results grid when the header search has been used.
 */
export default function ExperienceBrowser({ kind }: { kind: ExperienceKind }) {
  return (
    <Suspense fallback={null}>
      <Browser kind={kind} />
    </Suspense>
  );
}

function Browser({ kind }: { kind: ExperienceKind }) {
  const searchParams = useSearchParams();
  const location = searchParams.get("location") || "";
  const category = searchParams.get("category") || "";
  const date = searchParams.get("date") || "";
  const guests = Number(searchParams.get("guests")) || 0;
  const hasSearch = searchParams.toString().length > 0;

  // Carousel rows for the browse view (no search yet): generic first, then
  // swapped for the cities nearest the visitor.
  const featured = useCallback((c?: RowCoords) => experiencesApi.featured(kind, c), [kind]);
  const { rows, loading: rowsLoading } = useNearbyRows<ExperienceRow>(featured, !hasSearch);
  const [popular, setPopular] = useState<Destination[]>([]);

  const [results, setResults] = useState<ExperienceCardType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    destinationsApi.search(undefined, 8).then(setPopular).catch(() => setPopular([]));
  }, []);

  const fetchResults = useCallback(
    async (pageNum: number, replace: boolean) => {
      const current = ++requestId.current;
      setLoading(true);
      try {
        const res = await experiencesApi.search({
          kind,
          location: location || undefined,
          category: category || undefined,
          date: date || undefined,
          guests: guests > 0 ? guests : undefined,
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
    [kind, location, category, date, guests]
  );

  useEffect(() => {
    if (!hasSearch) return;
    fetchResults(1, true);
  }, [hasSearch, fetchResults]);

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

  const noun = kind === "service" ? "service" : "experience";

  if (!hasSearch) {
    return (
      <div className="mx-auto max-w-[1760px] px-4 py-6 sm:px-6 lg:px-10">
        {rowsLoading ? <RowsSkeleton /> : rows.map((row) => <ExperienceCarousel key={row.key} row={row} />)}
        {!rowsLoading && rows.length === 0 && (
          <p className="py-24 text-center text-hof dark:text-neutral-400">No {noun}s yet. Run the backend seed script to load demo data.</p>
        )}
      </div>
    );
  }

  const parts: string[] = [];
  if (category) parts.push(category);
  if (location) parts.push(`in ${location}`);
  const heading =
    loading && results.length === 0
      ? "Searching..."
      : `${total === 0 ? "No" : total} ${noun}${total === 1 ? "" : "s"} ${parts.join(" ")}`.trim();

  return (
    <div className="mx-auto max-w-[1760px] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[22px] font-semibold">{heading}</h1>
        {(date || guests > 0) && (
          <p className="text-sm text-hof dark:text-neutral-400">
            {date ? formatShort(fromISODate(date)) : ""}
            {date && guests > 0 ? " · " : ""}
            {guests > 0 ? `${guests} guest${guests > 1 ? "s" : ""}` : ""}
          </p>
        )}
      </div>

      {!loading && results.length === 0 ? (
        <div>
          <EmptyState title="No exact matches" description="Try a different city, date or category." />
          {popular.length > 0 && (
            <div className="pb-8">
              <p className="mb-3 text-center text-sm font-semibold">Popular destinations</p>
              <div className="flex flex-wrap justify-center gap-2">
                {popular
                  .filter((d) => d.kind === "city")
                  .map((d) => (
                    <Link
                      key={d.city}
                      href={`${kind === "service" ? "/services" : "/experiences"}?location=${encodeURIComponent(d.city)}`}
                      className="rounded-full border border-neutral-300 px-4 py-2 text-sm transition-colors hover:border-ink dark:border-neutral-600 dark:hover:border-white"
                    >
                      {d.label}
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7">
          {results.map((item) => (
            <ExperienceCard key={item.id} item={item} />
          ))}
          {loading &&
            Array.from({ length: 7 }).map((_, i) => (
              <div key={`s-${i}`} className="animate-pulse">
                <div className="aspect-[1/0.95] rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
                <div className="mt-3 h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
              </div>
            ))}
        </div>
      )}
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}
