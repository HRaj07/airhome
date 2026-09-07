"use client";

/** Placeholder rows shown while carousel data loads. */
export default function RowsSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse py-3">
          <div className="mb-4 h-6 w-64 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 7 }).map((_, j) => (
              <div key={j} className="w-[232px] shrink-0">
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
