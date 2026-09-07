"""
The data the seed script writes, built as plain dictionaries.

Nothing here imports SQLAlchemy: `seed.py` owns the database and this module
owns *what goes in it*, which means the generation logic can be unit-tested
without a driver installed (see tests/test_seed_data.py). It also keeps the
seed script itself short enough to read in one screen.
"""
import datetime
import random
from typing import Dict, Iterable, List, Optional, Sequence

from .cities import ALL_CITIES, MAJOR_CITIES, City
from .enums import BookingStatus, ExperienceKind, PropertyType
from . import photos
from .pricing import compute_price

#: Deterministic output, so two people running the seed see the same demo data.
SEED = 42

#: (name, icon, group). Airbnb's own wording, so the filter chips read the same
#: as the real ones ("Allows pets", "Washing machine"). The group is what the
#: "Show all amenities" modal sections on.
AMENITIES = [
    # Essentials — nearly every listing has these.
    ("Wifi", "wifi", "Essentials"),
    ("Kitchen", "kitchen", "Essentials"),
    ("TV", "tv", "Essentials"),
    ("Air conditioning", "ac", "Essentials"),
    ("Heating", "heating", "Essentials"),
    ("Hot water", "droplet", "Essentials"),
    ("Hairdryer", "wind", "Essentials"),
    ("Iron", "iron", "Essentials"),
    ("Bed linen", "bed", "Essentials"),
    ("Hangers", "hanger", "Essentials"),
    ("Washing machine", "washer", "Essentials"),
    ("Dryer", "dryer", "Essentials"),
    ("Dedicated workspace", "workspace", "Essentials"),
    # Kitchen and dining
    ("Microwave", "microwave", "Kitchen and dining"),
    ("Refrigerator", "fridge", "Kitchen and dining"),
    ("Cooking basics", "cooking", "Kitchen and dining"),
    ("Dishes and cutlery", "utensils", "Kitchen and dining"),
    ("Coffee maker", "coffee", "Kitchen and dining"),
    ("Dining table", "table", "Kitchen and dining"),
    ("Breakfast", "breakfast", "Kitchen and dining"),
    # Outdoor and features
    ("Pool", "pool", "Features"),
    ("Hot tub", "hot-tub", "Features"),
    ("Gym", "gym", "Features"),
    ("Private patio or balcony", "sun", "Features"),
    ("Garden", "tree", "Features"),
    ("BBQ grill", "flame", "Features"),
    ("Fireplace", "fireplace", "Features"),
    ("Outdoor furniture", "armchair", "Features"),
    ("Lift", "elevator", "Features"),
    ("Sea view", "waves", "Features"),
    ("Mountain view", "mountain", "Features"),
    # Parking and access
    ("Free parking", "parking", "Parking and facilities"),
    ("EV charger", "ev-charger", "Parking and facilities"),
    ("Self check-in", "key", "Parking and facilities"),
    ("Long-term stays allowed", "calendar", "Parking and facilities"),
    ("Allows pets", "pets", "Parking and facilities"),
    ("Luggage drop-off allowed", "luggage", "Parking and facilities"),
    # Safety
    ("Smoke alarm", "alarm", "Safety"),
    ("Carbon monoxide alarm", "alarm", "Safety"),
    ("First aid kit", "first-aid", "Safety"),
    ("Fire extinguisher", "extinguisher", "Safety"),
    ("Exterior security cameras on property", "camera", "Safety"),
    ("Lockbox", "lock", "Safety"),
    ("Private entrance", "door", "Safety"),
]

#: Amenities almost every real listing has; the rest are sampled on top.
CORE_AMENITIES = {"Wifi", "Kitchen", "TV", "Hot water", "Bed linen", "Hangers", "Smoke alarm", "Hairdryer"}

# Weighted so most listings are entire homes, like the real marketplace.
PROPERTY_TYPES = (
    [PropertyType.entire_home] * 6
    + [PropertyType.private_room] * 2
    + [PropertyType.hotel_room]
    + [PropertyType.shared_room]
)

#: Local price levels, as a multiple of the catalogue's baseline nightly rate.
#: The baseline (45-420 USD) is a Western-market range, and browsing from India
#: it read as broken: an entire flat in Delhi goes for roughly Rs 3,000-8,000 a
#: night, not the Rs 20,000 a flat rate produced. Countries absent from this map
#: keep the baseline. Add a country here to bring its market into line.
COUNTRY_PRICE_FACTOR = {
    "India": 0.30,
}

