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
    # draft | published | unlisted — only the owner ever sees non-published cards.
    status: str = "published"
    # Where the "Become a host" wizard resumes (drafts only, but harmless elsewhere).
    wizard_step: str = "about-your-place"

    class Config:
        from_attributes = True


class HostingFields(BaseModel):
    """Everything the "Become a host" wizard collects beyond the classic listing
    form. Shared by the detail view (so the wizard can resume) and the draft
    update payload."""
    structure_type: str = "house"
    host_highlights: List[str] = []
    weekend_price: Optional[float] = None
    new_listing_discount: float = 0.0
    weekly_discount: float = 0.0
    monthly_discount: float = 0.0
    guest_visibility: str = "any"
    has_exterior_camera: bool = False
    has_noise_monitor: bool = False
    has_weapons: bool = False
    wizard_step: str = "about-your-place"


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


class ListingDetail(ListingCard, HostingFields):
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
    # Optional hosting-wizard fields; the classic form omits them and keeps defaults.
    structure_type: Optional[str] = None
    host_highlights: Optional[List[str]] = None
    weekend_price: Optional[float] = None
    new_listing_discount: Optional[float] = None
    weekly_discount: Optional[float] = None
    monthly_discount: Optional[float] = None
    guest_visibility: Optional[str] = None
    has_exterior_camera: Optional[bool] = None
    has_noise_monitor: Optional[bool] = None
    has_weapons: Optional[bool] = None


class ListingUpdate(ListingCreate):
    pass


class ListingDraftUpdate(BaseModel):
    """One wizard step's worth of changes. Every field is optional: the wizard
    saves after each step and sends only what that step touched."""
    title: Optional[str] = Field(default=None, max_length=32)
    description: Optional[str] = Field(default=None, max_length=500)
    property_type: Optional[PropertyType] = None
    structure_type: Optional[str] = None
    bedrooms: Optional[int] = Field(default=None, ge=0, le=50)
    beds: Optional[int] = Field(default=None, ge=1, le=50)
    bathrooms: Optional[float] = Field(default=None, ge=0, le=50)
    max_guests: Optional[int] = Field(default=None, ge=1, le=16)
    price_per_night: Optional[float] = Field(default=None, ge=0)
    weekend_price: Optional[float] = Field(default=None, ge=0)
    cleaning_fee: Optional[float] = Field(default=None, ge=0)
    address: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    instant_book: Optional[bool] = None
    guest_visibility: Optional[str] = None
    host_highlights: Optional[List[str]] = None
    new_listing_discount: Optional[float] = Field(default=None, ge=0, le=1)
    weekly_discount: Optional[float] = Field(default=None, ge=0, le=1)
    monthly_discount: Optional[float] = Field(default=None, ge=0, le=1)
    has_exterior_camera: Optional[bool] = None
    has_noise_monitor: Optional[bool] = None
    has_weapons: Optional[bool] = None
    amenity_ids: Optional[List[int]] = None
    photo_urls: Optional[List[str]] = None
    wizard_step: Optional[str] = None
    # Clear the weekend price ("same as weekday") without sending null-vs-missing games.
    clear_weekend_price: bool = False


class ListingStatusUpdate(BaseModel):
    status: str  # published | unlisted


class EarningsEstimate(BaseModel):
    """The "Your home could make ₹X on Airbnb" number on the hosting landing page."""
    city: str
    nightly_rate: float
    nights: int
    total: float
    sample_size: int


class StayQuote(BaseModel):
    """What a specific stay costs, resolved server-side so the booking widget,
    the checkout page and the booking endpoint can't disagree about the price."""
    nights: int
    #: One rate per night, in order — a weekend or re-priced night differs.
    rates: List[float]
    avg_nightly: float
    nightly_subtotal: float
    discount_label: str = ""
    discount_rate: float = 0.0
    discount_amount: float = 0.0
    subtotal: float
    cleaning_fee: float
    service_fee: float
    total: float
    available: bool = True
    unavailable_reason: str = ""


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
    #: Declared as forward refs: the experience schemas are defined further down
    #: the file, after the listing ones. Resolved by model_rebuild() at the end.
    experiences: List["HostExperienceSummary"] = []
    services: List["HostExperienceSummary"] = []


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


