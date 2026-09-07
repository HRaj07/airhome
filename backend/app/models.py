import datetime

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Index, Text,
    Table, UniqueConstraint, Enum as SAEnum
)
from sqlalchemy.orm import relationship

from .database import Base
# Re-exported so callers keep using models.PropertyType etc.; the definitions
# live in enums.py so sqlalchemy-free code can import them.
from .enums import BookingStatus, ExperienceKind, PropertyType  # noqa: F401


listing_amenities = Table(
    "listing_amenities",
    Base.metadata,
    Column("listing_id", Integer, ForeignKey("listings.id", ondelete="CASCADE"), primary_key=True),
    Column("amenity_id", Integer, ForeignKey("amenities.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    avatar_url = Column(String, default="")
    bio = Column(Text, default="")
    # Shown on the public profile ("Roopali · Noida, India · Speaks English and Hindi").
    home_city = Column(String, default="")
    languages = Column(String, default="English")
    is_host = Column(Boolean, default=False)
    is_superhost = Column(Boolean, default=False)
    identity_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    listings = relationship("Listing", back_populates="host", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="guest", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="author", cascade="all, delete-orphan")
    wishlist_items = relationship("WishlistItem", back_populates="user", cascade="all, delete-orphan")
    experiences = relationship("Experience", back_populates="host", cascade="all, delete-orphan")
    experience_bookings = relationship("ExperienceBooking", back_populates="guest", cascade="all, delete-orphan")


class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    host_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    property_type = Column(SAEnum(PropertyType), default=PropertyType.entire_home, index=True)
    bedrooms = Column(Integer, default=1)
    beds = Column(Integer, default=1)
    bathrooms = Column(Float, default=1.0)
    max_guests = Column(Integer, default=2)
    price_per_night = Column(Float, nullable=False, index=True)
    cleaning_fee = Column(Float, default=0.0)
    service_fee_pct = Column(Float, default=0.12)
    # Airbnb's "Instant Book": confirm without waiting for the host. A filter chip.
    instant_book = Column(Boolean, default=True, index=True)
    # ---- Hosting flow (Airbnb's "Become a host" wizard + hosting dashboard) ----
    # "draft" while the wizard is unfinished, "published" once live, "unlisted"
    # when the host hides it. Only published listings appear in search.
    status = Column(String, default="published", index=True)
    # The wizard step to resume a draft at ("structure", "photos", ...).
    wizard_step = Column(String, default="about-your-place")
    # "Which of these best describes your place?": house, flat, barn, cabin...
    # (property_type stays the privacy level: entire home / room / shared room.)
    structure_type = Column(String, default="house")
    # Up to two of Airbnb's highlights: peaceful, unique, family_friendly, stylish, central, spacious.
    highlights = Column(String, default="")
    # Friday and Saturday nights; null means the weekday price applies.
    weekend_price = Column(Float, nullable=True)
    # Airbnb's default discounts: 20% for the first 3 bookings, 10% weekly, 20% monthly.
    new_listing_discount = Column(Float, default=0.20)
    weekly_discount = Column(Float, default=0.10)
    monthly_discount = Column(Float, default=0.20)
    # "Choose who to welcome for your first reservation": any | experienced
    guest_visibility = Column(String, default="any")
    # Safety details the host must disclose.
    has_exterior_camera = Column(Boolean, default=False)
    has_noise_monitor = Column(Boolean, default=False)
    has_weapons = Column(Boolean, default=False)
    published_at = Column(DateTime, nullable=True)
    # Free-text sections of the listing page, as on the real one.
    guest_access = Column(Text, default="")
    other_notes = Column(Text, default="")
    address = Column(String, default="")
    # Indexed because search filters and the destination aggregation both hit
    # these columns on every request, over ~5,000 rows.
    neighborhood = Column(String, default="", index=True)
    city = Column(String, nullable=False, index=True)
    state = Column(String, default="", index=True)
    country = Column(String, default="", index=True)
    latitude = Column(Float, default=0.0)
    longitude = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    host = relationship("User", back_populates="listings")
    photos = relationship("ListingPhoto", back_populates="listing", cascade="all, delete-orphan", order_by="ListingPhoto.position")
    amenities = relationship("Amenity", secondary=listing_amenities, back_populates="listings")
    bookings = relationship("Booking", back_populates="listing", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="listing", cascade="all, delete-orphan")
    wishlisted_by = relationship("WishlistItem", back_populates="listing", cascade="all, delete-orphan")
    calendar_days = relationship("ListingCalendarDay", back_populates="listing", cascade="all, delete-orphan")


class ListingCalendarDay(Base):
    """A host override for one night on the hosting calendar: blocked, and/or a
    custom price. Nights without a row are open at the listing's base price."""
    __tablename__ = "listing_calendar_days"
    __table_args__ = (UniqueConstraint("listing_id", "date", name="uq_listing_calendar_day"),)

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    blocked = Column(Boolean, default=False)
    price = Column(Float, nullable=True)

    listing = relationship("Listing", back_populates="calendar_days")


class ListingPhoto(Base):
    __tablename__ = "listing_photos"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(String, nullable=False)
    position = Column(Integer, default=0)

    listing = relationship("Listing", back_populates="photos")


class Amenity(Base):
    __tablename__ = "amenities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    icon = Column(String, default="check")
    # Section of the "Show all amenities" modal: Essentials, Kitchen and dining...
    group = Column(String, default="Essentials")

    listings = relationship("Listing", secondary=listing_amenities, back_populates="amenities")


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (Index("ix_bookings_listing_dates", "listing_id", "check_in", "check_out"),)

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False, index=True)
    guest_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # The availability check filters on listing + both dates together, so give
    # it a composite index (see __table_args__ below) as well as these.
    check_in = Column(Date, nullable=False, index=True)
    check_out = Column(Date, nullable=False, index=True)
    guests_count = Column(Integer, default=1)
    subtotal = Column(Float, nullable=False)
    cleaning_fee = Column(Float, default=0.0)
    service_fee = Column(Float, default=0.0)
    total_price = Column(Float, nullable=False)
    status = Column(SAEnum(BookingStatus), default=BookingStatus.confirmed)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    listing = relationship("Listing", back_populates="bookings")
    guest = relationship("User", back_populates="bookings")
    review = relationship("Review", back_populates="booking", uselist=False)


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    listing = relationship("Listing", back_populates="reviews")
    booking = relationship("Booking", back_populates="review")
    author = relationship("User", back_populates="reviews")


class WishlistItem(Base):
    __tablename__ = "wishlist_items"
    __table_args__ = (UniqueConstraint("user_id", "listing_id", name="uq_user_listing_wishlist"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="wishlist_items")
    listing = relationship("Listing", back_populates="wishlisted_by")


class Experience(Base):
    """A bookable activity (kind=experience) or professional service (kind=service)."""
    __tablename__ = "experiences"

    id = Column(Integer, primary_key=True, index=True)
    host_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    kind = Column(SAEnum(ExperienceKind), default=ExperienceKind.experience, index=True)
    category = Column(String, nullable=False, index=True)  # e.g. "Food & drink", "Photography"
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    city = Column(String, nullable=False, index=True)
    country = Column(String, default="", index=True)
    latitude = Column(Float, default=0.0)
    longitude = Column(Float, default=0.0)
    price_per_guest = Column(Float, nullable=False)
    duration_minutes = Column(Integer, default=120)
    start_time = Column(String, default="")   # "3:00 PM" — experiences run at a fixed daily time; blank for services
    max_guests = Column(Integer, default=8)   # capacity per date
    price_unit = Column(String, default="guest")  # "guest" or "group"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    host = relationship("User", back_populates="experiences")
    photos = relationship("ExperiencePhoto", back_populates="experience", cascade="all, delete-orphan", order_by="ExperiencePhoto.position")
    bookings = relationship("ExperienceBooking", back_populates="experience", cascade="all, delete-orphan")
    reviews = relationship("ExperienceReview", back_populates="experience", cascade="all, delete-orphan")


class ExperiencePhoto(Base):
    __tablename__ = "experience_photos"

    id = Column(Integer, primary_key=True, index=True)
    experience_id = Column(Integer, ForeignKey("experiences.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(String, nullable=False)
    position = Column(Integer, default=0)

    experience = relationship("Experience", back_populates="photos")


class ExperienceBooking(Base):
    __tablename__ = "experience_bookings"

    id = Column(Integer, primary_key=True, index=True)
    experience_id = Column(Integer, ForeignKey("experiences.id", ondelete="CASCADE"), nullable=False, index=True)
    guest_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    guests_count = Column(Integer, default=1)
    total_price = Column(Float, nullable=False)
    status = Column(SAEnum(BookingStatus), default=BookingStatus.confirmed)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    experience = relationship("Experience", back_populates="bookings")
    guest = relationship("User", back_populates="experience_bookings")


class ExperienceReview(Base):
    __tablename__ = "experience_reviews"

    id = Column(Integer, primary_key=True, index=True)
    experience_id = Column(Integer, ForeignKey("experiences.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    experience = relationship("Experience", back_populates="reviews")
    author = relationship("User")
