import datetime
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import func

from . import models, schemas


def _rating_stats(db: Session, listing_id: int):
    row = (
        db.query(func.avg(models.Review.rating), func.count(models.Review.id))
        .filter(models.Review.listing_id == listing_id)
        .first()
    )
    avg = round(row[0], 2) if row and row[0] else 0.0
    count = row[1] if row else 0
    return avg, count


def _cover_photo(listing: models.Listing) -> str:
    if listing.photos:
        return sorted(listing.photos, key=lambda p: p.position)[0].url
    return ""


def _is_wishlisted(db: Session, listing_id: int, user_id: Optional[int]) -> bool:
    if not user_id:
        return False
    return (
        db.query(models.WishlistItem)
        .filter(models.WishlistItem.listing_id == listing_id, models.WishlistItem.user_id == user_id)
        .first()
        is not None
    )


def to_listing_card(db: Session, listing: models.Listing, current_user_id: Optional[int] = None) -> schemas.ListingCard:
    avg, count = _rating_stats(db, listing.id)
    return schemas.ListingCard(
        id=listing.id,
        title=listing.title,
        neighborhood=listing.neighborhood or "",
        city=listing.city,
        state=listing.state,
        country=listing.country,
        price_per_night=listing.price_per_night,
        property_type=listing.property_type,
        max_guests=listing.max_guests,
        bedrooms=listing.bedrooms,
        beds=listing.beds,
        bathrooms=listing.bathrooms,
        latitude=listing.latitude,
        longitude=listing.longitude,
        cover_photo_url=_cover_photo(listing),
        rating_avg=avg,
        review_count=count,
        is_wishlisted=_is_wishlisted(db, listing.id, current_user_id),
    )


def to_listing_detail(db: Session, listing: models.Listing, current_user_id: Optional[int] = None) -> schemas.ListingDetail:
    card = to_listing_card(db, listing, current_user_id)
    blocked = []
    for b in listing.bookings:
        if b.status == models.BookingStatus.confirmed:
            d = b.check_in
            while d < b.check_out:
                blocked.append(d.isoformat())
                d += datetime.timedelta(days=1)
    return schemas.ListingDetail(
        **card.model_dump(),
        description=listing.description,
        address=listing.address,
        cleaning_fee=listing.cleaning_fee,
        service_fee_pct=listing.service_fee_pct,
        host=schemas.UserPublic.model_validate(listing.host),
        photos=[schemas.PhotoOut.model_validate(p) for p in sorted(listing.photos, key=lambda p: p.position)],
        amenities=[schemas.AmenityOut.model_validate(a) for a in listing.amenities],
        blocked_dates=blocked,
    )


def to_booking_out(booking: models.Booking) -> schemas.BookingOut:
    nights = (booking.check_out - booking.check_in).days
    return schemas.BookingOut(
        id=booking.id,
        listing=schemas.BookingListingSummary(
            id=booking.listing.id,
            title=booking.listing.title,
            cover_photo_url=_cover_photo(booking.listing),
            city=booking.listing.city,
            country=booking.listing.country,
            price_per_night=booking.listing.price_per_night,
        ),
        check_in=booking.check_in,
        check_out=booking.check_out,
        guests_count=booking.guests_count,
        nights=nights,
        subtotal=booking.subtotal,
        cleaning_fee=booking.cleaning_fee,
        service_fee=booking.service_fee,
        total_price=booking.total_price,
        status=booking.status,
        created_at=booking.created_at,
    )
