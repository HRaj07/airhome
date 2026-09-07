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

# (city, state, country, lat, lng, neighborhoods) — 6 listings are generated per city,
# one per neighborhood, so the homepage carousel rows look full.
CITIES = [
    ("New York", "NY", "United States", 40.7128, -74.0060,
     ["Williamsburg", "SoHo", "Harlem", "Upper West Side", "Astoria", "Brooklyn Heights"]),
    ("Los Angeles", "CA", "United States", 34.0522, -118.2437,
     ["Venice", "Silver Lake", "Santa Monica", "Echo Park", "Hollywood Hills", "Los Feliz"]),
    ("Paris", "", "France", 48.8566, 2.3522,
     ["Le Marais", "Montmartre", "Saint-Germain", "Belleville", "Latin Quarter", "Canal Saint-Martin"]),
    ("London", "", "United Kingdom", 51.5074, -0.1278,
     ["Shoreditch", "Notting Hill", "Camden", "Brixton", "Kensington", "Hackney"]),
    ("Tokyo", "", "Japan", 35.6762, 139.6503,
     ["Shibuya", "Shinjuku", "Asakusa", "Nakameguro", "Koenji", "Ginza"]),
    ("Barcelona", "", "Spain", 41.3874, 2.1686,
     ["El Born", "Gràcia", "Eixample", "Barceloneta", "Poblenou", "Gothic Quarter"]),
    ("Bali", "", "Indonesia", -8.3405, 115.0920,
     ["Canggu", "Ubud", "Seminyak", "Uluwatu", "Sanur", "Nusa Dua"]),
    ("Lisbon", "", "Portugal", 38.7223, -9.1393,
     ["Alfama", "Bairro Alto", "Chiado", "Belém", "Príncipe Real", "Cais do Sodré"]),
]

# Weighted so most listings are entire homes, like the real marketplace.
PROPERTY_TYPES = (
    [models.PropertyType.entire_home] * 6
    + [models.PropertyType.private_room] * 2
    + [models.PropertyType.hotel_room]
    + [models.PropertyType.shared_room]
)

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


EXPERIENCES = {
    "Food & drink": [
        ("{city} street food tour with a local", "12:00 PM", 180, 34),
        ("Hidden bars & craft cocktails of {city}", "8:00 PM", 150, 58),
        ("Cook a traditional {city} dinner together", "6:30 PM", 180, 72),
    ],
    "Art & culture": [
        ("{city} history & architecture walk", "10:00 AM", 150, 29),
        ("Photography walk through old {city}", "4:00 PM", 120, 45),
        ("Museum highlights with an art historian", "1:00 PM", 120, 55),
    ],
    "Outdoors": [
        ("Sunrise hike above {city}", "6:00 AM", 240, 49),
        ("Bike the hidden corners of {city}", "9:00 AM", 180, 39),
    ],
    "Wellness": [
        ("Rooftop yoga at sunrise", "7:00 AM", 75, 25),
        ("Sound bath & guided meditation", "7:30 PM", 90, 30),
    ],
    "Nightlife": [
        ("{city} night market food crawl", "7:00 PM", 180, 42),
        ("Live jazz & speakeasies after dark", "9:00 PM", 150, 65),
    ],
}

SERVICES = {
    "Photography": [
        ("{city} photo session by a local photographer", 90, 110, "guest"),
        ("Editorial love-story portraits by {name}", 120, 140, "group"),
        ("Candid travel portraits by {name}", 60, 95, "guest"),
        ("Cinematic city portraits by {name} Studio", 120, 160, "group"),
    ],
    "Training": [
        ("Personal training session with {name}", 60, 45, "guest"),
        ("Private yoga class at your stay", 75, 40, "guest"),
        ("Boxing fundamentals with {name}", 60, 55, "guest"),
        ("Pilates reformer session", 55, 50, "guest"),
    ],
    "Chefs": [
        ("Private chef dinner by {name}", 180, 95, "guest"),
        ("Farm-to-table tasting menu at home", 150, 120, "guest"),
        ("Brunch cooked in your kitchen by {name}", 120, 60, "guest"),
    ],
    "Massage": [
        ("In-home deep tissue massage", 60, 85, "guest"),
        ("Couples relaxation massage", 75, 150, "group"),
        ("Post-flight recovery massage by {name}", 60, 90, "guest"),
    ],
    "Make-up": [
        ("Event make-up by {name}", 60, 70, "guest"),
        ("Bridal trial & wedding-day make-up", 120, 180, "guest"),
    ],
    "Hair": [
        ("Blowout & styling at your stay", 45, 50, "guest"),
        ("Cut & colour by {name}", 120, 130, "guest"),
    ],
}

PRO_NAMES = ["Anaya", "Rishab", "Anurag", "Ashish", "Léa", "Kenji", "Marta", "Tomás", "Noor", "Elena"]

EXPERIENCE_DESCRIPTION = (
    "Join a passionate local host for a small-group experience designed to show you a side "
    "of the city most visitors never see. Everything is included — just bring your curiosity "
    "and comfortable shoes. Groups are kept small so there's plenty of time for questions, "
    "photos and detours."
)

SERVICE_DESCRIPTION = (
    "A vetted professional comes to you — at your stay or a location of your choice — so you "
    "can make the most of your trip without the logistics. Book a time that suits you; the "
    "provider brings everything needed for the session."
)

