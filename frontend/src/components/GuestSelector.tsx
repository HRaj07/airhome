"use client";

import { Minus, Plus } from "lucide-react";

export default function GuestSelector({
  guests,
  onChange,
  max = 16,
}: {
  guests: number;
  onChange: (n: number) => void;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-medium text-ink dark:text-neutral-100">Guests</p>
        <p className="text-sm text-hof dark:text-neutral-400">How many people are coming?</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Decrease guests"
          disabled={guests <= 1}
          onClick={() => onChange(Math.max(1, guests - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 disabled:opacity-30 dark:border-neutral-600"
        >
          <Minus size={14} />
        </button>
        <span className="w-4 text-center">{guests}</span>
        <button
          type="button"
          aria-label="Increase guests"
          disabled={guests >= max}
          onClick={() => onChange(Math.min(max, guests + 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 disabled:opacity-30 dark:border-neutral-600"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
