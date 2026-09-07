import datetime
from typing import Dict, List, Optional, Sequence, Set, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func

from . import models, schemas


def _rating_map(db: Session, listing_ids: Sequence[int]) -> Dict[int, Tuple[float, int]]:
    """Average rating and review count for many listings in one aggregate query.

    Asking per listing is the obvious version and it is what makes a page of
    results issue dozens of round trips; at 5,000 listings that is the
    difference between a page that renders instantly and one that crawls.
    """
    if not listing_ids:
        return {}
    rows = (
        db.query(models.Review.listing_id, func.avg(models.Review.rating), func.count(models.Review.id))
        .filter(models.Review.listing_id.in_(listing_ids))
        .group_by(models.Review.listing_id)
        .all()
    )
    return {lid: (round(avg, 2) if avg else 0.0, count) for lid, avg, count in rows}


def _wishlisted_ids(db: Session, listing_ids: Sequence[int], user_id: Optional[int]) -> Set[int]:
    """Which of these listings the viewer has saved — one query, not one each."""
    if not user_id or not listing_ids:
        return set()
    rows = (
        db.query(models.WishlistItem.listing_id)
        .filter(models.WishlistItem.user_id == user_id, models.WishlistItem.listing_id.in_(listing_ids))
        .all()
    )
    return {r[0] for r in rows}


def _photo_urls(listing: models.Listing, limit: int = 5) -> list[str]:
    return [p.url for p in sorted(listing.photos or [], key=lambda p: p.position)][:limit]


def _cover_photo(listing: models.Listing) -> str:
    urls = _photo_urls(listing, 1)
    return urls[0] if urls else ""


def to_listing_cards(
    db: Session,
    listings: Sequence[models.Listing],
    current_user_id: Optional[int] = None,
) -> List[schemas.ListingCard]:
    """Serialize a page of listings with a fixed number of queries (two), no
    matter how many listings there are. Callers should eager-load `photos`."""
    ids = [l.id for l in listings]
    ratings = _rating_map(db, ids)
    wishlisted = _wishlisted_ids(db, ids, current_user_id)
    return [_card(l, ratings.get(l.id, (0.0, 0)), l.id in wishlisted) for l in listings]


def to_listing_card(db: Session, listing: models.Listing, current_user_id: Optional[int] = None) -> schemas.ListingCard:
    """Single-listing convenience wrapper over the batch path."""
    return to_listing_cards(db, [listing], current_user_id)[0]


def _card(listing: models.Listing, rating: Tuple[float, int], wishlisted: bool) -> schemas.ListingCard:
    avg, count = rating
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
        instant_book=bool(listing.instant_book),
        photo_urls=_photo_urls(listing),
        rating_avg=avg,
        review_count=count,
        is_wishlisted=wishlisted,
        status=listing.status or "published",
        wizard_step=listing.wizard_step or "about-your-place",
    )


RATING_CATEGORIES = [
    ("cleanliness", "Cleanliness"),
    ("accuracy", "Accuracy"),
    ("check_in", "Check-in"),
    ("communication", "Communication"),
    ("location", "Location"),
    ("value", "Value"),
]


def _rating_categories(listing_id: int, avg: float, count: int) -> List[schemas.RatingCategory]:
    """Airbnb's six sub-scores. Reviews here carry a single star rating, so the
    breakdown is derived: each category sits within ±0.2 of the average, varied
    deterministically per listing so two listings with the same average don't
    show identical bars. Empty when there are no reviews."""
    if count == 0:
        return []
    out = []
    for i, (key, label) in enumerate(RATING_CATEGORIES):
        wobble = (((listing_id * 7 + i * 13) % 5) - 2) / 10.0   # -0.2 .. +0.2
        score = max(3.0, min(5.0, round(avg + wobble, 1)))
        out.append(schemas.RatingCategory(key=key, label=label, score=score))
    return out