EXPERIENCE_REVIEWS = [
    "Our host was incredible — knowledgeable, funny and so generous with their time.",
    "The highlight of our trip. Small group, great pace, unforgettable food.",
    "Worth every penny. We saw places we'd never have found on our own.",
    "Professional, punctual and genuinely talented. Would book again in a heartbeat.",
    "Perfectly organised from start to finish. Highly recommend.",
    "Such a fun way to spend the afternoon. Great for first-time visitors.",
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
        for city, state, country, lat, lng, neighborhoods in CITIES:
            # one listing per neighborhood -> 6 per city, 48 total
            for neighborhood in neighborhoods:
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
                    neighborhood=neighborhood,
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

                # Mostly 4-5 star reviews so a good share of listings qualify as
                # "Guest favourite" (>= 4.8 avg with several reviews), like the real site.
                extra_reviews = random.randint(1, 6)
                for _ in range(extra_reviews):
                    other_guest = random.choice(guest_objs)
                    db.add(
                        models.Review(
                            listing_id=listing.id,
                            author_id=other_guest.id,
                            rating=random.choice([3, 4, 4, 5, 5, 5, 5]),
                            comment=random.choice(REVIEW_COMMENTS),
                        )
                    )

        # Upcoming bookings -> block out calendar dates, populate "My Trips" / host dashboards
        for listing in random.sample(listings, k=min(18, len(listings))):
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

        # ---------- Experiences & Services ----------
        experiences = []
        for city, state, country, lat, lng, _neigh in CITIES:
            # ~7 experiences per city: pick from every category
            picks = []
            for category, templates in EXPERIENCES.items():
                for tpl in random.sample(templates, k=min(len(templates), 2 if category in ("Food & drink", "Art & culture") else 1)):
                    picks.append((category, tpl))
            for category, (title_tpl, start_time, duration, price) in picks:
                exp = models.Experience(
                    host_id=random.choice(host_objs).id,
                    kind=models.ExperienceKind.experience,
                    category=category,
                    title=title_tpl.format(city=city),
                    description=EXPERIENCE_DESCRIPTION,
                    city=city,
                    country=country,
                    latitude=lat + random.uniform(-0.03, 0.03),
                    longitude=lng + random.uniform(-0.03, 0.03),
                    price_per_guest=float(price),
                    price_unit="guest",
                    duration_minutes=duration,
                    start_time=start_time,
                    max_guests=random.choice([6, 8, 10, 12]),
                )
                db.add(exp)
                db.flush()
                for i in range(random.randint(3, 5)):
                    db.add(models.ExperiencePhoto(experience_id=exp.id, url=f"https://picsum.photos/seed/exp{exp.id}-{i}/1024/768", position=i))
                experiences.append(exp)

        # Services: spread each category across cities so every category row is full
        city_cycle = [c for c in CITIES]
        idx = 0
        for category, templates in SERVICES.items():
            for _ in range(7):
                title_tpl, duration, price, unit = templates[idx % len(templates)]
                city, state, country, lat, lng, _neigh = city_cycle[idx % len(city_cycle)]
                idx += 1
                exp = models.Experience(
                    host_id=random.choice(host_objs).id,
                    kind=models.ExperienceKind.service,
                    category=category,
                    title=title_tpl.format(city=city, name=random.choice(PRO_NAMES)),
                    description=SERVICE_DESCRIPTION,
                    city=city,
                    country=country,
                    latitude=lat + random.uniform(-0.03, 0.03),
                    longitude=lng + random.uniform(-0.03, 0.03),
                    price_per_guest=float(price),
                    price_unit=unit,
                    duration_minutes=duration,
                    start_time="",
                    max_guests=random.choice([1, 2, 4, 6]) if unit == "guest" else random.choice([2, 4]),
                )
                db.add(exp)
                db.flush()
                for i in range(random.randint(3, 4)):
                    db.add(models.ExperiencePhoto(experience_id=exp.id, url=f"https://picsum.photos/seed/svc{exp.id}-{i}/1024/768", position=i))
                experiences.append(exp)
        db.commit()

        # Reviews + a few bookings (past ones make listings feel established, upcoming ones use up spots)
        for exp in experiences:
            for _ in range(random.randint(2, 6)):
                db.add(models.ExperienceReview(
                    experience_id=exp.id,
                    author_id=random.choice(guest_objs).id,
                    rating=random.choice([4, 5, 5, 5, 5]),
                    comment=random.choice(EXPERIENCE_REVIEWS),
                ))
            if random.random() < 0.5:
                guests = random.randint(1, max(1, min(2, exp.max_guests)))
                total = exp.price_per_guest if exp.price_unit == "group" else exp.price_per_guest * guests
                db.add(models.ExperienceBooking(
                    experience_id=exp.id,
                    guest_id=random.choice(guest_objs).id,
                    date=today - datetime.timedelta(days=random.randint(3, 60)),
                    guests_count=guests,
                    total_price=round(total, 2),
                    status=models.BookingStatus.confirmed,
                ))
            if random.random() < 0.3:
                guests = random.randint(1, max(1, min(2, exp.max_guests)))
                total = exp.price_per_guest if exp.price_unit == "group" else exp.price_per_guest * guests
                db.add(models.ExperienceBooking(
                    experience_id=exp.id,
                    guest_id=random.choice(guest_objs).id,
                    date=today + datetime.timedelta(days=random.randint(1, 20)),
                    guests_count=guests,
                    total_price=round(total, 2),
                    status=models.BookingStatus.confirmed,
                ))

        db.commit()

        n_exp = sum(1 for e in experiences if e.kind == models.ExperienceKind.experience)
        n_svc = len(experiences) - n_exp
        print(f"Seeded {len(host_objs)} hosts, {len(guest_objs)} guests, {len(listings)} listings, {n_exp} experiences, {n_svc} services.")
        print("Demo login (any host): amelia.host@example.com / password123")
        print("Demo login (guest):    demo@example.com / password123")

    finally:
        db.close()


if __name__ == "__main__":
    run()
