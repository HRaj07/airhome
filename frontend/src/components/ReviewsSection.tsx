"use client";

import { useEffect, useState } from "react";
import { Star, X, Sparkles, CheckCircle2, KeyRound, MessageCircle, MapPin, Tag, type LucideIcon } from "lucide-react";
import type { RatingCategory, Review } from "@/lib/types";
import { useLocale } from "@/lib/locale-context";
import ReviewCard from "./ReviewCard";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  cleanliness: Sparkles,
  accuracy: CheckCircle2,
  check_in: KeyRound,
  communication: MessageCircle,
  location: MapPin,
  value: Tag,
};

/**
 * The reviews block of a listing page, in the real page's shape:
 * "★ 4.93 · 12 reviews", the six category scores, a two-column grid of the
 * first six reviews, and "Show all 12 reviews" opening the full list.
 */
export default function ReviewsSection({
  reviews,
  ratingAvg,
  categories = [],
  guestFavourite = false,
}: {
  reviews: Review[];
  ratingAvg: number;
  categories?: RatingCategory[];
  guestFavourite?: boolean;
}) {
  const { t } = useLocale();
  const [allOpen, setAllOpen] = useState(false);

  useEffect(() => {
    if (!allOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAllOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [allOpen]);

  if (reviews.length === 0) {
    return (
      <section id="reviews" className="border-b border-neutral-200 py-10 dark:border-neutral-800">
        <h2 className="mb-2 text-[22px] font-semibold">{t("No reviews yet")}</h2>
        <p className="text-sm text-hof dark:text-neutral-400">Be the first to review this place after your stay.</p>
      </section>
    );
  }

  const shown = reviews.slice(0, 6);

  return (
    <section id="reviews" className="border-b border-neutral-200 py-10 dark:border-neutral-800">
      {guestFavourite ? (
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3">
            <Laurel side="left" />
            <span className="text-[64px] font-bold leading-none tracking-tight">{ratingAvg.toFixed(2)}</span>
            <Laurel side="right" />
          </div>
          <p className="mt-2 text-[22px] font-semibold">{t("Guest favourite")}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-hof dark:text-neutral-400">
            This home is in the <b>top 10%</b> of eligible listings based on ratings, reviews and reliability.
          </p>
        </div>
      ) : (
        <h2 className="mb-6 flex items-center gap-2 text-[22px] font-semibold">
          <Star size={22} className="fill-current" />
          {ratingAvg.toFixed(2)} · {reviews.length} {reviews.length > 1 ? t("reviews") : t("review")}
        </h2>
      )}

      {categories.length > 0 && (
        <div className="mb-10 grid grid-cols-2 gap-x-8 gap-y-3 border-b border-neutral-200 pb-8 dark:border-neutral-800 sm:grid-cols-3 lg:grid-cols-6 lg:gap-y-0 lg:divide-x lg:divide-neutral-200 dark:lg:divide-neutral-800">
          {categories.map((c) => {
            const Icon = CATEGORY_ICONS[c.key] || Star;
            return (
              <div key={c.key} className="lg:px-4 first:lg:pl-0">
                <p className="text-sm font-medium">{t(c.label)}</p>
                <p className="mt-1 text-lg font-semibold">{c.score.toFixed(1)}</p>
                <Icon size={24} className="mt-3 hidden lg:block" />
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-x-16 gap-y-10 sm:grid-cols-2">
        {shown.map((r) => (
          <ReviewCard key={r.id} author={r.author} rating={r.rating} comment={r.comment} createdAt={r.created_at} />
        ))}
      </div>

      {reviews.length > shown.length && (
        <button
          type="button"
          onClick={() => setAllOpen(true)}
          className="mt-10 rounded-lg border border-ink px-6 py-3 text-[15px] font-semibold hover:bg-neutral-100 dark:border-white dark:hover:bg-neutral-800"
        >
          {t("Show all {n} reviews", { n: String(reviews.length) })}
        </button>
      )}

      {allOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAllOpen(false)}>
          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="All reviews"
          >
            <div className="flex items-center gap-3 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
              <button onClick={() => setAllOpen(false)} aria-label="Close" className="rounded-full p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <X size={18} />
              </button>
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <Star size={18} className="fill-current" /> {ratingAvg.toFixed(2)} · {reviews.length} {t("reviews")}
              </h3>
            </div>
            <div className="grid gap-x-12 gap-y-8 overflow-y-auto p-6 sm:grid-cols-2">
              {reviews.map((r) => (
                <ReviewCard key={r.id} author={r.author} rating={r.rating} comment={r.comment} createdAt={r.created_at} clamp={false} />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/** The laurel wreath that frames the rating on Guest favourite listings. */
export function Laurel({ side, size = 44 }: { side: "left" | "right"; size?: number }) {
  return (
    <svg
      width={size * 0.6}
      height={size}
      viewBox="0 0 24 40"
      fill="currentColor"
      aria-hidden="true"
      className={side === "right" ? "-scale-x-100" : ""}
    >
      <path d="M22 2c-6 2-10 7-11 13 4-1 8-5 11-13zM20 12c-6 1-10 5-12 11 5 0 9-4 12-11zM19 22c-6 0-10 3-13 9 5 1 10-2 13-9zM18 31c-5-1-10 1-14 6 5 2 10 0 14-6zM7 15C4 9 4 4 6 0c3 5 3 10 1 15zM6 24c-4-4-5-9-4-14 3 4 5 9 4 14zM6 33c-5-3-7-8-7-13 4 3 7 8 7 13z" />
    </svg>
  );
}
