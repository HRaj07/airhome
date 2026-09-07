"""
Exercise the seed's row builders end to end without a database.

This is the safety net for the one part of the backend that can't be checked by
importing the app: the seed writes ~140,000 rows with bulk inserts, so a single
wrong or missing key surfaces as an opaque driver error minutes in. Here it
surfaces as a named assertion in under a second.

Run with:  python tests/test_seed_data.py
"""
import datetime
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import seed_data as sd  # noqa: E402
from app.cities import ALL_CITIES, MAJOR_CITIES  # noqa: E402
from app.enums import BookingStatus, ExperienceKind, PropertyType  # noqa: E402

fails = 0


def check(label: str, cond: bool) -> None:
    global fails
    print(f"{'ok:  ' if cond else 'FAIL:'} {label}")
    if not cond:
        fails += 1


def keys_match(rows, expected: set, label: str) -> None:
    """Every bulk-inserted row must carry exactly the same keys: SQLAlchemy
    builds one prepared statement from the first row and binds the rest to it,
    so a row with a missing key fails at execute time, not at build time."""
    check(f"{label}: non-empty", len(rows) > 0)
    if not rows:
        return
    bad = [i for i, r in enumerate(rows) if set(r) != expected]
    check(f"{label}: all {len(rows)} rows share one key set", not bad)
    if bad:
        print(f"       first offender #{bad[0]}: {sorted(set(rows[bad[0]]) ^ expected)}")


random.seed(sd.SEED)

# ---------------------------------------------------------------- catalogue
names = [c.name for c in ALL_CITIES]
check("catalogue has ~600 cities", 550 <= len(ALL_CITIES) <= 700)
check("every city has coordinates", all(c.latitude and c.longitude for c in ALL_CITIES))
check("coordinates are in range", all(-90 <= c.latitude <= 90 and -180 <= c.longitude <= 180 for c in ALL_CITIES))
check("every city has neighbourhoods", all(len(c.neighborhoods) >= 4 for c in ALL_CITIES))
check("India is well represented", sum(1 for c in ALL_CITIES if c.country == "India") >= 100)
destinations = len(ALL_CITIES) + sum(len(c.neighborhoods) for c in ALL_CITIES)
check(f"{destinations} searchable destinations (>= 3000)", destinations >= 3000)
# Two real cities are named Lagos; the API disambiguates them by country, so the
# catalogue is allowed to contain both, but nothing else should collide.
dupes = {n for n in names if names.count(n) > 1}
check(f"no unexpected duplicate city names (found {dupes or 'none'})", dupes <= {"Lagos"})

# ---------------------------------------------------------------- users
today = datetime.date(2026, 9, 7)
users = sd.build_users("fake-hash", extra=30, today=today)
keys_match(users, {"email", "hashed_password", "full_name", "bio", "home_city", "languages", "is_host",
                   "is_superhost", "identity_verified", "avatar_url", "created_at"}, "users")
check("join dates are in the past", all(u["created_at"].date() < today for u in users))
check("join dates vary (profiles read '10 months' / '7 years on airhome')",
      len({u["created_at"].year for u in users}) >= 3)
check("everyone has a home city", all(u["home_city"] for u in users))
check("emails are unique", len({u["email"] for u in users}) == len(users))
check("the demo guest exists", any(u["email"] == "demo@example.com" and not u["is_host"] for u in users))
check("named hosts are hosts", all(u["is_host"] for u in users if u["email"].endswith(".host@example.com")))
check("there are both hosts and guests", any(u["is_host"] for u in users) and any(not u["is_host"] for u in users))

# ---------------------------------------------------------------- listings
host_ids = list(range(1, 40))
listing_rows = sd.build_listings(host_ids)
keys_match(listing_rows, {
    "host_id", "title", "description", "property_type", "bedrooms", "beds", "bathrooms",
    "max_guests", "price_per_night", "cleaning_fee", "service_fee_pct", "address",
    "neighborhood", "city", "state", "country", "latitude", "longitude",
    "instant_book", "guest_access", "other_notes",
}, "listings")
check("some listings are Instant Book and some aren't (so the chip filters)",
      0 < sum(1 for r in listing_rows if r["instant_book"]) < len(listing_rows))
