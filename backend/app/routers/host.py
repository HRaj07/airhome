"""Everything behind the hosting dashboard: Today's reservations, the calendar,
earnings, insights, and the earnings estimate on the "Airbnb it" landing page.

Money: a home booking's `total_price` is what the guest paid, which includes
the guest service fee. The host's gross is nights + cleaning fee; Airbnb keeps
a 3% host service fee out of that. Experiences and services use Airbnb's 20%
host fee on the booking total.
"""
import calendar
import datetime
from collections import defaultdict
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db
from ..deps import require_host
from ..serializers import to_listing_cards, to_booking_out, to_experience_cards, _rating_categories

router = APIRouter(prefix="/host", tags=["host"])

HOME_HOST_FEE = 0.03
EXPERIENCE_HOST_FEE = 0.20
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _cover(listing) -> str:
    photos = sorted(listing.photos, key=lambda p: p.position)
    return photos[0].url if photos else ""


def _home_gross(b: models.Booking) -> float:
    return round((b.subtotal or 0.0) + (b.cleaning_fee or 0.0), 2)


def _home_payout(b: models.Booking) -> float:
    return round(_home_gross(b) * (1 - HOME_HOST_FEE), 2)


def _exp_payout(b: models.ExperienceBooking) -> float:
    return round((b.total_price or 0.0) * (1 - EXPERIENCE_HOST_FEE), 2)


def _home_reservation(b: models.Booking) -> schemas.HostReservation:
    return schemas.HostReservation(
        id=b.id,
        kind="home",
        listing_id=b.listing_id,
        listing_title=b.listing.title,
        cover_photo_url=_cover(b.listing),
        city=b.listing.city,
        guest_id=b.guest_id,
        guest_name=b.guest.full_name,
        guest_avatar_url=b.guest.avatar_url or "",
        check_in=b.check_in,
        check_out=b.check_out,
        nights=(b.check_out - b.check_in).days,
        guests_count=b.guests_count,
        total_price=b.total_price,
        host_payout=_home_payout(b),
        status=b.status.value if hasattr(b.status, "value") else str(b.status),
        created_at=b.created_at,
    )


def _exp_reservation(b: models.ExperienceBooking) -> schemas.HostReservation:
    kind = b.experience.kind.value if hasattr(b.experience.kind, "value") else str(b.experience.kind)
    photos = sorted(b.experience.photos, key=lambda p: p.position)
    return schemas.HostReservation(
        id=b.id,
        kind=kind,
        listing_id=b.experience_id,
        listing_title=b.experience.title,
        cover_photo_url=photos[0].url if photos else "",
        city=b.experience.city,
        guest_id=b.guest_id,
        guest_name=b.guest.full_name,
        guest_avatar_url=b.guest.avatar_url or "",
        check_in=b.date,
        check_out=b.date,
        nights=0,
        guests_count=b.guests_count,
        total_price=b.total_price,
        host_payout=_exp_payout(b),
        status=b.status.value if hasattr(b.status, "value") else str(b.status),
        created_at=b.created_at,
    )


def _host_home_bookings(db: Session, host_id: int) -> List[models.Booking]:
    return (
        db.query(models.Booking)
        .join(models.Listing, models.Booking.listing_id == models.Listing.id)
        .options(
            selectinload(models.Booking.listing).selectinload(models.Listing.photos),
            selectinload(models.Booking.guest),
        )
        .filter(models.Listing.host_id == host_id)
        .all()
    )


def _host_exp_bookings(db: Session, host_id: int) -> List[models.ExperienceBooking]:
    return (
        db.query(models.ExperienceBooking)
        .join(models.Experience, models.ExperienceBooking.experience_id == models.Experience.id)
        .options(
            selectinload(models.ExperienceBooking.experience).selectinload(models.Experience.photos),
            selectinload(models.ExperienceBooking.guest),
        )
        .filter(models.Experience.host_id == host_id)
        .all()
    )


