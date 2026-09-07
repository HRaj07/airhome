"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { hostApi } from "@/lib/api";
import { useLocale } from "@/lib/locale-context";
import { formatDateRangeCompact, fromISODate } from "@/lib/date";
import type { HostReservation, HostReservations } from "@/lib/types";

type Filter = "upcoming" | "completed" | "cancelled" | "all";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

/** /hosting/reservations — Airbnb's reservations table with its four filters. */
export default function ReservationsPage() {
  const { formatPrice } = useLocale();
  const [data, setData] = useState<HostReservations | null>(null);
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    hostApi.reservations().then(setData).catch(() => setData(null)).finally(() => setLoaded(true));
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const today = new Date().toISOString().slice(0, 10);
    return data.all.filter((r) => {
      if (filter === "all") return true;
      if (filter === "cancelled") return r.status !== "confirmed";
      if (r.status !== "confirmed") return false;
      const end = r.kind === "home" ? r.check_out : r.check_in;
      return filter === "upcoming" ? end >= today : end < today;
    });
  }, [data, filter]);

  function when(r: HostReservation) {
    const a = fromISODate(r.check_in);
    return r.kind === "home" ? formatDateRangeCompact(a, fromISODate(r.check_out)) : a.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10 lg:px-10">
      <h1 className="text-3xl font-semibold">Reservations</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              filter === f.key ? "border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink" : "border-neutral-300 hover:border-ink dark:border-neutral-700 dark:hover:border-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-hof dark:bg-neutral-900 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Guest</th>
              <th className="px-4 py-3 font-medium">Dates</th>
              <th className="px-4 py-3 font-medium">Listing</th>
              <th className="px-4 py-3 font-medium">Booked</th>
              <th className="px-4 py-3 text-right font-medium">Guest paid</th>
              <th className="px-4 py-3 text-right font-medium">Your payout</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {!loaded ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-hof">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center text-hof dark:text-neutral-400">
                  No {filter === "all" ? "" : filter} reservations to show.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={`${r.kind}-${r.id}`} className="hover:bg-neutral-50 dark:hover:bg-neutral-900">
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.status === "confirmed" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-neutral-100 text-hof dark:bg-neutral-800"}`}>
                      {r.status === "confirmed" ? "Confirmed" : "Cancelled"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/users/${r.guest_id}`} className="font-medium hover:underline">
                      {r.guest_name}
                    </Link>
                    <p className="text-xs text-hof dark:text-neutral-400">
                      {r.guests_count} guest{r.guests_count === 1 ? "" : "s"}
                    </p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{when(r)}</td>
                  <td className="max-w-[240px] truncate px-4 py-3">
                    {r.listing_title}
                    <p className="text-xs capitalize text-hof dark:text-neutral-400">{r.kind}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-hof dark:text-neutral-400">{fromISODate(r.created_at.slice(0, 10)).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatPrice(r.total_price, { decimals: 0 })}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{r.status === "confirmed" ? formatPrice(r.host_payout, { decimals: 0 }) : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
