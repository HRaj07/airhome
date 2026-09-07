"use client";

import { useEffect, useRef } from "react";
import type { ListingCard as ListingCardType } from "@/lib/types";
import ListingCard from "./ListingCard";
import EmptyState from "./EmptyState";

export default function ListingGrid({
  listings,
  loading,
  hasMore,
  onLoadMore,
  nights = 2,
  emptyMessage = "No listings match your search",
}: {
  listings: ListingCardType[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  nights?: number;
  emptyMessage?: string;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || loading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  if (!loading && listings.length === 0) {
    return <EmptyState title={emptyMessage} description="Try adjusting your search or filters." />;
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} nights={nights} />
        ))}
        {loading &&
          Array.from({ length: 12 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="animate-pulse">
              <div className="aspect-[1/0.95] w-full rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
              <div className="mt-3 h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="mt-2 h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
            </div>
          ))}
      </div>
      <div ref={sentinelRef} className="h-1 w-full" />
    </div>
  );
}
