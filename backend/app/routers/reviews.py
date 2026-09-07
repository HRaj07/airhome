import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(tags=["reviews"])


@router.get("/listings/{listing_id}/reviews", response_model=List[schemas.ReviewOut])
def list_reviews(listing_id: int, db: Session = Depends(get_db)):
    reviews = (
        db.query(models.Review)
        .filter(models.Review.listing_id == listing_id)
        .order_by(models.Review.created_at.desc())
        .all()
    )
    return [schemas.ReviewOut.model_validate(r) for r in reviews]


@router.post("/listings/{listing_id}/reviews", response_model=schemas.ReviewOut, status_code=201)
def create_review(listing_id: int, payload: schemas.ReviewCreate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    completed_booking = (
        db.query(models.Booking)
        .filter(
            models.Booking.listing_id == listing_id,
            models.Booking.guest_id == user.id,
            models.Booking.status == models.BookingStatus.confirmed,
            models.Booking.check_out <= datetime.date.today(),
        )
        .order_by(models.Booking.check_out.desc())
        .first()
    )
    if not completed_booking:
        raise HTTPException(status_code=403, detail="You can only review listings after a completed stay")

    existing = db.query(models.Review).filter(models.Review.booking_id == completed_booking.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this stay")

    review = models.Review(
        listing_id=listing_id,
        booking_id=completed_booking.id,
        author_id=user.id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return schemas.ReviewOut.model_validate(review)
