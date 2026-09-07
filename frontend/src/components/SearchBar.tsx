"use client";

import { useEffect, useRef, useState } from "react";
import { Search, MapPin } from "lucide-react";
import DateRangeCalendar from "./DateRangeCalendar";
import GuestSelector from "./GuestSelector";
import { formatDateRange, fromISODate, toISODate } from "@/lib/date";

export interface SearchValue {
  location: string;
  checkIn: string; // ISO or ""
  checkOut: string;
  guests: number;
}

export default function SearchBar({ initial, onSearch }: { initial: SearchValue; onSearch: (v: SearchValue) => void }) {
  const [open, setOpen] = useState<"where" | "dates" | "who" | null>(null);
  const [location, setLocation] = useState(initial.location);
  const [checkIn, setCheckIn] = useState<Date | null>(initial.checkIn ? fromISODate(initial.checkIn) : null);
  const [checkOut, setCheckOut] = useState<Date | null>(initial.checkOut ? fromISODate(initial.checkOut) : null);
  const [guests, setGuests] = useState(initial.guests || 1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function submit() {
    setOpen(null);
    onSearch({
      location,
      checkIn: checkIn ? toISODate(checkIn) : "",
      checkOut: checkOut ? toISODate(checkOut) : "",
      guests,
    });
  }

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-3xl">
      <div className="flex flex-col divide-y divide-neutral-200 rounded-3xl border border-neutral-200 bg-white shadow-sm dark:divide-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 sm:flex-row sm:divide-y-0 sm:rounded-full sm:shadow-md">
        <button
          type="button"
          onClick={() => setOpen(open === "where" ? null : "where")}
          className={`flex-1 rounded-full px-6 py-3 text-left transition-colors ${open === "where" ? "bg-white shadow-md dark:bg-neutral-800" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
        >
          <p className="text-xs font-semibold">Where</p>
          <p className="truncate text-sm text-hof dark:text-neutral-400">{location || "Search destinations"}</p>
        </button>

        <button
          type="button"
          onClick={() => setOpen(open === "dates" ? null : "dates")}
          className={`flex-1 rounded-full px-6 py-3 text-left transition-colors ${open === "dates" ? "bg-white shadow-md dark:bg-neutral-800" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
        >
          <p className="text-xs font-semibold">Dates</p>
          <p className="truncate text-sm text-hof dark:text-neutral-400">{formatDateRange(checkIn, checkOut)}</p>
        </button>

        <button
          type="button"
          onClick={() => setOpen(open === "who" ? null : "who")}
          className={`flex flex-1 items-center justify-between rounded-full py-2 pl-6 pr-2 text-left transition-colors ${open === "who" ? "bg-white shadow-md dark:bg-neutral-800" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
        >
          <div>
            <p className="text-xs font-semibold">Who</p>
            <p className="truncate text-sm text-hof dark:text-neutral-400">
              {guests} guest{guests > 1 ? "s" : ""}
            </p>
          </div>
          <span
            onClick={(e) => {
              e.stopPropagation();
              submit();
            }}
            role="button"
            aria-label="Search"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rausch text-white hover:bg-rausch_dark"
          >
            <Search size={18} />
          </span>
        </button>
      </div>

      {open === "where" && (
        <div className="absolute left-0 top-full z-30 mt-2 w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-4 shadow-popover dark:border-neutral-700 dark:bg-neutral-900">
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
          <p className="mt-3 text-xs text-hof dark:text-neutral-400">
            Try &ldquo;Paris&rdquo;, &ldquo;Tokyo&rdquo;, &ldquo;New York&rdquo;...
          </p>
        </div>
      )}

      {open === "dates" && (
        <div className="absolute left-1/2 top-full z-30 mt-2 w-[min(90vw,640px)] -translate-x-1/2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-popover dark:border-neutral-700 dark:bg-neutral-900 sm:p-6">
          <DateRangeCalendar checkIn={checkIn} checkOut={checkOut} onChange={(a, b) => { setCheckIn(a); setCheckOut(b); }} />
        </div>
      )}

      {open === "who" && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-neutral-200 bg-white p-4 shadow-popover dark:border-neutral-700 dark:bg-neutral-900">
          <GuestSelector guests={guests} onChange={setGuests} />
          <button
            onClick={submit}
            className="mt-3 w-full rounded-lg bg-rausch py-2 text-sm font-semibold text-white hover:bg-rausch_dark"
          >
            Search
          </button>
        </div>
      )}
    </div>
  );
}
