"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Airbnb-style horizontal carousel row: a title that links somewhere, prev/next
 * arrow buttons on the right, and a snap-scrolling track of cards.
 */
export default function Carousel({ title, href, children, itemCount }: { title: string; href: string; children: ReactNode; itemCount: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    function update() {
      if (!el) return;
      setCanPrev(el.scrollLeft > 4);
      setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [itemCount]);

  function scrollTrack(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  }

  const arrowClass = (enabled: boolean) =>
    `flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white transition-opacity dark:border-neutral-700 dark:bg-neutral-900 ${
      enabled ? "hover:shadow-md" : "cursor-default opacity-30"
    }`;

  return (
    <section className="py-3">
      <div className="mb-3 flex items-center justify-between">
        <Link href={href} className="group flex items-center gap-2">
          <h2 className="text-[22px] font-semibold tracking-tight">{title}</h2>
          <span className="flex h-7 w-7 items-center justify-center rounded-full transition-colors group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800">
            <ChevronRight size={18} />
          </span>
        </Link>
        <div className="hidden items-center gap-2 sm:flex">
          <button onClick={() => scrollTrack(-1)} disabled={!canPrev} aria-label="Scroll left" className={arrowClass(canPrev)}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => scrollTrack(1)} disabled={!canNext} aria-label="Scroll right" className={arrowClass(canNext)}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div ref={trackRef} className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-0 sm:px-0">
        {children}
      </div>
    </section>
  );
}
