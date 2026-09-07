# airhome — an Airbnb Web App Clone

A fullstack clone of the Airbnb marketplace: browsing and searching listings, a detailed
listing page with an availability calendar and reviews, a complete booking flow with a
mocked checkout, and the full hosting side — Airbnb's step-by-step "Become a host"
listing wizard and its host-mode dashboard (Today, Calendar, Listings, Reservations,
Earnings, Insights). Built as a take-home fullstack assignment.

**Stack:** Next.js 14 (TypeScript, App Router) · FastAPI (Python) · SQLAlchemy · SQLite

---

## 1. What's implemented

### Core features
- **Home / explore** — mirrors the current Airbnb homepage: a compact
  `Anywhere | Anytime | Add guests` pill in the header that expands into the large
  Where / When / Who search bar, with real **All / Homes / Experiences / Services** tabs
  (`/`, `/homes`, `/experiences`, `/services`). The All tab interleaves home, experience
  and service carousel rows ("Popular homes in Paris", "Happening today in Tokyo",
  "Photography", ...). Cards show a "Guest favourite" badge, "Home in Montmartre"-style
  titles and "₹9,360 for 2 nights · ★4.9" pricing.
- **Search results** (`/homes?location=...`) — Airbnb's split layout: a filter-chip row
  (Filters + quick amenity toggles), an infinite-scroll grid on the left and an
  **interactive map with clickable price pins** on the right (Leaflet + OpenStreetMap,
  no API key). Hovering a card highlights its pin; clicking a pin opens a mini card.
  Overlapping pins merge into "N homes" cluster pins that zoom in on click, and the
  filter-chip row stays pinned under the header while you scroll. The filters modal
  covers price range, property type and amenities.
- **Destination autocomplete** — typing in "Where" queries `GET /api/destinations`, which
  builds its suggestions from the cities and neighbourhoods that actually have listings.
  A suggestion therefore can never lead to an empty results page, and a search for
  "Sector 75" or "Bandra" resolves to the right neighbourhood. Empty results pages offer
  "Popular destinations" chips from the same endpoint instead of a dead end.
- **Nearby search** — the Where dropdown has a "Nearby" option that uses the browser's
  Geolocation API; the server compares your position against every city with inventory
  and returns the closest one, telling you how far away it is.
- **The map is the search area.** Pan or zoom the results map and the list follows it
  ("Homes in map area"), with a price pin on every home in view — not just the current
  page — and clusters where pins would overlap. "Search as I move the map" can be turned
  off, in which case a "Search this area" button appears instead. The viewport is written
  to the URL so back/refresh keep it.
- **Listing page** in the real page's shape: title with Share/Save, the five-photo grid,
  "Entire home in Noida, India · 3 guests · 1 bedroom · 1 bed · 1 bathroom", the Guest
  favourite banner, "Hosted by Deeksha — Superhost · 1 year hosting", three Listing
  highlights, description with Guest access and Other things to note, Where you'll sleep,
  What this place offers with a "Show all 37 amenities" modal grouped by section, a
  two-month calendar, reviews with the six category scores and "Show all N reviews", Where
  you'll be, Meet your host, Things to know, and a sticky Photos · Amenities · Reviews ·
  Location / Reserve bar once the gallery scrolls away.
- **Profiles** — every reviewer's name and photo links to `/users/[id]`: photo, name,
  home city, Trips / Reviews / Years on airhome, "About", the reviews they've written, and
  a host's listings.
