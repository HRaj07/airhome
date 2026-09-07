import { Star } from "lucide-react";

export default function StarRating({
  rating,
  reviewCount,
  size = 14,
  showCount = true,
}: {
  rating: number;
  reviewCount?: number;
  size?: number;
  showCount?: boolean;
}) {
  const hasReviews = (reviewCount ?? 0) > 0;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star size={size} className="fill-current" />
      <span>{hasReviews ? rating.toFixed(1) : "New"}</span>
      {showCount && hasReviews && <span className="text-hof dark:text-neutral-400">({reviewCount})</span>}
    </span>
  );
}
