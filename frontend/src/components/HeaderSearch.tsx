"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, MapPin, Home as HomeIcon, PartyPopper, ConciergeBell, Sparkles, LocateFixed, Building2 } from "lucide-react";
import DateRangeCalendar from "./DateRangeCalendar";
import GuestSelector from "./GuestSelector";
import { formatDateRange, formatShort, fromISODate, toISODate } from "@/lib/date";
import { destinationsApi, experiencesApi } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { useLocale } from "@/lib/locale-context";
import { getCurrentPosition } from "@/lib/geo";
import type { Destination } from "@/lib/types";

export type SearchMode = "homes" | "experiences" | "services";

const MODE_CONFIG: Record<
  SearchMode,
  { path: string; wherePlaceholder: string; compactIcon: typeof HomeIcon; compactLabel: string }
> = {
  homes: { path: "/homes", wherePlaceholder: "Search destinations", compactIcon: HomeIcon, compactLabel: "Anywhere" },
  experiences: { path: "/experiences", wherePlaceholder: "Search destinations", compactIcon: PartyPopper, compactLabel: "Anywhere" },
  services: { path: "/services", wherePlaceholder: "Search destinations", compactIcon: ConciergeBell, compactLabel: "Anywhere" },
};

type Section = "where" | "when" | "who";

/**
 * The header search control: either the compact
 * "Anywhere | Anytime | Add guests" pill, or the large Where / When / Who bar.
 *
 * The "Where" dropdown is a live autocomplete over destinations that actually
 * have inventory (cities and neighbourhoods), so a suggestion can never lead
 * to an empty results page.
 */
/**
 * useSearchParams() opts a component out of static prerendering unless it sits
 * inside a Suspense boundary. This control lives in the Navbar, which the root
 * layout renders on every route, so without this wrapper `next build` fails to
 * prerender the entire site. `next dev` never prerenders, so the error only
 * ever appears in a production build.
 */
export default function HeaderSearch(props: HeaderSearchProps) {
  return (
    <Suspense fallback={null}>
      <HeaderSearchContent {...props} />
    </Suspense>
  );
}

interface HeaderSearchProps {
  mode: SearchMode;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}

