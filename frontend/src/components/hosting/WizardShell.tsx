"use client";

import Link from "next/link";
import { Home as HomeIcon } from "lucide-react";
import { PHASES, phaseProgress, type WizardStep } from "@/lib/hosting";

/**
 * The frame every "Become a host" step sits in, copied from Airbnb's wizard:
 * a bare header (logo, "Questions?", "Save & exit"), the step in the middle,
 * and a footer with a three-segment progress bar and Back / Next.
 */
export default function WizardShell({
  step,
  children,
  onBack,
  onNext,
  nextLabel = "Next",
  nextDisabled = false,
  saving = false,
  onSaveAndExit,
  hideFooter = false,
  wide = false,
}: {
  step: WizardStep;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  saving?: boolean;
  onSaveAndExit?: () => void;
  hideFooter?: boolean;
  wide?: boolean;
}) {
  const progress = phaseProgress(step);

  return (
    <div className="flex min-h-screen flex-col bg-white text-ink dark:bg-neutral-950 dark:text-white">
      <header className="flex h-20 items-center justify-between px-6 sm:px-10 lg:px-14">
        <Link href="/" className="flex items-center text-rausch" aria-label="airhome home">
          <HomeIcon size={30} strokeWidth={2.4} />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/help"
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Questions?
          </Link>
          <button
            type="button"
            onClick={onSaveAndExit}
            disabled={saving}
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Save &amp; exit
          </button>
        </div>
      </header>

      <main className={`mx-auto flex w-full flex-1 flex-col px-6 pb-32 pt-6 sm:px-10 ${wide ? "max-w-5xl" : "max-w-2xl"}`}>
        {children}
      </main>

      {!hideFooter && (
        <footer className="fixed inset-x-0 bottom-0 z-40 bg-white dark:bg-neutral-950">
          <div className="flex gap-1.5 px-0" aria-hidden="true">
            {PHASES.map((phase, i) => (
              <div key={phase.title} className="h-1.5 flex-1 overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-full bg-ink transition-[width] duration-500 dark:bg-white"
                  style={{ width: `${Math.round(progress[i] * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-6 py-4 sm:px-10 lg:px-14">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                disabled={saving}
                className="rounded-lg px-3 py-2 text-base font-semibold underline underline-offset-2 hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-800"
              >
                Back
              </button>
            ) : (
              <span />
            )}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                disabled={nextDisabled || saving}
                className="rounded-lg bg-ink px-8 py-3.5 text-base font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-30 dark:bg-white dark:text-ink"
              >
                {saving ? "Saving…" : nextLabel}
              </button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

/** The three "Step N" interstitials Airbnb shows at the start of each phase. */
export function PhaseIntro({ number, title, body, emoji }: { number: number; title: string; body: string; emoji: string }) {
  return (
    <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <p className="text-lg font-medium">Step {number}</p>
        <h1 className="mt-3 text-4xl font-medium leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-6 text-lg leading-relaxed text-ink dark:text-neutral-300">{body}</p>
      </div>
      <div className="flex justify-center">
        <div className="grid h-72 w-72 place-items-center rounded-3xl bg-[#f7f7f7] text-[9rem] leading-none dark:bg-neutral-900 sm:h-96 sm:w-96 sm:text-[12rem]" aria-hidden="true">
          {emoji}
        </div>
      </div>
    </div>
  );
}

/** The step heading Airbnb uses above every question. */
export function StepHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-medium leading-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-lg text-hof dark:text-neutral-400">{subtitle}</p>}
    </div>
  );
}

/** The +/− rows on the floor-plan step. */
export function Counter({
  label,
  value,
  min = 0,
  max = 50,
  step = 1,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const btn =
    "grid h-8 w-8 place-items-center rounded-full border border-neutral-400 text-hof transition hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 dark:border-neutral-600 dark:hover:border-white dark:hover:text-white";
  return (
    <div className="flex items-center justify-between border-b border-neutral-200 py-6 last:border-b-0 dark:border-neutral-800">
      <span className="text-lg">{label}</span>
      <div className="flex items-center gap-4">
        <button type="button" className={btn} onClick={() => onChange(Math.max(min, +(value - step).toFixed(1)))} disabled={value <= min} aria-label={`Decrease ${label}`}>
          −
        </button>
        <span className="w-8 text-center text-lg tabular-nums">{format ? format(value) : value}</span>
        <button type="button" className={btn} onClick={() => onChange(Math.min(max, +(value + step).toFixed(1)))} disabled={value >= max} aria-label={`Increase ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}

/** A selectable tile: the structure types, amenities and highlights all use it. */
export function Tile({
  selected,
  onClick,
  children,
  className = "",
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-xl border bg-white p-4 text-left transition dark:bg-neutral-900 ${
        selected
          ? "border-2 border-ink bg-neutral-50 dark:border-white dark:bg-neutral-800"
          : "border-neutral-300 hover:border-ink dark:border-neutral-700 dark:hover:border-white"
      } ${className}`}
    >
      {children}
    </button>
  );
}
