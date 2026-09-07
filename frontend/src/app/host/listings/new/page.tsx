"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { amenitiesApi, listingsApi } from "@/lib/api";
import ListingForm, { emptyListingForm } from "@/components/ListingForm";
import type { Amenity, ListingFormData } from "@/lib/types";

export default function NewListingPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">Loading…</div>}>
      <NewListingContent />
    </Suspense>
  );
}

function NewListingContent() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill from a location query string (the old address prompt) before
  // sending the host here. Falls back to a blank draft when opened directly.
  const [form, setForm] = useState<ListingFormData>(() => {
    const base = emptyListingForm();
    const city = searchParams.get("city");
    if (!city) return base;
    const num = (key: string) => {
      const v = Number(searchParams.get(key));
      return Number.isFinite(v) ? v : 0;
    };
    return {
      ...base,
      city,
      country: searchParams.get("country") || "",
      neighborhood: searchParams.get("neighborhood") || "",
      latitude: num("latitude"),
      longitude: num("longitude"),
    };
  });

  useEffect(() => {
    if (!authLoading && (!user || !user.is_host)) {
      router.replace("/login?next=/host/listings/new");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    amenitiesApi.list().then(setAmenities).catch(() => setAmenities([]));
  }, []);

  async function handleSubmit() {
    if (!form.city || !form.country) {
      showToast("Please fill in a city and country", "info");
      return;
    }
    setSubmitting(true);
    try {
      const listing = await listingsApi.create(form);
      showToast("Listing published!", "success");
      router.push(`/listing/${listing.id}`);
    } catch {
      showToast("Couldn't create listing. Please check your inputs.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user) {
    return <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <h1 className="mb-2 text-2xl font-semibold">Create a new listing</h1>
      <p className="mb-8 text-sm text-hof dark:text-neutral-400">
        {form.city ? `Publishing in ${form.city}. Fill in the rest below.` : "Fill in the details below to publish your space."}
      </p>
      <ListingForm value={form} amenities={amenities} onChange={setForm} onSubmit={handleSubmit} submitLabel="Publish listing" submitting={submitting} />
    </div>
  );
}
