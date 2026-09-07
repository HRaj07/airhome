# airhome — an Airbnb Web App Clone

A fullstack clone of the Airbnb marketplace: browsing and searching listings, a detailed
listing page with an availability calendar and reviews, a complete booking flow with a
mocked checkout, and a host dashboard with full CRUD over listings. Built as a take-home
fullstack assignment.

**Stack:** Next.js 14 (TypeScript, App Router) · FastAPI (Python) · SQLAlchemy · SQLite

---

## 1. What's implemented

### Core features
- **Home / explore page** — mirrors the current Airbnb homepage: a compact
  `Anywhere | Anytime | Add guests` pill in the header that expands into the large
  Where / When / Who search bar (with All / Homes / Experiences / Services tabs), followed by
  horizontal carousel rows grouped by city ("Popular homes in Paris", "Available in Tokyo
  this weekend", ...). Cards show a "Guest favourite" badge, "Home in Montmartre"-style
  titles and "₹9,360 for 2 nights · ★4.9" pricing. Searching (or applying a filter) switches
  to an infinite-scroll results grid with a filters modal (price range, property type,
  amenities).
- **Listing detail page** — photo gallery with a full-screen lightbox, description,
  amenities, host info card (with Superhost badge), an embedded map, an availability
  calendar that blocks already-booked dates, a price breakdown, and a reviews section.
- **Booking flow** — date range + guest count selection with validation (no overlapping
  or unavailable dates, guest count capped at the listing's max), a summary/checkout page
  with a mocked payment form, and a confirmation screen. Confirmed bookings persist and
  immediately block those dates on the listing's calendar.
- **My Trips** — a guest's upcoming and past bookings, with the ability to cancel an
  upcoming trip.
- **Host dashboard (full CRUD)** — hosts can create, edit, and delete listings (title,
  description, photos via URL, price, location with map coordinates, amenities), and see
  a dashboard of their listings (bookings, revenue, rating) plus upcoming bookings across
  all of their properties.
- **Auth** — simplified email/password auth (JWT) that distinguishes guest vs. host
  accounts (a user can be a guest only, or a guest *and* a host).
- **Wishlist** — heart icon on every listing card and detail page, with a dedicated
  Wishlist page.
- **Reviews** — a guest can leave a star rating + comment after a completed stay; the API
  enforces this server-side (you can't review a place you haven't stayed at).
- **Language & currency modal** (globe icon in the header) — pick a display currency
  (USD, INR, EUR, GBP, JPY, ...); every price on the site re-renders in it. Prices are
  stored in USD and converted with a fixed demo rate table. Language selection is stored
  but interface translation is a placeholder.
- **Toasts / notifications**, **dark mode toggle** (in the hamburger menu), and a **fully
  responsive** layout (mobile, tablet, desktop).
- **Seed data** — 5 hosts, 4 guests, 48 listings across 8 cities (6 neighbourhoods per
  city, each with 4-6 photos and 5-10 amenities), a mix of completed (reviewed) and
  upcoming bookings.

### Mocked / placeholder, as scoped by the assignment
- **Payments** — the checkout screen collects mock card details and never contacts a real
  payment processor.
- **Maps** — the listing detail page embeds a real, pannable/zoomable OpenStreetMap view
  centered on the listing (no API key, no extra dependency). There is **no** map view with
  clickable pins across the *search results* grid — that would need a mapping library
  (e.g. Leaflet) that could not be installed and tested in the sandbox this was built in
  (see [Section 8](#8-a-note-on-how-this-was-built--verified)); the grid view itself is
  fully functional. Wiring in `react-leaflet` for a results-page map is a small, isolated
  addition if you want to pick it up later — see `src/components/MapEmbed.tsx` for the
  current map component to extend.
- **Messaging between guests and hosts** and **identity verification** — out of scope per
  the assignment; not implemented (no placeholder UI was added for these).
- **Image uploads** — listing photos are added by URL (as the assignment explicitly
  allows: "photos via URL or upload"), not by uploading to cloud storage.

---

## 2. Repository structure

```
airbnb-clone/
├── backend/                 FastAPI app
│   ├── app/
│   │   ├── main.py          App entrypoint, CORS, router registration
│   │   ├── models.py        SQLAlchemy models (the DB schema)
│   │   ├── schemas.py       Pydantic request/response models
│   │   ├── database.py      Engine/session setup (SQLite)
│   │   ├── auth.py          Password hashing + JWT
│   │   ├── deps.py          FastAPI auth dependencies
│   │   ├── serializers.py   ORM -> API response shaping (ratings, blocked dates, etc.)
│   │   ├── pricing.py       Pure pricing/date-overlap math (unit tested, zero deps)
│   │   ├── utils.py         Shared query helpers (booking overlap check)
│   │   ├── seed.py          Seeds the DB with demo hosts/guests/listings/bookings
│   │   └── routers/         auth, listings, bookings, reviews, wishlist, amenities, host
│   ├── tests/test_pricing.py  Standalone unit tests (no pytest/deps required)
│   └── requirements.txt
├── frontend/                 Next.js 14 (App Router) + TypeScript + Tailwind
│   └── src/
│       ├── app/              Routes (see Section 5 for the route map)
│       ├── components/       Reusable UI (search bar, calendar, listing card, etc.)
│       └── lib/              API client, types, auth/theme/toast contexts, date helpers
│           └── date.test.ts  Standalone unit tests for calendar/date logic (run via tsx)
└── docs/
    └── API_CONTRACT.md       Full endpoint-by-endpoint API reference
```

---

## 3. Architecture overview

```
┌─────────────────────┐        HTTPS / JSON        ┌──────────────────────┐
│   Next.js frontend   │ ─────────────────────────▶ │   FastAPI backend    │
│  (App Router, TS)    │ ◀───────────────────────── │ (Python, SQLAlchemy) │
│                      │      JWT bearer token       │                      │
│ - React contexts:    │                              │ - Routers per        │
│   auth / theme /     │                              │   resource           │
│   toast              │                              │ - Pydantic schemas   │
│ - lib/api.ts fetch    │                              │ - SQLAlchemy ORM     │
│   wrapper            │                              │   over SQLite        │
└─────────────────────┘                              └──────────┬───────────┘
                                                                  │
                                                                  ▼
                                                          ┌───────────────┐
                                                          │  SQLite file  │
                                                          │  (airbnb.db)  │
                                                          └───────────────┘
```

- The frontend is a **pure client of the JSON API** — no server-side secrets, no direct DB
  access. Every page that needs data calls `src/lib/api.ts`, which attaches the JWT (from
  `localStorage`) to authenticated requests.
- The backend is a **stateless REST API**: each request re-derives the current user from
  the bearer token (`app/deps.py`), so it scales horizontally without sticky sessions.
- Business rules that are easy to get subtly wrong — night/price math and date-range
  overlap — are isolated into dependency-free pure functions (`backend/app/pricing.py`
  and `frontend/src/lib/date.ts`) specifically so they can be unit tested in isolation
  from the framework and the database. Both files have passing unit test suites (see
  Section 8).

---

## 4. Database schema

SQLite, managed by SQLAlchemy (`backend/app/models.py`). Tables:

| Table | Purpose | Key columns |
|---|---|---|
| `users` | Guests and hosts (one table; `is_host` flag, so an account can be both) | `email` (unique), `hashed_password`, `is_host`, `is_superhost`, `bio` |
| `listings` | A bookable property | `host_id` → `users.id`, `property_type`, `price_per_night`, `cleaning_fee`, `service_fee_pct`, `neighborhood`/`city`/`state`/`country`, `latitude`/`longitude` |
| `listing_photos` | Ordered photos for a listing | `listing_id` → `listings.id`, `url`, `position` |
| `amenities` | Amenity catalog (Wifi, Kitchen, Pool, ...) | `name`, `icon` |
| `listing_amenities` | Many-to-many join table | `listing_id`, `amenity_id` |
| `bookings` | A confirmed or cancelled stay | `listing_id`, `guest_id`, `check_in`, `check_out`, `guests_count`, `subtotal`/`cleaning_fee`/`service_fee`/`total_price`, `status` |
| `reviews` | A rating + comment tied to a completed booking | `listing_id`, `booking_id` (nullable), `author_id`, `rating` (1-5), `comment` |
| `wishlist_items` | A user's saved listings | `user_id`, `listing_id` (unique together) |

Relationships: a host (`users`) has many `listings`; a listing has many `photos`,
many-to-many `amenities`, many `bookings`, and many `reviews`; a `booking` belongs to one
`listing` and one guest (`users`), and may have one `review`. Deletes cascade from
`users`/`listings` down to their dependent rows (photos, bookings, reviews, wishlist
entries), so removing a listing cleans up everything under it.

**Availability** is derived, not stored as its own table: a date is "blocked" on a listing
if it falls inside `[check_in, check_out)` of any `confirmed` booking for that listing.
This keeps the schema from needing to keep two things (bookings and a separate
calendar/availability table) in sync.

---

## 5. Frontend route map

| Route | Description |
|---|---|
| `/` | Home: city carousel rows; with search params (`?location=&check_in=&check_out=&guests=`) an infinite-scroll results grid + filters modal |
| `/listing/[id]` | Listing detail: gallery, amenities, host, map, calendar, reviews |
| `/booking/[listingId]?check_in=&check_out=&guests=` | Booking summary + mocked checkout |
| `/trips` | My Trips (guest) |
| `/wishlist` | Saved listings |
| `/login`, `/signup` | Auth (sign up can pre-select "become a host") |
| `/host/dashboard` | Host overview: listings table (edit/delete), upcoming bookings |
| `/host/listings/new` | Create a listing |
| `/host/listings/[id]/edit` | Edit or delete a listing |

## 6. API overview

Full endpoint-by-endpoint reference (request/response shapes) is in
[`docs/API_CONTRACT.md`](docs/API_CONTRACT.md). Summary:

| Resource | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Amenities | `GET /api/amenities` |
| Listings | `GET /api/listings` (search/filter/paginate), `GET /api/listings/featured` (homepage carousel rows grouped by city), `GET /api/listings/{id}`, `POST/PUT/DELETE /api/listings/{id}` (host only), `GET /api/listings/mine`, `GET /api/listings/{id}/availability` |
| Bookings | `POST /api/bookings`, `GET /api/bookings/mine`, `GET /api/bookings/listing/{id}` (host only), `DELETE /api/bookings/{id}` (cancel) |
| Reviews | `GET/POST /api/listings/{id}/reviews` |
| Wishlist | `GET /api/wishlist`, `POST/DELETE /api/wishlist/{listing_id}` |
| Host | `GET /api/host/dashboard` |

Auth is a JWT bearer token (`Authorization: Bearer <token>`), issued at register/login.
Interactive Swagger docs are auto-generated by FastAPI at `/docs` once the backend is
running.

---

## 7. Setup & installation

### Prerequisites
- Python 3.11+ and Node.js 18+ (repo was written targeting these; anything reasonably
  recent should work).

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed          # creates airbnb.db and seeds demo data
python -m uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000` (docs at `http://localhost:8000/docs`).

**Demo accounts** (password for all: `password123`):
- Host: `amelia.host@example.com` (also: `daniel.host@example.com`, `sofia.host@example.com`, `james.host@example.com`, `mei.host@example.com`)
- Guest: `demo@example.com` (also: `guest1@example.com`, `guest2@example.com`, `guest3@example.com`)

### Frontend

```bash
cd frontend
cp .env.local.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:8000/api
npm install
npm run dev
```

Visit `http://localhost:3000`.

### Running the unit tests

```bash
# Backend — pure pricing/date-overlap logic, stdlib only
cd backend && python3 tests/test_pricing.py

# Frontend — pure calendar/date logic, run directly with tsx (no test runner needed)
cd frontend && npx tsx src/lib/date.test.ts
```

---

## 8. A note on how this was built & verified

This project was built inside a sandboxed cloud environment whose network access is
locked down by organization policy to a small allowlist that does **not** include PyPI or
the npm registry — so `pip install` and `npm install` could not be run there, and neither
the FastAPI server nor the Next.js dev server could actually be started to click through
in a browser. That constraint doesn't affect the app itself (the `requirements.txt` and
`package.json` list ordinary, obtainable packages that will install normally in your
environment, on your GitHub Actions CI, or on Render/Vercel) — but it means the usual
"run it and look at it" verification step couldn't happen there. Instead, verification
leaned on what could run without those registries:

- **Every backend `.py` file** passes `python -m py_compile` (syntax-valid).
- **Every frontend `.ts`/`.tsx` file** (41 files) passes an `esbuild` syntax check, and
  every route's full import graph (all ~20 components it touches) was bundled with
  `esbuild` to confirm every cross-file import actually resolves to a real export —
  catching the class of bug where a component is renamed or a prop/type is renamed in one
  file and not updated elsewhere.
- **The business logic most worth getting right** — night/price calculations and
  date-range overlap detection, on both the backend (`pricing.py`) and frontend
  (`date.ts`'s calendar grid + blocked-date logic) — is factored into small pure
  functions with standalone unit test suites that **do** run in this environment (they
  need no third-party packages), and all tests pass (15 backend cases, 16 frontend
  cases).

**Recommended before you submit:** run `pip install -r requirements.txt && python -m
app.seed && uvicorn app.main:app --reload` and `npm install && npm run dev` locally once,
click through the core flows (search → listing → book → My Trips, and the host CRUD
flow), and fix anything that surprises you. Everything above gives high confidence the
code is correct, but it is not a substitute for actually clicking through the running app
once before you hand it in.

---

## 9. Deploying

### Backend → Render (or Railway/Fly.io)
1. Push this repo to GitHub (see below).
2. On Render: New → Web Service → connect the repo, root directory `backend/`.
3. Build command: `pip install -r requirements.txt && python -m app.seed`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add an environment variable `CORS_ORIGINS` set to your deployed frontend URL (e.g.
   `https://your-app.vercel.app`) once you have it, and `JWT_SECRET` to a random string.
6. Note the deployed URL, e.g. `https://airhome-api.onrender.com`.

> SQLite lives on local disk, so on most free hosting tiers the database resets on
> redeploy/restart (ephemeral filesystem) — that's fine for a demo; for anything longer-
> lived, swap in Postgres (the code only touches the DB through SQLAlchemy, so this is a
> `DATABASE_URL` change plus `pip install psycopg2-binary`, no query changes needed).

### Frontend → Vercel
1. On Vercel: New Project → import the repo, root directory `frontend/`.
2. Add environment variable `NEXT_PUBLIC_API_URL` = your Render backend URL + `/api`
   (e.g. `https://airhome-api.onrender.com/api`).
3. Deploy. Vercel auto-detects Next.js.

### Pushing to GitHub

This repo was built and committed locally (`git log` shows the commit history) but was
**not** pushed anywhere, since doing that from here would have needed your GitHub
credentials. From your machine:

```bash
cd airbnb-clone
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

---

## 10. Assumptions & design decisions

- A single `users` table serves both guests and hosts (`is_host` boolean) rather than
  separate tables, since a real Airbnb account can be both — this avoids duplicating
  profile data and awkward "which table is this user in" logic.
- Availability is derived from confirmed bookings rather than stored separately (see
  Section 4) — one source of truth, no sync bugs between "bookings" and "blocked dates."
- Booking overlap uses a half-open interval `[check_in, check_out)`, so a checkout date
  can be someone else's check-in date on the same day (matches how Airbnb's own calendar
  behaves) — this is unit tested explicitly (see `date_ranges_overlap` tests).
  Cancelling a booking frees its dates immediately (cancelled bookings are excluded from
  the overlap and blocked-dates checks).
- Reviews require a completed booking (`check_out` in the past) belonging to the
  reviewing user, enforced server-side — not just a UI convention.
  Editing a listing replaces its photo list; deleting a listing cascades to its
  photos/bookings/reviews/wishlist entries.
- Auth is intentionally simple (JWT, 1-week expiry, no email verification/password
  reset) since the assignment explicitly allows "real user authentication can be
  simplified or mocked."
- The header reproduces Airbnb's layout and interaction (compact pill → expanded bar,
  tabs, globe modal, hamburger menu) but uses an original "airhome" wordmark and icon
  rather than Airbnb's trademarked logo. Experiences / Services tabs, Help Centre, Refer a
  host and Find a co-host are "coming soon" placeholders.
