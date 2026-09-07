"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { bookingsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useLocale } from "@/lib/locale-context";
import EmptyState from "@/components/EmptyState";
import type { Booking } from "@/lib/types";

export default function TripsPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/trips");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    bookingsApi
      .mine()
      .then(setBookings)
      .catch(() => showToast("Couldn't load your trips", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleCancel(id: number) {
    setCancellingId(id);
    try {
      await bookingsApi.cancel(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)));
      showToast("Booking cancelled", "success");
    } catch {
      showToast("Couldn't cancel booking", "error");
    } finally {
      setCancellingId(null);
    }
  }

  if (authLoading || !user || loading) {
    return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-8">Loading...</div>;
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.status === "confirmed" && b.check_out >= today);
  const past = bookings.filter((b) => b.status === "cancelled" || b.check_out < today);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <h1 className="mb-6 text-2xl font-semibold">My Trips</h1>

      {bookings.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={48} strokeWidth={1.2} />}
          title="No trips booked...yet!"
          description="Time to dust off your bags and start planning your next adventure."
          action={
            <Link href="/" className="mt-2 rounded-lg bg-rausch px-5 py-2.5 text-sm font-semibold text-white hover:bg-rausch_dark">
              Start searching
            </Link>
          }
        />
      ) : (
        <div className="space-y-10">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Upcoming</h2>
              <div className="space-y-4">
                {upcoming.map((b) => (
                  <TripCard key={b.id} booking={b} onCancel={() => handleCancel(b.id)} cancelling={cancellingId === b.id} />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Past &amp; cancelled</h2>
              <div className="space-y-4">
                {past.map((b) => (
                  <TripCard key={b.id} booking={b} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function TripCard({ booking, onCancel, cancelling }: { booking: Booking; onCancel?: () => void; cancelling?: boolean }) {
  const { formatPrice } = useLocale();
  return (
    <div className="flex gap-4 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
        {booking.listing.cover_photo_url && (
          <Image src={booking.listing.cover_photo_url} alt={booking.listing.title} fill sizes="128px" className="object-cover" />
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <Link href={`/listing/${booking.listing.id}`} className="font-medium hover:underline">
              {booking.listing.title}
            </Link>
            {booking.status === "cancelled" && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-hof dark:bg-neutral-800 dark:text-neutral-400">
                Cancelled
              </span>
            )}
          </div>
          <p className="text-sm text-hof dark:text-neutral-400">
            {booking.listing.city}, {booking.listing.country}
          </p>
          <p className="text-sm text-hof dark:text-neutral-400">
            {booking.check_in} → {booking.check_out} · {booking.guests_count} guest{booking.guests_count > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <p className="font-semibold">{formatPrice(booking.total_price, { decimals: 2 })}</p>
          {onCancel && booking.status === "confirmed" && (
            <button onClick={onCancel} disabled={cancelling} className="text-sm font-semibold text-rausch underline disabled:opacity-50">
              {cancelling ? "Cancelling..." : "Cancel booking"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
