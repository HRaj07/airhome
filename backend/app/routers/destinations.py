"""
Destination autocomplete for the header search bar.

Mirrors Airbnb's "Where" dropdown, which mixes cities and neighbourhoods.
Everything here is derived from the listings and experiences actually in the
database, so a suggestion can never lead to an empty result page.

The catalogue holds ~500 cities and ~3,500 destinations, so the aggregation
happens in SQL and the text match is pushed into the same query — the first
version of this endpoint loaded every listing on every keystroke.
"""
from math import asin, cos, radians, sin, sqrt
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..utils import haversine_km

router = APIRouter(prefix="/destinations", tags=["destinations"])

#: How many rows to aggregate before ranking. Generous enough that the best
#: matches are always in the pool, small enough to stay cheap.
CANDIDATE_LIMIT = 200


def _score(needle: str, *fields: str) -> int:
    """0 = no match, 2 = something starts with the query, 1 = merely contains it.

    Ranking a prefix above a substring is what puts Goa first when you type
    "goa", rather than some city that merely contains those letters.
    """
    lowered = [f.lower() for f in fields if f]
    if any(f.startswith(needle) for f in lowered):
        return 2
    if any(needle in f for f in lowered):
        return 1
    return 0


@router.get("", response_model=List[schemas.Destination])
def list_destinations(
    q: Optional[str] = Query(None, description="Free-text prefix/substring match"),
    limit: int = Query(6, ge=1, le=20),
    db: Session = Depends(get_db),
):
    needle = (q or "").strip().lower()
    like = f"%{needle}%" if needle else None

    # --- cities, aggregated in SQL --------------------------------------
    city_q = db.query(
        models.Listing.city,
        models.Listing.state,
        models.Listing.country,
        func.avg(models.Listing.latitude),
        func.avg(models.Listing.longitude),
        func.count(models.Listing.id),
    ).group_by(models.Listing.city, models.Listing.state, models.Listing.country)
    if like:
        city_q = city_q.filter(
            or_(
                models.Listing.city.ilike(like),
                models.Listing.state.ilike(like),
                models.Listing.country.ilike(like),
            )
        )
    city_rows = city_q.order_by(func.count(models.Listing.id).desc()).limit(CANDIDATE_LIMIT).all()

    # Two real cities are named Lagos, so a destination is keyed by city *and*
    # country, and the country shows up in the sublabel to tell them apart.
    cities: Dict[Tuple[str, str], schemas.Destination] = {}
    for city, state, country, lat, lng, count in city_rows:
        region = ", ".join(x for x in (state, country) if x)
        cities[(city.lower(), (country or "").lower())] = schemas.Destination(
            kind="city",
            label=city,
            sublabel=region or "Destination",
            city=city,
            country=country or "",
            latitude=lat or 0.0,
            longitude=lng or 0.0,
            count=count,
        )

    # --- neighbourhoods, only when there is something to match ----------
    neighborhoods: List[schemas.Destination] = []
    if like:
        hood_rows = (
            db.query(
                models.Listing.neighborhood,
                models.Listing.city,
                models.Listing.country,
                func.avg(models.Listing.latitude),
                func.avg(models.Listing.longitude),
                func.count(models.Listing.id),
            )
            .filter(models.Listing.neighborhood != "", models.Listing.neighborhood.ilike(like))
            .group_by(models.Listing.neighborhood, models.Listing.city, models.Listing.country)
            .order_by(func.count(models.Listing.id).desc())
            .limit(CANDIDATE_LIMIT)
            .all()
        )
        neighborhoods = [
            schemas.Destination(
                kind="neighborhood",
                label=hood,
                sublabel=f"Neighbourhood · {city}",
                city=city,
                country=country or "",
                latitude=lat or 0.0,
                longitude=lng or 0.0,
                count=count,
            )
            for hood, city, country, lat, lng, count in hood_rows
        ]

    # --- cities that only have experiences ------------------------------
    # A city with a food tour but no homes is still a real destination.
    exp_q = db.query(
        models.Experience.city,
        models.Experience.country,
        func.avg(models.Experience.latitude),
        func.avg(models.Experience.longitude),
        func.count(models.Experience.id),
    ).group_by(models.Experience.city, models.Experience.country)
    if like:
        exp_q = exp_q.filter(
            or_(models.Experience.city.ilike(like), models.Experience.country.ilike(like))
        )
    for city, country, lat, lng, count in exp_q.limit(CANDIDATE_LIMIT).all():
        key = (city.lower(), (country or "").lower())
        if key in cities:
            cities[key].count += count
        else:
            cities[key] = schemas.Destination(
                kind="city",
                label=city,
                sublabel=country or "Destination",
                city=city,
                country=country or "",
                latitude=lat or 0.0,
                longitude=lng or 0.0,
                count=count,
            )

    if not needle:
        # No query: the busiest cities, like Airbnb's default suggestions.
        return sorted(cities.values(), key=lambda d: -d.count)[:limit]

    scored = [
        (_score(needle, d.label, d.sublabel, d.city, d.country), d)
        for d in list(cities.values()) + neighborhoods
    ]
    hits = [(s, d) for s, d in scored if s > 0]
    # Better matches first, then cities before neighbourhoods, then the busiest.
    hits.sort(key=lambda sd: (-sd[0], 0 if sd[1].kind == "city" else 1, -sd[1].count))
    return [d for _, d in hits[:limit]]


# Kept as a module-level alias so existing call sites read unchanged; the
# implementation is shared with the location-aware homepage rows.
_haversine_km = haversine_km


@router.get("/nearest", response_model=schemas.NearestDestination)
def nearest_destination(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    db: Session = Depends(get_db),
):
    """The closest city that has inventory, for the "Nearby" search option.

    Compared against every city, not the popular ones: the first version of
    Nearby ranked the top-20 busiest cities by distance, and with every headline
    city tied on listing count, someone in Delhi was sent to Agra.
    """
    rows = (
        db.query(
            models.Listing.city,
            models.Listing.country,
            func.avg(models.Listing.latitude),
            func.avg(models.Listing.longitude),
            func.count(models.Listing.id),
        )
        .group_by(models.Listing.city, models.Listing.country)
        .all()
    )
    if not rows:
        raise HTTPException(status_code=404, detail="No destinations available")
    best = min(rows, key=lambda r: _haversine_km(lat, lng, r[2] or 0.0, r[3] or 0.0))
    city, country, clat, clng, count = best
    return schemas.NearestDestination(
        city=city,
        country=country or "",
        latitude=clat or 0.0,
        longitude=clng or 0.0,
        count=count,
        distance_km=round(_haversine_km(lat, lng, clat or 0.0, clng or 0.0)),
    )
