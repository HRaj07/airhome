import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

from .models import PropertyType, BookingStatus, ExperienceKind


# ---------- Auth / User ----------

class UserPublic(BaseModel):
    id: int
    full_name: str
    avatar_url: str = ""
    is_host: bool = False
    is_superhost: bool = False
    identity_verified: bool = True
    bio: str = ""
    home_city: str = ""
    languages: str = "English"
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class ProfileReview(BaseModel):
    """A review as shown on someone's profile: what they wrote, and about what."""
    id: int
    rating: int
    comment: str
    created_at: datetime.datetime
    subject_kind: str          # "listing" | "experience"
    subject_id: int
    subject_title: str
    subject_city: str


class UserProfile(UserPublic):
    """The public profile page: a person plus the numbers Airbnb shows beside
    their photo (trips, reviews, months on the platform)."""
    trips: int = 0
    reviews_written: int = 0
    months_on_platform: int = 0
    reviews: List[ProfileReview] = []
    listings: List["ListingCard"] = []


class UserMe(UserPublic):
    email: EmailStr


class UpdateProfileRequest(BaseModel):
    """The fields a person may edit on their own profile.

    Every field is optional: the client sends only what changed, and anything
    omitted (None) is left untouched.
    """
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    bio: Optional[str] = Field(default=None, max_length=1000)
    home_city: Optional[str] = Field(default=None, max_length=120)
    languages: Optional[str] = Field(default=None, max_length=200)
    #: Guests become hosts from "Become a host" without signing up again. Only
    #: promotion is accepted — see the router, which rejects `false`, since
    #: demoting an account would orphan its listings and their bookings.
    is_host: Optional[bool] = Field(default=None)


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
    group: str = "Essentials"

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
    instant_book: bool = True
    # The first few photos, so a card can offer Airbnb's swipeable gallery
    # without a second request per card.
    photo_urls: List[str] = []
    rating_avg: float = 0.0
    review_count: int = 0
    is_wishlisted: bool = False

    class Config:
        from_attributes = True


class ListingHighlight(BaseModel):
    """One of the three "Listing highlights" on the real page, e.g.
    "Dive right in — This is one of the few places in the area with a pool."."""
    icon: str
    title: str
    body: str


class RatingCategory(BaseModel):
    """Airbnb's per-category breakdown: Cleanliness 4.9, Accuracy 5.0, ..."""
    key: str
    label: str
    score: float


class SleepingArea(BaseModel):
    name: str        # "Bedroom 1"
    beds: str        # "1 double bed"


class ListingDetail(ListingCard):
    description: str = ""
    guest_access: str = ""
    other_notes: str = ""
    address: str = ""
    cleaning_fee: float = 0.0
    service_fee_pct: float = 0.12
    instant_book: bool = True
    host: UserPublic
    host_years_hosting: int = 1
    photos: List[PhotoOut] = []
    amenities: List[AmenityOut] = []
    blocked_dates: List[str] = []
    highlights: List[ListingHighlight] = []
    rating_categories: List[RatingCategory] = []
    sleeping: List[SleepingArea] = []


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
    instant_book: bool = True
    guest_access: str = ""
    other_notes: str = ""
    amenity_ids: List[int] = []
    photo_urls: List[str] = []


class ListingUpdate(ListingCreate):
    pass


class NearestDestination(BaseModel):
    city: str
    country: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    count: int = 0
    distance_km: int = 0


class MapPin(BaseModel):
    """Just enough to draw a price pin: the map asks for hundreds at a time."""
    id: int
    latitude: float
    longitude: float
    price_per_night: float
    city: str


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


# ---------- Experiences & Services ----------

class ExperienceCard(BaseModel):
    id: int
    kind: ExperienceKind
    category: str
    title: str
    city: str
    country: str = ""
    price_per_guest: float
    price_unit: str = "guest"
    start_time: str = ""
    duration_minutes: int = 120
    max_guests: int = 8
    latitude: float = 0.0
    longitude: float = 0.0
    cover_photo_url: str = ""
    rating_avg: float = 0.0
    review_count: int = 0

    class Config:
        from_attributes = True


class ExperienceAvailability(BaseModel):
    date: str            # ISO date
    spots_left: int


class ExperienceReviewOut(BaseModel):
    id: int
    author: UserPublic
    rating: int
    comment: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class ExperienceReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = ""


class ExperienceDetail(ExperienceCard):
    description: str = ""
    host: UserPublic
    photos: List[PhotoOut] = []
    reviews: List[ExperienceReviewOut] = []
    availability: List[ExperienceAvailability] = []   # next 30 days with remaining capacity


class ExperienceRow(BaseModel):
    title: str
    key: str
    #: What `key` is, so the client knows which filter the row links to:
    #: "city" -> ?location=, "category" -> ?category=.
    key_type: str = "city"
    items: List[ExperienceCard]


class PaginatedExperiences(BaseModel):
    items: List[ExperienceCard]
    total: int
    page: int
    limit: int
    has_more: bool


class ExperienceBookingCreate(BaseModel):
    date: datetime.date
    guests_count: int = Field(ge=1)


class ExperienceBookingOut(BaseModel):
    id: int
    experience: ExperienceCard
    date: datetime.date
    guests_count: int
    total_price: float
    status: BookingStatus
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class Destination(BaseModel):
    """One row in the header search "Where" dropdown."""
    kind: str                 # "city" | "neighborhood"
    label: str                # "Noida" / "Sector 18"
    sublabel: str             # "Uttar Pradesh, India" / "Neighbourhood · Noida"
    city: str                 # the value to search by
    country: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    count: int = 0


# UserProfile references ListingCard, which is defined further down.
UserProfile.model_rebuild()
