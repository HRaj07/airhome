"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";
import { formatDateRangeCompact, fromISODate } from "@/lib/date";
import type { HostReservation } from "@/lib/types";

/** One reservation as Airbnb's Today page shows it: the guest, the dates, the payout. */
export default function ReservationCard({ r, bucket }: { r: HostReservation; bucket?: string }) {
  const { formatPrice } = useLocale();
  const checkIn = fromISODate(r.check_in);
  const checkOut = fromISODate(r.check_out);
  const when = r.kind === "home" ? formatDateRangeCompact(checkIn, checkOut) : checkIn.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const status =
    r.status !== "confirmed"
      ? "Cancelled"
      : bucket === "checking_out"
        ? "Checking out today"
        : bucket === "currently_hosting"
          ? "Currently hosting"
          : bucket === "arriving_soon"
            ? "Arriving soon"
            : bucket === "pending_review"
              ? "Review your guest"
              : "Confirmed";
  const detailHref = r.kind === "home" ? `/listing/${r.listing_id}` : r.kind === "experience" ? `/experiences/${r.listing_id}` : `/services/${r.listing_id}`;

  return (
    <div className="flex flex-col rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <p className={`text-xs font-semibold ${r.status !== "confirmed" ? "text-hof" : "text-rausch"}`}>{status}</p>
      <div className="mt-3 flex items-center gap-3">
        <Link href={`/users/${r.guest_id}`} className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-200 text-lg font-semibold dark:bg-neutral-800" aria-label={r.guest_name}>
          {r.guest_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.guest_avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            r.guest_name.charAt(0)
          )}
        </Link>
        <div className="min-w-0">
          <p className="truncate font-medium">{r.guest_name}</p>
          <p className="text-sm text-hof dark:text-neutral-400">
            {r.guests_count} guest{r.guests_count === 1 ? "" : "s"}
            {r.kind === "home" ? ` · ${r.nights} night${r.nights === 1 ? "" : "s"}` : r.kind === "experience" ? " · Experience" : " · Service"}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
          {r.cover_photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.cover_photo_url} alt="" className="h-full w-full object-cover" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <Link href={detailHref} className="block truncate text-sm font-medium hover:underline">
            {r.listing_title}
          </Link>
          <p className="text-sm text-hof dark:text-neutral-400">{when}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{formatPrice(r.host_payout, { decimals: 0 })}</p>
          <p className="text-xs text-hof dark:text-neutral-400">payout</p>
        </div>
      </div>
    </div>
  );
}