class ExperienceCreate(BaseModel):
    """What a host fills in to publish an experience or a service.

    One payload for both: the two differ only in `kind` and in which fields
    carry meaning — an experience runs at a fixed daily `start_time`, a service
    is booked ad hoc and leaves it blank.
    """
    kind: ExperienceKind = ExperienceKind.experience
    category: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=140)
    description: str = ""
    city: str = Field(min_length=1, max_length=120)
    country: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    price_per_guest: float = Field(gt=0)
    price_unit: str = "guest"
    duration_minutes: int = Field(default=120, ge=15, le=1440)
    start_time: str = ""
    max_guests: int = Field(default=8, ge=1, le=50)
    photo_urls: List[str] = []


class ExperienceUpdate(ExperienceCreate):
    pass


class HostExperienceSummary(ExperienceCard):
    booking_count: int = 0
    revenue: float = 0.0


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


# HostDashboard names experience schemas declared below it.
HostDashboard.model_rebuild()


# ---------- Hosting dashboard ----------

class HostReservation(BaseModel):
    """One stay as the host sees it: who is coming, when, and what they will be paid."""
    id: int
    kind: str = "home"  # home | experience | service
    listing_id: int
    listing_title: str
    cover_photo_url: str = ""
    city: str = ""
    guest_id: int
    guest_name: str
    guest_avatar_url: str = ""
    check_in: datetime.date
    check_out: datetime.date
    nights: int
    guests_count: int
    total_price: float
    host_payout: float
    status: str
    created_at: datetime.datetime


class HostReservations(BaseModel):
    """Airbnb's Today tabs: Checking out / Currently hosting / Arriving soon /
    Upcoming / Pending review, plus the full history for the Reservations page."""
    checking_out: List[HostReservation] = []
    currently_hosting: List[HostReservation] = []
    arriving_soon: List[HostReservation] = []
    upcoming: List[HostReservation] = []
    pending_review: List[HostReservation] = []
    all: List[HostReservation] = []


class EarningsMonth(BaseModel):
    month: int
    label: str
    paid: float = 0.0
    upcoming: float = 0.0


class EarningsTransaction(BaseModel):
    id: int
    kind: str = "home"
    date: datetime.date
    listing_title: str
    guest_name: str
    nights: int
    gross: float
    host_fee: float
    payout: float
    status: str  # paid | upcoming | cancelled


class HostEarnings(BaseModel):
    year: int
    years: List[int]
    total_year: float
    paid_out: float
    upcoming: float
    bookings_count: int
    nights_booked: int
    avg_nightly: float
    months: List[EarningsMonth]
    transactions: List[EarningsTransaction]
    host_fee_pct: float = 0.03


class ListingInsight(BaseModel):
    id: int
    title: str
    cover_photo_url: str = ""
    city: str = ""
    status: str = "published"
    rating_avg: float = 0.0
    review_count: int = 0
    wishlist_saves: int = 0
    bookings_30d: int = 0
    occupancy_30d: float = 0.0
    revenue_30d: float = 0.0
    revenue_total: float = 0.0


class InsightReview(BaseModel):
    id: int
    listing_title: str
    author_name: str
    rating: int
    comment: str = ""
    created_at: datetime.datetime


class HostInsights(BaseModel):
    rating_avg: float
    review_count: int
    five_star_pct: float
    occupancy_30d: float
    nights_booked_30d: int
    wishlist_saves: int
    superhost_progress: dict
    listings: List[ListingInsight]
    recent_reviews: List[InsightReview]
    rating_breakdown: List[RatingCategory] = []


class CalendarDayOut(BaseModel):
    date: datetime.date
    price: float
    blocked: bool = False
    booked: bool = False
    booking_id: Optional[int] = None
    guest_name: str = ""
    is_weekend: bool = False
    custom_price: bool = False


class CalendarMonth(BaseModel):
    listing_id: int
    listing_title: str
    base_price: float
    weekend_price: Optional[float] = None
    days: List[CalendarDayOut]


class CalendarUpdate(BaseModel):
    dates: List[datetime.date]
    blocked: Optional[bool] = None
    price: Optional[float] = Field(default=None, ge=0)
    reset_price: bool = False
