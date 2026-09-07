/**
 * Dependency-free date helpers used across the search bar, availability
 * calendar, and booking flow. Kept framework/library free so the pure
 * logic can be executed and unit tested directly with `tsx` (no
 * `node_modules` required) — see src/lib/date.test.ts.
 *
 * All "day" values are plain Date objects normalized to local midnight;
 * ISO strings are always "YYYY-MM-DD".
 */

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isBefore(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}

export function isAfter(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() > startOfDay(b).getTime();
}

export function isWithinRange(date: Date, start: Date, end: Date): boolean {
  const t = startOfDay(date).getTime();
  return t >= startOfDay(start).getTime() && t <= startOfDay(end).getTime();
}

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = startOfDay(checkOut).getTime() - startOfDay(checkIn).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** True if any night in [checkIn, checkOut) lands on a blocked date.
 *  Checkout day itself is never blocked (matches backend semantics). */
export function rangeHitsBlockedDate(checkIn: Date, checkOut: Date, blockedISO: string[]): boolean {
  const blocked = new Set(blockedISO);
  let cursor = startOfDay(checkIn);
  const end = startOfDay(checkOut);
  while (cursor.getTime() < end.getTime()) {
    if (blocked.has(toISODate(cursor))) return true;
    cursor = addDays(cursor, 1);
  }
  return false;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

export function weekdayLabels(): string[] {
  return WEEKDAY_SHORT;
}

export function formatShort(date: Date): string {
  return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`;
}

export function formatDateRange(checkIn: Date | null, checkOut: Date | null): string {
  if (!checkIn && !checkOut) return "Add dates";
  if (checkIn && !checkOut) return `${formatShort(checkIn)} - Add checkout`;
  if (checkIn && checkOut) return `${formatShort(checkIn)} - ${formatShort(checkOut)}`;
  return "Add dates";
}

export interface CalendarDay {
  date: Date;
  inCurrentMonth: boolean;
  isPast: boolean;
  isBlocked: boolean;
  isToday: boolean;
}

/** Builds a 6x7 grid (42 days) for a given month, including padding days
 * from the previous/next month so every week row is complete. */
export function buildCalendarGrid(year: number, month: number, blockedISO: string[]): CalendarDay[] {
  const today = startOfDay(new Date());
  const blocked = new Set(blockedISO);
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0 = Sunday
  const gridStart = addDays(firstOfMonth, -startWeekday);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = addDays(gridStart, i);
    days.push({
      date,
      inCurrentMonth: date.getMonth() === month,
      isPast: isBefore(date, today),
      isBlocked: blocked.has(toISODate(date)),
      isToday: isSameDay(date, today),
    });
  }
  return days;
}

const MONTH_COMPACT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

/** The next Friday->Sunday, used as the default 2-night window on cards
 *  (Airbnb shows a concrete sample date range rather than "for 2 nights"). */
export function upcomingWeekend(from: Date = new Date()): { checkIn: Date; checkOut: Date } {
  const start = startOfDay(from);
  const daysUntilFriday = (5 - start.getDay() + 7) % 7 || 7; // always a future Friday
  const checkIn = addDays(start, daysUntilFriday);
  return { checkIn, checkOut: addDays(checkIn, 2) };
}

/** "11–13 Sept" when both dates share a month, otherwise "30 Sept – 2 Oct". */
export function formatDateRangeCompact(checkIn: Date, checkOut: Date): string {
  const sameMonth = checkIn.getMonth() === checkOut.getMonth() && checkIn.getFullYear() === checkOut.getFullYear();
  const m1 = MONTH_COMPACT[checkIn.getMonth()];
  const m2 = MONTH_COMPACT[checkOut.getMonth()];
  if (sameMonth) return `${checkIn.getDate()}\u2013${checkOut.getDate()} ${m1}`;
  return `${checkIn.getDate()} ${m1} \u2013 ${checkOut.getDate()} ${m2}`;
}

/**
 * "1 day ago", "3 weeks ago", "2 years ago" — how Airbnb dates reviews.
 * Falls back to months/years rather than stacking up hundreds of days.
 */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const days = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  if (days < 30) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

/** "10 months on airhome" / "7 years on airhome" — tenure as Airbnb writes it. */
export function tenure(joinedISO: string, now: Date = new Date()): string {
  const days = Math.max(0, Math.floor((now.getTime() - new Date(joinedISO).getTime()) / 86_400_000));
  const months = Math.floor(days / 30);
  if (months < 1) return "New";
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"}`;
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? "year" : "years"}`;
}