function HeaderSearchContent({
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
  const { t } = useLocale();
  const cfg = MODE_CONFIG[mode];

  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [guests, setGuests] = useState(0);
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [section, setSection] = useState<Section | null>(null);
  const [locating, setLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<Destination[]>([]);
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

  // Live autocomplete, debounced.
  useEffect(() => {
    if (section !== "where") return;
    let cancelled = false;
    const handle = setTimeout(() => {
      destinationsApi
        .search(location.trim() || undefined, 6)
        .then((d) => {
          if (!cancelled) setSuggestions(d);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [location, section]);

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

  /** "Nearby": geolocate, then pick the closest destination we actually have inventory in. */
  async function searchNearby() {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      // The server compares against every city with inventory. Doing it here
      // against the "popular" list sent people in Delhi to Agra.
      const best = await destinationsApi.nearest(pos.latitude, pos.longitude);
      setLocation(best.city);
      const approx = pos.precise ? "" : " (approximate, from your IP address)";
      showToast(
        best.distance_km < 60
          ? `Showing places near you in ${best.city}${approx}`
          : `Closest destination to you is ${best.city}${approx} (${best.distance_km.toLocaleString()} km away)`,
        "success"
      );
      setSection("when");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't get your location", "error");
    } finally {
      setLocating(false);
    }
  }

  function submit(overrideLocation?: string) {
    const loc = (overrideLocation ?? location).trim();
    const params = new URLSearchParams();
    if (loc) params.set("location", loc);
    if (mode === "homes") {
      if (checkIn) params.set("check_in", toISODate(checkIn));
      if (checkOut) params.set("check_out", toISODate(checkOut));
    } else if (checkIn) {
      params.set("date", toISODate(checkIn));
    }
    if (mode === "services" && category) params.set("category", category);
    if (guests > 0) params.set("guests", String(guests));
    setSection(null);
    onCollapse();
    const qs = params.toString();
    // Always leave at least one param behind: the results pages treat "no query
    // string at all" as the browse/carousel view.
    router.push(`${cfg.path}?${qs || "search=1"}`);
  }

  function pickDestination(d: Destination) {
    setLocation(d.city);
    setSection("when");
  }

  const guestsLabel = guests > 0 ? `${guests} ${guests > 1 ? t("guests") : t("guest")}` : "";
  const whenLabel =
    mode === "homes" ? (checkIn ? formatDateRange(checkIn, checkOut) : "") : checkIn ? formatShort(checkIn) : "";
  const thirdLabel = mode === "services" ? category : guestsLabel;
  const thirdPlaceholder = mode === "services" ? t("Add service") : t("Add guests");
  const thirdTitle = mode === "services" ? t("Type of service") : t("Who");
  const CompactIcon = cfg.compactIcon;
  // Once the map has been moved the viewport is the search area, and the pill
  // says so — "Homes in map area" — exactly as on the real site.
  const inMapArea = mode === "homes" && !!searchParams.get("sw_lat");

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
        <span className="px-3 font-medium">{inMapArea ? t("Homes in map area") : location || t(cfg.compactLabel)}</span>
        <span className="h-6 w-px bg-neutral-300 dark:bg-neutral-700" />
        <span className="px-3 font-medium">{whenLabel || t("Anytime")}</span>
        <span className="h-6 w-px bg-neutral-300 dark:bg-neutral-700" />
        <span className={`px-3 ${thirdLabel ? "font-medium" : "text-hof dark:text-neutral-400"}`}>
          {thirdLabel || (mode === "services" ? t("Any service") : t("Add guests"))}
        </span>
        <span className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-rausch text-white">
          <Search size={14} strokeWidth={3} />
        </span>
      </button>
    );
  }

  // ---------- expanded bar ----------
  const sectionBtn = (key: Section, extra = "") =>
    `relative flex-1 rounded-full px-8 py-3.5 text-left transition-colors ${
      section === key
        ? "bg-white shadow-popover dark:bg-neutral-800"
        : section
          ? "hover:bg-neutral-200 dark:hover:bg-neutral-800"
          : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
    } ${extra}`;

  return (
    <div ref={barRef} className="relative mx-auto w-full max-w-[1000px]">
      <div
        className={`flex flex-col divide-y divide-neutral-200 rounded-3xl border border-neutral-200 shadow-[0_3px_12px_rgba(0,0,0,0.1)] dark:divide-neutral-700 dark:border-neutral-700 sm:flex-row sm:items-center sm:divide-y-0 sm:rounded-full ${
          section ? "bg-neutral-100 dark:bg-neutral-900" : "bg-white dark:bg-neutral-900"
        }`}
      >
        {/* Where — the input lives inside the pill itself, like the real search bar */}
        <div className={sectionBtn("where")} onClick={() => setSection("where")}>
          <span className="block text-[13px] font-semibold">{t("Where")}</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onFocus={() => setSection("where")}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") setSection(null);
            }}
            placeholder={t(cfg.wherePlaceholder)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-hof dark:placeholder:text-neutral-400"
          />
        </div>

        <span className="hidden h-8 w-px bg-neutral-200 dark:bg-neutral-700 sm:block" />

        <button type="button" onClick={() => setSection(section === "when" ? null : "when")} className={sectionBtn("when")}>
          <span className="block text-[13px] font-semibold">{t("When")}</span>
          <span className={`block truncate text-sm ${whenLabel ? "text-ink dark:text-white" : "text-hof dark:text-neutral-400"}`}>
            {whenLabel || t("Add dates")}
          </span>
        </button>

        <span className="hidden h-8 w-px bg-neutral-200 dark:bg-neutral-700 sm:block" />

        <div className={sectionBtn("who", "flex items-center justify-between gap-3 py-2 pr-2")}>
          <button type="button" onClick={() => setSection(section === "who" ? null : "who")} className="min-w-0 flex-1 text-left">
            <span className="block text-[13px] font-semibold">{thirdTitle}</span>
            <span className={`block truncate text-sm ${thirdLabel ? "text-ink dark:text-white" : "text-hof dark:text-neutral-400"}`}>
              {thirdLabel || thirdPlaceholder}
            </span>
          </button>
          <button
            type="button"
            onClick={() => submit()}
            aria-label="Search"
            className={`flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-rausch text-white transition-all hover:bg-rausch_dark ${
              section ? "w-auto px-5" : "w-12"
            }`}
          >
            <Search size={18} strokeWidth={3} />
            {section && <span className="text-base font-medium">{t("Search")}</span>}
          </button>
        </div>
      </div>

      {section === "where" && (
        <div className="absolute left-0 top-full z-30 mt-3 w-full max-w-[420px] rounded-3xl border border-neutral-200 bg-white p-4 shadow-popover dark:border-neutral-700 dark:bg-neutral-900">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-hof dark:text-neutral-400">
            {location.trim() ? "Destinations" : t("Suggested destinations")}
          </p>
          <ul className="max-h-[340px] overflow-y-auto">
            {!location.trim() && (
              <li>
                <button
                  type="button"
                  onClick={searchNearby}
                  disabled={locating}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-sm hover:bg-neutral-100 disabled:opacity-60 dark:hover:bg-neutral-800"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                    <LocateFixed size={20} />
                  </span>
                  <span>
                    <span className="block font-medium">{locating ? t("Finding your location...") : t("Nearby")}</span>
                    <span className="block text-xs text-hof dark:text-neutral-400">{t("Find what's around you")}</span>
                  </span>
                </button>
              </li>
            )}

            {suggestions.map((d) => (
              <li key={`${d.kind}-${d.label}-${d.city}`}>
                <button
                  type="button"
                  onClick={() => pickDestination(d)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    {d.kind === "city" ? <MapPin size={20} strokeWidth={1.6} /> : <Building2 size={20} strokeWidth={1.6} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{d.label}</span>
                    <span className="block truncate text-xs text-hof dark:text-neutral-400">{d.sublabel}</span>
                  </span>
                </button>
              </li>
            ))}

            {location.trim() && suggestions.length === 0 && (
              <li className="px-2 py-6 text-center text-sm text-hof dark:text-neutral-400">
                No destinations match &ldquo;{location.trim()}&rdquo;.
                <button type="button" onClick={() => setLocation("")} className="mt-1 block w-full underline">
                  See all destinations
                </button>
              </li>
            )}
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
          <button onClick={() => submit()} className="mt-3 w-full rounded-lg bg-rausch py-2.5 text-sm font-semibold text-white hover:bg-rausch_dark">
            {t("Search")}
          </button>
        </div>
      )}

      {section === "who" && mode === "services" && (
        <div className="absolute right-0 top-full z-30 mt-3 w-80 rounded-3xl border border-neutral-200 bg-white p-4 shadow-popover dark:border-neutral-700 dark:bg-neutral-900">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-hof dark:text-neutral-400">{t("Type of service")}</p>
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
                {t("Any service")}
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
          <button onClick={() => submit()} className="mt-3 w-full rounded-lg bg-rausch py-2.5 text-sm font-semibold text-white hover:bg-rausch_dark">
            {t("Search")}
          </button>
        </div>
      )}
    </div>
  );
}