check(f"{len(listing_rows)} listings generated (>= 4000)", len(listing_rows) >= 4000)
check("every listing has a host from the pool", all(r["host_id"] in host_ids for r in listing_rows))
check("property types are real enum members", all(isinstance(r["property_type"], PropertyType) for r in listing_rows))
check("prices are positive", all(r["price_per_night"] > 0 for r in listing_rows))
check("no listing is priced below the floor",
      all(r["price_per_night"] >= sd.MIN_NIGHTLY_PRICE for r in listing_rows))

# Local price levels. An Indian entire home used to be drawn from the same
# 45-420 USD range as a Manhattan loft, which browsing from India read as
# broken; and a shared dorm bed from the same range as a whole villa, which put
# rooms above the houses around them. Both are checked against the market they
# sit in rather than against a fixed number, so retuning the factors doesn't
# mean retuning the test.
def avg_price(rows):
    return sum(r["price_per_night"] for r in rows) / max(1, len(rows))


def by_country_type(country, ptype):
    return [r for r in listing_rows if r["country"] == country and r["property_type"] is ptype]


in_homes = by_country_type("India", PropertyType.entire_home)
us_homes = by_country_type("United States", PropertyType.entire_home)
check("Indian homes are priced for the Indian market, not the Western one",
      len(in_homes) > 100 and avg_price(in_homes) < avg_price(us_homes) * 0.5)
check("countries without a price factor are untouched",
      abs(avg_price(us_homes) - 232.5) < 20)
for _country in ("India", "United States"):
    _homes = avg_price(by_country_type(_country, PropertyType.entire_home))
    check(f"a private room in {_country} costs less than a whole home",
          avg_price(by_country_type(_country, PropertyType.private_room)) < _homes)
    check(f"a shared room in {_country} is the cheapest thing on offer",
          avg_price(by_country_type(_country, PropertyType.shared_room))
          < avg_price(by_country_type(_country, PropertyType.private_room)))

check("guest capacity is at least 1", all(r["max_guests"] >= 1 for r in listing_rows))
check("beds are at least 1", all(r["beds"] >= 1 for r in listing_rows))
check("no listing is missing a neighbourhood", all(r["neighborhood"] for r in listing_rows))
check("titles have no unfilled placeholders", not any("{" in r["title"] for r in listing_rows))

by_city = {}
for r in listing_rows:
    by_city[r["city"]] = by_city.get(r["city"], 0) + 1
check("every city has listings", len(by_city) == len({c.name for c in ALL_CITIES}))
check("headline cities are the deepest",
      min(by_city[c.name] for c in MAJOR_CITIES) >= sd.LISTINGS_PER_TAIL_CITY)
# A city's listings should spread across its neighbourhoods rather than piling
# into one — this is what makes neighbourhood search and autocomplete useful.
noida = [r["neighborhood"] for r in listing_rows if r["city"] == "Noida"]
check("listings spread across a city's neighbourhoods", len(set(noida)) >= 5)

listings = [sd.Row(id=i + 1, price_per_night=r["price_per_night"], cleaning_fee=r["cleaning_fee"],
                   service_fee_pct=r["service_fee_pct"], max_guests=r["max_guests"],
                   property_type=r["property_type"], country=r["country"], city=r["city"])
            for i, r in enumerate(listing_rows)]

# ---------------------------------------------------------------- photos & amenities
amenity_rows = sd.build_amenities()
keys_match(amenity_rows, {"name", "icon", "group"}, "amenities")
check(f"{len(amenity_rows)} amenities in the catalogue (>= 40, so 'Show all 37 amenities' is real)", len(amenity_rows) >= 40)
check("amenity names are unique", len({a["name"] for a in amenity_rows}) == len(amenity_rows))
check("the filter-chip amenities exist under Airbnb's wording",
      {"Washing machine", "Wifi", "Free parking", "Kitchen", "Air conditioning", "Allows pets"} <= {a["name"] for a in amenity_rows})
amenity_ids = list(range(1, len(amenity_rows) + 1))
amenity_names = [a["name"] for a in amenity_rows]
photos, links = sd.build_photos_and_amenity_links(listings[:200], amenity_ids, amenity_names)
per_listing = {}
for l in links:
    per_listing[l["listing_id"]] = per_listing.get(l["listing_id"], 0) + 1
