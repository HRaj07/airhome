"""
Experiences (hosted activities) and Services (bookable professionals).
Both live in the `experiences` table, distinguished by `kind`; every endpoint
here takes a `kind` filter so the two tabs stay independent.
"""
import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db
from ..rows import distinct_cards, group_candidates, rank_cities_by_distance
from ..deps import get_current_user
from ..serializers import (
    to_experience_cards,
    to_experience_detail,
    to_experience_booking_out,
    experience_spots_left,
)

router = APIRouter(prefix="/experiences", tags=["experiences"])

#: Cards per carousel row.
PER_ROW = 12

EXPERIENCE_ROW_TITLES = [
    "Happening today in {city}",
    "Tomorrow in {city}",
    "This weekend in {city}",
    "Top-rated in {city}",
]

#: Used instead of the above once we know roughly where the guest is, so the
#: rows read as local. Mirrors NEAR_ROW_TITLES in the listings router.
NEAR_EXPERIENCE_TITLES = [
    "Experiences near you in {city}",
    "Happening near {city}",
    "This weekend in {city}",
    "Top-rated near {city}",
]

NEAR_SERVICE_TITLES = [
    "Services near you in {city}",
    "Available near {city}",
    "Book in {city}",
    "Top-rated near {city}",
]

#: A city further away than this is a suggestion, not a local one.
NEAR_RADIUS_KM = 400


def _base_query(db: Session, kind: models.ExperienceKind):
    return db.query(models.Experience).filter(models.Experience.kind == kind)


@router.get("/featured", response_model=List[schemas.ExperienceRow])
def featured(
    kind: models.ExperienceKind = Query(models.ExperienceKind.experience),
    rows: int = Query(12, ge=1, le=40, description="How many carousel rows to build"),
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lng: Optional[float] = Query(None, ge=-180, le=180),
    db: Session = Depends(get_db),
):
    """Carousel rows for the Experiences / Services tabs.

    Without coordinates: experiences are grouped by city (Airbnb's "Happening
    today in ..."), services by category ("Photography", "Training", ...).

    With coordinates both kinds group by city instead, ranked by distance from
    the guest, so the two tabs answer "what can I book around here?" the same
    way the homes tab does — a service catalogue is useless if the photographer
    is on another continent."""
    if lat is not None and lng is not None:
        return _featured_near(db, kind, rows, lat, lng)
    # Group in SQL and build only the rows the page shows. With ~500 cities in
    # the catalogue, grouping every row in Python meant serializing thousands of
    # cards for a page that displays a dozen rows.
    group_col = models.Experience.category if kind == models.ExperienceKind.service else models.Experience.city
    keys = [
        row[0]
        for row in db.query(group_col, func.count(models.Experience.id))
        .filter(models.Experience.kind == kind)
        .group_by(group_col)
        .order_by(func.count(models.Experience.id).desc(), group_col.asc())
        .limit(rows)
        .all()
    ]
    if not keys:
        return []

    items = (
        _base_query(db, kind)
        .options(selectinload(models.Experience.photos))
        .filter(group_col.in_(keys))
        .order_by(models.Experience.id.asc())
        .all()
    )
    # A category row draws the same title from every city, so it especially
    # needs the spare candidates group_candidates gathers.
    key_of = (lambda e: e.category) if kind == models.ExperienceKind.service else (lambda e: e.city)
    groups = group_candidates(items, keys, key_of, PER_ROW)

    flat = [e for k in keys for e in groups[k]]
    cards = {c.id: c for c in to_experience_cards(db, flat)}

    used_photos: set = set()

    def row_items(key: str):
        return distinct_cards(
            [cards[e.id] for e in groups[key]],
            PER_ROW,
            title_of=lambda c: c.title,
            photo_of=lambda c: c.cover_photo_url or "",
            used_photos=used_photos,
        )

    if kind == models.ExperienceKind.service:
        out = []
        for k in keys:
            items = row_items(k)
            if items:
                out.append(schemas.ExperienceRow(title=k, key=k, key_type="category", items=items))
        return out

    out = []
    for i, k in enumerate(keys):
        items = row_items(k)
        if not items:
            continue
        out.append(
            schemas.ExperienceRow(
                title=EXPERIENCE_ROW_TITLES[i % len(EXPERIENCE_ROW_TITLES)].format(city=k),
                key=k,
                key_type="city",
                items=items,
            )
        )
    return out


def _featured_near(db: Session, kind: models.ExperienceKind, rows: int,
                   lat: float, lng: float) -> List[schemas.ExperienceRow]:
    """City rows ordered by how far each city is from the guest.

    Distances are computed from each city's average coordinates — the same
    approach the listings router uses, so a Delhi guest gets Delhi first on
    every tab rather than whichever city happens to have the most inventory."""
    city_coords = (
        db.query(
            models.Experience.city,
            func.avg(models.Experience.latitude),
            func.avg(models.Experience.longitude),
        )
        .filter(models.Experience.kind == kind)
        .group_by(models.Experience.city)
        .all()
    )
    if not city_coords:
        return []

    keys, distances = rank_cities_by_distance(city_coords, lat, lng, rows)

    items = (
        _base_query(db, kind)
        .options(selectinload(models.Experience.photos))
        .filter(models.Experience.city.in_(keys))
        .order_by(models.Experience.id.asc())
        .all()
    )
    groups = group_candidates(items, keys, lambda e: e.city, PER_ROW)

    flat = [e for k in keys for e in groups[k]]
    cards = {c.id: c for c in to_experience_cards(db, flat)}

    near_titles = (
        NEAR_SERVICE_TITLES if kind == models.ExperienceKind.service else NEAR_EXPERIENCE_TITLES
    )
    far_titles = (
        ["{city}"] if kind == models.ExperienceKind.service else EXPERIENCE_ROW_TITLES
    )
    out = []
    used_photos: set = set()
    for i, k in enumerate(keys):
        items = distinct_cards(
            [cards[e.id] for e in groups[k]],
            PER_ROW,
            title_of=lambda c: c.title,
            photo_of=lambda c: c.cover_photo_url or "",
            used_photos=used_photos,
        )
        if not items:
            continue
        titles = near_titles if distances.get(k, float("inf")) <= NEAR_RADIUS_KM else far_titles
        out.append(
            schemas.ExperienceRow(
                title=titles[i % len(titles)].format(city=k),
                key=k,
                key_type="city",
                items=items,
            )
        )
    return out


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

    q = q.options(selectinload(models.Experience.photos))

    if date:
        # Per-date capacity has to be evaluated against that date's bookings, so
        # this one filter stays in Python — but it runs over the rows matching
        # the other filters, not the whole table, and only for dated searches.
        q = q.options(selectinload(models.Experience.bookings))
        needed = guests or 1
        matching = [e for e in q.order_by(models.Experience.id.asc()).all()
                    if experience_spots_left(e, date) >= needed]
        total = len(matching)
        start = (page - 1) * limit
        page_items = matching[start : start + limit]
    else:
        total = q.order_by(None).with_entities(func.count(models.Experience.id)).scalar() or 0
        start = (page - 1) * limit
        page_items = q.order_by(models.Experience.id.asc()).offset(start).limit(limit).all()

    return schemas.PaginatedExperiences(
        items=to_experience_cards(db, page_items),
        total=total,
        page=page,
        limit=limit,
        has_more=start + len(page_items) < total,
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
