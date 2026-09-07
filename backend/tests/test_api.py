"""
End-to-end API tests: the guest journey and the hosting journey, walked the way
a person walks them, against the seeded database through FastAPI's TestClient.

The other two suites are deliberately dependency-free — they test pure logic and
the seed's row builders without a database. This one is the counterpart: it
boots the real app, so it catches what those can't (routing, auth, serialization,
status codes, and the interaction between the calendar, pricing and bookings).

Nothing is left behind: every booking, review and calendar change it makes is
undone at the end.

Run:  cd backend && ./.venv/bin/python tests/test_api.py
      (needs `httpx`, which ships with requirements.txt for exactly this)
"""
import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from fastapi.testclient import TestClient
except ImportError as exc:  # pragma: no cover - guidance beats a stack trace
    print(f"Cannot import TestClient ({exc}).\nInstall the test dependency:  pip install httpx")
    sys.exit(1)

from app.main import app  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app import models  # noqa: E402

PASSWORD = "password123"
GUEST = "guest1@example.com"
HOST = "amelia.host@example.com"

client = TestClient(app)
failures = []
cleanup = []


def check(label, condition):
    if condition:
        print(f"ok:   {label}")
    else:
        failures.append(label)
        print(f"FAIL: {label}")


def login(email):
    r = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, f"could not log in as {email}: {r.text}"
    return {"Authorization": f"Bearer {r.json()['token']}"}


def days(n):
    return datetime.date.today() + datetime.timedelta(days=n)


# ===================================================================== browse

print("\n--- Browsing and search ---")
rows = client.get("/api/listings/featured?rows=6").json()
check("the home page returns carousel rows", len(rows) >= 3)
check("every row has cards with cover photos",
      all(row["items"] and row["items"][0]["cover_photo_url"] for row in rows))

near = client.get("/api/listings/featured?rows=6&lat=28.57&lng=77.32").json()
check("rows are ranked by proximity when coordinates are given", near[0]["city"] == "Noida")

search = client.get("/api/listings?location=Jaipur&limit=12").json()
check("a text search finds listings", search["total"] > 0)
check("every result is in the searched city", all(x["city"] == "Jaipur" for x in search["items"]))

page1 = client.get("/api/listings?limit=12&page=1").json()["items"]
page2 = client.get("/api/listings?limit=12&page=2").json()["items"]
check("pages do not overlap", not {x["id"] for x in page1} & {x["id"] for x in page2})

filtered = client.get("/api/listings?location=Jaipur&min_price=20&max_price=60&limit=50").json()["items"]
check("the price filter is respected", all(20 <= x["price_per_night"] <= 60 for x in filtered))
typed = client.get("/api/listings?location=Jaipur&property_type=entire_home&limit=50").json()["items"]
check("the property-type filter is respected", all(x["property_type"] == "entire_home" for x in typed))
big = client.get("/api/listings?location=Jaipur&guests=6&limit=50").json()["items"]
check("the guest-capacity filter is respected", all(x["max_guests"] >= 6 for x in big))

pins = client.get("/api/listings/map?sw_lat=26.8&sw_lng=75.7&ne_lat=27.0&ne_lng=75.9").json()
check("the map returns pins for a viewport", len(pins) > 0)
check("every pin falls inside the viewport", all(26.8 <= p["latitude"] <= 27.0 for p in pins))

check("destination autocomplete suggests real inventory",
      any("Noida" in d["label"] for d in client.get("/api/destinations?q=noi&limit=5").json()))

# ============================================================ listing detail

print("\n--- Listing detail and availability ---")
listing_id = search["items"][0]["id"]
detail = client.get(f"/api/listings/{listing_id}").json()
check("detail carries the gallery, amenities and host",
      len(detail["photos"]) >= 4 and detail["amenities"] and detail["host"]["full_name"])
check("detail carries the sections the real page shows",
      all(k in detail for k in ("highlights", "rating_categories", "sleeping", "blocked_dates")))
check("a missing listing 404s", client.get("/api/listings/99999999").status_code == 404)

