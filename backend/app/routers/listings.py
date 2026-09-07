import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, get_current_user_optional, require_host
from ..serializers import to_listing_card, to_listing_detail
from ..utils import booking_overlaps

router = APIRouter(prefix="/listings", tags=["listings"])


@router.get("", response_model=schemas.PaginatedListings)
def search_listings(
    location: Optional[str] = None,
    check_in: Optional[datetime.date] = None,
    check_out: Optional[datetime.date] = None,
    guests: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    property_type: Optional[models.PropertyType] = None,
    amenities: Optional[str] = None,  # csv of amenity ids
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_optional),
):
    q = db.query(models.Listing)

    if location:
        like = f"%{location}%"
        q = q.filter(or_(models.Listing.city.ilike(like), models.Listing.country.ilike(like), models.Listing.state.ilike(like)))
    if guests:
        q = q.filter(models.Listing.max_guests >= guests)
    if min_price is not None:
        q = q.filter(models.Listing.price_per_night >= min_price)
    if max_price is not None:
        q = q.filter(models.Listing.price_per_night <= max_price)
    if property_type:
        q = q.filter(models.Listing.property_type == property_type)

    amenity_ids: List[int] = []
    if amenities:
        amenity_ids = [int(a) for a in amenities.split(",") if a.strip().isdigit()]
        for aid in amenity_ids:
            q = q.filter(models.Listing.amenities.any(models.Amenity.id == aid))

    all_matching = q.order_by(models.Listing.id.desc()).all()

    if check_in and check_out:
        if check_out <= check_in:
            raise HTTPException(status_code=400, detail="check_out must be after check_in")
        all_matching = [l for l in all_matching if not booking_overlaps(check_in, check_out, l.id, db)]

    total = len(all_matching)
    start = (page - 1) * limit
    end = start + limit
    page_items = all_matching[start:end]

    items = [to_listing_card(db, l, current_user.id if current_user else None) for l in page_items]
    return schemas.PaginatedListings(items=items, total=total, page=page, limit=limit, has_more=end < total)


@router.get("/mine", response_model=List[schemas.ListingCard])
def my_listings(db: Session = Depends(get_db), host: models.User = Depends(require_host)):
    listings = db.query(models.Listing).filter(models.Listing.host_id == host.id).order_by(models.Listing.id.desc()).all()
    return [to_listing_card(db, l, host.id) for l in listings]


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
    listing.city = payload.city
    listing.state = payload.state
    listing.country = payload.country
    listing.latitude = payload.latitude
    listing.longitude = payload.longitude

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
