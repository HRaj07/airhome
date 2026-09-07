"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

/**
 * The swipeable photo area of a listing card: dots along the bottom and
 * arrows that fade in on hover, exactly like Airbnb's cards. Kept separate
 * from ListingCard so both the explore and results layouts share one
 * implementation.
 *
 * The whole card is a link, so the arrows must swallow the click.
 */
export default function CardPhotos({
  photos,
  alt,
  sizes,
  aspect = "aspect-[1/0.95]",
  overlay,
}: {
  photos: string[];
  alt: string;
  sizes: string;
  aspect?: string;
  /** Badges and the wishlist heart, positioned by the caller. */
  overlay?: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const slides = photos.length > 0 ? photos : [""];
  const many = slides.length > 1;

  function step(e: React.MouseEvent, delta: number) {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i + delta + slides.length) % slides.length);
  }

  return (
    <div className={`group/photos relative w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800 ${aspect}`}>
      {slides[index] ? (
        <Image
          src={slides[index]}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">No photo</div>
      )}

      {overlay}

      {many && (
        <>
          <button
            onClick={(e) => step(e, -1)}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 opacity-0 shadow transition-opacity hover:bg-white group-hover/photos:opacity-100 focus:opacity-100"
          >
            <ChevronLeft size={16} className="text-ink" />
          </button>
          <button
            onClick={(e) => step(e, 1)}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 opacity-0 shadow transition-opacity hover:bg-white group-hover/photos:opacity-100 focus:opacity-100"
          >
            <ChevronRight size={16} className="text-ink" />
          </button>

          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full bg-white transition-all ${
                  i === index ? "w-1.5 opacity-100" : "w-1.5 opacity-60"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
