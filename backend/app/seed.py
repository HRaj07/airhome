"""
Seed the database with the demo marketplace: ~500 cities, ~5,000 listings with
photos, amenities, bookings and reviews, plus experiences and services.

Everything is written with bulk inserts. The obvious version — construct an ORM
object, `flush()` to get its id, then add its children — issues one round trip
per row, which at this size takes minutes instead of seconds.

What the rows *contain* lives in seed_data.py, which has no database imports and
is unit-tested directly.

Run with:  python -m app.seed        (from the backend folder)
"""
import datetime
import random
import time

from sqlalchemy import insert

from . import models, seed_data
from .auth import hash_password
from .cities import ALL_CITIES
from .database import Base, SessionLocal, engine


def run() -> None:
    random.seed(seed_data.SEED)
    started = time.time()

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # ---------- reference data ----------
        today = datetime.date.today()
        db.execute(insert(models.Amenity.__table__), seed_data.build_amenities())
        db.commit()
        amenity_rows = db.query(models.Amenity.id, models.Amenity.name).order_by(models.Amenity.id).all()
        amenity_ids = [a.id for a in amenity_rows]
        amenity_names = [a.name for a in amenity_rows]

        # ---------- people ----------
        # One bcrypt hash reused for every account: hashing ~130 identical demo
        # passwords separately is otherwise the slowest step in the script.
        db.execute(insert(models.User.__table__), seed_data.build_users(hash_password("password123"), today=today))
        db.commit()

        host_ids = [u.id for u in db.query(models.User.id).filter(models.User.is_host.is_(True)).all()]
        guest_ids = [u.id for u in db.query(models.User.id).filter(models.User.is_host.is_(False)).all()]
        demo_guest_id = db.query(models.User.id).filter(models.User.email == "demo@example.com").scalar()
        # Hosts travel too, so they can review as well.
        reviewer_ids = guest_ids + host_ids[: len(host_ids) // 2]

        # ---------- listings ----------
        db.execute(insert(models.Listing.__table__), seed_data.build_listings(host_ids))
        db.commit()
        listings = db.query(
            models.Listing.id, models.Listing.price_per_night, models.Listing.cleaning_fee,
            models.Listing.service_fee_pct, models.Listing.max_guests,
            # Drive which photos the listing gets: a dorm bed shouldn't be
            # illustrated with a villa exterior, and a Delhi home shouldn't be
            # illustrated with a house in Ohio.
            models.Listing.property_type, models.Listing.country, models.Listing.city,
        ).all()
        print(f"  {len(listings)} listings across {len(ALL_CITIES)} cities")

        photos, amenity_links = seed_data.build_photos_and_amenity_links(listings, amenity_ids, amenity_names)
        db.execute(insert(models.ListingPhoto.__table__), photos)
        db.execute(insert(models.listing_amenities), amenity_links)
        db.commit()
        print(f"  {len(photos)} photos, {len(amenity_links)} amenity links")

        # ---------- bookings & reviews ----------
        past, upcoming = seed_data.build_bookings(listings, guest_ids, reviewer_ids, demo_guest_id, today)
        db.execute(insert(models.Booking.__table__), past + upcoming)
        db.commit()
        print(f"  {len(past)} past + {len(upcoming)} upcoming bookings")

        past_bookings = (
            db.query(models.Booking.id, models.Booking.listing_id, models.Booking.guest_id)
            .filter(models.Booking.check_out < today)
            .all()
        )
        reviews = seed_data.build_reviews(past_bookings, reviewer_ids, today)
        db.execute(insert(models.Review.__table__), reviews)
        db.commit()
        print(f"  {len(reviews)} reviews")

        # ---------- experiences & services ----------
        db.execute(insert(models.Experience.__table__), seed_data.build_experiences(host_ids))
        db.commit()
        experiences = db.query(
            models.Experience.id, models.Experience.kind, models.Experience.price_per_guest,
            models.Experience.price_unit, models.Experience.max_guests,
            # Title and category pick the photo topic, so a night market crawl
            # shows a night market; city and country keep covers distinct per
            # city and give Indian experiences Indian photography.
            models.Experience.title, models.Experience.category,
            models.Experience.city, models.Experience.country,
        ).all()

        exp_photos, exp_reviews, exp_bookings = seed_data.build_experience_children(
            experiences, guest_ids, reviewer_ids, today
        )
        db.execute(insert(models.ExperiencePhoto.__table__), exp_photos)
        db.execute(insert(models.ExperienceReview.__table__), exp_reviews)
        db.execute(insert(models.ExperienceBooking.__table__), exp_bookings)
        db.commit()

        n_exp = sum(1 for e in experiences if e.kind == models.ExperienceKind.experience)
        print(
            f"\nSeeded {len(host_ids)} hosts, {len(guest_ids)} guests, {len(listings)} listings "
            f"in {len(ALL_CITIES)} cities, {n_exp} experiences, {len(experiences) - n_exp} services "
            f"in {time.time() - started:.1f}s."
        )
        print("Demo login (any host): amelia.host@example.com / password123")
        print("Demo login (guest):    demo@example.com / password123")

    finally:
        db.close()


if __name__ == "__main__":
    run()
