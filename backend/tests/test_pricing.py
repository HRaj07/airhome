"""
Standalone unit tests for the dependency-free pricing/date logic.
Run with: python3 -m tests.test_pricing   (from the backend/ directory)
No third-party packages required.
"""
import datetime
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.pricing import (
    compute_price, nights_between, date_ranges_overlap,
    nightly_rate, nightly_rates, stay_discount, quote_stay,
)

failures = []


def check(label, condition):
    if not condition:
        failures.append(label)
        print(f"FAIL: {label}")
    else:
        print(f"ok:   {label}")


def d(s):
    return datetime.date.fromisoformat(s)


# --- nights_between ---
check("nights_between counts nights not days inclusive", nights_between(d("2026-09-10"), d("2026-09-13")) == 3)
check("nights_between same day would be 0", nights_between(d("2026-09-10"), d("2026-09-10")) == 0)

# --- compute_price ---
subtotal, service_fee, total = compute_price(3, 100.0, 50.0, 0.12)
check("subtotal = nights * price", subtotal == 300.0)
check("service fee = 12% of subtotal", service_fee == 36.0)
check("total = subtotal + cleaning + service", total == 386.0)

subtotal2, service_fee2, total2 = compute_price(1, 99.99, 20.0, 0.1)
check("rounding works for fractional prices", subtotal2 == 99.99 and service_fee2 == 10.0 and total2 == 129.99)

try:
    compute_price(0, 100, 0, 0.1)
    check("compute_price rejects zero nights", False)
except ValueError:
    check("compute_price rejects zero nights", True)

try:
    compute_price(-1, 100, 0, 0.1)
    check("compute_price rejects negative nights", False)
except ValueError:
    check("compute_price rejects negative nights", True)

# --- date_ranges_overlap ---
# Existing booking: Sep 10 (check-in) - Sep 15 (check-out)
existing_in, existing_out = d("2026-09-10"), d("2026-09-15")

# New checkout exactly equals existing check-in -> should NOT overlap (back-to-back OK)
check(
    "back-to-back before existing booking is allowed",
    date_ranges_overlap(d("2026-09-05"), d("2026-09-10"), existing_in, existing_out) is False,
)
# New check-in exactly equals existing checkout -> should NOT overlap
check(
    "back-to-back after existing booking is allowed",
    date_ranges_overlap(d("2026-09-15"), d("2026-09-20"), existing_in, existing_out) is False,
)
# Fully inside existing range -> overlap
check(
    "booking fully inside an existing range overlaps",
    date_ranges_overlap(d("2026-09-11"), d("2026-09-13"), existing_in, existing_out) is True,
)
# Overlapping the front
check(
    "booking overlapping the front overlaps",
    date_ranges_overlap(d("2026-09-08"), d("2026-09-12"), existing_in, existing_out) is True,
)
# Overlapping the back
check(
    "booking overlapping the back overlaps",
    date_ranges_overlap(d("2026-09-12"), d("2026-09-18"), existing_in, existing_out) is True,
)
# Fully containing existing range
check(
    "booking fully containing an existing range overlaps",
    date_ranges_overlap(d("2026-09-01"), d("2026-09-30"), existing_in, existing_out) is True,
)
# Completely separate, no overlap
check(
    "completely separate ranges do not overlap",
    date_ranges_overlap(d("2026-10-01"), d("2026-10-05"), existing_in, existing_out) is False,
)

# ---------------------------------------------------------------- quote_stay
#
# What a stay costs is not nights x nightly rate: a host can set a weekend
# rate, re-price individual nights on their calendar, and offer length-of-stay
# discounts. These pin down the resolution order and the arithmetic, since the
# booking endpoint, the price breakdown and the quote endpoint all rely on it.

FRI, SAT, SUN = d("2026-06-05"), d("2026-06-06"), d("2026-06-07")

check("a weekday night uses the base rate", nightly_rate(SUN, 100, weekend_price=150) == 100)
check("a Friday night uses the weekend rate", nightly_rate(FRI, 100, weekend_price=150) == 150)
check("a Saturday night uses the weekend rate", nightly_rate(SAT, 100, weekend_price=150) == 150)
check("no weekend rate means the base rate applies all week", nightly_rate(SAT, 100) == 100)
check("a calendar price beats the weekend rate",
      nightly_rate(SAT, 100, weekend_price=150, overrides={SAT: 80}) == 80)
check("a calendar price beats the base rate",
      nightly_rate(SUN, 100, overrides={SUN: 250}) == 250)

check("one rate per night, checkout day excluded",
      nightly_rates(FRI, d("2026-06-08"), 100, weekend_price=150) == [150, 150, 100])

check("no discount below the weekly threshold", stay_discount(6, 600, weekly_discount=0.1) is None)
check("7 nights earns the weekly discount", stay_discount(7, 700, weekly_discount=0.1).rate == 0.1)
check("28 nights earns the monthly discount, not the weekly",
      stay_discount(28, 2800, weekly_discount=0.1, monthly_discount=0.2).label == "Monthly stay discount")
check("the larger of two applicable discounts wins",
      stay_discount(7, 700, weekly_discount=0.1, new_listing_discount=0.2).label == "New listing promotion")
check("discounts do not stack",
      stay_discount(7, 700, weekly_discount=0.1, new_listing_discount=0.2).amount == 140.0)
check("the new-listing promotion expires after 3 bookings",
      stay_discount(3, 300, new_listing_discount=0.2, bookings_so_far=3) is None)
check("the new-listing promotion still runs on the third booking",
      stay_discount(3, 300, new_listing_discount=0.2, bookings_so_far=2) is not None)

q = quote_stay(FRI, d("2026-06-08"), base_price=100, cleaning_fee=30, service_fee_pct=0.12, weekend_price=150)
check("a mixed-rate stay sums its nights", q.nightly_subtotal == 400.0)
check("the average nightly rate is reported for the receipt", q.avg_nightly == round(400 / 3, 2))
check("no discount leaves the subtotal alone", q.subtotal == 400.0)
check("the service fee is a percentage of the subtotal", q.service_fee == 48.0)
check("the total is subtotal + cleaning + service", q.total == 478.0)

qd = quote_stay(d("2026-06-01"), d("2026-06-08"), base_price=100, cleaning_fee=30,
                service_fee_pct=0.12, weekly_discount=0.1)
check("a week-long stay is discounted", qd.discount_amount == 70.0)
check("the fee is charged on the discounted subtotal", qd.service_fee == round(630 * 0.12, 2))
check("a discounted total still adds up",
      abs(qd.total - (qd.subtotal + qd.cleaning_fee + qd.service_fee)) < 0.011)

qo = quote_stay(FRI, d("2026-06-08"), base_price=100, weekend_price=150, overrides={SAT: 500})
check("a night the host re-priced is charged at that price", qo.rates == [150, 500, 100])
check("and it lands in the subtotal", qo.nightly_subtotal == 750.0)

try:
    quote_stay(d("2026-06-08"), d("2026-06-08"), base_price=100)
    check("a zero-night stay is rejected", False)
except ValueError:
    check("a zero-night stay is rejected", True)

print()
if failures:
    print(f"{len(failures)} test(s) FAILED: {failures}")
    sys.exit(1)
else:
    print("All pricing/date tests passed.")
