"""
Seed the database with realistic mock data: hosts, guests, listings with
photos & amenities, existing bookings (past + upcoming), and reviews.

Run with:  python -m app.seed
"""
import datetime
import random

from .database import SessionLocal, engine, Base
from . import models
from .auth import hash_password
from .pricing import compute_price

random.seed(42)

AMENITIES = [
    ("Wifi", "wifi"),
    ("Kitchen", "kitchen"),
    ("Free parking", "parking"),
    ("Air conditioning", "ac"),
    ("Heating", "heating"),
    ("Washer", "washer"),
    ("Dryer", "dryer"),
    ("TV", "tv"),
    ("Dedicated workspace", "workspace"),
    ("Pets allowed", "pets"),
    ("Hot tub", "hot-tub"),
    ("Pool", "pool"),
    ("Gym", "gym"),
    ("Breakfast included", "breakfast"),
    ("Fireplace", "fireplace"),
    ("EV charger", "ev-charger"),
]

CITIES = [
    ("New York", "NY", "United States", 40.7128, -74.0060),
    ("Los Angeles", "CA", "United States", 34.0522, -118.2437),
    ("San Francisco", "CA", "United States", 37.7749, -122.4194),
    ("Austin", "TX", "United States", 30.2672, -97.7431),
    ("Miami", "FL", "United States", 25.7617, -80.1918),
    ("Paris", "", "France", 48.8566, 2.3522),
    ("London", "", "United Kingdom", 51.5074, -0.1278),
    ("Tokyo", "", "Japan", 35.6762, 139.6503),
    ("Barcelona", "", "Spain", 41.3874, 2.1686),
    ("Bali", "", "Indonesia", -8.3405, 115.0920),
    ("Lisbon", "", "Portugal", 38.7223, -9.1393),
    ("Cape Town", "", "South Africa", -33.9249, 18.4241),
]

PROPERTY_TYPES = list(models.PropertyType)

TITLE_TEMPLATES = [
    "Sunny {type} in the heart of {city}",
    "Cozy {type} with skyline views",
    "Modern {type} near downtown {city}",
    "Charming {type} steps from the beach",
    "Stylish {type} with rooftop access",
    "Quiet {type} perfect for a getaway",
    "Design {type} close to everything",
    "Bright {type} with private balcony",
    "Luxury {type} with stunning views",
    "Rustic {type} in a peaceful neighborhood",
]

TYPE_LABEL = {
    models.PropertyType.entire_home: "home",
    models.PropertyType.private_room: "private room",
    models.PropertyType.shared_room: "shared room",
    models.PropertyType.hotel_room: "hotel room",
}

DESCRIPTION = (
    "Welcome to this beautifully maintained space, thoughtfully designed for both relaxation "
    "and productivity. You'll have access to a fully equipped kitchen, fast wifi, and a "
    "comfortable living area. The neighborhood is walkable, with cafes, restaurants, and public "
    "transit just minutes away. Perfect for couples, families, or solo travelers looking to "
    "experience the city like a local."
)

HOSTS = [
    {"email": "amelia.host@example.com", "full_name": "Amelia Carter", "bio": "Superhost sharing beautiful stays for 6 years.", "superhost": True},
    {"email": "daniel.host@example.com", "full_name": "Daniel Kim", "bio": "I love meeting travelers from around the world.", "superhost": True},
    {"email": "sofia.host@example.com", "full_name": "Sofia Rossi", "bio": "Interior designer turned host. Every space has a story.", "superhost": False},
    {"email": "james.host@example.com", "full_name": "James Okafor", "bio": "Hosting cozy homes since 2020.", "superhost": True},
    {"email": "mei.host@example.com", "full_name": "Mei Tanaka", "bio": "Passionate about hospitality and good design.", "superhost": False},
]

GUESTS = [
    {"email": "guest1@example.com", "full_name": "Alex Johnson"},
    {"email": "guest2@example.com", "full_name": "Priya Sharma"},
    {"email": "guest3@example.com", "full_name": "Marco Silva"},
    {"email": "demo@example.com", "full_name": "Demo Guest"},
]

REVIEW_COMMENTS = [
    "Amazing stay! The place was exactly as described and the host was super responsive.",
    "Great location, super clean, and comfortable beds. Would book again.",
    "Loved every minute of our trip here. Highly recommend to anyone visiting the area.",
    "The photos don't do it justice — even better in person!",
    "Host went above and beyond to make our stay comfortable.",
    "Perfect for a weekend getaway. Quiet, clean, and cozy.",
    "Checked in easily and the space had everything we needed.",
    "Beautiful views and a great neighborhood to explore on foot.",
]