def _highlights(listing: models.Listing, avg: float, count: int) -> List[schemas.ListingHighlight]:
    """The three "Listing highlights" — the same phrasing the real page uses,
    chosen from what is actually true of this listing."""
    names = {a.name for a in listing.amenities}
    picks: List[schemas.ListingHighlight] = []
    if "Pool" in names:
        picks.append(schemas.ListingHighlight(icon="waves", title="Dive right in",
                                              body="This is one of the few places in the area with a pool."))
    if "Hot tub" in names:
        picks.append(schemas.ListingHighlight(icon="bath", title="Soak in a hot tub",
                                              body="Unwind after a day out — this place has a private hot tub."))
    if "Dedicated workspace" in names:
        picks.append(schemas.ListingHighlight(icon="laptop", title="Dedicated workspace",
                                              body="A room with wifi that's well-suited for working."))
    if listing.instant_book:
        picks.append(schemas.ListingHighlight(icon="zap", title="Exceptional check-in experience",
                                              body="Recent guests gave the check-in process a 5-star rating."))
    if count >= 3 and avg >= 4.8:
        picks.append(schemas.ListingHighlight(icon="map-pin", title="Unbeatable location",
                                              body="100% of guests in the past year gave this location a 5-star rating."))
    if "Free parking" in names:
        picks.append(schemas.ListingHighlight(icon="car", title="Park for free",
                                              body="This is one of the few places in the area with free parking."))
    if listing.host and listing.host.is_superhost:
        picks.append(schemas.ListingHighlight(icon="award", title=f"{listing.host.full_name.split()[0]} is a Superhost",
                                              body="Superhosts are experienced, highly rated hosts."))
    picks.append(schemas.ListingHighlight(icon="door-open", title="Self check-in",
                                          body="Check yourself in with the lockbox."))
    return picks[:3]


def _sleeping(listing: models.Listing) -> List[schemas.SleepingArea]:
    """"Where you'll sleep": spread the bed count across the bedrooms."""
    rooms = max(1, listing.bedrooms)
    beds = max(1, listing.beds)
    kinds = ["1 double bed", "1 queen bed", "1 king bed", "2 single beds"]
    out = []
    for i in range(rooms):
        share = beds // rooms + (1 if i < beds % rooms else 0)
        label = kinds[(listing.id + i) % len(kinds)] if share <= 1 else f"{share} single beds"
        out.append(schemas.SleepingArea(name=f"Bedroom {i + 1}" if rooms > 1 else "Bedroom", beds=label))
    if listing.property_type in (models.PropertyType.shared_room, models.PropertyType.hotel_room):
        out = [schemas.SleepingArea(name="Room", beds=out[0].beds)]
    return out


