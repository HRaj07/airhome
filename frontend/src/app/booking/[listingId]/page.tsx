"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, CreditCard } from "lucide-react";
import PriceBreakdown from "@/components/PriceBreakdown";
import { bookingsApi, listingsApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useLocale } from "@/lib/locale-context";
import { fromISODate, nightsBetween, formatShort } from "@/lib/date";
import type { Booking, ListingDetail } from "@/lib/types";

export default function BookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { formatPrice } = useLocale();

  const listingId = params?.listingId as string;
  const checkInISO = searchParams.get("check_in") || "";
  const checkOutISO = searchParams.get("check_out") || "";
  const guests = Number(searchParams.get("guests")) || 1;

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "", name: "" });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!listingId) return;
    listingsApi
      .get(listingId)
      .then(setListing)
      .catch(() => showToast("Couldn't load this listing", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  const checkIn = checkInISO ? fromISODate(checkInISO) : null;
  const checkOut = checkOutISO ? fromISODate(checkOutISO) : null;
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;

  const pricing = useMemo(() => {
    if (!listing || nights <= 0) return null;
    const subtotal = nights * listing.price_per_night;
    const serviceFee = subtotal * listing.service_fee_pct;
    const total = subtotal + listing.cleaning_fee + serviceFee;
    return { subtotal, serviceFee, total };
  }, [listing, nights]);

  const cardValid = card.number.replace(/\s/g, "").length >= 12 && card.expiry.length >= 4 && card.cvc.length >= 3 && card.name.trim().length > 1;

  async function handleConfirm() {
    if (!listing || !checkIn || !checkOut) return;
    if (!cardValid) {
      showToast("Please fill in mock payment details to continue", "info");
      return;
    }
    setSubmitting(true);
    try {
      const booking = await bookingsApi.create({
        listing_id: listing.id,
        check_in: checkInISO,
        check_out: checkOutISO,
        guests_count: guests,
      });
      setConfirmedBooking(booking);
      showToast("Booking confirmed!", "success");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        showToast("Those dates were just booked by someone else. Please pick different dates.", "error");
      } else if (e instanceof ApiError) {
        showToast(e.message, "error");
      } else {
        showToast("Something went wrong confirming your booking", "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">Loading...</div>;
  }

  if (!listing) {
    return <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">Listing not found.</div>;
  }

  if (!checkIn || !checkOut || nights <= 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-8">
        <p className="mb-4">Please choose your dates from the listing page first.</p>
        <button onClick={() => router.push(`/listing/${listing.id}`)} className="rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-ink">
          Back to listing
        </button>
      </div>
    );
  }

  if (confirmedBooking) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-8">
        <CheckCircle2 size={56} className="mx-auto mb-4 text-green-600" />
        <h1 className="text-2xl font-semibold">Booking confirmed!</h1>
        <p className="mt-2 text-hof dark:text-neutral-400">
          Your stay at {listing.title} from {formatShort(checkIn)} to {formatShort(checkOut)} is booked.
        </p>
        <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-neutral-200 p-5 text-left dark:border-neutral-800">
          <p className="text-sm text-hof dark:text-neutral-400">Confirmation #{confirmedBooking.id}</p>
          <p className="mt-1 font-semibold">{confirmedBooking.listing.title}</p>
          <p className="text-sm text-hof dark:text-neutral-400">
            {confirmedBooking.check_in} → {confirmedBooking.check_out} · {confirmedBooking.guests_count} guest
            {confirmedBooking.guests_count > 1 ? "s" : ""}
          </p>
          <p className="mt-2 font-semibold">{formatPrice(confirmedBooking.total_price, { decimals: 2 })} total</p>
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={() => router.push("/trips")} className="rounded-lg bg-rausch px-5 py-2.5 text-sm font-semibold text-white hover:bg-rausch_dark">
            View My Trips
          </button>
          <button onClick={() => router.push("/")} className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-semibold dark:border-neutral-700">
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <h1 className="mb-6 text-2xl font-semibold">Confirm and pay</h1>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <section className="border-b border-neutral-200 pb-6 dark:border-neutral-800">
            <h2 className="mb-4 text-lg font-semibold">Your trip</h2>
            <div className="flex justify-between">
              <div>
                <p className="font-medium">Dates</p>
                <p className="text-sm text-hof dark:text-neutral-400">
                  {formatShort(checkIn)} - {formatShort(checkOut)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-between">
              <div>
                <p className="font-medium">Guests</p>
                <p className="text-sm text-hof dark:text-neutral-400">
                  {guests} guest{guests > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </section>

          <section className="py-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <CreditCard size={20} /> Payment (mocked — no real charge)
            </h2>
            <div className="space-y-3">
              <input
                placeholder="Card number"
                value={card.number}
                onChange={(e) => setCard({ ...card, number: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
              />
              <div className="flex gap-3">
                <input
                  placeholder="MM/YY"
                  value={card.expiry}
                  onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                  className="w-1/2 rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
                />
                <input
                  placeholder="CVC"
                  value={card.cvc}
                  onChange={(e) => setCard({ ...card, cvc: e.target.value })}
                  className="w-1/2 rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
                />
              </div>
              <input
                placeholder="Name on card"
                value={card.name}
                onChange={(e) => setCard({ ...card, name: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
              />
              <p className="text-xs text-hof dark:text-neutral-400">
                This is a mocked checkout for demo purposes. No real payment will be processed.
              </p>
            </div>
          </section>
        </div>

        <div>
          <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
            <div className="flex gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800">
              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
                {listing.cover_photo_url && <Image src={listing.cover_photo_url} alt={listing.title} fill sizes="80px" className="object-cover" />}
              </div>
              <div>
                <p className="text-sm font-medium">{listing.title}</p>
                <p className="text-xs text-hof dark:text-neutral-400">
                  {listing.city}, {listing.country}
                </p>
              </div>
            </div>
            <div className="py-4">
              <h3 className="mb-3 font-semibold">Price details</h3>
              {pricing && (
                <PriceBreakdown
                  nights={nights}
                  pricePerNight={listing.price_per_night}
                  cleaningFee={listing.cleaning_fee}
                  serviceFee={pricing.serviceFee}
                  subtotal={pricing.subtotal}
                  total={pricing.total}
                />
              )}
            </div>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full rounded-xl bg-rausch py-3 font-semibold text-white transition-colors hover:bg-rausch_dark disabled:opacity-50"
            >
              {submitting ? "Confirming..." : "Confirm and pay"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
