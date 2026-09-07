"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { amenitiesApi, listingsApi } from "@/lib/api";
import ListingForm from "@/components/ListingForm";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { Amenity, ListingDetail, ListingFormData } from "@/lib/types";

function toFormData(l: ListingDetail): ListingFormData {
  return {
    title: l.title,
    description: l.description,
    property_type: l.property_type,
    bedrooms: l.bedrooms,
    beds: l.beds,
    bathrooms: l.bathrooms,
    max_guests: l.max_guests,
    price_per_night: l.price_per_night,
    cleaning_fee: l.cleaning_fee,
    service_fee_pct: l.service_fee_pct,
    address: l.address,
    neighborhood: l.neighborhood,
    city: l.city,
    state: l.state,
    country: l.country,
    latitude: l.latitude,
    longitude: l.longitude,
    amenity_ids: l.amenities.map((a) => a.id),
    photo_urls: l.photos.sort((a, b) => a.position - b.position).map((p) => p.url),
  };
}

export default function EditListingPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [form, setForm] = useState<ListingFormData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?next=/host/listings/${id}/edit`);
    }
  }, [authLoading, user, router, id]);

  useEffect(() => {
    if (!id) return;
    Promise.all([listingsApi.get(id), amenitiesApi.list()])
      .then(([listing, am]) => {
        setForm(toFormData(listing));
        setAmenities(am);
      })
      .catch(() => showToast("Couldn't load this listing", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit() {
    if (!form) return;
    setSubmitting(true);
    try {
      await listingsApi.update(id, form);
      showToast("Listing updated", "success");
      router.push("/hosting/listings");
    } catch {
      showToast("Couldn't save changes", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await listingsApi.remove(id);
      showToast("Listing deleted", "success");
      router.push("/hosting/listings");
    } catch {
      showToast("Couldn't delete listing", "error");
      setDeleting(false);
    }
  }

  if (authLoading || loading || !form) {
    return <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Edit listing</h1>
          <p className="text-sm text-hof dark:text-neutral-400">Update your listing details below.</p>
        </div>
        <button
          onClick={() => setConfirmOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-rausch px-4 py-2 text-sm font-semibold text-rausch hover:bg-rausch/5"
        >
          <Trash2 size={16} /> Delete
        </button>
      </div>
      <ListingForm value={form} amenities={amenities} onChange={setForm} onSubmit={handleSubmit} submitLabel="Save changes" submitting={submitting} />

      {confirmOpen && (
        <ConfirmDialog
          title="Delete this listing?"
          description="This will permanently remove the listing and cannot be undone."
          confirmLabel="Delete"
          danger
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
