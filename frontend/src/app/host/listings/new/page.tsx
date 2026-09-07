"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { amenitiesApi, listingsApi } from "@/lib/api";
import ListingForm, { emptyListingForm } from "@/components/ListingForm";
import type { Amenity, ListingFormData } from "@/lib/types";

export default function NewListingPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [form, setForm] = useState<ListingFormData>(emptyListingForm());
  const [submitting, setSubmitting] = useState(false);

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
      <p className="mb-8 text-sm text-hof dark:text-neutral-400">Fill in the details below to publish your space.</p>
      <ListingForm value={form} amenities={amenities} onChange={setForm} onSubmit={handleSubmit} submitLabel="Publish listing" submitting={submitting} />
    </div>
  );
}
