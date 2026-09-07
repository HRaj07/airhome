import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db
from ..deps import require_host
from ..serializers import to_listing_cards, to_booking_out, to_experience_cards

router = APIRouter(prefix="/host", tags=["host"])


@router.get("/dashboard", response_model=schemas.HostDashboard)
def dashboard(db: Session = Depends(get_db), host: models.User = Depends(require_host)):
    listings = (
        db.query(models.Listing)
        .options(selectinload(models.Listing.photos), selectinload(models.Listing.bookings))
        .filter(models.Listing.host_id == host.id)
        .order_by(models.Listing.id.desc())
        .all()
    )

    cards = to_listing_cards(db, listings, host.id)
    listing_summaries = []
    for l, card in zip(listings, cards):
        confirmed = [b for b in l.bookings if b.status == models.BookingStatus.confirmed]
        revenue = round(sum(b.total_price for b in confirmed), 2)
        listing_summaries.append(
            schemas.HostListingSummary(**card.model_dump(), booking_count=len(confirmed), revenue=revenue)
        )

    listing_ids = [l.id for l in listings]
    upcoming = []
    if listing_ids:
        upcoming = (
            db.query(models.Booking)
            .filter(
                models.Booking.listing_id.in_(listing_ids),
                models.Booking.status == models.BookingStatus.confirmed,
                models.Booking.check_out >= datetime.date.today(),
            )
            .order_by(models.Booking.check_in.asc())
            .limit(20)
            .all()
        )

    # Experiences and services live in one table, split by kind for the two
    # dashboard sections. Revenue counts confirmed bookings only, same as homes.
    hosted = (
        db.query(models.Experience)
        .options(selectinload(models.Experience.photos), selectinload(models.Experience.bookings))
        .filter(models.Experience.host_id == host.id)
        .order_by(models.Experience.id.desc())
        .all()
    )
    experience_cards = {c.id: c for c in to_experience_cards(db, hosted)}

    def summarise(exp: models.Experience) -> schemas.HostExperienceSummary:
        confirmed = [b for b in exp.bookings if b.status == models.BookingStatus.confirmed]
        return schemas.HostExperienceSummary(
            **experience_cards[exp.id].model_dump(),
            booking_count=len(confirmed),
            revenue=round(sum(b.total_price for b in confirmed), 2),
        )

    return schemas.HostDashboard(
        listings=listing_summaries,
        upcoming_bookings=[to_booking_out(b) for b in upcoming],
        experiences=[summarise(e) for e in hosted if e.kind == models.ExperienceKind.experience],
        services=[summarise(e) for e in hosted if e.kind == models.ExperienceKind.service],
    )