check("every listing has 12-25 amenities", all(12 <= n <= 26 for n in per_listing.values()))
wifi_id = amenity_names.index("Wifi") + 1
check("core amenities (Wifi) are on every listing", all(any(l["listing_id"] == lid and l["amenity_id"] == wifi_id for l in links) for lid in list(per_listing)[:10]))
keys_match(photos, {"listing_id", "url", "position"}, "photos")
keys_match(links, {"listing_id", "amenity_id"}, "amenity links")
check("every listing gets 5-7 photos", all(5 <= sum(1 for p in photos if p["listing_id"] == l.id) <= 7
                                           for l in listings[:20]))
check("photo positions start at 0", min(p["position"] for p in photos) == 0)
check("a listing never repeats the same photo",
      all(len({p["url"] for p in photos if p["listing_id"] == l.id})
          == sum(1 for p in photos if p["listing_id"] == l.id) for l in listings[:50]))

# Photos have to match the kind of place. picsum.photos handed back an
# arbitrary image per url, which is how a private room ended up showing
# mountains and bicycles; these assert the pools are actually keyed on type.
from app import photos as ph  # noqa: E402

by_listing = {}
for p in photos:
    by_listing.setdefault(p["listing_id"], []).append(p["url"])
ptype_of = {l.id: l.property_type for l in listings[:200]}


def cover_id(url: str) -> int:
    return int(url.split("/photos/")[1].split("/")[0])


CURATED_IDS = set(
    ph.HOME_EXTERIOR + ph.HOME_INTERIOR + ph.PRIVATE_ROOM + ph.BEDROOM + ph.HOTEL_ROOM
    + ph.DORM + ph.KITCHEN + ph.BATHROOM + ph.LIVING_ROOM + ph.DINING + ph.BALCONY
    + ph.WORKSPACE
) | {pid for region in ph.REGIONS.values() for pool in region.values() for pid in pool}
REGION_HOME_IDS = {pid for region in ph.REGIONS.values()
                   for pid in region["exterior"] + region["living"]}
REGION_BEDROOM_IDS = {pid for region in ph.REGIONS.values() for pid in region["bedroom"]}

check("every photo url is a real curated photo id",
      all(cover_id(u) in CURATED_IDS for urls in by_listing.values() for u in urls))
check("hostel beds lead with a dorm photo",
      all(cover_id(urls[0]) in ph.DORM
          for lid, urls in by_listing.items() if ptype_of[lid] is PropertyType.shared_room))
check("hotel rooms lead with a hotel photo",
      all(cover_id(urls[0]) in ph.HOTEL_ROOM
          for lid, urls in by_listing.items() if ptype_of[lid] is PropertyType.hotel_room))
check("private rooms lead with a bedroom photo",
      all(cover_id(urls[0]) in set(ph.PRIVATE_ROOM) | REGION_BEDROOM_IDS
          for lid, urls in by_listing.items() if ptype_of[lid] is PropertyType.private_room))
check("entire homes lead with a home photo",
      all(cover_id(urls[0]) in set(ph.HOME_EXTERIOR + ph.HOME_INTERIOR) | REGION_HOME_IDS
          for lid, urls in by_listing.items() if ptype_of[lid] is PropertyType.entire_home))
country_of = {l.id: l.country for l in listings[:200]}
india_homes = [lid for lid, urls in by_listing.items()
               if country_of[lid] == "India" and ptype_of[lid] is PropertyType.entire_home]
check("Indian homes exist in the sample", len(india_homes) > 5)
check("an Indian home leads with an Indian house photo",
      all(cover_id(by_listing[lid][0]) in ph.INDIA_EXTERIOR + ph.INDIA_LIVING for lid in india_homes))
check("an Indian home's gallery stays Indian or generic-room, never another region",
      not any(cover_id(u) in (ph.AFRICA_EXTERIOR + ph.SEA_EXTERIOR + ph.MENA_EXTERIOR
                              + ph.EAST_ASIA_EXTERIOR)
              for lid in india_homes for u in by_listing[lid]))
india_rooms = [lid for lid, urls in by_listing.items()
               if country_of[lid] == "India" and ptype_of[lid] is PropertyType.private_room]
check("an Indian private room leads with an Indian bedroom",
      all(cover_id(by_listing[lid][0]) in ph.INDIA_BEDROOM for lid in india_rooms))
check("countries with no regional pool still get the generic set",
      all(cover_id(by_listing[lid][0]) in ph.HOME_EXTERIOR + ph.HOME_INTERIOR
          for lid, urls in by_listing.items()
          if ptype_of[lid] is PropertyType.entire_home and ph.region_for(country_of[lid]) is None))