# ---------------------------------------------------------------- dashboard (legacy)

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
        revenue = round(sum(_home_payout(b) for b in confirmed), 2)
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
            revenue=round(sum(_exp_payout(b) for b in confirmed), 2),
        )

    return schemas.HostDashboard(
        listings=listing_summaries,
        upcoming_bookings=[to_booking_out(b) for b in upcoming],
        experiences=[summarise(e) for e in hosted if e.kind == models.ExperienceKind.experience],
        services=[summarise(e) for e in hosted if e.kind == models.ExperienceKind.service],
    )


# ---------------------------------------------------------------- reservations

@router.get("/reservations", response_model=schemas.HostReservations)
def reservations(db: Session = Depends(get_db), host: models.User = Depends(require_host)):
    """Airbnb's "Today" buckets plus the full list.

    checking_out: stays ending today · currently_hosting: guests in the house
    now · arriving_soon: check-in today or tomorrow · upcoming: later confirmed
    stays · pending_review: stays that ended in the last 14 days (Airbnb gives
    hosts 14 days to review a guest).
    """
    today = datetime.date.today()
    tomorrow = today + datetime.timedelta(days=1)
    review_window = today - datetime.timedelta(days=14)

    items = [_home_reservation(b) for b in _host_home_bookings(db, host.id)]
    items += [_exp_reservation(b) for b in _host_exp_bookings(db, host.id)]
    items.sort(key=lambda r: (r.check_in, r.id))

    out = schemas.HostReservations(all=sorted(items, key=lambda r: r.check_in, reverse=True))
    for r in items:
        if r.status != "confirmed":
            continue
        if r.kind == "home":
            if r.check_out == today:
                out.checking_out.append(r)
            elif r.check_in <= today < r.check_out:
                out.currently_hosting.append(r)
            elif today <= r.check_in <= tomorrow:
                out.arriving_soon.append(r)
            elif r.check_in > tomorrow:
                out.upcoming.append(r)
            elif review_window <= r.check_out < today:
                out.pending_review.append(r)
        else:
            if r.check_in == today:
                out.currently_hosting.append(r)
            elif r.check_in == tomorrow:
                out.arriving_soon.append(r)
            elif r.check_in > tomorrow:
                out.upcoming.append(r)
            elif review_window <= r.check_in < today:
                out.pending_review.append(r)
    return out


# ---------------------------------------------------------------- earnings

