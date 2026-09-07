/**
 * Standalone tests for the pure date helpers. No test runner or
 * node_modules required — run with:  npx tsx src/lib/date.test.ts
 * (or `tsx src/lib/date.test.ts` if tsx is installed globally).
 */
import {
  toISODate,
  fromISODate,
  addDays,
  isSameDay,
  isBefore,
  nightsBetween,
  rangeHitsBlockedDate,
  buildCalendarGrid,
  formatDateRange,
  upcomingWeekend,
  formatDateRangeCompact,
  timeAgo,
  tenure,
} from "./date";

let failures: string[] = [];
function check(label: string, condition: boolean) {
  if (!condition) {
    failures.push(label);
    console.log(`FAIL: ${label}`);
  } else {
    console.log(`ok:   ${label}`);
  }
}

// --- ISO round trip ---
const d1 = fromISODate("2026-09-10");
check("fromISODate parses year/month/day correctly", d1.getFullYear() === 2026 && d1.getMonth() === 8 && d1.getDate() === 10);
check("toISODate round-trips", toISODate(fromISODate("2026-01-05")) === "2026-01-05");
check("toISODate pads single-digit month/day", toISODate(new Date(2026, 0, 5)) === "2026-01-05");

// --- addDays / isSameDay / isBefore ---
check("addDays advances the date", isSameDay(addDays(fromISODate("2026-09-28"), 3), fromISODate("2026-10-01")));
check("isBefore true for earlier date", isBefore(fromISODate("2026-09-01"), fromISODate("2026-09-02")));
check("isBefore false for same date", isBefore(fromISODate("2026-09-01"), fromISODate("2026-09-01")) === false);

// --- nightsBetween ---
check("nightsBetween counts nights", nightsBetween(fromISODate("2026-09-10"), fromISODate("2026-09-13")) === 3);

// --- rangeHitsBlockedDate ---
const blocked = ["2026-09-12", "2026-09-13"];
check(
  "range overlapping a blocked date is detected",
  rangeHitsBlockedDate(fromISODate("2026-09-11"), fromISODate("2026-09-14"), blocked) === true
);
check(
  "range that only touches blocked date as checkout is allowed",
  rangeHitsBlockedDate(fromISODate("2026-09-10"), fromISODate("2026-09-12"), blocked) === false
);
check(
  "range entirely before blocked dates is allowed",
  rangeHitsBlockedDate(fromISODate("2026-09-01"), fromISODate("2026-09-05"), blocked) === false
);

// --- buildCalendarGrid ---
const grid = buildCalendarGrid(2026, 8, []); // September 2026 (month index 8)
check("calendar grid always has 42 cells", grid.length === 42);
const currentMonthDays = grid.filter((d) => d.inCurrentMonth);
check("September 2026 has 30 in-month days", currentMonthDays.length === 30);
check("first in-month day is Sep 1", isSameDay(currentMonthDays[0].date, fromISODate("2026-09-01")));

const gridWithBlocked = buildCalendarGrid(2026, 8, ["2026-09-15"]);
const sep15 = gridWithBlocked.find((d) => isSameDay(d.date, fromISODate("2026-09-15")));
check("blocked date is flagged in the grid", !!sep15 && sep15.isBlocked === true);

// --- formatDateRange ---
check("formatDateRange with no dates", formatDateRange(null, null) === "Add dates");
check(
  "formatDateRange with both dates",
  formatDateRange(fromISODate("2026-09-10"), fromISODate("2026-09-13")) === "Sep 10 - Sep 13"
);

// --- upcomingWeekend / formatDateRangeCompact ---
const wk = upcomingWeekend(fromISODate("2026-09-07")); // a Monday
check("upcomingWeekend starts on a Friday", wk.checkIn.getDay() === 5);
check("upcomingWeekend is 2 nights", nightsBetween(wk.checkIn, wk.checkOut) === 2);
check("upcomingWeekend is in the future", wk.checkIn.getTime() > fromISODate("2026-09-07").getTime());
const wkFromFriday = upcomingWeekend(fromISODate("2026-09-11")); // itself a Friday
check("upcomingWeekend from a Friday moves to next week", isSameDay(wkFromFriday.checkIn, fromISODate("2026-09-18")));

check(
  "compact range within one month",
  formatDateRangeCompact(fromISODate("2026-09-11"), fromISODate("2026-09-13")) === "11\u201313 Sept"
);
check(
  "compact range across months",
  formatDateRangeCompact(fromISODate("2026-09-30"), fromISODate("2026-10-02")) === "30 Sept \u2013 2 Oct"
);

// ---- timeAgo / tenure (review dates and "N years on airhome") ----
{
  const now = new Date("2026-09-07T12:00:00Z");
  const iso = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
  const cases: [number, string][] = [
    [0, "today"], [1, "1 day ago"], [3, "3 days ago"], [7, "1 week ago"], [20, "2 weeks ago"],
    [31, "1 month ago"], [200, "6 months ago"], [370, "1 year ago"], [800, "2 years ago"],
  ];
  for (const [d, want] of cases) check(`timeAgo(${d} days) = "${want}"`, timeAgo(iso(d), now) === want);
  check("tenure 300 days = 10 months", tenure(iso(300), now) === "10 months");
  check("tenure 2600 days = 7 years", tenure(iso(2600), now) === "7 years");
  check("tenure 45 days = 1 month", tenure(iso(45), now) === "1 month");
}

console.log();
if (failures.length > 0) {
  console.log(`${failures.length} test(s) FAILED:`, failures);
  process.exit(1);
} else {
  console.log("All date/calendar tests passed.");
}

