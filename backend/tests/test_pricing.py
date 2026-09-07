"""
Standalone unit tests for the dependency-free pricing/date logic.
Run with: python3 -m tests.test_pricing   (from the backend/ directory)
No third-party packages required.
"""
import datetime
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.pricing import compute_price, nights_between, date_ranges_overlap

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

print()
if failures:
    print(f"{len(failures)} test(s) FAILED: {failures}")
    sys.exit(1)
else:
    print("All pricing/date tests passed.")
