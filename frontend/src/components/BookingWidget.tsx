"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DateRangeCalendar from "./DateRangeCalendar";
import GuestSelector from "./GuestSelector";
import StarRating from "./StarRating";
import PriceBreakdown from "./PriceBreakdown";
import { formatShort, nightsBetween, toISODate } from "@/lib/date";
import { useToast } from "@/lib/toast-context";
import { useLocale } from "@/lib/locale-context";
import type { ListingDetail } from "@/lib/types";

export default function BookingWidget({ listing }: { listing: ListingDetail }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { formatPrice } = useLocale();
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
      setDatesOpen(true);
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
    <div className="sticky top-28 rounded-2xl border border-neutral-200 p-6 shadow-card dark:border-neutral-800">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-[22px]">
          <span className="font-semibold">{formatPrice(listing.price_per_night)}</span>{" "}
          <span className="text-base text-hof dark:text-neutral-400">night</span>
        </p>
        <StarRating rating={listing.rating_avg} reviewCount={listing.review_count} />
      </div>

      <div className="relative rounded-xl border border-neutral-400 dark:border-neutral-600">
        <div className="grid grid-cols-2 divide-x divide-neutral-400 border-b border-neutral-400 dark:divide-neutral-600 dark:border-neutral-600">
          <button
            type="button"
            onClick={() => {
              setDatesOpen((o) => !o);
              setGuestsOpen(false);
            }}
            className="px-3 py-2.5 text-left"
          >
            <span className="block text-[10px] font-bold uppercase tracking-wide">Check-in</span>
            <span className="text-sm">{checkIn ? formatShort(checkIn) : "Add date"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDatesOpen((o) => !o);
              setGuestsOpen(false);
            }}
            className="px-3 py-2.5 text-left"
          >
            <span className="block text-[10px] font-bold uppercase tracking-wide">Checkout</span>
            <span className="text-sm">{checkOut ? formatShort(checkOut) : "Add date"}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setGuestsOpen((o) => !o);
            setDatesOpen(false);
          }}
          className="block w-full px-3 py-2.5 text-left"
        >
          <span className="block text-[10px] font-bold uppercase tracking-wide">Guests</span>
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
            <p className="mt-2 text-xs text-hof dark:text-neutral-400">This place has a maximum of {listing.max_guests} guests.</p>
          </div>
        )}
      </div>

      <button
        onClick={handleReserve}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#E61E4D] via-[#E31C5F] to-[#D70466] py-3.5 font-semibold text-white transition-opacity hover:opacity-90"
      >
        {canReserve ? "Reserve" : "Check availability"}
      </button>
      {canReserve && <p className="mt-3 text-center text-sm text-hof dark:text-neutral-400">You won&apos;t be charged yet</p>}

      {nights > 0 && (
        <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <PriceBreakdown
            nights={nights}
            pricePerNight={listing.price_per_night}
            cleaningFee={listing.cleaning_fee}
            serviceFee={serviceFee}
            subtotal={subtotal}
            total={total}
          />
        </div>
      )}
    </div>
  );
}
