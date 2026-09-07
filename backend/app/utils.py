import datetime
from math import asin, cos, radians, sin, sqrt
from typing import Dict, Optional, Tuple

from sqlalchemy.orm import Session

from . import models
from .pricing import Quote, quote_stay


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in kilometres between two coordinates."""
    d_lat = radians(lat2 - lat1)
    d_lng = radians(lng2 - lng1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lng / 2) ** 2
    return 2 * 6371 * asin(sqrt(a))


def booking_overlaps(
    check_in: datetime.date,
    check_out: datetime.date,
    listing_id: int,
    db: Session,
    exclude_booking_id: int | None = None,
) -> bool:
    """True if [check_in, check_out) overlaps any existing confirmed booking for this listing.

    The actual interval-overlap predicate lives in pricing.date_ranges_overlap (pure,
    unit-tested); this wraps it with the DB query needed to find candidate bookings.
    """
    q = db.query(models.Booking).filter(
        models.Booking.listing_id == listing_id,
        models.Booking.status == models.BookingStatus.confirmed,
        models.Booking.check_in < check_out,
        models.Booking.check_out > check_in,
    )
    if exclude_booking_id:
        q = q.filter(models.Booking.id != exclude_booking_id)
    return q.first() is not None


def calendar_overrides(db: Session, listing_id: int, check_in: datetime.date, check_out: datetime.date) -> Tuple[Dict[datetime.date, float], bool]:
    """The host's per-night settings for a stay: (custom prices, any night blocked)."""
    rows = (
        db.query(models.ListingCalendarDay)
        .filter(
            models.ListingCalendarDay.listing_id == listing_id,
            models.ListingCalendarDay.date >= check_in,
            models.ListingCalendarDay.date < check_out,
        )
        .all()
    )
    prices = {r.date: r.price for r in rows if r.price is not None}
    return prices, any(r.blocked for r in rows)


def quote_for_listing(
    db: Session,
    listing: models.Listing,
    check_in: datetime.date,
    check_out: datetime.date,
    overrides: Optional[Dict[datetime.date, float]] = None,
) -> Quote:
    """Price a stay against how the host has actually set the listing up: the
    weekend rate, any night they re-priced on their calendar, and whichever
    length-of-stay or new-listing discount applies.

    The new-listing promotion runs out after the listing's first few bookings,
    so the count is read here rather than assumed.
    """
    if overrides is None:
        overrides, _ = calendar_overrides(db, listing.id, check_in, check_out)
    bookings_so_far = (
        db.query(models.Booking)
        .filter(
            models.Booking.listing_id == listing.id,
            models.Booking.status == models.BookingStatus.confirmed,
        )
        .count()
    )
    return quote_stay(
        check_in=check_in,
        check_out=check_out,
        base_price=listing.price_per_night,
        cleaning_fee=listing.cleaning_fee or 0.0,
        service_fee_pct=listing.service_fee_pct or 0.12,
        weekend_price=listing.weekend_price,
        overrides=overrides,
        weekly_discount=listing.weekly_discount or 0.0,
        monthly_discount=listing.monthly_discount or 0.0,
        new_listing_discount=listing.new_listing_discount or 0.0,
        bookings_so_far=bookings_so_far,
    )