@router.get("/earnings", response_model=schemas.HostEarnings)
def earnings(
    year: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    host: models.User = Depends(require_host),
):
    today = datetime.date.today()
    year = year or today.year

    homes = _host_home_bookings(db, host.id)
    exps = _host_exp_bookings(db, host.id)

    # A stay counts in the month it ends — that's when Airbnb releases the payout
    # (24h after check-in in reality, but by the month of the stay is what the
    # earnings chart shows). Money for stays that haven't finished is "upcoming".
    txs: List[schemas.EarningsTransaction] = []
    years = set()
    for b in homes:
        years.add(b.check_out.year)
        if b.check_out.year != year:
            continue
        status = "cancelled" if b.status != models.BookingStatus.confirmed else ("paid" if b.check_out <= today else "upcoming")
        gross = _home_gross(b)
        txs.append(
            schemas.EarningsTransaction(
                id=b.id,
                kind="home",
                date=b.check_out,
                listing_title=b.listing.title,
                guest_name=b.guest.full_name,
                nights=(b.check_out - b.check_in).days,
                gross=gross,
                host_fee=round(gross * HOME_HOST_FEE, 2),
                payout=0.0 if status == "cancelled" else _home_payout(b),
                status=status,
            )
        )
    for b in exps:
        years.add(b.date.year)
        if b.date.year != year:
            continue
        status = "cancelled" if b.status != models.BookingStatus.confirmed else ("paid" if b.date <= today else "upcoming")
        kind = b.experience.kind.value if hasattr(b.experience.kind, "value") else str(b.experience.kind)
        txs.append(
            schemas.EarningsTransaction(
                id=b.id,
                kind=kind,
                date=b.date,
                listing_title=b.experience.title,
                guest_name=b.guest.full_name,
                nights=0,
                gross=b.total_price,
                host_fee=round(b.total_price * EXPERIENCE_HOST_FEE, 2),
                payout=0.0 if status == "cancelled" else _exp_payout(b),
                status=status,
            )
        )
    txs.sort(key=lambda t: (t.date, t.id), reverse=True)

    months = [schemas.EarningsMonth(month=m, label=MONTHS[m - 1]) for m in range(1, 13)]
    paid = upcoming = 0.0
    nights = 0
    count = 0
    for t in txs:
        if t.status == "cancelled":
            continue
        count += 1
        nights += t.nights
        if t.status == "paid":
            paid += t.payout
            months[t.date.month - 1].paid += t.payout
        else:
            upcoming += t.payout
            months[t.date.month - 1].upcoming += t.payout
    for m in months:
        m.paid = round(m.paid, 2)
        m.upcoming = round(m.upcoming, 2)

    years.add(today.year)
    return schemas.HostEarnings(
        year=year,
        years=sorted(years, reverse=True),
        total_year=round(paid + upcoming, 2),
        paid_out=round(paid, 2),
        upcoming=round(upcoming, 2),
        bookings_count=count,
        nights_booked=nights,
        avg_nightly=round(paid / nights, 2) if nights else 0.0,
        months=months,
        transactions=txs,
        host_fee_pct=HOME_HOST_FEE,
    )


# ---------------------------------------------------------------- insights

@router.get("/insights", response_model=schemas.HostInsights)
def insights(db: Session = Depends(get_db), host: models.User = Depends(require_host)):
    today = datetime.date.today()
    window_start = today - datetime.timedelta(days=30)

    listings = (
        db.query(models.Listing)
        .options(
            selectinload(models.Listing.photos),
            selectinload(models.Listing.bookings),
            selectinload(models.Listing.reviews).selectinload(models.Review.author),
            selectinload(models.Listing.wishlisted_by),
        )
        .filter(models.Listing.host_id == host.id)
        .order_by(models.Listing.id.desc())
        .all()
    )

    all_reviews: List[models.Review] = []
    out_listings: List[schemas.ListingInsight] = []
    total_nights_30 = 0
    total_saves = 0
    published_count = 0

    for l in listings:
        confirmed = [b for b in l.bookings if b.status == models.BookingStatus.confirmed]
        reviews = list(l.reviews)
        all_reviews += reviews
        avg = round(sum(r.rating for r in reviews) / len(reviews), 2) if reviews else 0.0

        nights_30 = 0
        bookings_30 = 0
        revenue_30 = 0.0
        for b in confirmed:
            start = max(b.check_in, window_start)
            end = min(b.check_out, today)
            overlap = (end - start).days
            if overlap > 0:
                nights_30 += overlap
                bookings_30 += 1
                revenue_30 += _home_payout(b) * overlap / max(1, (b.check_out - b.check_in).days)
        total_nights_30 += nights_30
        saves = len(l.wishlisted_by)
        total_saves += saves
        if (l.status or "published") == "published":
            published_count += 1

        out_listings.append(
            schemas.ListingInsight(
                id=l.id,
                title=l.title or "Untitled listing",
                cover_photo_url=_cover(l),
                city=l.city,
                status=l.status or "published",
                rating_avg=avg,
                review_count=len(reviews),
                wishlist_saves=saves,
                bookings_30d=bookings_30,
                occupancy_30d=round(min(1.0, nights_30 / 30), 2),
                revenue_30d=round(revenue_30, 2),
                revenue_total=round(sum(_home_payout(b) for b in confirmed), 2),
            )
        )

    rating_avg = round(sum(r.rating for r in all_reviews) / len(all_reviews), 2) if all_reviews else 0.0
    five_star = sum(1 for r in all_reviews if r.rating == 5)
    recent = sorted(all_reviews, key=lambda r: r.created_at, reverse=True)[:6]
    review_listing = {l.id: l.title for l in listings}

    completed_stays = sum(
        1 for l in listings for b in l.bookings
        if b.status == models.BookingStatus.confirmed and b.check_out <= today
    )
    superhost = {
        "is_superhost": bool(host.is_superhost),
        "rating": {"value": rating_avg, "target": 4.8, "met": rating_avg >= 4.8 and len(all_reviews) > 0},
        "stays": {"value": completed_stays, "target": 10, "met": completed_stays >= 10},
        "cancellation_rate": {"value": 0.0, "target": 0.01, "met": True},
        "response_rate": {"value": 1.0, "target": 0.9, "met": True},
    }

    occupancy = round(min(1.0, total_nights_30 / (30 * published_count)), 2) if published_count else 0.0

    return schemas.HostInsights(
        rating_avg=rating_avg,
        review_count=len(all_reviews),
        five_star_pct=round(five_star / len(all_reviews), 2) if all_reviews else 0.0,
        occupancy_30d=occupancy,
        nights_booked_30d=total_nights_30,
        wishlist_saves=total_saves,
        superhost_progress=superhost,
        listings=out_listings,
        recent_reviews=[
            schemas.InsightReview(
                id=r.id,
                listing_title=review_listing.get(r.listing_id, ""),
                author_name=r.author.full_name if r.author else "Guest",
                rating=r.rating,
                comment=r.comment or "",
                created_at=r.created_at,
            )
            for r in recent
        ],
        rating_breakdown=_rating_categories(host.id, rating_avg, len(all_reviews)),
    )


