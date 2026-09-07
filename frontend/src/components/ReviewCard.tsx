"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { useState } from "react";
import type { User } from "@/lib/types";
import { tenure, timeAgo } from "@/lib/date";
import TranslatedText from "./TranslatedText";

/**
 * One review, laid out as on the real listing page:
 *
 *   (avatar)  Roopali
 *             10 months on airhome
 *   ★★★★★ · 1 week ago
 *   It was a very beautiful place and we definitely would like to come again.
 *   Show more
 *
 * The avatar and name link to the reviewer's public profile.
 */
export default function ReviewCard({
  author,
  rating,
  comment,
  createdAt,
  clamp = true,
}: {
  author: User;
  rating: number;
  comment: string;
  createdAt: string;
  /** Clamp to three lines with a "Show more" link, as on the listing page. */
  clamp?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const long = comment.length > 140;

  return (
    <article className="flex flex-col gap-2">
      <Link href={`/users/${author.id}`} className="group flex items-center gap-3">
        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          {author.avatar_url ? (
            <Image src={author.avatar_url} alt={author.full_name} fill sizes="48px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-hof">
              {author.full_name.charAt(0)}
            </span>
          )}
        </span>
        <span>
          <span className="block text-[15px] font-semibold text-ink group-hover:underline dark:text-neutral-100">
            {author.full_name.split(" ")[0]}
          </span>
          <span className="block text-sm text-hof dark:text-neutral-400">{tenure(author.created_at)} on airhome</span>
        </span>
      </Link>

      <p className="flex items-center gap-1.5 text-sm">
        <span className="flex items-center" aria-label={`${rating} out of 5 stars`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={10} className={i < rating ? "fill-current text-ink dark:text-white" : "fill-current text-neutral-300 dark:text-neutral-700"} />
          ))}
        </span>
        <span className="text-hof dark:text-neutral-400">· {timeAgo(createdAt)}</span>
      </p>

      <TranslatedText
        text={comment}
        className={`text-[15px] leading-relaxed text-ink dark:text-neutral-200 ${clamp && !open ? "line-clamp-3" : ""}`}
      />
      {long && clamp && !open && (
        <button type="button" onClick={() => setOpen(true)} className="self-start text-sm font-semibold underline">
          Show more
        </button>
      )}
    </article>
  );
}