- **Experiences & Services** — fully bookable, not placeholders. Experiences are hosted
  activities at a fixed daily start time (time badge on the card, "From ₹3,700 / guest ·
  ★5.0"); services are professionals booked per guest or per group. Each has a detail
  page (gallery, description, host, map, reviews), a date picker that only allows dates
  with spots left (per-date capacity is enforced server-side), a guest picker capped at
  the remaining spots, a mocked checkout, a confirmation screen, and cancellation from
  My Trips. Services can be searched by type (Photography, Training, Chefs, ...).
- **Booking flow** — date range + guest count selection with validation (no overlapping
  or unavailable dates, guest count capped at the listing's max), a summary/checkout page
  with a mocked payment form, and a confirmation screen. Confirmed bookings persist and
  immediately block those dates on the listing's calendar.
- **My Trips** — a guest's upcoming and past stays *and* experience/service bookings,
  with the ability to cancel anything upcoming.
- **Become a host** — Airbnb's listing wizard, one URL per step
  (`/become-a-host/[id]/[step]`): place type, privacy type, location, floor plan,
  amenities, photos, title, highlights and description, booking settings, first-guest
  visibility, weekday and weekend price with the guest-price breakdown, discounts, safety
  disclosures, a review screen and publish. The draft is created server-side on the first
  click and every step saves to it, so closing the tab and coming back resumes exactly
  where you left off. `/host/homes` is the signed-out landing page, with an earnings
  estimate built from the nightly rates of comparable listings nearby.
- **Host mode** (`/hosting`) — its own header, as on the real site:
  **Today** (reservations bucketed into checking out / currently hosting / arriving soon /
  upcoming / pending review), **Calendar** (per-night prices, block or open nights, set a
  custom price for a date range, booked nights showing the guest), **Listings**
  (list/unlist, continue a draft, edit, delete), **Reservations**, **Earnings** (monthly
  paid-vs-upcoming chart, payouts with the host service fee itemised, transaction
  history) and **Insights** (rating breakdown, Superhost progress, occupancy, per-listing
  performance, recent reviews).
- **Auth** — simplified email/password auth (JWT) that distinguishes guest vs. host
  accounts (a user can be a guest only, or a guest *and* a host).
- **Wishlist** — heart icon on every listing card and detail page, with a dedicated
  Wishlist page.
- **Reviews** — a guest can leave a star rating + comment after a completed stay (or an
  attended experience/service); the API enforces this server-side.
- **Help Centre, Refer a host, Find a co-host** (hamburger menu) — working pages: a
  searchable FAQ, a personal referral link with copy-to-clipboard and email invites, and a
  filterable co-host directory with intro requests.
- **Language & currency modal** (globe icon in the header) — pick a display currency
  (USD, INR, EUR, GBP, JPY, ...); every price on the site re-renders in it. Prices are
  stored in USD and converted with a fixed demo rate table. Picking a language
  translates the interface (header, search bar, menu, cards, listing page, booking
  flow, trips, auth) into Hindi, Marathi, Kannada, Spanish, French, German, Japanese,
  Portuguese, Italian, Indonesian, Chinese, Korean or Dutch; other regions fall back to
  English. With the Translation toggle on, listing/experience descriptions and reviews
  are shown in that language too (with Airbnb's "Translated from English · Show
  original" note) — see `src/lib/i18n.ts`.
- **Toasts / notifications**, **dark mode toggle** (in the hamburger menu), and a **fully
  responsive** layout (mobile, tablet, desktop).
- **Footer, Help Centre and info pages** match the real site: "Inspiration for future
  getaways" (six tabs of destinations, all of which have inventory), Support / Hosting /
  airhome link columns, and a legal bar — with every link resolving to a real page
  (`/info/[slug]`: airCover, Anti-discrimination, Cancellation options, Hosting
  resources, Newsroom, Privacy, Terms, …). The Help Centre has role tabs (Guest, Home
  host, Experience host, Service host, Travel admin), a "We're here for you" login card,
  getting-started guides and top articles.
- **Gift cards** (`/gift-cards`) — buy flow with amount chips, recipient, message and a
  live card preview, plus a redeem form. Checkout is mocked like the rest of payments.
- **Log in or sign up modal** — the header opens Airbnb's three-step modal (identify →
  password → register) with mocked Google/Apple buttons and one-click demo accounts,
  rather than navigating away to a separate page.
- **Seed data — a marketplace, not a sample.** ~610 real cities with real coordinates,
  ~5,900 listings, ~2,500 experiences and services, ~24,000 photos, ~16,000 reviews and
  ~4,000 bookings, owned by ~80 hosts and reviewed by ~50 guests. Together the cities and
  their neighbourhoods make **~3,560 searchable destinations**, so autocomplete has real
  depth and any city a reviewer types resolves to inventory.

  India is deliberately over-represented (220+ cities, from the metros down to Kasol,
  Hampi and Havelock): the demo is browsed from India, and a marketplace that returns
  nothing for "Indore" reads as broken. Listings carry 12–25 of a 44-amenity catalogue in
  Airbnb's wording, an Instant Book flag, guest-access and house-note text; reviewers have
  home cities, languages and join dates spread over ten years, and reviews are dated over
  two years so the page reads "1 week ago … 2 years ago". The ~100 headline cities carry hand-written real
  neighbourhoods (Bandra West, Koramangala, Le Marais, Shibuya); the long tail derives
  plausible locality names by country — noted here rather than passed off as researched.
  The catalogue is `backend/app/cities.py`.

### Mocked / placeholder, as scoped by the assignment
- **Payments** — the checkout screen collects mock card details and never contacts a real
  payment processor.
- **Maps** — the search results map uses Leaflet with OpenStreetMap tiles (no API key);
  the listing/experience detail pages embed an OpenStreetMap view. Both are real,
  pannable maps rather than static images.
- **Messaging between guests and hosts** and **identity verification** — out of scope per
  the assignment; not implemented.
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
│   │   ├── serializers.py   ORM -> API response shaping (batched ratings, blocked dates)
│   │   ├── enums.py         Domain enums, free of SQLAlchemy so pure code can import them
│   │   ├── cities.py        The ~509-city destination catalogue
│   │   ├── seed_data.py     What the seed writes, as plain dicts (no DB imports)
│   │   ├── pricing.py       Pure pricing/date-overlap math (unit tested, zero deps)
│   │   ├── migrate.py       Adds any model column the shipped database lacks, on start-up
│   │   ├── photos.py        Photo pools: matches imagery to property type, topic and region
│   │   ├── rows.py          Row-building helpers shared by the carousel endpoints
│   │   ├── utils.py         Shared query helpers (booking overlap, stay quoting)
│   │   ├── seed.py          Seeds the DB with demo hosts/guests/listings/bookings
│   │   └── routers/         auth, listings, bookings, reviews, wishlist, amenities,
│   │                         host, experiences, destinations, users
│   ├── tests/                 Test suites (no pytest — plain asserts, one runner)
│   │   ├── run_all.py         Runs all three
│   │   ├── test_pricing.py    Stay quoting + booking-overlap logic (stdlib only)
│   │   ├── test_seed_data.py  The whole seed generation, without a database
│   │   └── test_api.py        The guest and hosting journeys through the real API
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
| `experiences` | A bookable activity (`kind=experience`) or professional service (`kind=service`) | `host_id` → `users.id`, `kind`, `category`, `city`, `price_per_guest`, `price_unit` (guest/group), `start_time`, `duration_minutes`, `max_guests` (capacity per date) |
| `experience_photos` | Ordered photos for an experience | `experience_id`, `url`, `position` |
| `experience_bookings` | A booking for one date | `experience_id`, `guest_id`, `date`, `guests_count`, `total_price`, `status` |
| `experience_reviews` | Rating + comment on an experience | `experience_id`, `author_id`, `rating`, `comment` |

Relationships: a host (`users`) has many `listings`; a listing has many `photos`,
many-to-many `amenities`, many `bookings`, and many `reviews`; a `booking` belongs to one
`listing` and one guest (`users`), and may have one `review`. Deletes cascade from
`users`/`listings` down to their dependent rows (photos, bookings, reviews, wishlist
entries), so removing a listing cleans up everything under it.

Experiences and services share one table because their booking model is identical (a
date, a headcount, a per-guest or per-group price); `kind` decides which tab they appear
under and how rows are grouped (experiences by city, services by category).

**Availability** is derived, not stored as its own table: a date is "blocked" on a listing
if it falls inside `[check_in, check_out)` of any `confirmed` booking for that listing.
For experiences, a date's remaining spots = `max_guests` minus the guests on confirmed
bookings for that date.
This keeps the schema from needing to keep two things (bookings and a separate
calendar/availability table) in sync.

---

## 5. Frontend route map

| Route | Description |
|---|---|
| `/` | All tab: mixed home / experience / service carousel rows |
| `/homes` | Homes tab: city rows; with any search params (`?location=&check_in=&check_out=&guests=`) the results grid + map + filters |
| `/experiences`, `/services` | Carousel rows; with search params (`?location=&date=&guests=&category=`) a results grid |
| `/experiences/[id]`, `/services/[id]` | Detail page with date/guest picker |
| `/experiences/[id]/book`, `/services/[id]/book` | Mocked checkout + confirmation |
| `/help`, `/refer`, `/co-host` | Help Centre (searchable FAQ), referral link + invites, co-host directory |
| `/gift-cards` | Buy a gift card (amount, recipient, message, live preview) + redeem |
| `/listing/[id]` | Listing detail: gallery, amenities, host, map, calendar, reviews |
| `/booking/[listingId]?check_in=&check_out=&guests=` | Booking summary + mocked checkout |
| `/trips` | My Trips (guest) |
| `/wishlist` | Saved listings |
| `/login`, `/signup` | Auth (sign up can pre-select "become a host") |
| `/host/homes` | "Airbnb it" landing page: earnings estimate, AirCover comparison, FAQ |
| `/become-a-host` | Hosting overview + "Get started" (creates the draft) |
| `/become-a-host/[id]/[step]` | The listing wizard — one route per step, resumable |
| `/hosting` | Host mode — Today: reservations by what's happening now |
| `/hosting/calendar` | Per-night availability and pricing for one listing |
| `/hosting/listings` | Every home, experience and service you host, with its status |
| `/hosting/reservations` | All reservations, filtered by upcoming / completed / cancelled |
| `/hosting/earnings` | Payouts by month, with the host service fee itemised |
| `/hosting/insights` | Ratings, Superhost progress, occupancy, listing performance |
| `/host/listings/[id]/edit` | Edit or delete a published listing |

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
| Host | `GET /api/host/reservations`, `GET /api/host/earnings?year=`, `GET /api/host/insights`, `GET/PUT /api/host/calendar/{listing_id}`, `GET /api/host/estimate`, `GET /api/host/dashboard` |
| Hosting wizard | `GET/POST /api/listings/drafts`, `PATCH /api/listings/{id}/draft` (save one step), `POST /api/listings/{id}/publish`, `PATCH /api/listings/{id}/status` (list / unlist) |
| Pricing | `GET /api/listings/{id}/quote?check_in=&check_out=` — what a stay actually costs: weekend rate, per-night prices the host set on their calendar, and the best applicable stay discount |
| Destinations | `GET /api/destinations?q=` (autocomplete from live inventory), `GET /api/destinations/nearest?lat=&lng=` (closest city with inventory, for "Nearby") |
| Map | `GET /api/listings/map` (price pins for every match in the viewport; `/listings` accepts the same `sw_lat/sw_lng/ne_lat/ne_lng` bounds so the list follows the map) |
| Users | `GET /api/users/{id}` (public profile: stats, reviews written, listings) |
| Experiences & Services | `GET /api/experiences/featured?kind=`, `GET /api/experiences?kind=&location=&category=&date=&guests=`, `GET /api/experiences/categories?kind=`, `GET /api/experiences/{id}`, `POST /api/experiences/{id}/bookings`, `POST /api/experiences/{id}/reviews`, `GET /api/experiences/bookings/mine`, `DELETE /api/experiences/bookings/{id}` |

**Performance note.** At this data size the naive shapes stop working, so the read paths
were rewritten to keep query counts flat:

- `GET /listings` counts and pages **in SQL**, and applies the date-availability filter as
  a `NOT EXISTS` sub-query. It previously materialised every match to slice it in Python,
  which meant an unfiltered search loaded all ~4,900 rows on every request.
- Cards are serialized in batches: ratings come from one `GROUP BY` and wishlist state
  from one `IN` query, instead of two queries per card (`serializers.to_listing_cards`).
- `GET /listings/featured` and `GET /experiences/featured` group in SQL and build only the
  rows the page shows (12 by default, `?rows=` to change), rather than one row per city
  across the whole catalogue.
- `GET /destinations` aggregates cities and neighbourhoods with `GROUP BY` and pushes the
  text match into the same query.
- The columns all of this filters and groups on are indexed, including a composite
  `(listing_id, check_in, check_out)` index for the availability check.

Auth is a JWT bearer token (`Authorization: Bearer <token>`), issued at register/login.
Interactive Swagger docs are auto-generated by FastAPI at `/docs` once the backend is
running.

---

## 7. Setup & installation

### Prerequisites
- Python 3.11+ and Node.js 18+ (repo was written targeting these; anything reasonably
  recent should work).

### Quick start (scripted)

```bash
./setup.sh            # venv + backend deps + seeded DB + npm install  (run once)
./start-backend.sh    # http://localhost:8000/docs
./start-frontend.sh   # http://localhost:3000   (second terminal)
./reseed.sh           # wipe and re-seed the demo data
```

The start scripts call `backend/.venv/bin/python` directly, so there is no
`source .venv/bin/activate` step and no chance of picking up a globally installed
`uvicorn`. The manual equivalents are below.

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
# Backend — all three suites, through the project's venv
cd backend && ./.venv/bin/python tests/run_all.py

# Frontend — typecheck plus the pure date / geo / i18n suites
cd frontend && npm test
```

There is no pytest and no test runner: every suite is a plain script of
assertions with one entry point. The pricing and seed suites import only the
standard library, so `python3 tests/run_all.py` runs them anywhere; the API
suite boots the real app against the seeded database and is skipped with a note
when the dependencies aren't installed.

```bash
cd backend   && python3 -m tests.test_pricing      # stay quoting + booking-overlap logic
cd backend   && python3 -m tests.test_seed_data    # the catalogue and every seed row builder
cd backend   && ./.venv/bin/python -m tests.test_api   # the guest and hosting journeys, end to end
cd frontend  && npm run typecheck                  # tsc --noEmit over the whole app
cd frontend  && npx tsx src/lib/date.test.ts       # calendar maths
```

`tests/test_api.py` is the one that walks the product: browse, search, filter,
map, availability, quote, book, double-book, cancel, review, wishlist,
experiences, then the whole hosting side — draft, every wizard step, publish,
unlist, calendar blocking and re-pricing, earnings, insights, and the
authorisation boundaries between guest and host. It cleans up everything it
creates, so it can be run against the demo database repeatedly.

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
  rather than Airbnb's trademarked logo.
- Translation is dictionary-based (`src/lib/i18n.ts`), not a live machine-translation
  service: interface strings are keyed by their English text, and host-written content
  is translated when it matches one of the demo's seed descriptions/reviews (text a host
  types in themselves is shown as written). This keeps the feature fully offline and
  deterministic; swapping in a translation API would be a one-function change in
  `translateContent`.
- Referral invites and co-host intro requests are stored in the browser (localStorage)
  rather than the database — they don't affect any other user, so a server round-trip
  would add tables without adding behaviour.
