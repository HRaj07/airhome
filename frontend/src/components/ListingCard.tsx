"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { useState } from "react";
import type { ListingCard as ListingCardType } from "@/lib/types";
import { PROPERTY_TYPE_SHORT } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useLocale } from "@/lib/locale-context";
import { wishlistApi } from "@/lib/api";

export function isGuestFavourite(listing: ListingCardType): boolean {
  return listing.rating_avg >= 4.8 && listing.review_count >= 3;
}

export default function ListingCard({
  listing,
  nights = 2,
  compact = false,
}: {
  listing: ListingCardType;
  /** Number of nights the displayed total is for (defaults to 2, like the Airbnb homepage). */
  nights?: number;
  /** Narrow card used inside horizontal carousels. */
  compact?: boolean;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { formatPrice } = useLocale();
  const [wishlisted, setWishlisted] = useState(listing.is_wishlisted);
  const [busy, setBusy] = useState(false);

  async function toggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast("Log in to save listings to your wishlist", "info");
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !wishlisted;
    setWishlisted(next);
    try {
      if (next) {
        await wishlistApi.add(listing.id);
        showToast("Saved to wishlist", "success");
      } else {
        await wishlistApi.remove(listing.id);
        showToast("Removed from wishlist", "info");
      }
    } catch {
      setWishlisted(!next);
      showToast("Something went wrong, please try again", "error");
    } finally {
      setBusy(false);
    }
  }

  const place = listing.neighborhood || listing.city;
  const total = listing.price_per_night * nights;

  return (
    <Link
      href={`/listing/${listing.id}`}
      className={`group block cursor-pointer ${compact ? "w-[168px] shrink-0 snap-start sm:w-[200px] lg:w-[232px]" : ""}`}
      title={listing.title}
    >
      <div className="relative aspect-[1/0.95] w-full overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800">
        {listing.cover_photo_url ? (
          <Image
            src={listing.cover_photo_url}
            alt={listing.title}
            fill
            sizes={compact ? "240px" : "(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-400">No photo</div>
        )}

        {isGuestFavourite(listing) && (
          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink shadow-sm">
            Guest favourite
          </span>
        )}

        <button
          onClick={toggleWishlist}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute right-3 top-3 transition-transform active:scale-90"
        >
          <Heart
            size={26}
            className={wishlisted ? "fill-rausch text-white" : "fill-black/50 text-white"}
            strokeWidth={1.8}
          />
        </button>
      </div>

      <div className="mt-2.5 space-y-0.5">
        <p className="truncate text-[15px] font-medium text-ink dark:text-neutral-100">
          {PROPERTY_TYPE_SHORT[listing.property_type]} in {place}
        </p>
        <p className="truncate text-sm text-hof dark:text-neutral-400">
          {formatPrice(total)} for {nights} night{nights !== 1 ? "s" : ""}
          <span className="mx-1">·</span>
          <Star size={12} className="mb-0.5 inline fill-current" />{" "}
          {listing.review_count > 0 ? listing.rating_avg.toFixed(listing.rating_avg % 1 === 0 ? 1 : 2) : "New"}
        </p>
      </div>
    </Link>
  );
}
