# API Contract — Airbnb Clone

Base URL (dev): `http://localhost:8000/api`
Auth: JWT bearer token in `Authorization: Bearer <token>` header, issued at login/register.
All list endpoints are paginated: `?page=1&limit=12` -> `{ items: [...], total, page, limit, has_more }`.

## Data Models (response shapes)

### User
```
{ id, email, full_name, avatar_url, is_host, is_superhost, identity_verified, bio, home_city, languages, created_at }
```

### Amenity
```
{ id, name, icon, group }
```

### Listing (list view / card)
```
{
  id, title, neighborhood, city, state, country, price_per_night, rating_avg, review_count,
  cover_photo_url, property_type, max_guests, bedrooms, beds, bathrooms,
  latitude, longitude, is_wishlisted (bool, only if authed)
}
```

### Listing (detail view) — adds:
```
{
  description, guest_access, other_notes, address, instant_book,
  host: { id, full_name, avatar_url, is_superhost, identity_verified, bio, home_city, languages, created_at },
  host_years_hosting,
  photos: [{id, url, position}],
  amenities: [{id, name, icon, group}],                 // group = section of "Show all amenities"
  cleaning_fee, service_fee_pct,
  blocked_dates: ["2026-09-10", "2026-09-11", ...],     // derived from confirmed bookings
  highlights: [{icon, title, body}],                    // the three "Listing highlights"
  rating_categories: [{key, label, score}],             // Cleanliness, Accuracy, Check-in, ...
  sleeping: [{name, beds}]                              // "Where you'll sleep"
}
```

### Booking
```
{
  id, listing: {id, title, cover_photo_url, city, country, price_per_night},
  check_in, check_out, guests_count, nights, subtotal, cleaning_fee, service_fee, total_price,
  status, created_at
}
```

### Review
```
{ id, author: {id, full_name, avatar_url}, rating, comment, created_at }
```

## Endpoints

### Auth
- `POST /auth/register` — body `{email, password, full_name, is_host}` -> `{token, user}`
- `POST /auth/login` — body `{email, password}` -> `{token, user}`
- `GET /auth/me` — auth required -> `user`

### Amenities
- `GET /amenities` -> `[{id, name, icon}]`

### Listings
- `GET /listings` — query: `location, check_in, check_out, guests, min_price, max_price, property_type, amenities (csv of ids), instant_book, min_bathrooms, sw_lat, sw_lng, ne_lat, ne_lng, page, limit` -> paginated Listing[list]. When all four bounds are given the map viewport is the search area and `location` is ignored ("Homes in map area").
- `GET /listings/map` — same filters -> `[{ id, latitude, longitude, price_per_night, city }]`, up to 400 pins for everything in view (the paged search only returns one page; the map shows a price on every home).
- `GET /listings/featured` -> `[{ title: "Popular homes in Paris", city, items: Listing[list][] }]` — homepage carousel rows, grouped by city
- `GET /listings/{id}` -> Listing[detail]
- `POST /listings` — auth (host) — body: title, description, property_type, bedrooms, beds, bathrooms, max_guests, price_per_night, cleaning_fee, service_fee_pct, address, city, state, country, latitude, longitude, amenity_ids[], photo_urls[]
- `PUT /listings/{id}` — auth (owner host)
- `DELETE /listings/{id}` — auth (owner host)
- `GET /listings/mine` — auth (host) -> Listing[] owned by current user
- `GET /listings/{id}/availability` -> `{blocked_dates: [...]}`

