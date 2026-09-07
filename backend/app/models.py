import datetime
import enum

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text,
    Table, UniqueConstraint, Enum as SAEnum
)
from sqlalchemy.orm import relationship

from .database import Base


class PropertyType(str, enum.Enum):
    entire_home = "entire_home"
    private_room = "private_room"
    shared_room = "shared_room"
    hotel_room = "hotel_room"


class BookingStatus(str, enum.Enum):
    confirmed = "confirmed"
    cancelled = "cancelled"


class ExperienceKind(str, enum.Enum):
    """Experiences are hosted activities (food tours, workshops...); services are
    bookable professionals (photographers, trainers, chefs...). They share one
    table because the booking model — a date, a headcount, a per-guest price —
    is identical; `kind` drives which tab they appear under."""
    experience = "experience"
    service = "service"


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
    is_host = Column(Boolean, default=False)
    is_superhost = Column(Boolean, default=False)
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
    host_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    property_type = Column(SAEnum(PropertyType), default=PropertyType.entire_home)
    bedrooms = Column(Integer, default=1)
    beds = Column(Integer, default=1)
    bathrooms = Column(Float, default=1.0)
    max_guests = Column(Integer, default=2)
    price_per_night = Column(Float, nullable=False)
    cleaning_fee = Column(Float, default=0.0)
    service_fee_pct = Column(Float, default=0.12)
    address = Column(String, default="")
    neighborhood = Column(String, default="")
    city = Column(String, nullable=False, index=True)
    state = Column(String, default="")
    country = Column(String, default="")
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


class ListingPhoto(Base):
    __tablename__ = "listing_photos"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False)
    url = Column(String, nullable=False)
    position = Column(Integer, default=0)

    listing = relationship("Listing", back_populates="photos")


class Amenity(Base):
    __tablename__ = "amenities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    icon = Column(String, default="check")

    listings = relationship("Listing", secondary=listing_amenities, back_populates="amenities")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False)
    guest_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    check_in = Column(Date, nullable=False)
    check_out = Column(Date, nullable=False)
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
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
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
    country = Column(String, default="")
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
    experience_id = Column(Integer, ForeignKey("experiences.id", ondelete="CASCADE"), nullable=False)
    url = Column(String, nullable=False)
    position = Column(Integer, default=0)

    experience = relationship("Experience", back_populates="photos")


class ExperienceBooking(Base):
    __tablename__ = "experience_bookings"

    id = Column(Integer, primary_key=True, index=True)
    experience_id = Column(Integer, ForeignKey("experiences.id", ondelete="CASCADE"), nullable=False)
    guest_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    guests_count = Column(Integer, default=1)
    total_price = Column(Float, nullable=False)
    status = Column(SAEnum(BookingStatus), default=BookingStatus.confirmed)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    experience = relationship("Experience", back_populates="bookings")
    guest = relationship("User", back_populates="experience_bookings")


class ExperienceReview(Base):
    __tablename__ = "experience_reviews"

    id = Column(Integer, primary_key=True, index=True)
    experience_id = Column(Integer, ForeignKey("experiences.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    experience = relationship("Experience", back_populates="reviews")
    author = relationship("User")
