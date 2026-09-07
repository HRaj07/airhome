"""
Public user profiles — what you see when you click a reviewer's name.

Mirrors Airbnb's profile page: photo, name, home city, the three stats beside
the photo (trips, reviews, time on the platform), an "About" block, and the
reviews the person has written. Hosts also show their listings.
"""
import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..serializers import to_listing_cards

router = APIRouter(prefix="/users", tags=["users"])


@router.patch("/me", response_model=schemas.UserMe)
def update_me(
    payload: schemas.UpdateProfileRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Edit your own profile.

    Declared before /{user_id} so the literal path "me" wins the match instead
    of being parsed as an integer id.
    """
    changes = payload.model_dump(exclude_unset=True, exclude_none=True)
    for field, value in changes.items():
        setattr(current_user, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/{user_id}", response_model=schemas.UserProfile)
def get_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    today = datetime.date.today()
    trips = (
        db.query(func.count(models.Booking.id))
        .filter(
            models.Booking.guest_id == user.id,
            models.Booking.status == models.BookingStatus.confirmed,
            models.Booking.check_out <= today,
        )
        .scalar()
        or 0
    ) + (
        db.query(func.count(models.ExperienceBooking.id))
        .filter(
            models.ExperienceBooking.guest_id == user.id,
            models.ExperienceBooking.status == models.BookingStatus.confirmed,
            models.ExperienceBooking.date <= today,
        )
        .scalar()
        or 0
    )

    # Reviews they wrote, about homes and about experiences, newest first.
    listing_reviews = (
        db.query(models.Review)
        .options(selectinload(models.Review.listing))
        .filter(models.Review.author_id == user.id)
        .order_by(models.Review.created_at.desc())
        .limit(30)
        .all()
    )
    experience_reviews = (
        db.query(models.ExperienceReview)
        .options(selectinload(models.ExperienceReview.experience))
        .filter(models.ExperienceReview.author_id == user.id)
        .order_by(models.ExperienceReview.created_at.desc())
        .limit(30)
        .all()
    )
    reviews = [
        schemas.ProfileReview(
            id=r.id, rating=r.rating, comment=r.comment, created_at=r.created_at,
            subject_kind="listing", subject_id=r.listing.id,
            subject_title=r.listing.title, subject_city=r.listing.city,
        )
        for r in listing_reviews
    ] + [
        schemas.ProfileReview(
            id=r.id, rating=r.rating, comment=r.comment, created_at=r.created_at,
            subject_kind="experience", subject_id=r.experience.id,
            subject_title=r.experience.title, subject_city=r.experience.city,
        )
        for r in experience_reviews
    ]
    reviews.sort(key=lambda r: r.created_at, reverse=True)

    reviews_written = (
        (db.query(func.count(models.Review.id)).filter(models.Review.author_id == user.id).scalar() or 0)
        + (db.query(func.count(models.ExperienceReview.id)).filter(models.ExperienceReview.author_id == user.id).scalar() or 0)
    )

    listings = []
    if user.is_host:
        rows = (
            db.query(models.Listing)
            .options(selectinload(models.Listing.photos))
            .filter(models.Listing.host_id == user.id)
            .order_by(models.Listing.id.desc())
            .limit(12)
            .all()
        )
        listings = to_listing_cards(db, rows)

    months = max(0, (datetime.datetime.utcnow() - user.created_at).days // 30)

    return schemas.UserProfile(
        **schemas.UserPublic.model_validate(user).model_dump(),
        trips=trips,
        reviews_written=reviews_written,
        months_on_platform=months,
        reviews=reviews[:20],
        listings=listings,
    )