db = SessionLocal()
booked_listing = db.query(models.Booking.listing_id).first()[0]
db.close()
busy = client.get(f"/api/listings/{booked_listing}").json()
check("a listing with bookings reports blocked dates", len(busy["blocked_dates"]) > 0)
blocked_day = datetime.date.fromisoformat(busy["blocked_dates"][0])
dated = client.get(
    f"/api/listings?location={busy['city']}&check_in={blocked_day}"
    f"&check_out={blocked_day + datetime.timedelta(days=1)}&limit=50"
).json()["items"]
check("a listing booked on those dates drops out of a dated search",
      booked_listing not in [x["id"] for x in dated])

# ================================================================== booking

print("\n--- Booking flow ---")
guest = login(GUEST)
check("auth/me identifies the signed-in guest", client.get("/api/auth/me", headers=guest).json()["email"] == GUEST)

check_in, check_out = days(45), days(48)
quote = client.get(f"/api/listings/{listing_id}/quote?check_in={check_in}&check_out={check_out}").json()
check("a stay can be quoted before booking", quote["nights"] == 3 and len(quote["rates"]) == 3)
check("the quote's lines add up to its total",
      abs(quote["total"] - (quote["subtotal"] + quote["cleaning_fee"] + quote["service_fee"])) < 0.011)

created = client.post("/api/bookings", json={
    "listing_id": listing_id, "check_in": str(check_in), "check_out": str(check_out), "guests_count": 2,
}, headers=guest)
check("a booking is created", created.status_code == 201)
booking = created.json()
cleanup.append(("booking", booking["id"], guest))
check("the guest is charged exactly what they were quoted", abs(booking["total_price"] - quote["total"]) < 0.02)
check("the stored booking adds up",
      abs(booking["total_price"] - (booking["subtotal"] + booking["cleaning_fee"] + booking["service_fee"])) < 0.02)

def book(ci, co, guests=2):
    return client.post("/api/bookings", json={
        "listing_id": listing_id, "check_in": str(ci), "check_out": str(co), "guests_count": guests,
    }, headers=guest)

check("double-booking the same nights is refused", book(days(46), days(48)).status_code == 409)
check("a check-in in the past is refused", book(days(-10), days(-8)).status_code == 400)
check("check-out before check-in is refused", book(days(48), days(45)).status_code == 400)
check("booking over capacity is refused", book(days(200), days(203), guests=99).status_code == 400)
check("booking signed out is refused", client.post("/api/bookings", json={
    "listing_id": listing_id, "check_in": str(days(300)), "check_out": str(days(302)), "guests_count": 1,
}).status_code == 401)

adjacent = book(check_out, check_out + datetime.timedelta(days=2))
check("a stay starting on another's checkout day is allowed", adjacent.status_code == 201)
if adjacent.status_code == 201:
    check("cancelling a booking works",
          client.delete(f"/api/bookings/{adjacent.json()['id']}", headers=guest).status_code == 200)

check("the booking appears in Trips",
      any(x["id"] == booking["id"] for x in client.get("/api/bookings/mine", headers=guest).json()))
check("the booking blocks those nights on the listing's calendar",
      str(check_in) in client.get(f"/api/listings/{listing_id}").json()["blocked_dates"])
check("those dates now quote as unavailable",
      client.get(f"/api/listings/{listing_id}/quote?check_in={check_in}&check_out={check_out}").json()["available"] is False)

# ================================================================== reviews

print("\n--- Reviews, wishlist, experiences ---")
check("reviewing a place you never stayed at is refused",
      client.post(f"/api/listings/{listing_id}/reviews", json={"rating": 5, "comment": "Nice"},
                  headers=guest).status_code in (400, 403))

check("a listing can be saved to the wishlist",
      client.post(f"/api/wishlist/{listing_id}", headers=guest).status_code in (200, 201))
check("it appears in the wishlist",
      any(x["id"] == listing_id for x in client.get("/api/wishlist", headers=guest).json()))
check("the listing reports itself as wishlisted",
      client.get(f"/api/listings/{listing_id}", headers=guest).json()["is_wishlisted"])
