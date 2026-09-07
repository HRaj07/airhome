"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DateRangeCalendar from "./DateRangeCalendar";
import GuestSelector from "./GuestSelector";
import StarRating from "./StarRating";
import { formatDateRange, nightsBetween, toISODate } from "@/lib/date";
import { useToast } from "@/lib/toast-context";
import type { ListingDetail } from "@/lib/types";

export default function BookingWidget({ listing }: { listing: ListingDetail }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [guests, setGuests] = useState(1);
  const [datesOpen, setDatesOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const subtotal = nights * listing.price_per_night;
  const serviceFee = subtotal * listing.service_fee_pct;
  const total = subtotal + (nights > 0 ? listing.cleaning_fee : 0) + serviceFee;
  const canReserve = !!checkIn && !!checkOut && nights > 0;

  function handleReserve() {
    if (!canReserve || !checkIn || !checkOut) {
      showToast("Please select your check-in and check-out dates", "info");
      return;
    }
    if (guests > listing.max_guests) {
      showToast(`This place has a maximum of ${listing.max_guests} guests`, "error");
      return;
    }
    const params = new URLSearchParams({
      check_in: toISODate(checkIn),
      check_out: toISODate(checkOut),
      guests: String(guests),
    });
    router.push(`/booking/${listing.id}?${params.toString()}`);
  }

  return (
    <div className="sticky top-24 rounded-2xl border border-neutral-200 p-6 shadow-card dark:border-neutral-800">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-lg">
          <span className="font-semibold">${listing.price_per_night.toFixed(0)}</span>{" "}
          <span className="text-sm text-hof dark:text-neutral-400">night</span>
        </p>
        <StarRating rating={listing.rating_avg} reviewCount={listing.review_count} />
      </div>

      <div className="relative rounded-xl border border-neutral-300 dark:border-neutral-600">
        <button
          type="button"
          onClick={() => {
            setDatesOpen((o) => !o);
            setGuestsOpen(false);
          }}
          className="block w-full border-b border-neutral-300 px-4 py-3 text-left dark:border-neutral-600"
        >
          <span className="block text-[10px] font-semibold uppercase tracking-wide">Dates</span>
          <span className="text-sm">{formatDateRange(checkIn, checkOut)}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setGuestsOpen((o) => !o);
            setDatesOpen(false);
          }}
          className="block w-full px-4 py-3 text-left"
        >
          <span className="block text-[10px] font-semibold uppercase tracking-wide">Guests</span>
          <span className="text-sm">
            {guests} guest{guests > 1 ? "s" : ""}
          </span>
        </button>

        {datesOpen && (
          <div className="absolute left-0 top-full z-20 mt-2 w-[320px] rounded-2xl border border-neutral-200 bg-white p-4 shadow-popover dark:border-neutral-700 dark:bg-neutral-900 sm:w-[360px]">
            <DateRangeCalendar
              checkIn={checkIn}
              checkOut={checkOut}
              blockedDates={listing.blocked_dates}
              monthsToShow={1}
              onChange={(a, b) => {
                setCheckIn(a);
                setCheckOut(b);
                if (a && b) setDatesOpen(false);
              }}
            />
          </div>
        )}
        {guestsOpen && (
          <div className="absolute left-0 top-full z-20 mt-2 w-[300px] rounded-2xl border border-neutral-200 bg-white p-4 shadow-popover dark:border-neutral-700 dark:bg-neutral-900">
            <GuestSelector guests={guests} onChange={setGuests} max={listing.max_guests} />
            <p className="mt-2 text-xs text-hof dark:text-neutral-400">Max {listing.max_guests} guests</p>
          </div>
        )}
      </div>

      <button
        onClick={handleReserve}
        className="mt-4 w-full rounded-xl bg-rausch py-3 font-semibold text-white transition-colors hover:bg-rausch_dark"
      >
        Reserve
      </button>
      <p className="mt-2 text-center text-xs text-hof dark:text-neutral-400">You won&apos;t be charged yet</p>

      {nights > 0 && (
        <div className="mt-6 space-y-3 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800">
          <div className="flex justify-between">
            <span className="underline">
              ${listing.price_per_night.toFixed(0)} x {nights} night{nights !== 1 ? "s" : ""}
            </span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {listing.cleaning_fee > 0 && (
            <div className="flex justify-between">
              <span className="underline">Cleaning fee</span>
              <span>${listing.cleaning_fee.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="underline">Service fee</span>
            <span>${serviceFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-neutral-200 pt-3 font-semibold dark:border-neutral-800">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
