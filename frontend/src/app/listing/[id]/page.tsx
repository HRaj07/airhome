"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Star, MapPin, Users, BedDouble, Bath, DoorClosed } from "lucide-react";
import PhotoGallery from "@/components/PhotoGallery";
import HostCard from "@/components/HostCard";
import ReviewsSection from "@/components/ReviewsSection";
import AmenityIcon from "@/components/AmenityIcon";
import MapEmbed from "@/components/MapEmbed";
import BookingWidget from "@/components/BookingWidget";
import WriteReviewForm from "@/components/WriteReviewForm";
import { listingsApi, reviewsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ListingDetail, Review } from "@/lib/types";
import { PROPERTY_TYPE_LABELS } from "@/lib/types";

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params?.id as string;

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([listingsApi.get(id), reviewsApi.list(id)])
      .then(([l, r]) => {
        setListing(l);
        setReviews(r);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  async function refreshReviews() {
    if (!id) return;
    const [l, r] = await Promise.all([listingsApi.get(id), reviewsApi.list(id)]);
    setListing(l);
    setReviews(r);
  }

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">Loading listing...</div>;
  }

  if (notFound || !listing) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-8">
        <h1 className="mb-2 text-xl font-semibold">Listing not found</h1>
        <button onClick={() => router.push("/")} className="text-rausch underline">
          Back to search
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">{listing.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        <span className="flex items-center gap-1">
          <Star size={14} className="fill-current" />
          {listing.review_count > 0 ? listing.rating_avg.toFixed(1) : "New"}
          {listing.review_count > 0 && <span className="text-hof dark:text-neutral-400">({listing.review_count} reviews)</span>}
        </span>
        <span className="text-hof dark:text-neutral-400">·</span>
        <span className="flex items-center gap-1 text-hof dark:text-neutral-400">
          <MapPin size={14} />
          {listing.city}, {listing.country}
        </span>
      </div>

      <div className="mt-6">
        <PhotoGallery photos={listing.photos} title={listing.title} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="border-b border-neutral-200 pb-6 dark:border-neutral-800">
            <h2 className="text-xl font-semibold">
              {PROPERTY_TYPE_LABELS[listing.property_type]} hosted by {listing.host.full_name}
            </h2>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-hof dark:text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Users size={16} /> {listing.max_guests} guests
              </span>
              <span className="flex items-center gap-1.5">
                <DoorClosed size={16} /> {listing.bedrooms} bedroom{listing.bedrooms !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <BedDouble size={16} /> {listing.beds} bed{listing.beds !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <Bath size={16} /> {listing.bathrooms} bath{listing.bathrooms !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="border-b border-neutral-200 py-6 dark:border-neutral-800">
            <p className="whitespace-pre-line text-ink dark:text-neutral-200">{listing.description}</p>
          </div>

          <div className="border-b border-neutral-200 py-6 dark:border-neutral-800">
            <h2 className="mb-4 text-xl font-semibold">What this place offers</h2>
            <div className="grid grid-cols-2 gap-4">
              {listing.amenities.map((a) => (
                <div key={a.id} className="flex items-center gap-3 text-sm">
                  <AmenityIcon icon={a.icon} />
                  {a.name}
                </div>
              ))}
            </div>
          </div>

          <div className="border-b border-neutral-200 py-6 dark:border-neutral-800">
            <h2 className="mb-4 text-xl font-semibold">Where you&apos;ll be</h2>
            <MapEmbed latitude={listing.latitude} longitude={listing.longitude} label={listing.title} />
            <p className="mt-3 text-sm text-hof dark:text-neutral-400">
              {listing.city}, {listing.state ? `${listing.state}, ` : ""}
              {listing.country}
            </p>
          </div>

          <ReviewsSection reviews={reviews} ratingAvg={listing.rating_avg} />

          {user && (
            <div className="py-8">
              <WriteReviewForm listingId={listing.id} onSubmitted={refreshReviews} />
            </div>
          )}

          <div className="py-6">
            <HostCard host={listing.host} />
          </div>
        </div>

        <div>
          <BookingWidget listing={listing} />
        </div>
      </div>
    </div>
  );
}