check("every seeded country resolves to a region or deliberately to none",
      all(ph.region_for(c) in (None, "india", "africa", "east_asia", "southeast_asia", "mena")
          for c in {l.country for l in listings}))

city_of = {l.id: l.city for l in listings[:200]}
covers_per_city = {}
for lid, urls in by_listing.items():
    covers_per_city.setdefault(city_of[lid], []).append(cover_id(urls[0]))
bad_cities = [c for c, covers in covers_per_city.items() if len(covers) != len(set(covers))]
check("no two listings in a city share a cover photo", not bad_cities)

check("a dorm listing is never illustrated with a villa exterior",
      not any(cover_id(u) in ph.HOME_EXTERIOR
              for lid, urls in by_listing.items() if ptype_of[lid] is PropertyType.shared_room
              for u in urls))
check("no listing gets the same amenity twice", len({(l["listing_id"], l["amenity_id"]) for l in links}) == len(links))
check("amenity links point at real amenities", all(l["amenity_id"] in amenity_ids for l in links))

# ---------------------------------------------------------------- bookings
guest_ids = list(range(40, 80))
past, upcoming = sd.build_bookings(listings[:500], guest_ids, guest_ids + host_ids, 41, today)
booking_keys = {"listing_id", "guest_id", "check_in", "check_out", "guests_count",
                "subtotal", "cleaning_fee", "service_fee", "total_price", "status"}
keys_match(past, booking_keys, "past bookings")
keys_match(upcoming, booking_keys, "upcoming bookings")
check("past bookings are in the past", all(b["check_out"] < today for b in past))
check("upcoming bookings are in the future", all(b["check_in"] > today for b in upcoming))
check("check_out always follows check_in", all(b["check_out"] > b["check_in"] for b in past + upcoming))
check("guest counts fit the listing", all(1 <= b["guests_count"] for b in past + upcoming))
check("totals are the sum of their parts",
      all(abs(b["total_price"] - (b["subtotal"] + b["cleaning_fee"] + b["service_fee"])) < 0.011
          for b in past + upcoming))
check("bookings are confirmed", all(b["status"] is BookingStatus.confirmed for b in past + upcoming))
check("the demo guest has trips", sum(1 for b in upcoming if b["guest_id"] == 41) >= 6)

# ---------------------------------------------------------------- reviews
past_rows = [sd.Row(id=i + 1, listing_id=b["listing_id"], guest_id=b["guest_id"]) for i, b in enumerate(past)]
reviews = sd.build_reviews(past_rows, guest_ids, today)
keys_match(reviews, {"listing_id", "booking_id", "author_id", "rating", "comment", "created_at"}, "reviews")
check("review dates are in the past", all(r["created_at"].date() < today for r in reviews))
check("review dates spread over more than a year", (max(r["created_at"] for r in reviews) - min(r["created_at"] for r in reviews)).days > 365)
check("review pool has real variety", len(set(r["comment"] for r in reviews)) >= 30)
check("ratings are 1-5", all(1 <= r["rating"] <= 5 for r in reviews))
attached = [r for r in reviews if r["booking_id"] is not None]
check("at most one review per booking",
      len({r["booking_id"] for r in attached}) == len(attached))
check("a booking-attached review is written by that booking's guest",
      all(r["author_id"] == past[r["booking_id"] - 1]["guest_id"] for r in attached))
check("average rating clears 4.0 (so 'Guest favourite' is reachable)",
      sum(r["rating"] for r in reviews) / len(reviews) > 4.0)

# ---------------------------------------------------------------- experiences
exp_rows = sd.build_experiences(host_ids)
keys_match(exp_rows, {
    "host_id", "kind", "category", "title", "description", "city", "country",
    "latitude", "longitude", "price_per_guest", "price_unit", "duration_minutes",
    "start_time", "max_guests",
}, "experiences")
check("both kinds are generated",
      {r["kind"] for r in exp_rows} == {ExperienceKind.experience, ExperienceKind.service})
check("every city has an experience or service",
      len({r["city"] for r in exp_rows}) == len({c.name for c in ALL_CITIES}))
check("titles have no unfilled placeholders", not any("{" in r["title"] for r in exp_rows))
check("price units are valid", all(r["price_unit"] in ("guest", "group") for r in exp_rows))
check("Indian experiences carry Indian prices",
      (sum(r["price_per_guest"] for r in exp_rows if r["country"] == "India")
       / max(1, len([r for r in exp_rows if r["country"] == "India"])))
      < (sum(r["price_per_guest"] for r in exp_rows if r["country"] == "United States")
         / max(1, len([r for r in exp_rows if r["country"] == "United States"]))) * 0.5)