#: What guests pay for less of the property. A shared dorm bed drawn from the
#: same range as an entire villa was the other half of the problem: it put a
#: "Room in Connaught Place" above every whole house around it.
PROPERTY_TYPE_PRICE_FACTOR = {
    PropertyType.entire_home: 1.0,
    PropertyType.hotel_room: 0.72,
    PropertyType.private_room: 0.5,
    PropertyType.shared_room: 0.28,
}

#: Floors, in USD, so the factors can never multiply down to a silly number.
MIN_NIGHTLY_PRICE = 6.0
MIN_EXPERIENCE_PRICE = 5.0


def nightly_price(base: float, country: str, ptype: PropertyType) -> float:
    """The baseline draw adjusted for where the listing is and how much of the
    place the guest gets. Deterministic — it draws no randomness of its own, so
    re-seeding reproduces the same photos, titles and bookings as before with
    only the prices moved."""
    adjusted = base * COUNTRY_PRICE_FACTOR.get(country, 1.0) * PROPERTY_TYPE_PRICE_FACTOR[ptype]
    return max(MIN_NIGHTLY_PRICE, float(round(adjusted, 0)))


def guest_price(base: float, country: str) -> float:
    """The same local adjustment for an experience or service, which has no
    property type to scale by."""
    return max(MIN_EXPERIENCE_PRICE, float(round(base * COUNTRY_PRICE_FACTOR.get(country, 1.0), 0)))

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
    PropertyType.entire_home: "home",
    PropertyType.private_room: "private room",
    PropertyType.shared_room: "shared room",
    PropertyType.hotel_room: "hotel room",
}

GUEST_ACCESS = (
    "Guests will have access to the entire space, ensuring complete privacy and comfort "
    "throughout their stay. Shared facilities in the building — where listed under amenities — "
    "are available during their published hours; please confirm availability with us before "
    "check-in if you plan to use them."
)

OTHER_NOTES = (
    "As per local regulations, all guests are required to share a valid government-issued "
    "ID before check-in.\n\nOur stays are designed for couples, families and solo travellers. "
    "We don't accommodate parties or large gatherings, and quiet hours run from 10 PM to 8 AM."
)

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
    "The place was so good and clean. Exactly how the host described and presented. Thank you for the wonderful and smooth stay.",
    "Nice place to spend a few days for couples.",
    "I loved it.",
    "It was a very beautiful place and we definitely would like to come again.",
    "The place was very cosy and comfortable, we had a great time during our stay.",
    "Amazing place to stay! The overall vibe of the place is so calm and beautiful. We had a great time, and the stay was extremely comfortable. The host was very responsive and helped us with everything we needed.",
    "Great location, super clean, and comfortable beds. Would book again.",
    "The photos don't do it justice — even better in person!",
    "Host went above and beyond to make our stay comfortable. Check-in was seamless.",
    "Perfect for a weekend getaway. Quiet, clean, and cosy.",
    "Checked in easily and the space had everything we needed. Fast wifi, which mattered for us.",
    "Beautiful views and a great neighbourhood to explore on foot.",
    "Spotless apartment, well stocked kitchen and a very kind host. Highly recommended.",
    "Loved the location — cafes and the metro right around the corner. Bed was very comfortable.",
    "Everything was as described. Host replied within minutes each time we messaged.",
    "We stayed for a week and didn't want to leave. The balcony was our favourite spot.",
    "Good value for the area. A little street noise at night but nothing a window couldn't fix.",
    "Clean, calm and central. The self check-in worked perfectly even though we arrived late.",
    "The host left snacks and a handwritten note. Small touches that made the stay feel personal.",
    "Great for families — plenty of space and the kids loved the pool.",
    "Would recommend to anyone visiting for work. Desk, chair and strong wifi.",
    "The apartment is exactly like the pictures. Quiet building and easy parking.",
    "Really enjoyed our stay. The host gave excellent recommendations for dinner nearby.",
    "Lovely home with a lot of character. The kitchen had everything we needed to cook.",
    "Comfortable, clean and the AC worked well — important in this heat!",
    "A gem. We came for two nights and extended to four.",
    "Check-in instructions were clear and the place was spotless on arrival.",
    "Our third time staying here. It's become our go-to for this city.",
    "Great host, great place, great location. Nothing to complain about.",
    "The rooftop view at sunset alone is worth the price.",
    "Cosy and well maintained. The bed was one of the best we've had on a trip.",
    "Very responsive host and a peaceful neighbourhood. We slept really well.",
    "Convenient location and a thoughtfully furnished flat. We'd happily return.",
    "Ten out of ten. Clean, quiet, and the host is a lovely person.",
    "The description was accurate and the host was easy to communicate with.",
    "Stylish interiors and a comfortable bed. The shower pressure was excellent.",
    "Ideal base for exploring the old town on foot. Bakery downstairs was a bonus.",
    "Nice stay overall. Would have liked a few more kitchen utensils, but the host was quick to help.",
    "We felt at home from the moment we walked in. Thank you for hosting us!",
    "Superb place, superb host. Booked again for next month before we'd even checked out.",
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

