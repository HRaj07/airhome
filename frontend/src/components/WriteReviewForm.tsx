"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { reviewsApi, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";

export default function WriteReviewForm({ listingId, onSubmitted }: { listingId: number; onSubmitted: () => void }) {
  const { showToast } = useToast();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  async function submit() {
    if (!comment.trim()) {
      showToast("Please write a few words about your stay", "info");
      return;
    }
    setSubmitting(true);
    try {
      await reviewsApi.create(listingId, { rating, comment });
      showToast("Thanks for your review!", "success");
      setComment("");
      setOpen(false);
      onSubmitted();
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        showToast("You can only review a listing after a completed stay", "error");
      } else if (e instanceof ApiError && e.status === 400) {
        showToast("You've already reviewed this stay", "info");
      } else {
        showToast("Couldn't submit your review. Please try again.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg border border-ink px-5 py-2.5 text-sm font-semibold dark:border-white">
        Write a review
      </button>
    );
  }

  return (
    <div className="max-w-lg rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
      <h3 className="mb-3 font-semibold">Share your experience</h3>
      <div className="mb-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star size={26} className={(hoverRating || rating) >= n ? "fill-current text-ink dark:text-white" : "text-neutral-300"} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What made your stay special?"
        rows={4}
        className="w-full rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
      />
      <div className="mt-3 flex gap-2">
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-ink"
        >
          {submitting ? "Submitting..." : "Submit review"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800">
          Cancel
        </button>
      </div>
    </div>
  );
}
