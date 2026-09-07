# API Contract — Airbnb Clone

Base URL (dev): `http://localhost:8000/api`
Auth: JWT bearer token in `Authorization: Bearer <token>` header, issued at login/register.
All list endpoints are paginated: `?page=1&limit=12` -> `{ items: [...], total, page, limit, has_more }`.

## Data Models (response shapes)

### User
```
{ id, email, full_name, avatar_url, is_host, is_superhost, bio, created_at }
```

### Amenity
```
{ id, name, icon }
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
  description, address, host: { id, full_name, avatar_url, is_superhost, bio, created_at },
  photos: [{id, url, position}],
  amenities: [{id, name, icon}],
  cleaning_fee, service_fee_pct,
  blocked_dates: ["2026-09-10", "2026-09-11", ...]   // derived from confirmed bookings
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
- `GET /listings` — query: `location, check_in, check_out, guests, min_price, max_price, property_type, amenities (csv of ids), page, limit` -> paginated Listing[list]
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
