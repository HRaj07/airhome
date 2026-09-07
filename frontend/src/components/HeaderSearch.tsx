"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, MapPin, Home as HomeIcon } from "lucide-react";
import DateRangeCalendar from "./DateRangeCalendar";
import GuestSelector from "./GuestSelector";
import { formatDateRange, fromISODate, toISODate } from "@/lib/date";

const POPULAR_DESTINATIONS = ["Paris", "London", "Tokyo", "New York", "Barcelona", "Bali", "Lisbon", "Los Angeles"];

type Section = "where" | "when" | "who";

/**
 * The header search control. Renders either the compact
 * "Anywhere | Anytime | Add guests" pill, or the large Where / When / Who bar
 * with its popovers — the parent decides which via `expanded`.
 */
export default function HeaderSearch({
  expanded,
  onExpand,
  onCollapse,
}: {
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [guests, setGuests] = useState(0);
  const [section, setSection] = useState<Section | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Keep the control in sync with the URL (shareable searches, back/forward).
  useEffect(() => {
    setLocation(searchParams.get("location") || "");
    const ci = searchParams.get("check_in");
    const co = searchParams.get("check_out");
    setCheckIn(ci ? fromISODate(ci) : null);
    setCheckOut(co ? fromISODate(co) : null);
    setGuests(Number(searchParams.get("guests")) || 0);
  }, [searchParams]);

  useEffect(() => {
    if (!expanded) setSection(null);
  }, [expanded]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setSection(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function submit() {
    const params = new URLSearchParams();
    if (location.trim()) params.set("location", location.trim());
    if (checkIn) params.set("check_in", toISODate(checkIn));
    if (checkOut) params.set("check_out", toISODate(checkOut));
    if (guests > 0) params.set("guests", String(guests));
    setSection(null);
    onCollapse();
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  const guestsLabel = guests > 0 ? `${guests} guest${guests > 1 ? "s" : ""}` : "";

  // ---------- compact pill ----------
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onExpand}
        aria-label="Start your search"
        className="flex items-center rounded-full border border-neutral-200 bg-white py-1.5 pl-2 pr-1.5 text-sm shadow-sm transition-shadow hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-rausch dark:bg-neutral-800">
          <HomeIcon size={16} />
        </span>
        <span className="px-3 font-medium">{location || "Anywhere"}</span>
        <span className="h-6 w-px bg-neutral-300 dark:bg-neutral-700" />
        <span className="px-3 font-medium">{checkIn ? formatDateRange(checkIn, checkOut) : "Anytime"}</span>
        <span className="h-6 w-px bg-neutral-300 dark:bg-neutral-700" />
        <span className={`px-3 ${guestsLabel ? "font-medium" : "text-hof dark:text-neutral-400"}`}>{guestsLabel || "Add guests"}</span>
        <span className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-rausch text-white">
          <Search size={14} strokeWidth={3} />
        </span>
      </button>
    );
  }

  // ---------- expanded bar ----------
  const sectionBtn = (key: Section, extra = "") =>
    `relative flex-1 rounded-full px-7 py-3.5 text-left transition-colors ${
      section === key
        ? "bg-white shadow-popover dark:bg-neutral-800"
        : section
          ? "hover:bg-neutral-200 dark:hover:bg-neutral-800"
          : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
    } ${extra}`;

  return (
    <div ref={barRef} className="relative mx-auto w-full max-w-4xl">
      <div
        className={`flex flex-col divide-y divide-neutral-200 rounded-3xl border border-neutral-200 shadow-md dark:divide-neutral-700 dark:border-neutral-700 sm:flex-row sm:items-center sm:divide-y-0 sm:rounded-full ${
          section ? "bg-neutral-100 dark:bg-neutral-900" : "bg-white dark:bg-neutral-900"
        }`}
      >
        <button type="button" onClick={() => setSection(section === "where" ? null : "where")} className={sectionBtn("where")}>
          <span className="block text-xs font-semibold">Where</span>
          <span className={`block truncate text-sm ${location ? "text-ink dark:text-white" : "text-hof dark:text-neutral-400"}`}>
            {location || "Search destinations"}
          </span>
        </button>

        <span className="hidden h-8 w-px bg-neutral-300 dark:bg-neutral-700 sm:block" />

        <button type="button" onClick={() => setSection(section === "when" ? null : "when")} className={sectionBtn("when")}>
          <span className="block text-xs font-semibold">When</span>
          <span className={`block truncate text-sm ${checkIn ? "text-ink dark:text-white" : "text-hof dark:text-neutral-400"}`}>
            {checkIn ? formatDateRange(checkIn, checkOut) : "Add dates"}
          </span>
        </button>

        <span className="hidden h-8 w-px bg-neutral-300 dark:bg-neutral-700 sm:block" />

        <div className={sectionBtn("who", "flex items-center justify-between gap-3 py-2 pr-2")}>
          <button type="button" onClick={() => setSection(section === "who" ? null : "who")} className="min-w-0 flex-1 text-left">
            <span className="block text-xs font-semibold">Who</span>
            <span className={`block truncate text-sm ${guestsLabel ? "text-ink dark:text-white" : "text-hof dark:text-neutral-400"}`}>
              {guestsLabel || "Add guests"}
            </span>
          </button>
          <button
            type="button"
            onClick={submit}
            aria-label="Search"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rausch text-white transition-colors hover:bg-rausch_dark"
          >
            <Search size={18} strokeWidth={3} />
          </button>
        </div>
      </div>

      {section === "where" && (
        <div className="absolute left-0 top-full z-30 mt-3 w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-popover dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-300 px-3 py-2 dark:border-neutral-600">
            <MapPin size={16} className="text-hof" />
            <input
              autoFocus
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Search by city or country"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-hof dark:text-neutral-400">Suggested destinations</p>
          <ul className="max-h-64 overflow-y-auto">
            {POPULAR_DESTINATIONS.filter((d) => d.toLowerCase().includes(location.toLowerCase())).map((d) => (
              <li key={d}>
                <button
                  type="button"
                  onClick={() => {
                    setLocation(d);
                    setSection("when");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <MapPin size={18} />
                  </span>
                  {d}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {section === "when" && (
        <div className="absolute left-1/2 top-full z-30 mt-3 w-[min(92vw,720px)] -translate-x-1/2 rounded-3xl border border-neutral-200 bg-white p-6 shadow-popover dark:border-neutral-700 dark:bg-neutral-900">
          <DateRangeCalendar
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={(a, b) => {
              setCheckIn(a);
              setCheckOut(b);
              if (a && b) setSection("who");
            }}
          />
        </div>
      )}

      {section === "who" && (
        <div className="absolute right-0 top-full z-30 mt-3 w-80 rounded-3xl border border-neutral-200 bg-white p-6 shadow-popover dark:border-neutral-700 dark:bg-neutral-900">
          <GuestSelector guests={Math.max(guests, 1)} onChange={setGuests} />
          <button onClick={submit} className="mt-3 w-full rounded-lg bg-rausch py-2.5 text-sm font-semibold text-white hover:bg-rausch_dark">
            Search
          </button>
        </div>
      )}
    </div>
  );
}
