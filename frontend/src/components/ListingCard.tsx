"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useState } from "react";
import type { ListingCard as ListingCardType } from "@/lib/types";
import { PROPERTY_TYPE_LABELS } from "@/lib/types";
import StarRating from "./StarRating";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { wishlistApi } from "@/lib/api";

export default function ListingCard({ listing }: { listing: ListingCardType }) {
  const { user } = useAuth();
  const { showToast } = useToast();
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
        showToast("Added to wishlist", "success");
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

  return (
    <Link href={`/listing/${listing.id}`} className="group block cursor-pointer">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl2 bg-neutral-100 dark:bg-neutral-800">
        {listing.cover_photo_url ? (
          <Image
            src={listing.cover_photo_url}
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-400">No photo</div>
        )}
        <button
          onClick={toggleWishlist}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute right-3 top-3 transition-transform active:scale-90"
        >
          <Heart
            size={24}
            className={wishlisted ? "fill-rausch text-rausch" : "fill-black/30 text-white"}
            strokeWidth={1.5}
          />
        </button>
      </div>
      <div className="mt-2 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium text-ink dark:text-neutral-100">
            {listing.city}
            {listing.country ? `, ${listing.country}` : ""}
          </p>
          <StarRating rating={listing.rating_avg} reviewCount={listing.review_count} showCount={false} />
        </div>
        <p className="truncate text-sm text-hof dark:text-neutral-400">{listing.title}</p>
        <p className="text-sm text-hof dark:text-neutral-400">{PROPERTY_TYPE_LABELS[listing.property_type]}</p>
        <p className="pt-1 text-sm">
          <span className="font-semibold text-ink dark:text-neutral-100">${listing.price_per_night.toFixed(0)}</span>{" "}
          <span className="text-hof dark:text-neutral-400">night</span>
        </p>
      </div>
    </Link>
  );
}