# ---------------------------------------------------------------- calendar

def _owned(listing_id: int, db: Session, host: models.User) -> models.Listing:
    listing = (
        db.query(models.Listing)
        .options(selectinload(models.Listing.calendar_days))
        .filter(models.Listing.id == listing_id)
        .first()
    )
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.host_id != host.id:
        raise HTTPException(status_code=403, detail="You do not own this listing")
    return listing


@router.get("/calendar/{listing_id}", response_model=schemas.CalendarMonth)
def calendar_month(
    listing_id: int,
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
    host: models.User = Depends(require_host),
):
    listing = _owned(listing_id, db, host)
    first = datetime.date(year, month, 1)
    last = datetime.date(year, month, calendar.monthrange(year, month)[1])

    overrides: Dict[datetime.date, models.ListingCalendarDay] = {d.date: d for d in listing.calendar_days}
    bookings = (
        db.query(models.Booking)
        .options(selectinload(models.Booking.guest))
        .filter(
            models.Booking.listing_id == listing.id,
            models.Booking.status == models.BookingStatus.confirmed,
            models.Booking.check_in <= last,
            models.Booking.check_out > first,
        )
        .all()
    )
    booked: Dict[datetime.date, models.Booking] = {}
    for b in bookings:
        d = max(b.check_in, first)
        while d < b.check_out and d <= last:
            booked[d] = b
            d += datetime.timedelta(days=1)

    days = []
    d = first
    while d <= last:
        is_weekend = d.weekday() in (4, 5)  # Friday & Saturday nights
        base = listing.weekend_price if (is_weekend and listing.weekend_price) else listing.price_per_night
        o = overrides.get(d)
        b = booked.get(d)
        days.append(
            schemas.CalendarDayOut(
                date=d,
                price=o.price if (o and o.price is not None) else base,
                blocked=bool(o and o.blocked),
                booked=b is not None,
                booking_id=b.id if b else None,
                guest_name=b.guest.full_name if b else "",
                is_weekend=is_weekend,
                custom_price=bool(o and o.price is not None),
            )
        )
        d += datetime.timedelta(days=1)

    return schemas.CalendarMonth(
        listing_id=listing.id,
        listing_title=listing.title or "Untitled listing",
        base_price=listing.price_per_night,
        weekend_price=listing.weekend_price,
        days=days,
    )


