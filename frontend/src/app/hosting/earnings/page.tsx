"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { hostApi } from "@/lib/api";
import { useLocale } from "@/lib/locale-context";
import { fromISODate } from "@/lib/date";
import type { HostEarnings } from "@/lib/types";

/**
 * /hosting/earnings — Airbnb's earnings page: the year's headline number, a
 * month-by-month chart of paid vs upcoming payouts, the summary tiles and the
 * transaction history with the host service fee shown on every line.
 */
export default function EarningsPage() {
  const { formatPrice } = useLocale();
  const [data, setData] = useState<HostEarnings | null>(null);
  const [year, setYear] = useState<number | undefined>(undefined);
  const [filter, setFilter] = useState<"all" | "paid" | "upcoming">("all");
  const [error, setError] = useState(false);

  useEffect(() => {
    hostApi
      .earnings(year)
      .then(setData)
      .catch(() => setError(true));
  }, [year]);

  if (error) return <div className="p-10 text-center text-hof">Couldn&apos;t load your earnings.</div>;
  if (!data) return <div className="p-10 text-center text-hof">Loading earnings…</div>;

  const max = Math.max(1, ...data.months.map((m) => m.paid + m.upcoming));
  const isCurrentYear = data.year === new Date().getFullYear();
  const txs = data.transactions.filter((t) => filter === "all" || t.status === filter);

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Earnings</h1>
          <p className="mt-4 text-2xl font-medium sm:text-3xl">
            You&apos;ve made <span className="font-semibold">{formatPrice(data.paid_out, { decimals: 0 })}</span> {isCurrentYear ? "this year" : `in ${data.year}`}
          </p>
          {data.upcoming > 0 && (
            <p className="mt-1 text-hof dark:text-neutral-400">
              plus <span className="font-medium text-ink dark:text-white">{formatPrice(data.upcoming, { decimals: 0 })}</span> in upcoming payouts
            </p>
          )}
        </div>
        <label className="relative">
          <select
            value={data.year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Year"
            className="appearance-none rounded-full border border-neutral-300 bg-white py-2 pl-4 pr-9 text-sm font-medium dark:border-neutral-700 dark:bg-neutral-900"
          >
            {data.years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
        </label>
      </div>

      {/* Month chart: paid in ink, upcoming hatched lighter — the same split Airbnb draws. */}
      <div className="mt-10 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <div className="flex h-56 items-end gap-2 sm:gap-3">
          {data.months.map((m) => {
            const total = m.paid + m.upcoming;
            const h = (total / max) * 100;
            const paidShare = total ? (m.paid / total) * 100 : 0;
            return (
              <div key={m.month} className="group flex flex-1 flex-col items-center justify-end gap-2" title={`${m.label}: ${formatPrice(total, { decimals: 0 })}`}>
                <span className="text-[11px] tabular-nums text-hof opacity-0 transition group-hover:opacity-100 dark:text-neutral-400">{total > 0 ? formatPrice(total, { decimals: 0 }) : ""}</span>
                <div className="flex w-full max-w-[40px] flex-col justify-end overflow-hidden rounded-t-md bg-neutral-100 dark:bg-neutral-800" style={{ height: `${Math.max(2, h)}%` }}>
                  <div className="w-full bg-rausch/40" style={{ height: `${100 - paidShare}%` }} />
                  <div className="w-full bg-ink dark:bg-white" style={{ height: `${paidShare}%` }} />
                </div>
                <span className="text-xs text-hof dark:text-neutral-400">{m.label}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-5 text-xs text-hof dark:text-neutral-400">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-ink dark:bg-white" /> Paid out
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-rausch/40" /> Upcoming
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label="Paid out" value={formatPrice(data.paid_out, { decimals: 0 })} />
        <Tile label="Upcoming" value={formatPrice(data.upcoming, { decimals: 0 })} />
        <Tile label="Bookings" value={String(data.bookings_count)} />
        <Tile label="Nights booked" value={String(data.nights_booked)} />
        <Tile label="Avg. per night" value={formatPrice(data.avg_nightly, { decimals: 0 })} />
      </div>

      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Transaction history</h2>
          <div className="flex gap-2">
            {(["all", "paid", "upcoming"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full border px-3.5 py-1.5 text-sm capitalize ${filter === f ? "border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink" : "border-neutral-300 dark:border-neutral-700"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-sm text-hof dark:text-neutral-400">
          Payouts are released once a stay is complete. A {Math.round(data.host_fee_pct * 100)}% host service fee is deducted from homes; 20% from experiences and services.
        </p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-hof dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium">Guest</th>
                <th className="px-4 py-3 text-right font-medium">Gross</th>
                <th className="px-4 py-3 text-right font-medium">Service fee</th>
                <th className="px-4 py-3 text-right font-medium">Payout</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {txs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-hof dark:text-neutral-400">
                    No transactions for {data.year}.
                  </td>
                </tr>
              ) : (
                txs.map((t) => (
                  <tr key={`${t.kind}-${t.id}`}>
                    <td className="px-4 py-3 whitespace-nowrap">{fromISODate(t.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</td>
                    <td className="max-w-[240px] truncate px-4 py-3">
                      {t.listing_title}
                      <p className="text-xs text-hof dark:text-neutral-400">
                        {t.kind === "home" ? `${t.nights} night${t.nights === 1 ? "" : "s"}` : t.kind === "experience" ? "Experience" : "Service"}
                      </p>
                    </td>
                    <td className="px-4 py-3">{t.guest_name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPrice(t.gross, { decimals: 0 })}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-hof dark:text-neutral-400">−{formatPrice(t.host_fee, { decimals: 0 })}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{t.status === "cancelled" ? "—" : formatPrice(t.payout, { decimals: 0 })}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          t.status === "paid"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : t.status === "upcoming"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-neutral-100 text-hof dark:bg-neutral-800"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-xs text-hof dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
