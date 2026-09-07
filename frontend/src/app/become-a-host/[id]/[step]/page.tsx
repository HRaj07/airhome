"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { listingsApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { isWizardStep, wizardHref, type WizardStep } from "@/lib/hosting";
import type { ListingDetail, ListingDraftUpdate } from "@/lib/types";
import type { WizardDestination } from "@/components/hosting/steps/common";
import { Intro, Structure, PrivacyType, Location, FloorPlan } from "@/components/hosting/steps/PlaceSteps";
import { Amenities, Photos, Title, Description } from "@/components/hosting/steps/StandOutSteps";
import {
  BookingSettings,
  Visibility,
  Price,
  Discounts,
  Legal,
  Receipt,
  Published,
} from "@/components/hosting/steps/PublishSteps";

/**
 * /become-a-host/[id]/[step] — Airbnb's listing wizard, one URL per step.
 *
 * This page owns only the three things every step shares: loading the draft,
 * saving a step's fields, and deciding which step to render. Each step lives in
 * `components/hosting/steps/`, grouped by the phase it belongs to.
 *
 * The draft exists on the server from the first click, so every step saves its
 * own fields with PATCH /listings/{id}/draft along with the step to resume at.
 * Refresh, close the tab, come back next week: the listing opens where you left
 * it. The extra "published" route is the celebration screen.
 */
export default function BecomeAHostStepPage() {
  const params = useParams<{ id: string; step: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const id = params.id;
  const stepParam = params.step;

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace(`/login?next=/become-a-host/${id}/${stepParam}`);
  }, [authLoading, user, router, id, stepParam]);

  useEffect(() => {
    if (!user) return;
    listingsApi
      .get(id)
      .then(setListing)
      .catch((e: unknown) =>
        setError(e instanceof ApiError && e.status === 404 ? "We couldn't find that listing." : "Couldn't load your listing.")
      );
  }, [id, user]);

  const step: WizardStep | "published" | null =
    stepParam === "published" ? "published" : isWizardStep(stepParam) ? stepParam : null;

  /** Save this step's fields and move on (or stay put, for Save & exit). */
  const save = useCallback(
    async (patch: ListingDraftUpdate, to: WizardDestination) => {
      if (!listing) return;
      setSaving(true);
      try {
        const nextWizardStep = to && to !== "exit" && to !== "published" ? to : undefined;
        const body: ListingDraftUpdate = { ...patch };
        // Only a draft remembers where to resume; editing a live listing shouldn't.
        if (nextWizardStep && listing.status === "draft") body.wizard_step = nextWizardStep;
        const updated = Object.keys(body).length > 0 ? await listingsApi.updateDraft(listing.id, body) : listing;
        setListing(updated);
        if (to === "exit") router.push("/hosting/listings");
        else if (to === "published") router.push(`/become-a-host/${listing.id}/published`);
        else if (to) router.push(wizardHref(listing.id, to));
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Couldn't save that step", "error");
      } finally {
        setSaving(false);
      }
    },
    [listing, router, showToast]
  );

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">{error}</h1>
        <Link href="/hosting/listings" className="mt-6 inline-block rounded-lg bg-ink px-6 py-3 font-semibold text-white dark:bg-white dark:text-ink">
          Go to your listings
        </Link>
      </div>
    );
  }
  if (!step) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">That step doesn&apos;t exist.</h1>
        <Link href={wizardHref(id, "about-your-place")} className="mt-6 inline-block underline">
          Start from the beginning
        </Link>
      </div>
    );
  }
  if (!listing || authLoading) {
    return <div className="grid min-h-screen place-items-center text-hof">Loading your listing…</div>;
  }
  if (step === "published") return <Published listing={listing} />;

  const common = { listing, saving, onSave: save, step };

  switch (step) {
    case "about-your-place":
      return (
        <Intro
          {...common}
          number={1}
          title="Tell us about your place"
          body="In this step, we'll ask you which type of property you have and if guests will book the entire place or just a room. Then let us know the location and how many guests can stay."
          emoji="🏠"
        />
      );
    case "structure":
      return <Structure {...common} />;
    case "privacy-type":
      return <PrivacyType {...common} />;
    case "location":
      return <Location {...common} />;
    case "floor-plan":
      return <FloorPlan {...common} />;
    case "stand-out":
      return (
        <Intro
          {...common}
          number={2}
          title="Make your place stand out"
          body="In this step, you'll add some of the amenities your place offers, plus 5 or more photos. Then you'll create a title and description."
          emoji="🛋️"
        />
      );
    case "amenities":
      return <Amenities {...common} />;
    case "photos":
      return <Photos {...common} />;
    case "title":
      return <Title {...common} />;
    case "description":
      return <Description {...common} />;
    case "finish-setup":
      return (
        <Intro
          {...common}
          number={3}
          title="Finish up and publish"
          body="Finally, you'll choose booking settings, set up pricing and publish your listing."
          emoji="🎉"
        />
      );
    case "booking-settings":
      return <BookingSettings {...common} />;
    case "visibility":
      return <Visibility {...common} />;
    case "price":
      return <Price {...common} weekend={false} />;
    case "weekend-price":
      return <Price {...common} weekend />;
    case "discounts":
      return <Discounts {...common} />;
    case "legal":
      return <Legal {...common} />;
    case "receipt":
      return <Receipt {...common} />;
  }
}