check("it can be removed again",
      client.delete(f"/api/wishlist/{listing_id}", headers=guest).status_code == 200)

exps = client.get("/api/experiences?kind=experience&location=Jaipur&limit=10").json()
check("experiences can be searched", exps["total"] > 0)
check("experience categories load", len(client.get("/api/experiences/categories?kind=service").json()) > 0)
exp_booking = client.post(f"/api/experiences/{exps['items'][0]['id']}/bookings",
                          json={"date": str(days(20)), "guests_count": 2}, headers=guest)
check("an experience can be booked", exp_booking.status_code in (200, 201))
if exp_booking.status_code in (200, 201):
    check("and cancelled",
          client.delete(f"/api/experiences/bookings/{exp_booking.json()['id']}", headers=guest).status_code == 200)

# ================================================================== hosting

print("\n--- Hosting: the listing wizard ---")
host = login(HOST)
draft = client.post("/api/listings/drafts", headers=host)
check("a draft listing is created", draft.status_code == 201)
draft = draft.json()
draft_id = draft["id"]
cleanup.append(("listing", draft_id, host))
check("the draft opens at the first step", draft["status"] == "draft" and draft["wizard_step"] == "about-your-place")
check("a draft is invisible to the public", client.get(f"/api/listings/{draft_id}").status_code == 404)
check("but visible to its host", client.get(f"/api/listings/{draft_id}", headers=host).status_code == 200)


def step(payload):
    return client.patch(f"/api/listings/{draft_id}/draft", json=payload, headers=host)


check("an unknown property structure is rejected", step({"structure_type": "spaceship"}).status_code == 400)
step({"structure_type": "cabin", "wizard_step": "privacy-type"})
step({"property_type": "entire_home", "wizard_step": "location"})
step({"city": "Goa", "country": "India", "latitude": 15.3, "longitude": 74.1, "wizard_step": "floor-plan"})
step({"max_guests": 4, "bedrooms": 2, "beds": 3, "bathrooms": 1.5, "wizard_step": "amenities"})
amenity_ids = [a["id"] for a in client.get("/api/amenities").json()[:4]]
step({"amenity_ids": amenity_ids, "wizard_step": "photos"})
step({"photo_urls": [f"https://example.com/{i}.jpg" for i in range(5)], "wizard_step": "title"})
check("an over-long title is rejected", step({"title": "x" * 40}).status_code == 422)
step({"title": "Cabin by the sea", "wizard_step": "description"})
step({"host_highlights": ["peaceful", "unique", "central"],
      "description": "A calm cabin steps from the beach.", "wizard_step": "price"})
step({"price_per_night": 80, "wizard_step": "weekend-price"})
saved = step({"weekend_price": 120, "wizard_step": "receipt"}).json()

check("each step is saved to the draft", saved["structure_type"] == "cabin" and saved["price_per_night"] == 80)
check("only two highlights are kept, as the step allows", saved["host_highlights"] == ["peaceful", "unique"])
check("photos and amenities are saved", len(saved["photos"]) == 5 and len(saved["amenities"]) == 4)
check("the draft remembers where to resume", saved["wizard_step"] == "receipt")
check("the draft is listed under drafts",
      any(x["id"] == draft_id for x in client.get("/api/listings/drafts", headers=host).json()))
check("a draft never appears in search",
      draft_id not in [x["id"] for x in client.get("/api/listings?location=Goa&limit=50").json()["items"]])

incomplete = client.post("/api/listings/drafts", headers=host).json()
cleanup.append(("listing", incomplete["id"], host))
check("an incomplete draft cannot be published",
      client.post(f"/api/listings/{incomplete['id']}/publish", headers=host).status_code == 400)

published = client.post(f"/api/listings/{draft_id}/publish", headers=host)
check("a complete draft publishes", published.status_code == 200 and published.json()["status"] == "published")
check("the published listing is now public", client.get(f"/api/listings/{draft_id}").status_code == 200)
check("and appears in search",
      draft_id in [x["id"] for x in client.get("/api/listings?location=Goa&limit=50").json()["items"]])
