"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, MapPin, Home as HomeIcon, PartyPopper, ConciergeBell, Sparkles, LocateFixed } from "lucide-react";
import DateRangeCalendar from "./DateRangeCalendar";
import GuestSelector from "./GuestSelector";
import { formatDateRange, formatShort, fromISODate, toISODate } from "@/lib/date";
import { experiencesApi } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { DESTINATIONS, getCurrentPosition, nearestDestination } from "@/lib/geo";

export type SearchMode = "homes" | "experiences" | "services";


const MODE_CONFIG: Record<
  SearchMode,
  { path: string; wherePlaceholder: string; compactIcon: typeof HomeIcon; compactLabel: string }
> = {
  homes: { path: "/homes", wherePlaceholder: "Search destinations", compactIcon: HomeIcon, compactLabel: "Anywhere" },
  experiences: { path: "/experiences", wherePlaceholder: "Search by city or landmark", compactIcon: PartyPopper, compactLabel: "Anywhere" },
  services: { path: "/services", wherePlaceholder: "Search destinations", compactIcon: ConciergeBell, compactLabel: "Anywhere" },
};

type Section = "where" | "when" | "who";

/**
 * The header search control. Renders either the compact
 * "Anywhere | Anytime | Add guests" pill, or the large Where / When / Who bar
 * with its popovers — the parent decides which via `expanded`.
 *
 * `mode` changes the third field and where the search navigates:
 *  - homes:       Where / When (date range) / Who   -> /homes?...
 *  - experiences: Where / When (single date) / Who  -> /experiences?...
 *  - services:    Where / When (single date) / Type of service -> /services?...
 */
