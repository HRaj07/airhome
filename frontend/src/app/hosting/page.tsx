"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, ChevronRight } from "lucide-react";
import { hostApi, listingsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { resumeStep, wizardHref } from "@/lib/hosting";
import type { HostReservation, HostReservations, ListingCard } from "@/lib/types";
import ReservationCard from "@/components/hosting/ReservationCard";

type Bucket = keyof Omit<HostReservations, "all">;

const TABS: { key: Bucket; label: string; empty: string }[] = [
  { key: "checking_out", label: "Checking out", empty: "You don't have any guests checking out today or tomorrow." },
  { key: "currently_hosting", label: "Currently hosting", empty: "You don't have any guests staying with you right now." },
  { key: "arriving_soon", label: "Arriving soon", empty: "You don't have any guests arriving today or tomorrow." },
  { key: "upcoming", label: "Upcoming", empty: "You don't have any upcoming reservations yet." },
  { key: "pending_review", label: "Pending review", empty: "You don't have any guest reviews to write. Reviews are open for 14 days after checkout." },
];

/** /hosting — Airbnb's "Today" page: your reservations by what's happening now. */
export default function HostingTodayPage() {
  const { user } = useAuth();
  const { formatPrice } = useLocale();
  const [data, setData] = useState<HostReservations | null>(null);
  const [drafts, setDrafts] = useState<ListingCard[]>([]);
  const [tab, setTab] = useState<Bucket>("checking_out");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([hostApi.reservations(), listingsApi.drafts().catch(() => [] as ListingCard[])])
      .then(([r, d]) => {
        setData(r);
        setDrafts(d);
        // Open on the first tab that has something in it, like Airbnb does.
        const first = TABS.find((t) => r[t.key].length > 0);
        if (first) setTab(first.key);
      })
      .catch(() => setData(null))
      .finally(() => setLoaded(true));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const items: HostReservation[] = data ? data[tab] : [];
  const upcomingPayout = data ? data.upcoming.concat(data.arriving_soon, data.currently_hosting).reduce((s, r) => s + r.host_payout, 0) : 0;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10 lg:px-10">
      <h1 className="text-3xl font-semibold">
        {greeting}, {user?.full_name.split(" ")[0]}!
      </h1>

      {drafts.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-medium">Finish setting up your listing</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {drafts.map((d) => (
              <Link
                key={d.id}
                href={wizardHref(d.id, resumeStep(d))}
                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-300 p-4 transition hover:shadow-card dark:border-neutral-700"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    {d.cover_photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.cover_photo_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{d.title || "Your listing"}</span>
                    <span className="block text-sm text-hof dark:text-neutral-400">{d.city ? `${d.city} · ` : ""}Continue where you left off</span>
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-medium">Your reservations</h2>
          <Link href="/hosting/reservations" className="text-sm font-semibold underline">
            All reservations ({data?.all.length ?? 0})
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {TABS.map((t) => {
            const count = data ? data[t.key].length : 0;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  active ? "border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink" : "border-neutral-300 hover:border-ink dark:border-neutral-700 dark:hover:border-white"
                }`}
              >
                {t.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {!loaded ? (
            <div className="h-48 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900" />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl bg-[#f7f7f7] px-6 py-14 text-center dark:bg-neutral-900">
              <CalendarCheck size={40} strokeWidth={1.2} className="text-hof" />
              <p className="mt-4 max-w-sm text-sm text-hof dark:text-neutral-400">{TABS.find((t) => t.key === tab)?.empty}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((r) => (
                <ReservationCard key={`${r.kind}-${r.id}`} r={r} bucket={tab} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-14 grid gap-4 sm:grid-cols-3">
        <Stat label="Upcoming payouts" value={formatPrice(upcomingPayout, { decimals: 0 })} href="/hosting/earnings" />
        <Stat label="Guests arriving soon" value={String(data?.arriving_soon.length ?? 0)} href="/hosting/reservations" />
        <Stat label="Reviews to write" value={String(data?.pending_review.length ?? 0)} href="/hosting/insights" />
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-medium">We&apos;re here to help</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            { emoji: "📅", title: "Set up your calendar", body: "Block dates you're not available and set custom prices for busy weekends.", href: "/hosting/calendar" },
            { emoji: "📈", title: "See how you're doing", body: "Ratings, occupancy and what guests are saying, all in one place.", href: "/hosting/insights" },
            { emoji: "💸", title: "Track your earnings", body: "Every payout, upcoming and paid, with the fees shown clearly.", href: "/hosting/earnings" },
          ].map((c) => (
            <Link key={c.title} href={c.href} className="rounded-2xl border border-neutral-200 p-5 transition hover:shadow-card dark:border-neutral-800">
              <span className="text-3xl" aria-hidden="true">
                {c.emoji}
              </span>
              <p className="mt-3 font-medium">{c.title}</p>
              <p className="mt-1 text-sm text-hof dark:text-neutral-400">{c.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-neutral-200 p-5 transition hover:shadow-card dark:border-neutral-800">
      <p className="text-sm text-hof dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Link>
  );
}
