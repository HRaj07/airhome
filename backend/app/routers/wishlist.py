from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..serializers import to_listing_cards

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.get("", response_model=List[schemas.ListingCard])
def get_wishlist(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    items = db.query(models.WishlistItem).filter(models.WishlistItem.user_id == user.id).all()
    return to_listing_cards(db, [item.listing for item in items], user.id)


@router.post("/{listing_id}", response_model=schemas.OkResponse)
def add_to_wishlist(listing_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    existing = (
        db.query(models.WishlistItem)
        .filter(models.WishlistItem.listing_id == listing_id, models.WishlistItem.user_id == user.id)
        .first()
    )
    if not existing:
        db.add(models.WishlistItem(listing_id=listing_id, user_id=user.id))
        db.commit()
    return schemas.OkResponse(ok=True)


@router.delete("/{listing_id}", response_model=schemas.OkResponse)
def remove_from_wishlist(listing_id: int, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    item = (
        db.query(models.WishlistItem)
        .filter(models.WishlistItem.listing_id == listing_id, models.WishlistItem.user_id == user.id)
        .first()
    )
    if item:
        db.delete(item)
        db.commit()
    return schemas.OkResponse(ok=True)
