import datetime
from math import asin, cos, radians, sin, sqrt

from sqlalchemy.orm import Session

from . import models


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
