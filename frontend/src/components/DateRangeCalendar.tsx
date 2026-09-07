"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  buildCalendarGrid,
  monthLabel,
  weekdayLabels,
  isSameDay,
  isWithinRange,
  toISODate,
  rangeHitsBlockedDate,
} from "@/lib/date";

interface Props {
  checkIn: Date | null;
  checkOut: Date | null;
  blockedDates?: string[];
  monthsToShow?: number;
  onChange: (checkIn: Date | null, checkOut: Date | null) => void;
}

export default function DateRangeCalendar({ checkIn, checkOut, blockedDates = [], monthsToShow = 2, onChange }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  function shiftMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  function handleClick(date: Date, disabled: boolean) {
    if (disabled) return;
    if (!checkIn || (checkIn && checkOut)) {
      onChange(date, null);
      return;
    }
    // checkIn is set, checkOut is not
    if (date.getTime() <= checkIn.getTime()) {
      onChange(date, null);
      return;
    }
    if (rangeHitsBlockedDate(checkIn, date, blockedDates)) {
      // Can't span an unavailable night — start a fresh selection from this date instead.
      onChange(date, null);
      return;
    }
    onChange(checkIn, date);
  }

  function renderMonth(offset: number) {
    let m = viewMonth + offset;
    let y = viewYear;
    if (m > 11) {
      m -= 12;
      y += 1;
    }
    const grid = buildCalendarGrid(y, m, blockedDates);

    return (
      <div key={`${y}-${m}`} className="w-full">
        <p className="mb-3 text-center font-semibold text-ink dark:text-neutral-100">{monthLabel(y, m)}</p>
        <div className="grid grid-cols-7 gap-y-1 text-center text-xs text-hof dark:text-neutral-400">
          {weekdayLabels().map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
          {grid.map((day, idx) => {
            const disabled = day.isPast || day.isBlocked || !day.inCurrentMonth;
            const isCheckIn = checkIn && isSameDay(day.date, checkIn);
            const isCheckOut = checkOut && isSameDay(day.date, checkOut);
            const inRange = checkIn && checkOut && isWithinRange(day.date, checkIn, checkOut);

            return (
              <button
                key={idx}
                type="button"
                disabled={disabled}
                onClick={() => handleClick(day.date, disabled)}
                title={day.isBlocked ? "Not available" : undefined}
                className={[
                  "mx-auto flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                  !day.inCurrentMonth ? "invisible" : "",
                  disabled && day.inCurrentMonth ? "text-neutral-300 line-through dark:text-neutral-700" : "",
                  !disabled ? "hover:bg-neutral-100 dark:hover:bg-neutral-800" : "",
                  isCheckIn || isCheckOut ? "bg-ink text-white dark:bg-white dark:text-ink" : "",
                  inRange && !isCheckIn && !isCheckOut ? "bg-neutral-100 dark:bg-neutral-800" : "",
                  day.isToday && !isCheckIn && !isCheckOut ? "font-bold underline" : "",
                ].join(" ")}
              >
                {day.date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="rounded-full border border-neutral-300 p-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="rounded-full border border-neutral-300 p-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className={`grid gap-8 ${monthsToShow === 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        {Array.from({ length: monthsToShow }).map((_, i) => renderMonth(i))}
      </div>
      {checkIn && (
        <p className="mt-3 text-xs text-hof dark:text-neutral-400">
          {checkOut ? `${toISODate(checkIn)} to ${toISODate(checkOut)}` : "Select checkout date"}
        </p>
      )}
    </div>
  );
}