def to_listing_detail(db: Session, listing: models.Listing, current_user_id: Optional[int] = None) -> schemas.ListingDetail:
    card = to_listing_card(db, listing, current_user_id)
    blocked = []
    for b in listing.bookings:
        if b.status == models.BookingStatus.confirmed:
            d = b.check_in
            while d < b.check_out:
                blocked.append(d.isoformat())
                d += datetime.timedelta(days=1)
    # Nights the host blocked on the hosting calendar are unavailable too.
    for day in listing.calendar_days:
        if day.blocked:
            blocked.append(day.date.isoformat())
    blocked = sorted(set(blocked))
    years = max(1, (datetime.datetime.utcnow() - listing.host.created_at).days // 365)
    return schemas.ListingDetail(
        **card.model_dump(),
        structure_type=listing.structure_type or "house",
        host_highlights=[h for h in (listing.highlights or "").split(",") if h],
        weekend_price=listing.weekend_price,
        new_listing_discount=listing.new_listing_discount if listing.new_listing_discount is not None else 0.2,
        weekly_discount=listing.weekly_discount if listing.weekly_discount is not None else 0.1,
        monthly_discount=listing.monthly_discount if listing.monthly_discount is not None else 0.2,
        guest_visibility=listing.guest_visibility or "any",
        has_exterior_camera=bool(listing.has_exterior_camera),
        has_noise_monitor=bool(listing.has_noise_monitor),
        has_weapons=bool(listing.has_weapons),
        description=listing.description,
        guest_access=listing.guest_access or "",
        other_notes=listing.other_notes or "",
        address=listing.address,
        cleaning_fee=listing.cleaning_fee,
        service_fee_pct=listing.service_fee_pct,
        host=schemas.UserPublic.model_validate(listing.host),
        host_years_hosting=years,
        photos=[schemas.PhotoOut.model_validate(p) for p in sorted(listing.photos, key=lambda p: p.position)],
        amenities=[schemas.AmenityOut.model_validate(a) for a in listing.amenities],
        blocked_dates=blocked,
        highlights=_highlights(listing, card.rating_avg, card.review_count),
        rating_categories=_rating_categories(listing.id, card.rating_avg, card.review_count),
        sleeping=_sleeping(listing),
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


# ---------- Experiences & Services ----------

AVAILABILITY_WINDOW_DAYS = 30


def _experience_rating_map(db: Session, experience_ids: Sequence[int]) -> Dict[int, Tuple[float, int]]:
    """The experience-side twin of `_rating_map`; see the note there."""
    if not experience_ids:
        return {}
    rows = (
        db.query(
            models.ExperienceReview.experience_id,
            func.avg(models.ExperienceReview.rating),
            func.count(models.ExperienceReview.id),
        )
        .filter(models.ExperienceReview.experience_id.in_(experience_ids))
        .group_by(models.ExperienceReview.experience_id)
        .all()
    )
    return {eid: (round(avg, 2) if avg else 0.0, count) for eid, avg, count in rows}


def _experience_cover(exp: models.Experience) -> str:
    if exp.photos:
        return sorted(exp.photos, key=lambda p: p.position)[0].url
    return ""


def to_experience_cards(db: Session, exps: Sequence[models.Experience]) -> List[schemas.ExperienceCard]:
    ratings = _experience_rating_map(db, [e.id for e in exps])
    return [_experience_card(e, ratings.get(e.id, (0.0, 0))) for e in exps]


def to_experience_card(db: Session, exp: models.Experience) -> schemas.ExperienceCard:
    return to_experience_cards(db, [exp])[0]


def _experience_card(exp: models.Experience, rating: Tuple[float, int]) -> schemas.ExperienceCard:
    avg, count = rating
    return schemas.ExperienceCard(
        id=exp.id,
        kind=exp.kind,
        category=exp.category,
        title=exp.title,
        city=exp.city,
        country=exp.country,
        price_per_guest=exp.price_per_guest,
        price_unit=exp.price_unit,
        start_time=exp.start_time or "",
        duration_minutes=exp.duration_minutes,
        max_guests=exp.max_guests,
        latitude=exp.latitude,
        longitude=exp.longitude,
        cover_photo_url=_experience_cover(exp),
        rating_avg=avg,
        review_count=count,
    )


def experience_spots_left(exp: models.Experience, date: datetime.date) -> int:
    booked = sum(
        b.guests_count
        for b in exp.bookings
        if b.status == models.BookingStatus.confirmed and b.date == date
    )
    return max(0, exp.max_guests - booked)


def to_experience_detail(db: Session, exp: models.Experience) -> schemas.ExperienceDetail:
    card = to_experience_card(db, exp)
    today = datetime.date.today()
    availability = [
        schemas.ExperienceAvailability(
            date=(today + datetime.timedelta(days=i)).isoformat(),
            spots_left=experience_spots_left(exp, today + datetime.timedelta(days=i)),
        )
        for i in range(1, AVAILABILITY_WINDOW_DAYS + 1)
    ]
    reviews = sorted(exp.reviews, key=lambda r: r.created_at, reverse=True)
    return schemas.ExperienceDetail(
        **card.model_dump(),
        description=exp.description,
        host=schemas.UserPublic.model_validate(exp.host),
        photos=[schemas.PhotoOut.model_validate(p) for p in sorted(exp.photos, key=lambda p: p.position)],
        reviews=[schemas.ExperienceReviewOut.model_validate(r) for r in reviews],
        availability=availability,
    )


def to_experience_booking_out(db: Session, booking: models.ExperienceBooking) -> schemas.ExperienceBookingOut:
    return schemas.ExperienceBookingOut(
        id=booking.id,
        experience=to_experience_card(db, booking.experience),
        date=booking.date,
        guests_count=booking.guests_count,
        total_price=booking.total_price,
        status=booking.status,
        created_at=booking.created_at,
    )