def run():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        amenity_objs = [models.Amenity(name=n, icon=i) for n, i in AMENITIES]
        db.add_all(amenity_objs)
        db.commit()
        for a in amenity_objs:
            db.refresh(a)

        host_objs = []
        for h in HOSTS:
            u = models.User(
                email=h["email"],
                hashed_password=hash_password("password123"),
                full_name=h["full_name"],
                bio=h["bio"],
                is_host=True,
                is_superhost=h["superhost"],
                avatar_url=f"https://i.pravatar.cc/150?u={h['email']}",
            )
            db.add(u)
            host_objs.append(u)
        db.commit()
        for u in host_objs:
            db.refresh(u)

        guest_objs = []
        for g in GUESTS:
            u = models.User(
                email=g["email"],
                hashed_password=hash_password("password123"),
                full_name=g["full_name"],
                is_host=False,
                avatar_url=f"https://i.pravatar.cc/150?u={g['email']}",
            )
            db.add(u)
            guest_objs.append(u)
        db.commit()
        for u in guest_objs:
            db.refresh(u)

        listings = []
        listing_num = 0
        for city, state, country, lat, lng in CITIES:
            # 1-2 listings per city, ~18-20 total
            for _ in range(random.choice([1, 2])):
                listing_num += 1
                ptype = random.choice(PROPERTY_TYPES)
                title = random.choice(TITLE_TEMPLATES).format(type=TYPE_LABEL[ptype], city=city)
                host = random.choice(host_objs)
                bedrooms = random.randint(1, 4)
                beds = bedrooms + random.choice([0, 0, 1])
                bathrooms = random.choice([1.0, 1.5, 2.0, 2.5])
                max_guests = bedrooms * 2 + random.choice([0, 1, 2])
                price = round(random.uniform(45, 420), 0)
                cleaning_fee = round(price * random.uniform(0.1, 0.25), 2)

                # slight jitter so listings in the same city aren't stacked exactly
                jitter_lat = lat + random.uniform(-0.03, 0.03)
                jitter_lng = lng + random.uniform(-0.03, 0.03)

                listing = models.Listing(
                    host_id=host.id,
                    title=title,
                    description=DESCRIPTION,
                    property_type=ptype,
                    bedrooms=bedrooms,
                    beds=max(beds, 1),
                    bathrooms=bathrooms,
                    max_guests=max(max_guests, 1),
                    price_per_night=price,
                    cleaning_fee=cleaning_fee,
                    service_fee_pct=0.12,
                    address=f"{random.randint(1, 999)} {random.choice(['Main St', 'Oak Ave', 'Sunset Blvd', 'River Rd', 'Market St'])}",
                    city=city,
                    state=state,
                    country=country,
                    latitude=jitter_lat,
                    longitude=jitter_lng,
                )
                db.add(listing)
                db.flush()

                num_photos = random.randint(4, 6)
                for i in range(num_photos):
                    photo = models.ListingPhoto(
                        listing_id=listing.id,
                        url=f"https://picsum.photos/seed/listing{listing.id}-{i}/1024/768",
                        position=i,
                    )
                    db.add(photo)

                chosen_amenities = random.sample(amenity_objs, k=random.randint(5, 10))
                listing.amenities = chosen_amenities

                listings.append(listing)

        db.commit()
        for l in listings:
            db.refresh(l)

        today = datetime.date.today()

        # Past (completed) bookings -> enable reviews
        for listing in listings:
            if random.random() < 0.8:
                guest = random.choice(guest_objs)
                nights = random.randint(2, 6)
                check_in = today - datetime.timedelta(days=random.randint(20, 120))
                check_out = check_in + datetime.timedelta(days=nights)
                subtotal, service_fee, total = compute_price(
                    nights, listing.price_per_night, listing.cleaning_fee, listing.service_fee_pct
                )
                booking = models.Booking(
                    listing_id=listing.id,
                    guest_id=guest.id,
                    check_in=check_in,
                    check_out=check_out,
                    guests_count=random.randint(1, listing.max_guests),
                    subtotal=subtotal,
                    cleaning_fee=listing.cleaning_fee,
                    service_fee=service_fee,
                    total_price=total,
                    status=models.BookingStatus.confirmed,
                )
                db.add(booking)
                db.flush()

                # add 1-3 reviews on this listing (from various guests, but only
                # one may attach to this exact completed booking to satisfy the
                # one-review-per-booking rule; extra reviews are booking-less
                # historical reviews to make listings feel established)
                review = models.Review(
                    listing_id=listing.id,
                    booking_id=booking.id,
                    author_id=guest.id,
                    rating=random.randint(4, 5),
                    comment=random.choice(REVIEW_COMMENTS),
                )
                db.add(review)

                extra_reviews = random.randint(0, 3)
                for _ in range(extra_reviews):
                    other_guest = random.choice(guest_objs)
                    db.add(
                        models.Review(
                            listing_id=listing.id,
                            author_id=other_guest.id,
                            rating=random.randint(3, 5),
                            comment=random.choice(REVIEW_COMMENTS),
                        )
                    )

        # Upcoming bookings -> block out calendar dates, populate "My Trips" / host dashboards
        for listing in random.sample(listings, k=min(10, len(listings))):
            guest = random.choice(guest_objs)
            nights = random.randint(2, 5)
            check_in = today + datetime.timedelta(days=random.randint(5, 60))
            check_out = check_in + datetime.timedelta(days=nights)
            subtotal, service_fee, total = compute_price(
                nights, listing.price_per_night, listing.cleaning_fee, listing.service_fee_pct
            )
            db.add(
                models.Booking(
                    listing_id=listing.id,
                    guest_id=guest.id,
                    check_in=check_in,
                    check_out=check_out,
                    guests_count=random.randint(1, listing.max_guests),
                    subtotal=subtotal,
                    cleaning_fee=listing.cleaning_fee,
                    service_fee=service_fee,
                    total_price=total,
                    status=models.BookingStatus.confirmed,
                )
            )

        db.commit()

        print(f"Seeded {len(host_objs)} hosts, {len(guest_objs)} guests, {len(listings)} listings.")
        print("Demo login (any host): amelia.host@example.com / password123")
        print("Demo login (guest):    demo@example.com / password123")

    finally:
        db.close()


if __name__ == "__main__":
    run()
