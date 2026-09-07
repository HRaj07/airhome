"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Award, Check } from "lucide-react";
import { hostApi } from "@/lib/api";
import { useLocale } from "@/lib/locale-context";
import { timeAgo } from "@/lib/date";
import type { HostInsights } from "@/lib/types";

/**
 * /hosting/insights — Airbnb's Insights: overall rating with the category
 * breakdown, Superhost progress, occupancy, and per-listing performance,
 * plus the latest reviews guests have left.
 */
export default function InsightsPage() {
  const { formatPrice } = useLocale();
  const [data, setData] = useState<HostInsights | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    hostApi.insights().then(setData).catch(() => setError(true));
  }, []);

  if (error) return <div className="p-10 text-center text-hof">Couldn&apos;t load insights.</div>;
  if (!data) return <div className="p-10 text-center text-hof">Loading insights…</div>;

  const sp = data.superhost_progress;
  const criteria = [
    { label: "Overall rating", value: sp.rating.value ? sp.rating.value.toFixed(2) : "—", target: `${sp.rating.target}+`, met: sp.rating.met },
    { label: "Completed stays", value: String(sp.stays.value), target: `${sp.stays.target}+`, met: sp.stays.met },
    { label: "Cancellation rate", value: `${Math.round(sp.cancellation_rate.value * 100)}%`, target: `<${Math.round(sp.cancellation_rate.target * 100)}%`, met: sp.cancellation_rate.met },
    { label: "Response rate", value: `${Math.round(sp.response_rate.value * 100)}%`, target: `${Math.round(sp.response_rate.target * 100)}%+`, met: sp.response_rate.met },
  ];

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10 lg:px-10">
      <h1 className="text-3xl font-semibold">Insights</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Overall rating" value={data.review_count ? data.rating_avg.toFixed(2) : "New"} sub={`${data.review_count} review${data.review_count === 1 ? "" : "s"}`} icon={<Star size={16} fill="currentColor" />} />
        <Tile label="5-star reviews" value={`${Math.round(data.five_star_pct * 100)}%`} sub="of all reviews" />
        <Tile label="Occupancy (30 days)" value={`${Math.round(data.occupancy_30d * 100)}%`} sub={`${data.nights_booked_30d} nights booked`} />
        <Tile label="Wishlist saves" value={String(data.wishlist_saves)} sub="guests saved your places" />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Rating breakdown</h2>
          {data.rating_breakdown.length === 0 ? (
            <p className="mt-3 text-sm text-hof dark:text-neutral-400">Your category ratings appear after your first review.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.rating_breakdown.map((c) => (
                <li key={c.key} className="flex items-center gap-4 text-sm">
                  <span className="w-32 text-hof dark:text-neutral-400">{c.label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <span className="block h-full rounded-full bg-ink dark:bg-white" style={{ width: `${(c.score / 5) * 100}%` }} />
                  </span>
                  <span className="w-8 text-right font-medium tabular-nums">{c.score.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Award size={20} className="text-rausch" />
            <h2 className="text-lg font-semibold">{sp.is_superhost ? "You're a Superhost" : "Superhost progress"}</h2>
          </div>
          <p className="mt-1 text-sm text-hof dark:text-neutral-400">Superhost status is assessed every quarter against these four criteria.</p>
          <ul className="mt-4 divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
            {criteria.map((c) => (
              <li key={c.label} className="flex items-center justify-between py-3">
                <span>{c.label}</span>
                <span className="flex items-center gap-3">
                  <span className="text-hof dark:text-neutral-400">target {c.target}</span>
                  <span className="font-medium tabular-nums">{c.value}</span>
                  <span className={`grid h-5 w-5 place-items-center rounded-full ${c.met ? "bg-emerald-500 text-white" : "bg-neutral-200 dark:bg-neutral-700"}`}>{c.met && <Check size={12} />}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Listing performance</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-hof dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 text-right font-medium">Saves</th>
                <th className="px-4 py-3 text-right font-medium">Occupancy (30d)</th>
                <th className="px-4 py-3 text-right font-medium">Earned (30d)</th>
                <th className="px-4 py-3 text-right font-medium">Earned (all time)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {data.listings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-hof dark:text-neutral-400">
                    Publish a listing to start seeing how it performs.
                  </td>
                </tr>
              ) : (
                data.listings.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3">
                      <Link href={`/listing/${l.id}`} className="flex items-center gap-3 hover:underline">
                        <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                          {l.cover_photo_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={l.cover_photo_url} alt="" className="h-full w-full object-cover" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block max-w-[240px] truncate font-medium">{l.title}</span>
                          <span className="block text-xs text-hof dark:text-neutral-400">
                            {l.city}
                            {l.status !== "published" ? ` · ${l.status === "draft" ? "In progress" : "Unlisted"}` : ""}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {l.review_count ? (
                        <span className="flex items-center gap-1">
                          <Star size={12} fill="currentColor" /> {l.rating_avg.toFixed(2)} <span className="text-hof">({l.review_count})</span>
                        </span>
                      ) : (
                        <span className="text-hof">New</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{l.wishlist_saves}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{Math.round(l.occupancy_30d * 100)}%</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPrice(l.revenue_30d, { decimals: 0 })}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatPrice(l.revenue_total, { decimals: 0 })}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Recent reviews</h2>
        {data.recent_reviews.length === 0 ? (
          <p className="mt-3 text-sm text-hof dark:text-neutral-400">No reviews yet. They&apos;ll show up here after guests complete a stay.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.recent_reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{r.author_name}</p>
                  <span className="flex items-center gap-0.5" aria-label={`${r.rating} stars`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={12} fill={i < r.rating ? "currentColor" : "none"} className={i < r.rating ? "" : "text-neutral-300"} />
                    ))}
                  </span>
                </div>
                <p className="text-xs text-hof dark:text-neutral-400">
                  {r.listing_title} · {timeAgo(r.created_at)}
                </p>
                <p className="mt-3 text-sm leading-relaxed">{r.comment || "No written comment."}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value, sub, icon }: { label: string; value: string; sub: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
      <p className="text-sm text-hof dark:text-neutral-400">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-3xl font-semibold tabular-nums">
        {icon}
        {value}
      </p>
      <p className="mt-1 text-xs text-hof dark:text-neutral-400">{sub}</p>
    </div>
  );
}
