"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import type { ExperienceKind } from "@/lib/types";

export interface CategoryOption {
  /** Stored on the row and shown on cards, so it must match the seeded vocabulary. */
  value: string;
  label: string;
  emoji: string;
}

/**
 * Airbnb's second host step: a grid of category cards under a single question
 * ("What experience will you offer to guests?" / "What service will you
 * provide?"). Picking one goes straight to the form — Airbnb has no Next
 * button on this screen, the card itself is the action.
 */
export default function CategoryChooser({
  kind,
  heading,
  options,
}: {
  kind: ExperienceKind;
  heading: string;
  options: CategoryOption[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useLocale();

  const next = kind === "service" ? "/setup/services/create" : "/setup/experiences/create";
  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${next}`);
  }, [loading, user, router, next]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-12 flex justify-end">
        <Link
          href="/"
          className="rounded-full bg-neutral-100 px-5 py-2.5 text-sm font-medium hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
        >
          {t("Back")}
        </Link>
      </div>

      <h1 className="mx-auto mb-14 max-w-2xl text-center text-3xl font-semibold leading-tight sm:text-4xl">
        {t(heading)}
      </h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() =>
              router.push(
                `/host/experiences/new?kind=${kind}&category=${encodeURIComponent(option.value)}`
              )
            }
            className="flex aspect-square flex-col items-center justify-center gap-4 rounded-2xl border border-neutral-300 bg-white p-4 text-center transition-all hover:border-neutral-400 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-500"
          >
            <span className="text-5xl" aria-hidden>
              {option.emoji}
            </span>
            <span className="text-sm font-medium leading-snug">{t(option.label)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