### Bookings
- `POST /bookings` — auth — body `{listing_id, check_in, check_out, guests_count}` -> Booking (409 if overlapping dates or guests > max_guests)
- `GET /bookings/mine` — auth -> Booking[] (guest's trips)
- `GET /bookings/listing/{listing_id}` — auth (owner host) -> Booking[] for that listing
- `DELETE /bookings/{id}` — auth (owner guest) — cancel

### Reviews
- `GET /listings/{id}/reviews` -> Review[]
- `POST /listings/{id}/reviews` — auth — body `{rating, comment}` — must have a past completed booking for that listing

### Wishlist
- `GET /wishlist` — auth -> Listing[list][]
- `POST /wishlist/{listing_id}` — auth -> `{ok: true}`
- `DELETE /wishlist/{listing_id}` — auth -> `{ok: true}`

### Host dashboard
- `GET /host/dashboard` — auth (host) -> `{ listings: [...with booking_count, revenue], upcoming_bookings: [...] }`

### Users
- `GET /users/{id}` -> public profile: `UserPublic + { trips, reviews_written, months_on_platform, reviews: [{id, rating, comment, created_at, subject_kind, subject_id, subject_title, subject_city}], listings: Listing[list][] }`

### Destinations (search autocomplete)
- `GET /destinations?q=&limit=` -> Destination[]
- `GET /destinations/nearest?lat=&lng=` -> `{ city, country, latitude, longitude, count, distance_km }` — the closest city with inventory, compared against every city (powers "Nearby").

Suggestions are derived from live inventory (distinct cities and neighbourhoods that
actually have listings), so a suggestion can never lead to an empty results page. With no
`q`, returns the biggest cities by listing count — used for the "Popular destinations"
chips on empty states. Matching is case-insensitive; a prefix match outranks a substring
match, and cities outrank neighbourhoods.

```
Destination = { kind: "city" | "neighborhood", label, sublabel, city, country,
                latitude, longitude, count }
```

## Property types
`entire_home | private_room | shared_room | hotel_room`

## Error shape
`{ detail: "message" }` with appropriate HTTP status (400/401/403/404/409).

### Experiences & Services
Both live in the `experiences` table; `kind` is `experience` or `service`.
- `GET /experiences/featured?kind=experience|service` -> `[{ title, key, items: ExperienceCard[] }]` (experiences grouped by city, services by category)
- `GET /experiences?kind=&location=&category=&date=&guests=&page=&limit=` -> paginated ExperienceCard[]
- `GET /experiences/categories?kind=` -> `["Photography", "Training", ...]`
- `GET /experiences/{id}` -> ExperienceDetail (`+ description, host, photos, reviews, availability: [{date, spots_left}]` for the next 30 days)
- `POST /experiences/{id}/bookings` — auth — `{date, guests_count}` -> ExperienceBooking (409 when the date lacks enough spots)
- `POST /experiences/{id}/reviews` — auth — `{rating, comment}`; requires an attended (past-dated) booking
- `GET /experiences/bookings/mine` — auth -> ExperienceBooking[]
- `DELETE /experiences/bookings/{id}` — auth — cancel

```
ExperienceCard = { id, kind, category, title, city, country, price_per_guest, price_unit ("guest"|"group"),
                   start_time ("3:00 PM" or ""), duration_minutes, max_guests, latitude, longitude,
                   cover_photo_url, rating_avg, review_count }
ExperienceBooking = { id, experience: ExperienceCard, date, guests_count, total_price, status, created_at }
```

## Notes on scale

The seeded database holds ~5,900 listings across ~610 cities, so the read endpoints are
written to keep their query count flat rather than proportional to the result set:

- `GET /listings` counts and pages in SQL; the `check_in`/`check_out` availability filter
  is a `NOT EXISTS` sub-query over confirmed bookings, using the half-open interval
  `[check_in, check_out)` — a stay that ends the day another begins does not clash.
- Listing and experience cards are serialized in batches: one `GROUP BY` for ratings and
  one `IN` query for wishlist state, regardless of how many cards are on the page.
- `GET /listings/featured` and `GET /experiences/featured` accept `?rows=` (default 12,
  max 40) and group in SQL, so they never build a row per city across the whole catalogue.
- `GET /destinations` aggregates with `GROUP BY` and pushes the text match into the query.

Destinations are keyed by city **and** country: two real cities are named Lagos, and the
sublabel is what tells them apart.