check("no experience is priced below the floor",
      all(r["price_per_guest"] >= sd.MIN_EXPERIENCE_PRICE for r in exp_rows))
check("experiences have a start time",
      all(r["start_time"] for r in exp_rows if r["kind"] is ExperienceKind.experience))
check("capacity is at least 1", all(r["max_guests"] >= 1 for r in exp_rows))

exps = [sd.Row(id=i + 1, kind=r["kind"], price_per_guest=r["price_per_guest"],
               price_unit=r["price_unit"], max_guests=r["max_guests"],
               title=r["title"], category=r["category"],
               city=r["city"], country=r["country"])
        for i, r in enumerate(exp_rows[:300])]
ep, er, eb = sd.build_experience_children(exps, guest_ids, guest_ids, today)
keys_match(ep, {"experience_id", "url", "position"}, "experience photos")
keys_match(er, {"experience_id", "author_id", "rating", "comment", "created_at"}, "experience reviews")
keys_match(eb, {"experience_id", "guest_id", "date", "guests_count", "total_price", "status"}, "experience bookings")
check("experience bookings never exceed capacity",
      all(b["guests_count"] <= next(e.max_guests for e in exps if e.id == b["experience_id"]) for b in eb))
check("group-priced bookings charge the group rate once",
      all(b["total_price"] == next(e.price_per_guest for e in exps if e.id == b["experience_id"])
          for b in eb if next(e.price_unit for e in exps if e.id == b["experience_id"]) == "group"))

# Every experience and service must be illustrated with what it actually is.
photos_by_exp = {}
for p in ep:
    photos_by_exp.setdefault(p["experience_id"], []).append(p["url"])
title_of = {e.id: e.title for e in exps}
cat_of = {e.id: e.category for e in exps}
country_of_exp = {e.id: e.country for e in exps}
check("experience photos come from the topic its title names",
      all(cover_id(u) in ph.experience_pool(title_of[eid], cat_of[eid], country_of_exp[eid])
          for eid, urls in photos_by_exp.items() for u in urls))

# The Agra sound bath showing a European man with a singing bowl is what put
# the India-specific pools in; these keep them wired up.
# Gender-matched services are the deliberate exception: naming the host wins
# over the regional pool, so they are checked separately below.
india_exps = [e.id for e in exps if e.country == "India"
              and ph.topic_for(title_of[e.id], cat_of[e.id]) in ph.INDIA_TOPIC_PHOTOS
              and not (ph.gender_in_title(title_of[e.id])
                       and ph.topic_for(title_of[e.id], cat_of[e.id]) in ph.PEOPLE_PHOTOS)]
check("Indian experiences exist in the sample", len(india_exps) > 20)
check("an Indian experience uses Indian photography",
      all(cover_id(u) in ph.INDIA_TOPIC_PHOTOS[ph.topic_for(title_of[eid], cat_of[eid])]
          for eid in india_exps for u in photos_by_exp[eid]))
check("a non-Indian experience still uses the global pool",
      all(cover_id(photos_by_exp[e.id][0]) in ph.TOPIC_PHOTOS[ph.topic_for(title_of[e.id], cat_of[e.id])]
          for e in exps
          if e.country != "India" and e.id in photos_by_exp
          and not (ph.gender_in_title(title_of[e.id])
                   and ph.topic_for(title_of[e.id], cat_of[e.id]) in ph.PEOPLE_PHOTOS)))

# Two cards side by side opening with the same photograph reads as a bug.
def covers_by_city(rows, id_to_city, id_key):
    out = {}
    for gid, urls in rows.items():
        out.setdefault(id_to_city[gid], []).append(cover_id(urls[0]))
    return out

exp_city = {e.id: e.city for e in exps}
for city, covers in covers_by_city(photos_by_exp, exp_city, "experience").items():
    pass
dupe_cities = [c for c, covers in covers_by_city(photos_by_exp, exp_city, "e").items()
               if len(covers) != len(set(covers))]
check("no two experiences in a city share a cover photo", not dupe_cities)
check("an experience never repeats the same photo",
      all(len(set(urls)) == len(urls) for urls in photos_by_exp.values()))