#: Hosts in India get Indian names. A trainer photographed in Delhi being
#: introduced as "Tomás" is the kind of mismatch a guest notices instantly.
INDIA_PRO_NAMES = ["Anaya", "Rishab", "Anurag", "Ashish", "Priya", "Aditya",
                   "Meera", "Vikram", "Kavya", "Rohan", "Neha", "Arjun"]
WORLD_PRO_NAMES = ["Léa", "Kenji", "Marta", "Tomás", "Noor", "Elena", "Lucas", "Sofia"]


def host_names_for(country: str) -> List[str]:
    return INDIA_PRO_NAMES if country == "India" else WORLD_PRO_NAMES

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



# Extra hosts and guests so 5,000 listings aren't all owned by five people and
# reviews aren't written by the same four names everywhere.
FIRST_NAMES = [
    "Aarav", "Ananya", "Rohan", "Isha", "Kabir", "Meera", "Vivaan", "Diya", "Arjun", "Sana",
    "Liam", "Emma", "Noah", "Olivia", "Ethan", "Ava", "Lucas", "Mia", "Mateo", "Sofia",
    "Yuki", "Haruto", "Chloe", "Louis", "Elif", "Omar", "Nadia", "Thabo", "Ingrid", "Pedro",
]
LAST_NAMES = [
    "Sharma", "Iyer", "Kapoor", "Nair", "Bose", "Reddy", "Mehta", "Singh",
    "Walker", "Novak", "Fischer", "Moreau", "Rossi", "Silva", "Tanaka", "Kim",
    "Okafor", "Haddad", "Lindqvist", "Costa",
]

#: Roughly how many listings each city gets. Headliners feel deep; the long
#: tail still has enough that a search never dead-ends.
LISTINGS_PER_MAJOR_CITY = 12
LISTINGS_PER_TAIL_CITY = 9



# A lightweight stand-in for a persisted row. The builders only ever need these
# few columns back from the database, and taking a plain object rather than an
# ORM instance is what lets the tests run without SQLAlchemy.
class Row:
    """Duck-types the `(id, price_per_night, ...)` tuples SQLAlchemy returns."""

    def __init__(self, **kw):
        self.__dict__.update(kw)


def _street(country: str) -> str:
    roads = {
        "India": ["Main Road", "Ring Road", "Station Road", "Mall Road", "Park Street"],
    }.get(country, ["Main St", "Oak Ave", "Sunset Blvd", "River Rd", "Market St"])
    return f"{random.randint(1, 999)} {random.choice(roads)}"


def build_amenities() -> List[dict]:
    return [{"name": n, "icon": i, "group": g} for n, i, g in AMENITIES]


HOME_CITIES = [
    "Noida, India", "New Delhi, India", "Mumbai, India", "Bengaluru, India", "Pune, India",
    "Hyderabad, India", "Jaipur, India", "Kolkata, India", "Chennai, India", "Gurgaon, India",
    "London, United Kingdom", "Manchester, United Kingdom", "New York, United States",
    "Toronto, Canada", "Sydney, Australia", "Singapore", "Dubai, United Arab Emirates",
    "Paris, France", "Berlin, Germany", "Lisbon, Portugal", "Tokyo, Japan", "Seoul, South Korea",
]
LANGUAGE_SETS = [
    "English and Hindi", "English, Hindi and Marathi", "English and Kannada", "English and Tamil",
    "English", "English and French", "English and Spanish", "English and German",
    "English and Japanese", "English and Portuguese", "English, Hindi and Punjabi",
]
HOST_BIOS = [
    "Hosting thoughtful stays for travellers who appreciate a clean, quiet home.",
    "Interior designer by day, host by heart. Every space has a story.",
    "I love meeting travellers from around the world and sharing my city with them.",
    "Superhost since my first year — quick replies and spotless homes are my thing.",
    "Coffee enthusiast, hill walker, and proud host of a few homes I care for personally.",
]


