import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db
from ..rows import distinct_cards, group_candidates, rank_cities_by_distance
from ..deps import get_current_user, get_current_user_optional, require_host
from ..serializers import to_listing_card, to_listing_cards, to_listing_detail

router = APIRouter(prefix="/listings", tags=["listings"])


class SearchFilters:
    """Every filter the results page can apply, shared by the paged search and
    the map endpoint so the pins always agree with the list."""

    def __init__(
        self,
        location: Optional[str] = None,
        check_in: Optional[datetime.date] = None,
        check_out: Optional[datetime.date] = None,
        guests: Optional[int] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        property_type: Optional[models.PropertyType] = None,
        amenities: Optional[str] = Query(None, description="csv of amenity ids"),
        instant_book: Optional[bool] = None,
        min_bathrooms: Optional[float] = None,
        # Map viewport. When all four are given, the location text is ignored
        # and the map is the search area — Airbnb's "Homes in map area".
        sw_lat: Optional[float] = None,
        sw_lng: Optional[float] = None,
        ne_lat: Optional[float] = None,
        ne_lng: Optional[float] = None,
    ):
        self.location = location
        self.check_in = check_in
        self.check_out = check_out
        self.guests = guests
        self.min_price = min_price
        self.max_price = max_price
        self.property_type = property_type
        self.amenities = amenities
        self.instant_book = instant_book
        self.min_bathrooms = min_bathrooms
        self.bounds = (
            (sw_lat, sw_lng, ne_lat, ne_lng)
            if None not in (sw_lat, sw_lng, ne_lat, ne_lng)
            else None
        )

    def apply(self, q):
        f = self
        if f.bounds:
            sw_lat, sw_lng, ne_lat, ne_lng = f.bounds
            q = q.filter(
                models.Listing.latitude >= sw_lat,
                models.Listing.latitude <= ne_lat,
                models.Listing.longitude >= sw_lng,
                models.Listing.longitude <= ne_lng,
            )
        elif f.location:
            like = f"%{f.location}%"
            q = q.filter(
                or_(
                    models.Listing.city.ilike(like),
                    models.Listing.country.ilike(like),
                    models.Listing.state.ilike(like),
                    models.Listing.neighborhood.ilike(like),
                )
            )
        if f.guests:
            q = q.filter(models.Listing.max_guests >= f.guests)
        if f.min_price is not None:
            q = q.filter(models.Listing.price_per_night >= f.min_price)
        if f.max_price is not None:
            q = q.filter(models.Listing.price_per_night <= f.max_price)
        if f.property_type:
            q = q.filter(models.Listing.property_type == f.property_type)
        if f.instant_book:
            q = q.filter(models.Listing.instant_book.is_(True))
        if f.min_bathrooms:
            q = q.filter(models.Listing.bathrooms >= f.min_bathrooms)
        if f.amenities:
            for a in f.amenities.split(","):
                if a.strip().isdigit():
                    q = q.filter(models.Listing.amenities.any(models.Amenity.id == int(a)))

        if f.check_in and f.check_out:
            if f.check_out <= f.check_in:
                raise HTTPException(status_code=400, detail="check_out must be after check_in")
            # Availability as a NOT EXISTS rather than a Python filter, so the
            # database still does the counting and the paging. Half-open interval:
            # a stay ending the day another begins does not overlap.
            clash = (
                select(models.Booking.id)
                .where(
                    models.Booking.listing_id == models.Listing.id,
                    models.Booking.status == models.BookingStatus.confirmed,
                    models.Booking.check_in < f.check_out,
                    models.Booking.check_out > f.check_in,
                )
                .exists()
            )
            q = q.filter(~clash)
        return q