export default function HeaderSearch({
  mode,
  expanded,
  onExpand,
  onCollapse,
}: {
  mode: SearchMode;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const cfg = MODE_CONFIG[mode];
  const [locating, setLocating] = useState(false);

  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [guests, setGuests] = useState(0);
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [section, setSection] = useState<Section | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Keep the control in sync with the URL (shareable searches, back/forward).
  useEffect(() => {
    setLocation(searchParams.get("location") || "");
    const ci = searchParams.get("check_in") || searchParams.get("date");
    const co = searchParams.get("check_out");
    setCheckIn(ci ? fromISODate(ci) : null);
    setCheckOut(co ? fromISODate(co) : null);
    setGuests(Number(searchParams.get("guests")) || 0);
    setCategory(searchParams.get("category") || "");
  }, [searchParams]);

  useEffect(() => {
    if (mode === "services") {
      experiencesApi.categories("service").then(setCategories).catch(() => setCategories([]));
    }
  }, [mode]);

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

  /** "Nearby": use the browser's location and jump to the closest destination we have inventory in. */
  async function searchNearby() {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      const { destination, distanceKm } = nearestDestination(pos.latitude, pos.longitude);
      setLocation(destination.city);
      showToast(
        distanceKm < 150
          ? `Showing ${mode === "homes" ? "homes" : mode} near you in ${destination.city}`
          : `Closest destination to you is ${destination.city} (${distanceKm.toLocaleString()} km away)`,
        "success"
      );
      setSection("when");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't get your location", "error");
    } finally {
      setLocating(false);
    }
  }

  function submit() {
    const params = new URLSearchParams();
    if (location.trim()) params.set("location", location.trim());
    if (mode === "homes") {
      if (checkIn) params.set("check_in", toISODate(checkIn));
      if (checkOut) params.set("check_out", toISODate(checkOut));
    } else if (checkIn) {
      params.set("date", toISODate(checkIn));
    }
    if (mode === "services") {
      if (category) params.set("category", category);
    }
    if (guests > 0) params.set("guests", String(guests));
    setSection(null);
    onCollapse();
    const qs = params.toString();
    // Always land on the results view — even an empty search shows everything, like Airbnb.
    router.push(`${cfg.path}?${qs || "q="}`);
  }

  const guestsLabel = guests > 0 ? `${guests} guest${guests > 1 ? "s" : ""}` : "";
  const whenLabel =
    mode === "homes" ? (checkIn ? formatDateRange(checkIn, checkOut) : "") : checkIn ? formatShort(checkIn) : "";
  const thirdLabel = mode === "services" ? category : guestsLabel;
  const thirdPlaceholder = mode === "services" ? "Add service" : "Add guests";
  const thirdTitle = mode === "services" ? "Type of service" : "Who";
  const CompactIcon = cfg.compactIcon;

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
          <CompactIcon size={16} />
        </span>
        <span className="px-3 font-medium">{location || cfg.compactLabel}</span>
        <span className="h-6 w-px bg-neutral-300 dark:bg-neutral-700" />
        <span className="px-3 font-medium">{whenLabel || "Anytime"}</span>
        <span className="h-6 w-px bg-neutral-300 dark:bg-neutral-700" />
        <span className={`px-3 ${thirdLabel ? "font-medium" : "text-hof dark:text-neutral-400"}`}>
          {thirdLabel || (mode === "services" ? "Any service" : "Add guests")}
        </span>
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
            {location || cfg.wherePlaceholder}
          </span>
        </button>

        <span className="hidden h-8 w-px bg-neutral-300 dark:bg-neutral-700 sm:block" />

        <button type="button" onClick={() => setSection(section === "when" ? null : "when")} className={sectionBtn("when")}>
          <span className="block text-xs font-semibold">When</span>
          <span className={`block truncate text-sm ${whenLabel ? "text-ink dark:text-white" : "text-hof dark:text-neutral-400"}`}>
            {whenLabel || "Add dates"}
          </span>
        </button>

        <span className="hidden h-8 w-px bg-neutral-300 dark:bg-neutral-700 sm:block" />

        <div className={sectionBtn("who", "flex items-center justify-between gap-3 py-2 pr-2")}>
          <button type="button" onClick={() => setSection(section === "who" ? null : "who")} className="min-w-0 flex-1 text-left">
            <span className="block text-xs font-semibold">{thirdTitle}</span>
            <span className={`block truncate text-sm ${thirdLabel ? "text-ink dark:text-white" : "text-hof dark:text-neutral-400"}`}>
              {thirdLabel || thirdPlaceholder}
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
          <ul className="max-h-72 overflow-y-auto">
            {!location && (
              <li>
                <button
                  type="button"
                  onClick={searchNearby}
                  disabled={locating}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-neutral-100 disabled:opacity-60 dark:hover:bg-neutral-800"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                    <LocateFixed size={18} />
                  </span>
                  <span>
                    <span className="block font-medium">{locating ? "Finding your location..." : "Nearby"}</span>
                    <span className="block text-xs text-hof dark:text-neutral-400">Find what&apos;s around you</span>
                  </span>
                </button>
              </li>
            )}
            {DESTINATIONS.filter((d) => d.city.toLowerCase().includes(location.toLowerCase()) || d.country.toLowerCase().includes(location.toLowerCase())).map((d) => (
              <li key={d.city}>
                <button
                  type="button"
                  onClick={() => {
                    setLocation(d.city);
                    setSection("when");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <MapPin size={18} />
                  </span>
                  <span>
                    <span className="block font-medium">{d.city}</span>
                    <span className="block text-xs text-hof dark:text-neutral-400">{d.country}</span>
                  </span>
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
            mode={mode === "homes" ? "range" : "single"}
            onChange={(a, b) => {
              setCheckIn(a);
              setCheckOut(b);
              if (mode !== "homes" ? !!a : !!a && !!b) setSection("who");
            }}
          />
        </div>
      )}

      {section === "who" && mode !== "services" && (
        <div className="absolute right-0 top-full z-30 mt-3 w-80 rounded-3xl border border-neutral-200 bg-white p-6 shadow-popover dark:border-neutral-700 dark:bg-neutral-900">
          <GuestSelector guests={Math.max(guests, 1)} onChange={setGuests} />
          <button onClick={submit} className="mt-3 w-full rounded-lg bg-rausch py-2.5 text-sm font-semibold text-white hover:bg-rausch_dark">
            Search
          </button>
        </div>
      )}

      {section === "who" && mode === "services" && (
        <div className="absolute right-0 top-full z-30 mt-3 w-80 rounded-3xl border border-neutral-200 bg-white p-4 shadow-popover dark:border-neutral-700 dark:bg-neutral-900">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-hof dark:text-neutral-400">Type of service</p>
          <ul className="max-h-72 overflow-y-auto">
            <li>
              <button
                type="button"
                onClick={() => {
                  setCategory("");
                  submit();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <Sparkles size={16} />
                </span>
                Any service
              </button>
            </li>
            {categories.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => {
                    setCategory(c);
                    setSection(null);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                    category === c ? "font-semibold" : ""
                  }`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <ConciergeBell size={16} />
                  </span>
                  {c}
                </button>
              </li>
            ))}
          </ul>
          <button onClick={submit} className="mt-3 w-full rounded-lg bg-rausch py-2.5 text-sm font-semibold text-white hover:bg-rausch_dark">
            Search
          </button>
        </div>
      )}
    </div>
  );
}