def _joined(today: datetime.date, min_months: int, max_months: int) -> datetime.datetime:
    """A join date some months in the past; real profiles read "10 months on
    Airbnb" or "7 years on Airbnb", not "joined this week"."""
    days = random.randint(min_months * 30, max_months * 30)
    return datetime.datetime.combine(today - datetime.timedelta(days=days), datetime.time(12, 0))


def _person(email: str, full_name: str, password_hash: str, *, is_host: bool, superhost: bool,
            bio: str, today: datetime.date, min_months: int, max_months: int) -> dict:
    return {
        "email": email, "hashed_password": password_hash, "full_name": full_name,
        "bio": bio, "home_city": random.choice(HOME_CITIES), "languages": random.choice(LANGUAGE_SETS),
        "is_host": is_host, "is_superhost": superhost, "identity_verified": random.random() < 0.9,
        "avatar_url": f"https://i.pravatar.cc/150?u={email}",
        "created_at": _joined(today, min_months, max_months),
    }


def build_users(password_hash: str, extra: int = 120,
                today: Optional[datetime.date] = None) -> List[dict]:
    """The four named demo accounts, the five named hosts, and enough extra
    people that 5,000 listings aren't all owned by the same five hosts."""
    today = today or datetime.date.today()
    rows: List[dict] = []
    for h in HOSTS:
        rows.append(_person(h["email"], h["full_name"], password_hash, is_host=True,
                            superhost=h["superhost"], bio=h["bio"], today=today,
                            min_months=24, max_months=96))
    for g in GUESTS:
        rows.append(_person(g["email"], g["full_name"], password_hash, is_host=False,
                            superhost=False, bio="", today=today, min_months=6, max_months=60))
    seen = {r["email"] for r in rows}
    for i in range(extra):
        first, last = random.choice(FIRST_NAMES), random.choice(LAST_NAMES)
        email = f"{first.lower()}.{last.lower()}{i}@example.com"
        if email in seen:
            continue
        seen.add(email)
        is_host = i < (extra * 2 // 3)
        rows.append(_person(email, f"{first} {last}", password_hash, is_host=is_host,
                            superhost=is_host and random.random() < 0.35,
                            bio=random.choice(HOST_BIOS) if is_host else "",
                            today=today, min_months=3, max_months=120))
    return rows


def build_listings(host_ids: Sequence[int], cities: Iterable[City] = ALL_CITIES) -> List[dict]:
    major = {c.name for c in MAJOR_CITIES}
    rows: List[dict] = []
    for city in cities:
        count = LISTINGS_PER_MAJOR_CITY if city.name in major else LISTINGS_PER_TAIL_CITY
        for n in range(count):
            ptype = random.choice(PROPERTY_TYPES)
            bedrooms = random.randint(1, 4)
            price = nightly_price(random.uniform(45, 420), city.country, ptype)
            rows.append({
                "host_id": random.choice(host_ids),
                "title": random.choice(TITLE_TEMPLATES).format(type=TYPE_LABEL[ptype], city=city.name),
                "description": DESCRIPTION,
                "property_type": ptype,
                "bedrooms": bedrooms,
                "beds": max(bedrooms + random.choice([0, 0, 1]), 1),
                "bathrooms": random.choice([1.0, 1.5, 2.0, 2.5]),
                "max_guests": max(bedrooms * 2 + random.choice([0, 1, 2]), 1),
                "price_per_night": price,
                "cleaning_fee": round(price * random.uniform(0.1, 0.25), 2),
                "service_fee_pct": 0.12,
                "instant_book": random.random() < 0.7,
                "guest_access": GUEST_ACCESS,
                "other_notes": OTHER_NOTES,
                "address": _street(city.country),
                # Cycling the neighbourhoods spreads listings evenly across them.
                "neighborhood": city.neighborhoods[n % len(city.neighborhoods)],
                "city": city.name,
                "state": city.state,
                "country": city.country,
                # Jitter, so same-city listings don't stack on a single map pin.
                "latitude": city.latitude + random.uniform(-0.03, 0.03),
                "longitude": city.longitude + random.uniform(-0.03, 0.03),
            })
    return rows


def build_photos_and_amenity_links(listings: Sequence[Row], amenity_ids: Sequence[int],
                                   amenity_names: Optional[Sequence[str]] = None):
    """Photos, and 12–25 amenities per listing: the core set nearly every real
    listing has, plus a random sample of the rest. `amenity_names` is the name
    for each id, in the same order; without it every amenity is optional."""
    ids = list(amenity_ids)
    names = list(amenity_names) if amenity_names else [""] * len(ids)
    core = [aid for aid, name in zip(ids, names) if name in CORE_AMENITIES]
    optional = [aid for aid, name in zip(ids, names) if name not in CORE_AMENITIES]
    rows, links = [], []
    # Covers already spent in the city we're filling. Rows are per-city, so
    # keeping these distinct is what stops a carousel repeating a photo.
    covers_by_city: Dict[str, set] = {}
    for l in listings:
        city = getattr(l, "city", "") or ""
        used = covers_by_city.setdefault(city, set())
        ids = photos.listing_photo_ids(
            getattr(l, "property_type", None), random.randint(5, 7),
            getattr(l, "country", None), avoid_covers=used,
        )
        used.add(ids[0])
        for i, pid in enumerate(ids):
            rows.append({"listing_id": l.id, "url": photos.photo_url(pid), "position": i})
        chosen = set(core)
        chosen.update(random.sample(optional, k=min(len(optional), random.randint(6, 18))))
        for aid in sorted(chosen):
            links.append({"listing_id": l.id, "amenity_id": aid})
    return rows, links


def _booking(listing: Row, guest_id: int, check_in: datetime.date, nights: int) -> dict:
    subtotal, service_fee, total = compute_price(
        nights, listing.price_per_night, listing.cleaning_fee, listing.service_fee_pct
    )
    return {
        "listing_id": listing.id, "guest_id": guest_id,
        "check_in": check_in, "check_out": check_in + datetime.timedelta(days=nights),
        "guests_count": random.randint(1, listing.max_guests),
        "subtotal": subtotal, "cleaning_fee": listing.cleaning_fee, "service_fee": service_fee,
        "total_price": total, "status": BookingStatus.confirmed,
    }


def build_bookings(
    listings: Sequence[Row],
    guest_ids: Sequence[int],
    reviewer_ids: Sequence[int],
    demo_guest_id: int,
    today: datetime.date,
):
    """Past stays (which is what unlocks reviews) plus a thinner layer of
    upcoming ones, which block calendar dates and fill host dashboards. The demo
    guest always gets a few, so "My Trips" is never empty on a fresh database."""
    past, upcoming = [], []
    for l in listings:
        if random.random() < 0.75:
            past.append(_booking(l, random.choice(reviewer_ids),
                                 today - datetime.timedelta(days=random.randint(20, 200)),
                                 random.randint(2, 6)))
        if random.random() < 0.08:
            upcoming.append(_booking(l, random.choice(guest_ids),
                                     today + datetime.timedelta(days=random.randint(5, 60)),
                                     random.randint(2, 5)))
    for l in random.sample(list(listings), k=min(6, len(listings))):
        upcoming.append(_booking(l, demo_guest_id,
                                 today + datetime.timedelta(days=random.randint(6, 90)),
                                 random.randint(2, 5)))
    return past, upcoming


def _review_time(today: datetime.date, min_days: int, max_days: int) -> datetime.datetime:
    return datetime.datetime.combine(today - datetime.timedelta(days=random.randint(min_days, max_days)),
                                     datetime.time(random.randint(8, 21), random.randint(0, 59)))


def build_reviews(past_bookings: Sequence[Row], reviewer_ids: Sequence[int],
                  today: Optional[datetime.date] = None) -> List[dict]:
    """One review per completed booking — the same rule the API enforces — plus
    booking-less historical reviews so listings don't all show a single review.
    Ratings are weighted high so a realistic share clear the 4.8 "Guest
    favourite" bar, as on the real site. Dates are spread over two years so the
    page reads "1 week ago … 2 years ago" rather than everything today."""
    today = today or datetime.date.today()
    rows: List[dict] = []
    for b in past_bookings:
        rows.append({
            "listing_id": b.listing_id, "booking_id": b.id, "author_id": b.guest_id,
            "rating": random.choice([4, 5, 5, 5]), "comment": random.choice(REVIEW_COMMENTS),
            "created_at": _review_time(today, 1, 60),
        })
        for _ in range(random.randint(1, 6)):
            rows.append({
                "listing_id": b.listing_id, "booking_id": None,
                "author_id": random.choice(reviewer_ids),
                # Skewed high on purpose: guests who bother to review a stay
                # they liked are the norm, and it puts a realistic share of
                # listings over the "Guest favourite" bar.
                "rating": random.choice([3, 4, 5, 5, 5, 5, 5]),
                "comment": random.choice(REVIEW_COMMENTS),
                "created_at": _review_time(today, 7, 730),
            })
    return rows


def build_experiences(host_ids: Sequence[int], cities: Iterable[City] = ALL_CITIES) -> List[dict]:
    """Every city gets some, so switching to the Experiences tab after searching
    a small city is not a dead end."""
    major = {c.name for c in MAJOR_CITIES}
    exp_templates = [(cat, tpl) for cat, tpls in EXPERIENCES.items() for tpl in tpls]
    svc_templates = [(cat, tpl) for cat, tpls in SERVICES.items() for tpl in tpls]
    rows: List[dict] = []
    for city in cities:
        is_major = city.name in major
        for category, (title_tpl, start_time, duration, price) in random.sample(
            exp_templates, k=min(len(exp_templates), 7 if is_major else 2)
        ):
            rows.append({
                "host_id": random.choice(host_ids), "kind": ExperienceKind.experience,
                "category": category, "title": title_tpl.format(city=city.name),
                "description": EXPERIENCE_DESCRIPTION, "city": city.name, "country": city.country,
                "latitude": city.latitude + random.uniform(-0.03, 0.03),
                "longitude": city.longitude + random.uniform(-0.03, 0.03),
                "price_per_guest": guest_price(price, city.country), "price_unit": "guest",
                "duration_minutes": duration, "start_time": start_time,
                "max_guests": random.choice([6, 8, 10, 12]),
            })
        for category, (title_tpl, duration, price, unit) in random.sample(
            svc_templates, k=min(len(svc_templates), 4 if is_major else 1)
        ):
            rows.append({
                "host_id": random.choice(host_ids), "kind": ExperienceKind.service,
                "category": category,
                "title": title_tpl.format(city=city.name, name=random.choice(host_names_for(city.country))),
                "description": SERVICE_DESCRIPTION, "city": city.name, "country": city.country,
                "latitude": city.latitude + random.uniform(-0.03, 0.03),
                "longitude": city.longitude + random.uniform(-0.03, 0.03),
                "price_per_guest": guest_price(price, city.country), "price_unit": unit,
                "duration_minutes": duration, "start_time": "",
                "max_guests": random.choice([1, 2, 4, 6]) if unit == "guest" else random.choice([2, 4]),
            })
    return rows


def build_experience_children(experiences: Sequence[Row], guest_ids: Sequence[int],
                              reviewer_ids: Sequence[int], today: datetime.date):
    photo_rows, reviews, bookings = [], [], []
    covers_by_city: Dict[str, set] = {}
    for e in experiences:
        city = getattr(e, "city", "") or ""
        used = covers_by_city.setdefault(city, set())
        pool = photos.experience_pool(
            getattr(e, "title", ""), getattr(e, "category", None), getattr(e, "country", None)
        )
        cover = random.choice(photos.fresh_choices(pool, list(used)))
        used.add(cover)
        rest = [p for p in pool if p != cover]
        random.shuffle(rest)
        ids = [cover] + rest[: random.randint(2, 3)]
        for i, pid in enumerate(ids):
            photo_rows.append({"experience_id": e.id, "url": photos.photo_url(pid), "position": i})
        for _ in range(random.randint(2, 6)):
            reviews.append({
                "experience_id": e.id, "author_id": random.choice(reviewer_ids),
                "rating": random.choice([4, 5, 5, 5, 5]), "comment": random.choice(EXPERIENCE_REVIEWS),
                "created_at": _review_time(today, 3, 540),
            })
        for days, chance in ((-random.randint(3, 60), 0.5), (random.randint(1, 20), 0.3)):
            if random.random() >= chance:
                continue
            count = random.randint(1, max(1, min(2, e.max_guests)))
            total = e.price_per_guest if e.price_unit == "group" else e.price_per_guest * count
            bookings.append({
                "experience_id": e.id, "guest_id": random.choice(guest_ids),
                "date": today + datetime.timedelta(days=days), "guests_count": count,
                "total_price": round(total, 2), "status": BookingStatus.confirmed,
            })
    return photo_rows, reviews, bookings