@router.get("", response_model=schemas.PaginatedListings)
def search_listings(
    filters: SearchFilters = Depends(),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_optional),
):
    q = filters.apply(db.query(models.Listing))

    # Count and page in SQL. Materialising every match to slice it in Python
    # meant an unfiltered search loaded the whole table on every request.
    total = q.order_by(None).with_entities(func.count(models.Listing.id)).scalar() or 0
    offset = (page - 1) * limit
    page_items = (
        q.options(selectinload(models.Listing.photos))
        .order_by(models.Listing.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = to_listing_cards(db, page_items, current_user.id if current_user else None)
    return schemas.PaginatedListings(
        items=items, total=total, page=page, limit=limit, has_more=offset + len(page_items) < total
    )


#: The most pins one map request returns. Past this the map is zoomed out far
#: enough that the pins would overlap anyway.
MAP_PIN_LIMIT = 400


@router.get("/map", response_model=List[schemas.MapPin])
def map_pins(filters: SearchFilters = Depends(), db: Session = Depends(get_db)):
    """Every listing matching the current search inside the map viewport, as
    lightweight pins. The paged search only returns one page; the real map
    shows a price on every home in view, so it needs its own, cheaper query."""
    rows = (
        filters.apply(
            db.query(
                models.Listing.id, models.Listing.latitude, models.Listing.longitude,
                models.Listing.price_per_night, models.Listing.city,
            )
        )
        .order_by(models.Listing.id.desc())
        .limit(MAP_PIN_LIMIT)
        .all()
    )
    return [
        schemas.MapPin(id=i, latitude=lat, longitude=lng, price_per_night=p, city=c)
        for i, lat, lng, p, c in rows
    ]


#: Cards per homepage carousel row.
PER_ROW = 12

ROW_TITLES = [
    "Popular homes in {city}",
    "Available in {city} this weekend",
    "Stay in {city}",
    "Homes in {city} guests love",
    "Places to stay in {city}",
]

# Used for cities close to the visitor, so the top of the page reads like
# somewhere they could actually drive to tonight.
NEAR_ROW_TITLES = [
    "Stay near {city}",
    "Homes near you in {city}",
    "Popular homes in {city}",
    "Available in {city} this weekend",
]

# A city within this radius counts as "near you" for the row heading.
NEAR_RADIUS_KM = 400


@router.get("/featured", response_model=List[schemas.FeaturedRow])
def featured_rows(
    rows: int = Query(12, ge=1, le=40, description="How many city rows to build"),
    lat: Optional[float] = Query(None, ge=-90, le=90, description="Visitor latitude, to rank rows by proximity"),
    lng: Optional[float] = Query(None, ge=-180, le=180, description="Visitor longitude, to rank rows by proximity"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_optional),
):
    """Homepage carousel rows: one row per city.

    Without coordinates, rows are the busiest cities — the generic landing page.
    With them, cities are ranked by how close they are to the visitor, so
    someone in Mumbai opens the page to Mumbai rather than Lagos. Only a handful
    of rows are built either way: the catalogue has ~500 cities, and serializing
    every one would mean thousands of cards for a page that shows a dozen.
    """
    distances: dict[str, float] = {}
    if lat is not None and lng is not None:
        city_coords = (
            db.query(
                models.Listing.city,
                func.avg(models.Listing.latitude),
                func.avg(models.Listing.longitude),
            )
            .group_by(models.Listing.city)
            .all()
        )
        top_cities, distances = rank_cities_by_distance(city_coords, lat, lng, rows)
    else:
        top_cities = [
            row[0]
            for row in db.query(models.Listing.city, func.count(models.Listing.id).label("n"))
            .group_by(models.Listing.city)
            .order_by(func.count(models.Listing.id).desc(), models.Listing.city.asc())
            .limit(rows)
            .all()
        ]
    if not top_cities:
        return []

    listings = (
        db.query(models.Listing)
        .options(selectinload(models.Listing.photos))
        .filter(models.Listing.city.in_(top_cities))
        .order_by(models.Listing.id.asc())
        .all()
    )
    by_city = group_candidates(listings, top_cities, lambda l: l.city, PER_ROW)

    # One batch serialization for every row's cards together.
    flat = [l for city in top_cities for l in by_city[city]]
    cards = {c.id: c for c in to_listing_cards(db, flat, current_user.id if current_user else None)}

    out = []
    # Shared across every row, so a photo used in the Delhi row can't reappear
    # in the Noida row directly below it.
    used_photos: set = set()
    for i, city in enumerate(top_cities):
        items = distinct_cards(
            [cards[l.id] for l in by_city[city]],
            PER_ROW,
            title_of=lambda c: c.title,
            photo_of=lambda c: c.cover_photo_url or "",
            used_photos=used_photos,
        )
        if not items:
            continue
        out.append(
            schemas.FeaturedRow(
                title=(
                    NEAR_ROW_TITLES[i % len(NEAR_ROW_TITLES)]
                    if distances.get(city, float("inf")) <= NEAR_RADIUS_KM
                    else ROW_TITLES[i % len(ROW_TITLES)]
                ).format(city=city),
                city=city,
                items=items,
            )
        )
    return out


@router.get("/mine", response_model=List[schemas.ListingCard])
def my_listings(db: Session = Depends(get_db), host: models.User = Depends(require_host)):
    listings = db.query(models.Listing).filter(models.Listing.host_id == host.id).order_by(models.Listing.id.desc()).all()
    return to_listing_cards(db, listings, host.id)


@router.get("/{listing_id}", response_model=schemas.ListingDetail)
def get_listing(listing_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user_optional)):
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return to_listing_detail(db, listing, current_user.id if current_user else None)


@router.get("/{listing_id}/availability")
def get_availability(listing_id: int, db: Session = Depends(get_db)):
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    detail = to_listing_detail(db, listing)
    return {"blocked_dates": detail.blocked_dates}


def _apply_listing_fields(listing: models.Listing, payload: schemas.ListingCreate, db: Session):
    listing.title = payload.title
    listing.description = payload.description
    listing.property_type = payload.property_type
    listing.bedrooms = payload.bedrooms
    listing.beds = payload.beds
    listing.bathrooms = payload.bathrooms
    listing.max_guests = payload.max_guests
    listing.price_per_night = payload.price_per_night
    listing.cleaning_fee = payload.cleaning_fee
    listing.service_fee_pct = payload.service_fee_pct
    listing.address = payload.address
    listing.neighborhood = payload.neighborhood
    listing.city = payload.city
    listing.state = payload.state
    listing.country = payload.country
    listing.latitude = payload.latitude
    listing.longitude = payload.longitude
    listing.instant_book = payload.instant_book
    listing.guest_access = payload.guest_access
    listing.other_notes = payload.other_notes

    if payload.amenity_ids:
        listing.amenities = db.query(models.Amenity).filter(models.Amenity.id.in_(payload.amenity_ids)).all()
    else:
        listing.amenities = []

    listing.photos = [
        models.ListingPhoto(url=url, position=i) for i, url in enumerate(payload.photo_urls)
    ]


@router.post("", response_model=schemas.ListingDetail, status_code=status.HTTP_201_CREATED)
def create_listing(payload: schemas.ListingCreate, db: Session = Depends(get_db), host: models.User = Depends(require_host)):
    listing = models.Listing(host_id=host.id)
    _apply_listing_fields(listing, payload, db)
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return to_listing_detail(db, listing, host.id)


@router.put("/{listing_id}", response_model=schemas.ListingDetail)
def update_listing(listing_id: int, payload: schemas.ListingUpdate, db: Session = Depends(get_db), host: models.User = Depends(require_host)):
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.host_id != host.id:
        raise HTTPException(status_code=403, detail="You do not own this listing")
    _apply_listing_fields(listing, payload, db)
    db.commit()
    db.refresh(listing)
    return to_listing_detail(db, listing, host.id)


@router.delete("/{listing_id}", response_model=schemas.OkResponse)
def delete_listing(listing_id: int, db: Session = Depends(get_db), host: models.User = Depends(require_host)):
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.host_id != host.id:
        raise HTTPException(status_code=403, detail="You do not own this listing")
    db.delete(listing)
    db.commit()
    return schemas.OkResponse(ok=True)
