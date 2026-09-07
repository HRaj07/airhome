import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

from .models import PropertyType, BookingStatus


# ---------- Auth / User ----------

class UserPublic(BaseModel):
    id: int
    full_name: str
    avatar_url: str = ""
    is_host: bool = False
    is_superhost: bool = False
    bio: str = ""
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class UserMe(UserPublic):
    email: EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str
    is_host: bool = False


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    user: UserMe


# ---------- Amenity ----------

class AmenityOut(BaseModel):
    id: int
    name: str
    icon: str

    class Config:
        from_attributes = True


# ---------- Listing ----------

class PhotoOut(BaseModel):
    id: int
    url: str
    position: int

    class Config:
        from_attributes = True


class ListingCard(BaseModel):
    id: int
    title: str
    neighborhood: str = ""
    city: str
    state: str = ""
    country: str = ""
    price_per_night: float
    property_type: PropertyType
    max_guests: int
    bedrooms: int
    beds: int
    bathrooms: float
    latitude: float
    longitude: float
    cover_photo_url: str = ""
    rating_avg: float = 0.0
    review_count: int = 0
    is_wishlisted: bool = False

    class Config:
        from_attributes = True


class ListingDetail(ListingCard):
    description: str = ""
    address: str = ""
    cleaning_fee: float = 0.0
    service_fee_pct: float = 0.12
    host: UserPublic
    photos: List[PhotoOut] = []
    amenities: List[AmenityOut] = []
    blocked_dates: List[str] = []


class ListingCreate(BaseModel):
    title: str
    description: str = ""
    property_type: PropertyType = PropertyType.entire_home
    bedrooms: int = 1
    beds: int = 1
    bathrooms: float = 1.0
    max_guests: int = 2
    price_per_night: float
    cleaning_fee: float = 0.0
    service_fee_pct: float = 0.12
    address: str = ""
    neighborhood: str = ""
    city: str
    state: str = ""
    country: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    amenity_ids: List[int] = []
    photo_urls: List[str] = []


class ListingUpdate(ListingCreate):
    pass


class PaginatedListings(BaseModel):
    items: List[ListingCard]
    total: int
    page: int
    limit: int
    has_more: bool


class FeaturedRow(BaseModel):
    """A homepage carousel row, e.g. 'Popular homes in Paris'."""
    title: str
    city: str
    items: List[ListingCard]


# ---------- Booking ----------

class BookingListingSummary(BaseModel):
    id: int
    title: str
    cover_photo_url: str = ""
    city: str
    country: str = ""
    price_per_night: float

    class Config:
        from_attributes = True


class BookingCreate(BaseModel):
    listing_id: int
    check_in: datetime.date
    check_out: datetime.date
    guests_count: int = 1


class BookingOut(BaseModel):
    id: int
    listing: BookingListingSummary
    check_in: datetime.date
    check_out: datetime.date
    guests_count: int
    nights: int
    subtotal: float
    cleaning_fee: float
    service_fee: float
    total_price: float
    status: BookingStatus
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ---------- Review ----------

class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = ""


class ReviewOut(BaseModel):
    id: int
    author: UserPublic
    rating: int
    comment: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ---------- Wishlist ----------

class OkResponse(BaseModel):
    ok: bool = True


# ---------- Host dashboard ----------

class HostListingSummary(ListingCard):
    booking_count: int = 0
    revenue: float = 0.0


class HostDashboard(BaseModel):
    listings: List[HostListingSummary]
    upcoming_bookings: List[BookingOut]
