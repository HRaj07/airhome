import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..serializers import to_booking_out
from ..utils import booking_overlaps, calendar_overrides, quote_for_listing

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=schemas.BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(payload: schemas.BookingCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    listing = db.query(models.Listing).filter(models.Listing.id == payload.listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if payload.check_out <= payload.check_in:
        raise HTTPException(status_code=400, detail="check_out must be after check_in")
    if payload.check_in < datetime.date.today():
        raise HTTPException(status_code=400, detail="check_in cannot be in the past")
    if payload.guests_count < 1 or payload.guests_count > listing.max_guests:
        raise HTTPException(status_code=400, detail=f"Guests must be between 1 and {listing.max_guests}")
    if (listing.status or "published") != "published":
        raise HTTPException(status_code=404, detail="Listing not found")
    if booking_overlaps(payload.check_in, payload.check_out, listing.id, db):
        raise HTTPException(status_code=409, detail="Listing is not available for the selected dates")
    # Nights the host blocked on their calendar, and any they re-priced.
    overrides, blocked = calendar_overrides(db, listing.id, payload.check_in, payload.check_out)
    if blocked:
        raise HTTPException(status_code=409, detail="Listing is not available for the selected dates")

    # The guest is charged what they were quoted: weekend rates, per-night
    # prices from the host's calendar and any stay discount all apply here.
    quote = quote_for_listing(db, listing, payload.check_in, payload.check_out, overrides)

    booking = models.Booking(
        listing_id=listing.id,
        guest_id=user.id,
        check_in=payload.check_in,
        check_out=payload.check_out,
        guests_count=payload.guests_count,
        subtotal=quote.subtotal,
        cleaning_fee=quote.cleaning_fee,
        service_fee=quote.service_fee,
        total_price=quote.total,
        status=models.BookingStatus.confirmed,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return to_booking_out(booking)


@router.get("/mine", response_model=List[schemas.BookingOut])
def my_bookings(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    bookings = (
        db.query(models.Booking)
        .filter(models.Booking.guest_id == user.id)
        .order_by(models.Booking.check_in.desc())
        .all()
    )
    return [to_booking_out(b) for b in bookings]


@router.get("/listing/{listing_id}", response_model=List[schemas.BookingOut])
def bookings_for_listing(listing_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.host_id != user.id:
        raise HTTPException(status_code=403, detail="You do not own this listing")
    bookings = (
        db.query(models.Booking)
        .filter(models.Booking.listing_id == listing_id)
        .order_by(models.Booking.check_in.desc())
        .all()
    )
    return [to_booking_out(b) for b in bookings]


@router.delete("/{booking_id}", response_model=schemas.OkResponse)
def cancel_booking(booking_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.guest_id != user.id:
        raise HTTPException(status_code=403, detail="Not your booking")
    booking.status = models.BookingStatus.cancelled
    db.commit()
    return schemas.OkResponse(ok=True)
