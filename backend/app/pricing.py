"""Pure pricing math, isolated from the DB layer so it can be unit tested
without any third-party dependencies.

What a stay costs is not `nights x price_per_night`. A host can set a weekend
rate, override individual nights on their calendar, and offer length-of-stay
discounts; Airbnb quotes all of that before the guest pays. `quote_stay` is the
single place that resolves it, so the widget, the checkout page and the booking
endpoint can never disagree about the price.
"""
import datetime
from typing import Dict, List, NamedTuple, Optional

#: Friday and Saturday nights carry the weekend rate, when the host set one.
WEEKEND_WEEKDAYS = (4, 5)

#: Airbnb's thresholds for its two length-of-stay discounts.
WEEKLY_DISCOUNT_NIGHTS = 7
MONTHLY_DISCOUNT_NIGHTS = 28

#: How many of a listing's bookings the "new listing" promotion applies to.
NEW_LISTING_PROMO_BOOKINGS = 3


def nights_between(check_in: datetime.date, check_out: datetime.date) -> int:
    return (check_out - check_in).days


def date_ranges_overlap(a_start: datetime.date, a_end: datetime.date, b_start: datetime.date, b_end: datetime.date) -> bool:
    """Half-open interval overlap: [a_start, a_end) vs [b_start, b_end).
    A checkout date equal to another booking's check-in date is NOT an overlap."""
    return a_start < b_end and a_end > b_start


def nightly_rate(
    night: datetime.date,
    base_price: float,
    weekend_price: Optional[float] = None,
    overrides: Optional[Dict[datetime.date, float]] = None,
) -> float:
    """What one night costs, most specific rule first: a price the host set on
    that date in their calendar, then the weekend rate, then the base rate."""
    if overrides and night in overrides and overrides[night] is not None:
        return overrides[night]
    if weekend_price and night.weekday() in WEEKEND_WEEKDAYS:
        return weekend_price
    return base_price


def nightly_rates(
    check_in: datetime.date,
    check_out: datetime.date,
    base_price: float,
    weekend_price: Optional[float] = None,
    overrides: Optional[Dict[datetime.date, float]] = None,
) -> List[float]:
    """The rate for every night of the stay. Checkout day is not a night."""
    out = []
    night = check_in
    while night < check_out:
        out.append(nightly_rate(night, base_price, weekend_price, overrides))
        night += datetime.timedelta(days=1)
    return out


class StayDiscount(NamedTuple):
    """The one discount applied to a stay, and what to call it on the receipt."""
    label: str
    rate: float
    amount: float


def stay_discount(
    nights: int,
    nightly_subtotal: float,
    weekly_discount: float = 0.0,
    monthly_discount: float = 0.0,
    new_listing_discount: float = 0.0,
    bookings_so_far: Optional[int] = None,
) -> Optional[StayDiscount]:
    """The best single discount this stay qualifies for.

    Airbnb stacks nothing: a month-long stay at a brand-new listing gets the
    larger of the two, not both. Candidates are the monthly rate (28+ nights),
    the weekly rate (7+), and the new-listing promotion, which only runs for the
    listing's first few bookings — pass `bookings_so_far` to enforce that, or
    leave it None when the caller has already decided the promo applies.
    """
    candidates: List[StayDiscount] = []
    if monthly_discount > 0 and nights >= MONTHLY_DISCOUNT_NIGHTS:
        candidates.append(StayDiscount("Monthly stay discount", monthly_discount, 0.0))
    elif weekly_discount > 0 and nights >= WEEKLY_DISCOUNT_NIGHTS:
        candidates.append(StayDiscount("Weekly stay discount", weekly_discount, 0.0))
    promo_open = bookings_so_far is None or bookings_so_far < NEW_LISTING_PROMO_BOOKINGS
    if new_listing_discount > 0 and promo_open:
        candidates.append(StayDiscount("New listing promotion", new_listing_discount, 0.0))
    if not candidates:
        return None
    best = max(candidates, key=lambda d: d.rate)
    return best._replace(amount=round(nightly_subtotal * best.rate, 2))


class Quote(NamedTuple):
    """Everything the receipt shows, so the client renders rather than computes."""
    nights: int
    rates: List[float]
    avg_nightly: float
    nightly_subtotal: float
    discount_label: str
    discount_rate: float
    discount_amount: float
    subtotal: float          # after discount — what the fees are charged on
    cleaning_fee: float
    service_fee: float
    total: float


def quote_stay(
    check_in: datetime.date,
    check_out: datetime.date,
    base_price: float,
    cleaning_fee: float = 0.0,
    service_fee_pct: float = 0.12,
    weekend_price: Optional[float] = None,
    overrides: Optional[Dict[datetime.date, float]] = None,
    weekly_discount: float = 0.0,
    monthly_discount: float = 0.0,
    new_listing_discount: float = 0.0,
    bookings_so_far: Optional[int] = None,
) -> Quote:
    """Price a stay the way the listing is actually configured.

    The service fee is charged on the discounted subtotal, so a discount reduces
    the fee with it — which is what makes the total on the receipt match the
    sum of the lines above it.
    """
    nights = nights_between(check_in, check_out)
    if nights <= 0:
        raise ValueError("nights must be positive")

    rates = nightly_rates(check_in, check_out, base_price, weekend_price, overrides)
    nightly_subtotal = round(sum(rates), 2)
    discount = stay_discount(
        nights, nightly_subtotal, weekly_discount, monthly_discount,
        new_listing_discount, bookings_so_far,
    )
    discount_amount = discount.amount if discount else 0.0
    subtotal = round(nightly_subtotal - discount_amount, 2)
    service_fee = round(subtotal * service_fee_pct, 2)
    total = round(subtotal + cleaning_fee + service_fee, 2)

    return Quote(
        nights=nights,
        rates=rates,
        avg_nightly=round(nightly_subtotal / nights, 2),
        nightly_subtotal=nightly_subtotal,
        discount_label=discount.label if discount else "",
        discount_rate=discount.rate if discount else 0.0,
        discount_amount=discount_amount,
        subtotal=subtotal,
        cleaning_fee=cleaning_fee,
        service_fee=service_fee,
        total=total,
    )


def compute_price(nights: int, price_per_night: float, cleaning_fee: float, service_fee_pct: float):
    """Flat-rate pricing: (subtotal, service_fee, total).

    Kept for callers that have no calendar to consult — the seed builds its demo
    bookings with it. Anything quoting a real stay should use `quote_stay`.
    """
    if nights <= 0:
        raise ValueError("nights must be positive")
    subtotal = round(nights * price_per_night, 2)
    service_fee = round(subtotal * service_fee_pct, 2)
    total = round(subtotal + cleaning_fee + service_fee, 2)
    return subtotal, service_fee, total
