"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { hostApi, listingsApi } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { useLocale } from "@/lib/locale-context";
import { monthLabel, toISODate, weekdayLabels } from "@/lib/date";
import type { CalendarDayOut, CalendarMonth, ListingCard } from "@/lib/types";

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="p-10 text-hof">Loading calendar…</div>}>
      <CalendarContent />
    </Suspense>
  );
}

/**
 * /hosting/calendar — Airbnb's hosting calendar: one listing at a time, a
 * month grid showing the nightly price on every open night, booked nights
 * with the guest's name, and blocked nights struck through. Click nights to
 * select them, then block/open them or set a custom price in the side panel.
 */
function CalendarContent() {
  const params = useSearchParams();
  const { showToast } = useToast();
  const { formatPrice, currency } = useLocale();
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [listingId, setListingId] = useState<number | null>(null);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [data, setData] = useState<CalendarMonth | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listingsApi
      .mine()
      .then((all) => {
        const live = all.filter((l) => l.status !== "draft");
        setListings(live);
        const fromUrl = Number(params.get("listing"));
        const pick = live.find((l) => l.id === fromUrl) ?? live[0];
        if (pick) setListingId(pick.id);
      })
      .catch(() => showToast("Couldn't load your listings", "error"));
  }, [params, showToast]);

  const load = useCallback(() => {
    if (!listingId) return;
    hostApi
      .calendar(listingId, year, month)
      .then(setData)
      .catch(() => showToast("Couldn't load the calendar", "error"));
  }, [listingId, year, month, showToast]);

  useEffect(() => {
    load();
    setSelected([]);
  }, [load]);

  function shift(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  const byDate = useMemo(() => new Map((data?.days ?? []).map((d) => [d.date, d])), [data]);
  const todayISO = toISODate(today);

  function toggle(day: CalendarDayOut) {
    if (day.booked || day.date < todayISO) return;
    setSelected((s) => (s.includes(day.date) ? s.filter((x) => x !== day.date) : [...s, day.date].sort()));
  }

  async function apply(update: { blocked?: boolean; price?: number; reset_price?: boolean }) {
    if (!listingId || selected.length === 0) return;
    setBusy(true);
    try {
      await hostApi.updateCalendar(listingId, { dates: selected, ...update });
      showToast("Calendar updated", "success");
      setPrice("");
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't update the calendar", "error");
    } finally {
      setBusy(false);
    }
  }

  // Leading blanks so the 1st lands on the right weekday (weeks start Sunday, like the guest calendar).
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const cells: (CalendarDayOut | null)[] = [...Array(firstWeekday).fill(null), ...(data?.days ?? [])];
  const selectedDays = selected.map((d) => byDate.get(d)).filter((d): d is CalendarDayOut => !!d);
  const allBlocked = selectedDays.length > 0 && selectedDays.every((d) => d.blocked);

  if (listings.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">No listings to show yet</h1>
        <p className="mt-2 text-hof dark:text-neutral-400">Publish a home and its calendar will appear here.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-8 lg:flex-row lg:px-8">
      <div className="flex-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="grid h-9 w-9 place-items-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <ChevronLeft size={18} />
            </button>
            <h1 className="min-w-[180px] text-center text-xl font-semibold">{monthLabel(year, month - 1)}</h1>
            <button type="button" onClick={() => shift(1)} aria-label="Next month" className="grid h-9 w-9 place-items-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <ChevronRight size={18} />
            </button>
            <button type="button" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }} className="ml-2 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium dark:border-neutral-700">
              Today
            </button>
          </div>
          <select
            value={listingId ?? ""}
            onChange={(e) => setListingId(Number(e.target.value))}
            aria-label="Listing"
            className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title || "Untitled listing"} — {l.city}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800">
          {weekdayLabels().map((w) => (
            <div key={w} className="bg-white py-2 text-center text-xs font-medium text-hof dark:bg-neutral-950 dark:text-neutral-400">
              {w}
            </div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={`blank-${i}`} className="bg-white dark:bg-neutral-950" />;
            const past = day.date < todayISO;
            const isSel = selected.includes(day.date);
            const num = Number(day.date.slice(8, 10));
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => toggle(day)}
                disabled={day.booked || past}
                aria-pressed={isSel}
                aria-label={`${day.date}${day.booked ? `, booked by ${day.guest_name}` : day.blocked ? ", blocked" : `, ${formatPrice(day.price, { decimals: 0 })}`}`}
                className={`flex aspect-square flex-col justify-between p-1.5 text-left transition sm:p-2 ${
                  day.booked
                    ? "bg-neutral-100 dark:bg-neutral-900"
                    : past
                      ? "bg-white text-neutral-300 dark:bg-neutral-950 dark:text-neutral-700"
                      : isSel
                        ? "bg-ink text-white dark:bg-white dark:text-ink"
                        : day.blocked
                          ? "bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                          : "bg-white hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900"
                }`}
              >
                <span className={`text-xs font-medium sm:text-sm ${day.date === todayISO ? "rounded-full bg-rausch px-1.5 text-white" : ""}`}>{num}</span>
                {day.booked ? (
                  <span className="truncate rounded bg-neutral-800 px-1 py-0.5 text-[10px] font-medium text-white dark:bg-neutral-200 dark:text-ink sm:text-xs">{day.guest_name.split(" ")[0]}</span>
                ) : (
                  <span className={`text-[10px] tabular-nums sm:text-xs ${day.blocked ? "line-through opacity-60" : ""} ${day.custom_price && !isSel ? "font-semibold text-rausch" : ""}`}>
                    {past ? "" : formatPrice(day.price, { decimals: 0 })}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-hof dark:text-neutral-400">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-neutral-800 dark:bg-neutral-200" /> Booked</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-neutral-300 bg-neutral-50 dark:bg-neutral-900" /> Blocked</span>
          <span className="flex items-center gap-1.5 text-rausch"><span className="font-semibold">{currency.symbol}</span> Custom price</span>
        </div>
      </div>

      <aside className="w-full shrink-0 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800 lg:w-80">
        {selected.length === 0 ? (
          <>
            <h2 className="text-lg font-semibold">{data?.listing_title ?? "Your listing"}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-hof dark:text-neutral-400">Weekday price</dt>
                <dd className="font-medium">{data ? formatPrice(data.base_price, { decimals: 0 }) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-hof dark:text-neutral-400">Weekend price</dt>
                <dd className="font-medium">{data?.weekend_price ? formatPrice(data.weekend_price, { decimals: 0 }) : "Same as weekday"}</dd>
              </div>
            </dl>
            <p className="mt-6 text-sm text-hof dark:text-neutral-400">Select one or more nights to block them, open them, or set a custom price.</p>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {selected.length} night{selected.length === 1 ? "" : "s"} selected
                </h2>
                <p className="text-sm text-hof dark:text-neutral-400">
                  {selected[0]}
                  {selected.length > 1 ? ` → ${selected[selected.length - 1]}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => setSelected([])} aria-label="Clear selection" className="rounded-full p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <X size={16} />
              </button>
            </div>

            <div className="mt-5">
              <p className="text-sm font-medium">Availability</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" disabled={busy} onClick={() => apply({ blocked: false })} className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${!allBlocked ? "border-ink dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`}>
                  Open
                </button>
                <button type="button" disabled={busy} onClick={() => apply({ blocked: true })} className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${allBlocked ? "border-ink dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`}>
                  Blocked
                </button>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-sm font-medium">Nightly price</p>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-neutral-300 px-3 dark:border-neutral-700">
                <span className="text-sm text-hof">{currency.symbol}</span>
                <input
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder={data ? String(Math.round(data.base_price * (currency.rate || 1))) : ""}
                  className="w-full bg-transparent py-2.5 text-sm outline-none"
                  aria-label="Custom nightly price"
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy || !price}
                  onClick={() => apply({ price: Number(price) / (currency.rate || 1) })}
                  className="rounded-lg bg-ink px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-ink"
                >
                  Save price
                </button>
                <button type="button" disabled={busy} onClick={() => apply({ reset_price: true })} className="rounded-lg border border-neutral-300 px-3 py-2.5 text-sm font-medium dark:border-neutral-700">
                  Reset to base
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
