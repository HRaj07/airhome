"use client";

import Link from "next/link";
import { Heart, Star, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import type { ListingCard as ListingCardType } from "@/lib/types";
import { PROPERTY_TYPE_SHORT } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useLocale } from "@/lib/locale-context";
import { wishlistApi } from "@/lib/api";
import CardPhotos from "./CardPhotos";
import { formatDateRangeCompact, fromISODate, nightsBetween, upcomingWeekend } from "@/lib/date";

export function isGuestFavourite(listing: ListingCardType): boolean {
  // Airbnb badges a large slice of its Indian inventory; at 4.8 with three
  // reviews almost nothing here qualified, so the row looked bare next to the
  // real thing.
  return listing.rating_avg >= 4.7 && listing.review_count >= 2;
}

/**
 * Airbnb uses two card shapes and this component renders both:
 *
 * - `explore` — the small card in the homepage carousels and dense grids:
 *   "Home in Alfama" / "11–13 Sept" / "₹9,360 total · ★4.9".
 * - `result`  — the wider card beside the search map, which has room for the
 *   rating on the title line, the listing's own name, the bed count and an
 *   underlined "₹11,896 for 5 nights".
 *
 * They share the wishlist behaviour, the photo carousel and the stay maths, so
 * they live together rather than in two components that drift apart.
 */
export default function ListingCard({
  listing,
  checkIn,
  checkOut,
  compact = false,
  layout = "explore",
}: {
  listing: ListingCardType;
  /** ISO dates from the current search. When absent the card shows the upcoming weekend,
   *  the way Airbnb shows a concrete sample stay rather than a generic price. */
  checkIn?: string;
  checkOut?: string;
  /** Narrow card used inside horizontal carousels. */
  compact?: boolean;
  layout?: "explore" | "result";
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { formatPrice, t } = useLocale();
  const [wishlisted, setWishlisted] = useState(listing.is_wishlisted);
  const [busy, setBusy] = useState(false);

  const stay = useMemo(() => {
    if (checkIn && checkOut) {
      const a = fromISODate(checkIn);
      const b = fromISODate(checkOut);
      return { label: formatDateRangeCompact(a, b), nights: Math.max(1, nightsBetween(a, b)) };
    }
    const wk = upcomingWeekend();
    return { label: formatDateRangeCompact(wk.checkIn, wk.checkOut), nights: 2 };
  }, [checkIn, checkOut]);

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
  const heading = t("{type} in {place}", { type: t(PROPERTY_TYPE_SHORT[listing.property_type]), place });
  const total = listing.price_per_night * stay.nights;
  const photos = listing.photo_urls?.length ? listing.photo_urls : listing.cover_photo_url ? [listing.cover_photo_url] : [];
  const ratingLabel =
    listing.review_count > 0 ? listing.rating_avg.toFixed(listing.rating_avg % 1 === 0 ? 1 : 2) : t("New");

  const overlay = (
    <>
      {isGuestFavourite(listing) && (
        <span className="absolute left-3 top-3 z-[1] flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink shadow-sm">
          <Trophy size={12} className="text-[#c99a2e]" aria-hidden="true" />
          {t("Guest favourite")}
        </span>
      )}
      <button
        onClick={toggleWishlist}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        className="absolute right-3 top-3 z-[1] transition-transform active:scale-90"
      >
        <Heart size={26} className={wishlisted ? "fill-rausch text-white" : "fill-black/40 text-white"} strokeWidth={1.8} />
      </button>
    </>
  );

  if (layout === "result") {
    return (
      <Link href={`/listing/${listing.id}`} className="group block cursor-pointer" title={listing.title}>
        <CardPhotos
          photos={photos}
          alt={listing.title}
          aspect="aspect-[1/0.86]"
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 45vw, 26vw"
          overlay={overlay}
        />

        <div className="mt-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-[15px] font-semibold text-ink dark:text-neutral-100">{heading}</p>
            <span className="flex shrink-0 items-center gap-1 text-sm text-ink dark:text-neutral-200">
              <Star size={12} className="fill-current" />
              {ratingLabel}
              {listing.review_count > 0 && (
                <span className="text-hof dark:text-neutral-400">({listing.review_count})</span>
              )}
            </span>
          </div>
          <p className="truncate text-sm text-hof dark:text-neutral-400">{listing.title}</p>
          <p className="truncate text-sm text-hof dark:text-neutral-400">
            {listing.bedrooms} {listing.bedrooms === 1 ? t("bedroom") : t("bedrooms")} · {listing.beds}{" "}
            {listing.beds === 1 ? t("bed") : t("beds")}
          </p>
          <p className="truncate text-sm text-hof dark:text-neutral-400">{stay.label}</p>
          <p className="mt-0.5 truncate text-sm text-ink dark:text-neutral-100">
            <span className="font-semibold underline">{formatPrice(total)}</span>{" "}
            {stay.nights === 1 ? t("for 1 night") : t("for {n} nights", { n: String(stay.nights) })}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/listing/${listing.id}`}
      className={`group block cursor-pointer ${compact ? "w-[168px] shrink-0 snap-start sm:w-[200px] lg:w-[232px]" : ""}`}
      title={listing.title}
    >
      <CardPhotos
        photos={photos}
        alt={listing.title}
        sizes={compact ? "240px" : "(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"}
        overlay={overlay}
      />

      <div className="mt-2.5">
        <p className="truncate text-[15px] font-medium text-ink dark:text-neutral-100">{heading}</p>
        <p className="truncate text-sm text-hof dark:text-neutral-400">{stay.label}</p>
        <p className="truncate text-sm text-ink dark:text-neutral-200">
          <span className="underline decoration-transparent">
            {formatPrice(total)} {t("total")}
          </span>
          <span className="mx-1 text-hof dark:text-neutral-400">·</span>
          <Star size={12} className="mb-0.5 inline fill-current" /> {ratingLabel}
        </p>
      </div>
    </Link>
  );
}
