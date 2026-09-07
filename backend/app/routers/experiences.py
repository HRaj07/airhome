"""
Experiences (hosted activities) and Services (bookable professionals).
Both live in the `experiences` table, distinguished by `kind`; every endpoint
here takes a `kind` filter so the two tabs stay independent.
"""
import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..serializers import (
    to_experience_card,
    to_experience_detail,
    to_experience_booking_out,
    experience_spots_left,
)

router = APIRouter(prefix="/experiences", tags=["experiences"])

EXPERIENCE_ROW_TITLES = [
    "Happening today in {city}",
    "Tomorrow in {city}",
    "This weekend in {city}",
    "Top-rated in {city}",
]


def _base_query(db: Session, kind: models.ExperienceKind):
    return db.query(models.Experience).filter(models.Experience.kind == kind)


@router.get("/featured", response_model=List[schemas.ExperienceRow])
def featured(
    kind: models.ExperienceKind = Query(models.ExperienceKind.experience),
    db: Session = Depends(get_db),
):
    """Carousel rows for the Experiences / Services tabs.

    Experiences are grouped by city (like Airbnb's "Happening today in ..."),
    services by category ("Photography", "Training", ...)."""
    items = _base_query(db, kind).order_by(models.Experience.id.asc()).all()
    groups: dict[str, list[models.Experience]] = {}
    if kind == models.ExperienceKind.service:
        for e in items:
            groups.setdefault(e.category, []).append(e)
        ordered = sorted(groups.items(), key=lambda kv: (-len(kv[1]), kv[0]))
        return [
            schemas.ExperienceRow(title=cat, key=cat, items=[to_experience_card(db, e) for e in group[:12]])
            for cat, group in ordered
        ]

    for e in items:
        groups.setdefault(e.city, []).append(e)
    ordered = sorted(groups.items(), key=lambda kv: (-len(kv[1]), kv[0]))
    rows = []
    for i, (city, group) in enumerate(ordered):
        rows.append(
            schemas.ExperienceRow(
                title=EXPERIENCE_ROW_TITLES[i % len(EXPERIENCE_ROW_TITLES)].format(city=city),
                key=city,
                items=[to_experience_card(db, e) for e in group[:12]],
            )
        )
    return rows


@router.get("", response_model=schemas.PaginatedExperiences)
def search(
    kind: models.ExperienceKind = Query(models.ExperienceKind.experience),
    location: Optional[str] = None,
    category: Optional[str] = None,
    date: Optional[datetime.date] = None,
    guests: Optional[int] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(18, ge=1, le=50),
    db: Session = Depends(get_db),
):
    q = _base_query(db, kind)
    if location:
        like = f"%{location}%"
        q = q.filter(or_(models.Experience.city.ilike(like), models.Experience.country.ilike(like)))
    if category:
        q = q.filter(models.Experience.category.ilike(f"%{category}%"))
    if guests:
        q = q.filter(models.Experience.max_guests >= guests)

    all_matching = q.order_by(models.Experience.id.asc()).all()
    if date:
        needed = guests or 1
        all_matching = [e for e in all_matching if experience_spots_left(e, date) >= needed]

    total = len(all_matching)
    start = (page - 1) * limit
    page_items = all_matching[start : start + limit]
    return schemas.PaginatedExperiences(
        items=[to_experience_card(db, e) for e in page_items],
        total=total,
        page=page,
        limit=limit,
        has_more=start + limit < total,
    )


@router.get("/categories", response_model=List[str])
def categories(kind: models.ExperienceKind = Query(models.ExperienceKind.service), db: Session = Depends(get_db)):
    rows = db.query(models.Experience.category).filter(models.Experience.kind == kind).distinct().all()
    return sorted(r[0] for r in rows)


@router.get("/bookings/mine", response_model=List[schemas.ExperienceBookingOut])
def my_bookings(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    bookings = (
        db.query(models.ExperienceBooking)
        .filter(models.ExperienceBooking.guest_id == user.id)
        .order_by(models.ExperienceBooking.date.desc())
        .all()
    )
    return [to_experience_booking_out(db, b) for b in bookings]


@router.delete("/bookings/{booking_id}", response_model=schemas.OkResponse)
def cancel_booking(booking_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    booking = db.query(models.ExperienceBooking).filter(models.ExperienceBooking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.guest_id != user.id:
        raise HTTPException(status_code=403, detail="Not your booking")
    booking.status = models.BookingStatus.cancelled
    db.commit()
    return schemas.OkResponse(ok=True)


@router.get("/{experience_id}", response_model=schemas.ExperienceDetail)
def get_experience(experience_id: int, db: Session = Depends(get_db)):
    exp = db.query(models.Experience).filter(models.Experience.id == experience_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Not found")
    return to_experience_detail(db, exp)


@router.post("/{experience_id}/bookings", response_model=schemas.ExperienceBookingOut, status_code=status.HTTP_201_CREATED)
def book(
    experience_id: int,
    payload: schemas.ExperienceBookingCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    exp = db.query(models.Experience).filter(models.Experience.id == experience_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Not found")
    if payload.date < datetime.date.today():
        raise HTTPException(status_code=400, detail="Date cannot be in the past")
    if payload.guests_count > exp.max_guests:
        raise HTTPException(status_code=400, detail=f"Maximum {exp.max_guests} guests")
    spots = experience_spots_left(exp, payload.date)
    if payload.guests_count > spots:
        raise HTTPException(status_code=409, detail=f"Only {spots} spot{'s' if spots != 1 else ''} left on that date")

    if exp.price_unit == "group":
        total = round(exp.price_per_guest, 2)
    else:
        total = round(exp.price_per_guest * payload.guests_count, 2)

    booking = models.ExperienceBooking(
        experience_id=exp.id,
        guest_id=user.id,
        date=payload.date,
        guests_count=payload.guests_count,
        total_price=total,
        status=models.BookingStatus.confirmed,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return to_experience_booking_out(db, booking)


@router.post("/{experience_id}/reviews", response_model=schemas.ExperienceReviewOut, status_code=201)
def review(
    experience_id: int,
    payload: schemas.ExperienceReviewCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    exp = db.query(models.Experience).filter(models.Experience.id == experience_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Not found")
    attended = (
        db.query(models.ExperienceBooking)
        .filter(
            models.ExperienceBooking.experience_id == experience_id,
            models.ExperienceBooking.guest_id == user.id,
            models.ExperienceBooking.status == models.BookingStatus.confirmed,
            models.ExperienceBooking.date <= datetime.date.today(),
        )
        .first()
    )
    if not attended:
        raise HTTPException(status_code=403, detail="You can review after attending")
    r = models.ExperienceReview(experience_id=experience_id, author_id=user.id, rating=payload.rating, comment=payload.comment)
    db.add(r)
    db.commit()
    db.refresh(r)
    return schemas.ExperienceReviewOut.model_validate(r)
