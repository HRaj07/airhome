from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/amenities", tags=["amenities"])


@router.get("", response_model=List[schemas.AmenityOut])
def list_amenities(db: Session = Depends(get_db)):
    return db.query(models.Amenity).order_by(models.Amenity.name).all()