@router.put("/calendar/{listing_id}", response_model=schemas.OkResponse)
def update_calendar(
    listing_id: int,
    payload: schemas.CalendarUpdate,
    db: Session = Depends(get_db),
    host: models.User = Depends(require_host),
):
    """Block/open nights and set or reset a custom nightly price for a set of dates."""
    listing = _owned(listing_id, db, host)
    if not payload.dates:
        raise HTTPException(status_code=400, detail="Pick at least one date")
    existing = {d.date: d for d in listing.calendar_days}
    for date in payload.dates:
        row = existing.get(date)
        if row is None:
            row = models.ListingCalendarDay(listing_id=listing.id, date=date, blocked=False, price=None)
            db.add(row)
            existing[date] = row
        if payload.blocked is not None:
            row.blocked = payload.blocked
        if payload.reset_price:
            row.price = None
        elif payload.price is not None:
            row.price = payload.price
    db.flush()
    # Drop rows that no longer override anything, so the table stays small.
    for row in list(existing.values()):
        if not row.blocked and row.price is None and row.id is not None:
            db.delete(row)
    db.commit()
    return schemas.OkResponse(ok=True)


# ---------------------------------------------------------------- estimate

@router.get("/estimate", response_model=schemas.EarningsEstimate)
def estimate(
    city: Optional[str] = Query(None),
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lng: Optional[float] = Query(None, ge=-180, le=180),
    bedrooms: int = Query(1, ge=0, le=10),
    nights: int = Query(7, ge=1, le=30),
    property_type: Optional[models.PropertyType] = Query(None),
    db: Session = Depends(get_db),
):
    """"Your home could make ₹X on Airbnb": the median nightly rate of comparable
    published listings nearby, times the number of nights, less the host fee.
    Open to signed-out visitors, like the real landing page."""
    q = db.query(models.Listing.price_per_night, models.Listing.city).filter(models.Listing.status == "published")
    resolved_city = city or ""
    if lat is not None and lng is not None and not city:
        # ~1° box, then rank by rough distance in Python.
        rows = (
            q.filter(
                models.Listing.latitude.between(lat - 1, lat + 1),
                models.Listing.longitude.between(lng - 1, lng + 1),
            ).all()
        )
        if rows:
            resolved_city = max({r[1] for r in rows}, key=lambda c: sum(1 for r in rows if r[1] == c))
            rows = [r for r in rows if r[1] == resolved_city]
    else:
        if city:
            q = q.filter(models.Listing.city.ilike(f"%{city}%"))
        rows = q.all()
        if rows:
            resolved_city = rows[0][1]
    if property_type and rows:
        typed = (
            db.query(models.Listing.price_per_night, models.Listing.city)
            .filter(models.Listing.status == "published", models.Listing.city == resolved_city, models.Listing.property_type == property_type)
            .all()
        )
        rows = typed or rows

    prices = sorted(r[0] for r in rows if r[0])
    if not prices:
        # Nothing nearby: fall back to the catalogue-wide median.
        prices = sorted(p for (p,) in db.query(models.Listing.price_per_night).filter(models.Listing.status == "published").all() if p)
        resolved_city = resolved_city or "your area"
    if not prices:
        return schemas.EarningsEstimate(city=resolved_city or "your area", nightly_rate=0, nights=nights, total=0, sample_size=0)

    median = prices[len(prices) // 2]
    # Each extra bedroom lifts the rate; a studio trims it a little.
    rate = median * (1 + 0.25 * max(0, bedrooms - 1)) * (0.85 if bedrooms == 0 else 1)
    total = round(rate * nights * (1 - HOME_HOST_FEE), 2)
    return schemas.EarningsEstimate(
        city=resolved_city or "your area",
        nightly_rate=round(rate, 2),
        nights=nights,
        total=total,
        sample_size=len(prices),
    )
