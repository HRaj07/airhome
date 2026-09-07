"use client";

/** Placeholder rows shown while carousel data loads. */
export default function RowsSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse py-3">
          <div className="mb-4 h-6 w-64 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 7 }).map((_, j) => (
              <div key={j} className="w-[70%] shrink-0 sm:w-[calc((100%_-_24px)/3)] md:w-[calc((100%_-_36px)/4)] lg:w-[calc((100%_-_48px)/5)] xl:w-[calc((100%_-_60px)/6)] min-[1440px]:w-[calc((100%_-_72px)/7)]">
                <div className="aspect-[1/0.95] rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
                <div className="mt-3 h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="mt-2 h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
