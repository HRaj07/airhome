import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import require_host
from ..serializers import to_listing_card, to_booking_out

router = APIRouter(prefix="/host", tags=["host"])


@router.get("/dashboard", response_model=schemas.HostDashboard)
def dashboard(db: Session = Depends(get_db), host: models.User = Depends(require_host)):
    listings = db.query(models.Listing).filter(models.Listing.host_id == host.id).order_by(models.Listing.id.desc()).all()

    listing_summaries = []
    for l in listings:
        card = to_listing_card(db, l, host.id)
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

    return schemas.HostDashboard(
        listings=listing_summaries,
        upcoming_bookings=[to_booking_out(b) for b in upcoming],
    )
