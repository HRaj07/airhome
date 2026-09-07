"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Star } from "lucide-react";
import type { ExperienceCard as ExperienceCardType } from "@/lib/types";
import { KIND_PATH } from "@/lib/types";
import { useLocale } from "@/lib/locale-context";

/** "3:00 PM" -> "3pm", "12:30 PM" -> "12:30pm" (matches Airbnb's time badge). */
export function shortTime(t: string): string {
  const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return t;
  const [, h, min, ap] = m;
  return `${h}${min === "00" ? "" : `:${min}`}${ap.toLowerCase()}`;
}

export default function ExperienceCard({ item, compact = false }: { item: ExperienceCardType; compact?: boolean }) {
  const { formatPrice, t } = useLocale();
  const href = `${KIND_PATH[item.kind]}/${item.id}`;

  return (
    <Link
      href={href}
      className={`group block ${compact ? "w-[168px] shrink-0 snap-start sm:w-[200px] lg:w-[232px]" : ""}`}
      title={item.title}
    >
      <div className="relative aspect-[1/0.95] w-full overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800">
        {item.cover_photo_url ? (
          <Image
            src={item.cover_photo_url}
            alt={item.title}
            fill
            sizes={compact ? "240px" : "(max-width: 768px) 50vw, 25vw"}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-400">No photo</div>
        )}
        {item.start_time && (
          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink shadow-sm">
            {shortTime(item.start_time)}
          </span>
        )}
        <span className="absolute right-3 top-3">
          <Heart size={26} className="fill-black/50 text-white" strokeWidth={1.8} />
        </span>
      </div>
      <div className="mt-2.5 space-y-0.5">
        <p className="line-clamp-2 text-[15px] font-medium leading-snug text-ink dark:text-neutral-100">{item.title}</p>
        <p className="truncate text-sm text-hof dark:text-neutral-400">
          {t("From")} {formatPrice(item.price_per_guest)} / {t(item.price_unit)}
          {item.review_count > 0 && (
            <>
              <span className="mx-1">·</span>
              <Star size={12} className="mb-0.5 inline fill-current" /> {item.rating_avg.toFixed(item.rating_avg % 1 === 0 ? 1 : 2)}
            </>
          )}
        </p>
      </div>
    </Link>
  );
}
