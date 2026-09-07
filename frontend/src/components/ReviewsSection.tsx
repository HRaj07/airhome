import Image from "next/image";
import { Star } from "lucide-react";
import type { Review } from "@/lib/types";

export default function ReviewsSection({ reviews, ratingAvg }: { reviews: Review[]; ratingAvg: number }) {
  if (reviews.length === 0) {
    return (
      <section className="border-b border-neutral-200 py-8 dark:border-neutral-800">
        <h2 className="mb-2 text-xl font-semibold">No reviews yet</h2>
        <p className="text-sm text-hof dark:text-neutral-400">Be the first to review this place after your stay.</p>
      </section>
    );
  }

  return (
    <section className="border-b border-neutral-200 py-8 dark:border-neutral-800">
      <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
        <Star size={20} className="fill-current" />
        {ratingAvg.toFixed(1)} · {reviews.length} review{reviews.length > 1 ? "s" : ""}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {reviews.slice(0, 8).map((r) => (
          <div key={r.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                {r.author.avatar_url && (
                  <Image src={r.author.avatar_url} alt={r.author.full_name} fill sizes="40px" className="object-cover" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{r.author.full_name}</p>
                <p className="text-xs text-hof dark:text-neutral-400">{new Date(r.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
              </div>
            </div>
            <p className="line-clamp-4 text-sm text-ink dark:text-neutral-200">{r.comment}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
