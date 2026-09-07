"use client";

import { nextStep, prevStep, type WizardStep } from "@/lib/hosting";
import type { ListingDetail, ListingDraftUpdate } from "@/lib/types";

/** Where a step can send the guest next: on through the wizard, or out of it. */
export type WizardDestination = WizardStep | "exit" | "published" | null;

/** What the wizard page hands every step. */
export interface StepProps {
  listing: ListingDetail;
  saving: boolean;
  step: WizardStep;
  /** Persist this step's fields, then navigate. */
  onSave: (patch: ListingDraftUpdate, to: WizardDestination) => Promise<void>;
}

/**
 * Wires a step's own draft state into the shell's Back / Next / Save & exit,
 * so each step only has to say *what* it collects and when it is complete.
 *
 * `patch` is a function rather than a value because it is read at click time,
 * after the step's local state has settled.
 */
export function useStepNav(props: StepProps, patch: () => ListingDraftUpdate, canProceed = true) {
  const { step, onSave, saving } = props;
  const back = prevStep(step);
  const next = nextStep(step);
  return {
    step,
    saving,
    onBack: back ? () => onSave(patch(), back) : undefined,
    onNext: next ? () => onSave(patch(), next) : undefined,
    onSaveAndExit: () => onSave(patch(), "exit"),
    nextDisabled: !canProceed,
  };
}

/** Shared input styling, so the location and photo steps stay in step. */
export const FIELD_CLASS =
  "w-full rounded-lg border border-neutral-400 px-4 py-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900 dark:focus:border-white";