check("it can be unlisted",
      client.patch(f"/api/listings/{draft_id}/status", json={"status": "unlisted"}, headers=host).status_code == 200)
check("an unlisted listing is hidden again", client.get(f"/api/listings/{draft_id}").status_code == 404)
client.patch(f"/api/listings/{draft_id}/status", json={"status": "published"}, headers=host)

print("\n--- Hosting: calendar, pricing and the dashboard ---")
# A Friday, so the weekend rate is exercised.
friday = days(60)
while friday.weekday() != 4:
    friday += datetime.timedelta(days=1)
monday = friday + datetime.timedelta(days=3)

q = client.get(f"/api/listings/{draft_id}/quote?check_in={friday}&check_out={monday}").json()
check("Friday and Saturday are charged at the weekend rate", q["rates"] == [120, 120, 80])

client.put(f"/api/host/calendar/{draft_id}",
           json={"dates": [str(friday)], "price": 500}, headers=host)
q2 = client.get(f"/api/listings/{draft_id}/quote?check_in={friday}&check_out={monday}").json()
check("a night the host re-priced is charged at that price", q2["rates"][0] == 500)

client.put(f"/api/host/calendar/{draft_id}",
           json={"dates": [str(friday)], "reset_price": True, "blocked": True}, headers=host)
q3 = client.get(f"/api/listings/{draft_id}/quote?check_in={friday}&check_out={monday}").json()
check("a blocked night makes the stay unavailable", q3["available"] is False)
check("blocking a night is refused at booking time",
      client.post("/api/bookings", json={"listing_id": draft_id, "check_in": str(friday),
                                         "check_out": str(monday), "guests_count": 2},
                  headers=guest).status_code == 409)
client.put(f"/api/host/calendar/{draft_id}", json={"dates": [str(friday)], "blocked": False}, headers=host)

month = client.get(f"/api/host/calendar/{draft_id}?year={friday.year}&month={friday.month}", headers=host).json()
check("the hosting calendar returns a month of nights", len(month["days"]) >= 28)
check("it prices weekends from the weekend rate",
      next(d for d in month["days"] if d["date"] == str(friday))["price"] == 120)

long_stay = client.get(
    f"/api/listings/{draft_id}/quote?check_in={days(120)}&check_out={days(130)}"
).json()
check("a 10-night stay earns a length-of-stay or new-listing discount", long_stay["discount_amount"] > 0)
check("the discounted total still adds up",
      abs(long_stay["total"] - (long_stay["subtotal"] + long_stay["cleaning_fee"] + long_stay["service_fee"])) < 0.011)

res = client.get("/api/host/reservations", headers=host).json()
check("the host sees their reservations bucketed", all(
    k in res for k in ("checking_out", "currently_hosting", "arriving_soon", "upcoming", "pending_review", "all")))
earnings = client.get("/api/host/earnings", headers=host).json()
check("earnings report a year of payouts", earnings["total_year"] >= 0 and len(earnings["months"]) == 12)
check("the host fee is deducted from every payout",
      all(t["payout"] <= t["gross"] for t in earnings["transactions"]))
insights = client.get("/api/host/insights", headers=host).json()
check("insights report ratings and listing performance",
      "superhost_progress" in insights and isinstance(insights["listings"], list))
check("the earnings estimate is open to signed-out visitors",
      client.get("/api/host/estimate?city=Goa&bedrooms=2&nights=7").json()["total"] > 0)

check("a guest cannot reach the hosting endpoints",
      client.get("/api/host/reservations", headers=guest).status_code == 403)
check("a guest cannot edit someone else's listing",
      client.patch(f"/api/listings/{draft_id}/draft", json={"title": "hijacked"}, headers=guest).status_code == 403)

# ================================================================== teardown

for kind, ident, auth_headers in reversed(cleanup):
    if kind == "booking":
        client.delete(f"/api/bookings/{ident}", headers=auth_headers)
    else:
        client.delete(f"/api/listings/{ident}", headers=auth_headers)

print()
if failures:
    print(f"{len(failures)} test(s) FAILED: {failures}")
    sys.exit(1)
print("All API tests passed.")
