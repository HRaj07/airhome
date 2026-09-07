import datetime

from sqlalchemy.orm import Session

from . import models


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