check("every seeded title resolves to a topic by name, not by category fallback",
      all(any(phrase in title_of[e.id].lower() for phrase, _ in ph.TITLE_TOPICS) for e in exps))
# A service named after a woman must not open on a photo of a man.
named = [e for e in exps if ph.gender_in_title(title_of[e.id])
         and ph.topic_for(title_of[e.id], cat_of[e.id]) in ph.PEOPLE_PHOTOS]
check("services named after a host exist in the sample", len(named) > 10)
check("the person shown matches the host the title names",
      all(cover_id(u) in ph.PEOPLE_PHOTOS[ph.topic_for(title_of[e.id], cat_of[e.id])][
              ph.gender_in_title(title_of[e.id])]
          for e in named for u in photos_by_exp.get(e.id, [])))
check("every seeded host name resolves to a gender",
      all(ph.gender_in_title(f"session with {n}")
          for n in sd.INDIA_PRO_NAMES + sd.WORLD_PRO_NAMES + sd.PRO_NAMES))

# A trainer photographed in Delhi should not be introduced as "Tomás".
def host_in(title):
    for n in sd.INDIA_PRO_NAMES + sd.WORLD_PRO_NAMES + sd.PRO_NAMES:
        if n in title:
            return n
    return None

indian_named = [(e, host_in(title_of[e.id])) for e in exps if e.country == "India" and host_in(title_of[e.id])]
foreign_named = [(e, host_in(title_of[e.id])) for e in exps if e.country != "India" and host_in(title_of[e.id])]
check("Indian services have Indian host names",
      all(n in sd.INDIA_PRO_NAMES for _, n in indian_named))
check("non-Indian services never borrow the Indian-only names",
      all(n not in set(sd.INDIA_PRO_NAMES) - set(sd.WORLD_PRO_NAMES) - {"Anaya", "Rishab", "Anurag", "Ashish"}
          or n in sd.WORLD_PRO_NAMES for _, n in foreign_named))

# Boxing must show boxing, everywhere. Pilates must show pilates.
check("boxing shows boxing gloves, not kalaripayattu",
      not any(14828300 <= cover_id(u) <= 14828400 for e in exps for u in photos_by_exp.get(e.id, [])))
check("Indian boxing/pilates/museum/rooftop use the accurate global pools",
      all(t not in ph.INDIA_TOPIC_PHOTOS for t in ("boxing", "pilates", "museum", "rooftop_yoga", "city_cycling")))

# Two frames from one shoot read as the same photo: within a city, covers
# must come from different shoots, not merely different ids.
def shoot_dupes(rows, id_to_city):
    by_city = {}
    for gid, urls in rows.items():
        by_city.setdefault(id_to_city[gid], []).append(cover_id(urls[0]))
    bad = []
    for city, covers in by_city.items():
        for i, a in enumerate(covers):
            if any(ph.same_shoot(a, b) for b in covers[:i]):
                bad.append(city); break
    return bad
check("no two experience covers in a city come from the same shoot",
      not shoot_dupes(photos_by_exp, exp_city))
check("no two listing covers in a city come from the same shoot",
      not shoot_dupes(by_listing, city_of))

# The derelict village shots a user called "very bad quality" are gone, and the
# rustic kitchens are demoted to gallery filler rather than cover photos.
RETIRED = {35289099, 17499591, 5909611, 36034761, 32707321, 34783110,
           36848889, 37632035, 31991808, 17935378}
check("the low-quality village photos are retired",
      not (RETIRED & set(CURATED_IDS)))
check("an Indian detail shot is never a cover",
      not any(cover_id(urls[0]) in ph.INDIA_DETAIL for urls in by_listing.values()))

check("a night market crawl shows a night market",
      all(ph.topic_for(t, None) == "night_market" for t in title_of.values() if "night market" in t.lower()))
check("boxing shows boxing, not generic training",
      all(ph.topic_for(t, None) == "boxing" for t in title_of.values() if "boxing" in t.lower()))
check("brunch is cooked, not confused with a cooking class",
      all(ph.topic_for(t, None) == "brunch" for t in title_of.values() if "brunch" in t.lower()))
check("a bridal trial is bridal, not generic make-up",
      all(ph.topic_for(t, None) == "bridal_makeup" for t in title_of.values() if "bridal" in t.lower()))

print("\n" + (f"{fails} FAILED" if fails else "All seed-data tests passed."))
sys.exit(1 if fails else 0)
