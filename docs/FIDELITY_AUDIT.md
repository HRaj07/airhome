# Airbnb fidelity audit — gaps found and fixes

Compared against airbnb.co.in / airbnb.co.uk screenshots, Sept 2026.

## A. Functional bugs (highest priority)
| # | Issue | Fix |
|---|---|---|
| A1 | Searching "noida" (or any Indian city) returns **0 homes / 0 experiences / 0 services** — a dead end. Real Airbnb has inventory everywhere. | Seed 6 Indian cities (Noida, Gurgaon, New Delhi, Mumbai, Bengaluru, Goa) with neighbourhoods, plus experiences & services in each. |
| A2 | The "Where" dropdown shows **"SUGGESTED DESTINATIONS" with nothing under it** when the typed text matches no city. | Real autocomplete driven by a new `/destinations` API; always shows something (matches, then popular). |
| A3 | The dropdown renders a **second duplicate text input** below the pill — the typed value appears twice. | Single input inside the expanded pill, dropdown below is a suggestion list only. |
| A4 | No-results page is a dead end. | "No exact matches" now offers nearby/popular destinations as clickable chips. |
| A5 | Login is a full page navigation; real Airbnb opens a **modal** from anywhere. | Auth modal (email/phone → Continue, Google/Apple mocked), `/login` kept as a route. |

## B. Missing features present in real Airbnb
| # | Item | Fix |
|---|---|---|
| B1 | **Gift cards** — in the hamburger menu and as a page. | New `/gift-cards` page + menu entry. |
| B2 | Footer is a single line; real has **Support / Hosting / airhome** link columns. | Full 3-column footer. |
| B3 | Refer page styling doesn't match (real = white page, QR + "Customise link", three earning cards, "Share referral link"). | Rebuilt to match. |

## C. Visual fidelity
| # | Item | Fix |
|---|---|---|
| C1 | Active tab uses an underline everywhere; real Airbnb draws a **rounded outline box** around the active tab on `/homes`, `/experiences`, `/services` (underline only for "All"). | Implemented both states. |
| C2 | Cards read "$346 for 2 nights"; real reads **"11–13 Sept"** on line 1 and **"£38 total"** on line 2. | Cards show the date range when dates are searched, and "total" pricing. |
| C3 | Experience time badge shows "3pm"; real uses **24-hour "15:00"**. | Switched to 24-hour. |
| C4 | Search bar on results pages overlapped/floated oddly. | Fixed positioning. |

## Status
All items A1–A5, B1–B3 and C1–C4 are implemented as of this commit. Verified by:
per-file esbuild syntax check across all 69 `.ts`/`.tsx` files, an esbuild
bundle-resolution check for every route entry (catches the missing-import class of bug
that previously crashed `Navbar`), a scan for JSX tags with no import or local
definition, `python3 -m py_compile` over the backend, and the four unit suites
(`test_pricing.py`, `date.test.ts`, `geo.test.ts`, `i18n.test.ts`) — all passing.

**Re-seed required:** the seed data changed (Indian cities + neighbourhoods), so run
`./reseed.sh` before starting the backend.

## D. Second pass — results page (from the 12:06 comparison screenshots)
| # | Issue | Fix |
|---|---|---|
| D1 | Result cards reused the small explore card (3 across). Real Airbnb's map-side cards are wider, with the rating on the title line, the listing's own name, "1 bedroom · 1 bed", the date range and an **underlined** "₹11,896 for 5 nights". | `ListingCard` gained a `layout="result"` variant; the results grid is now 2-up (3-up only past 1536px). |
| D2 | Cards showed one static photo. Real cards are a **swipeable gallery** with dots and hover arrows. | New `CardPhotos` component, shared by both layouts. Backend `ListingCard` now returns `photo_urls` (first 5) so this needs no extra request per card. |
| D3 | No "**Prices include all fees**" note beside the results heading. | Added, with Airbnb's tag icon. |
| D4 | Heading didn't match Airbnb's phrasing. | "Over 1,000 homes" past a thousand, "84 homes in Noida" otherwise. |
| D5 | An unfiltered browse fitted the map to results on three continents, giving a **zoomed-out world map with two cluster pins**. | The map now frames the city with the most results when the spread is wider than 30°, the way Airbnb always frames one area. |
| D6 | Pressing Search with nothing filled in produced the URL `?q=`. | Now `?search=1`. |

## E. Catalogue scale-up
The marketplace only had 14 cities, so most searches were dead ends. It now seeds ~509
real cities (~3,560 searchable destinations) and ~4,900 listings — see README §1.

That broke every read path that had been written for 84 rows, so those were rewritten
too: SQL paging and a `NOT EXISTS` availability filter on `/listings`, batched rating and
wishlist lookups for cards, `?rows=`-limited SQL grouping for the two featured endpoints,
`GROUP BY` aggregation for `/destinations`, and indexes on every column they filter or
group on (details in README §6).

The seed's row generation moved into `seed_data.py`, which imports no database driver, so
`tests/test_seed_data.py` can exercise all ~5,000 listings, bookings, reviews and
experiences in under a second — the seed is the one part of the backend that can't be
checked by importing the app, and a bad key in a bulk insert otherwise surfaces as an
opaque driver error minutes in.

## F. Third pass — from the 7 Sept side-by-side screenshots (airbnb.co.uk / .co.in vs localhost)

### Functional bugs
| # | Issue | Fix |
|---|---|---|
| F1 | **Nearby** from Delhi picked Agra. The client fetched the top-20 "popular" cities and picked the closest of *those*; with every headline city at 12 listings the top 20 is arbitrary. | New `GET /destinations/nearest?lat&lng` — haversine over **every** city with inventory, server-side. |
| F2 | Enlarging the map shows no prices for other regions, and zooming/panning doesn't change the list. Real Airbnb: the map shows every home in view, and the list follows the map ("Homes in map area"). | `GET /listings` and a new lightweight `GET /listings/map` accept viewport bounds. The map reports its bounds on move; the list refetches; pins come from `/listings/map` (up to 400) rather than just the current page. "Search as I move the map" toggle. |
| F3 | Scrolling the home page makes the header **flicker** between expanded and collapsed (the video). Collapsing shrinks the page, which drops `scrollY` back under the threshold, which re-expands it. | Hysteresis: collapse past 80px, re-expand under 16px, never collapse on pages too short to scroll past it. |
| F4 | Filter chips are the wrong set and order. Real (.co.in): Washing machine · Wifi · Free parking · Kitchen · Air conditioning · Instant Book · Allows pets · 1+ bathrooms. | Exact set. Instant Book is a new listing flag; 1+ bathrooms is a `min_bathrooms` filter; the rest map to amenities (renamed to Airbnb's wording). |

### Missing features
| # | Item | Fix |
|---|---|---|
| F5 | Google / Apple buttons show text; real Airbnb shows **icon-only square buttons** with the brand marks. | Inline SVG logos, 80×64 outlined squares. |
| F6 | Guest favourite pill lacks the **trophy** mark; the listing page lacks the laurel **Guest favourite banner** ("One of the most loved homes… 5.0 ★ · 12 Reviews"). | Both added. |
| F7 | Listing page is thin. Real: title + Share/Save · 5-photo grid + "Show all photos" · "Entire rental unit in Noida, India" · "3 guests · 1 bedroom · 1 bed · 1 bathroom" · Guest favourite banner · "Hosted by Deeksha — Superhost · 1 year hosting" · **Listing highlights** (3, with icons) · description + Show more · Guest access · Other things to note · Where you'll sleep · What this place offers + "Show all 37 amenities" · calendar · reviews with **category bars** and review cards ("Roopali · 10 months on Airbnb · ★★★★★ · 1 week ago · Show more") + "Show all N reviews" · Where you'll be · Meet your host · Things to know. Sticky sub-nav (Photos · Amenities · Reviews · Location | £89 total · Reserve) after scrolling past the gallery. Reserve card shows **"£89 total"** underlined, CHECK-IN / CHECKOUT boxes, GUESTS dropdown. | Page rebuilt section by section. Backend `ListingDetail` gains highlights, guest_access, other_notes, sleeping arrangements, rating categories, host years_hosting. Amenity catalogue grows from 16 to 44 so "Show all 37 amenities" is real. |
| F8 | Review authors aren't clickable. Real: click a reviewer → **profile page** (avatar, name, city, Trips / Reviews / Months on Airbnb, "About", "What hosts are saying", identity verified). | New `GET /users/{id}` + `/users/[id]` page. Every reviewer avatar/name on listings and experiences links to it. Users gain `home_city`, `languages`, spread-out join dates. |
| F9 | Footer is a stub. Real: **"Inspiration for future getaways"** tabbed destination grid (Popular · Coastal · Historic · Islands · Lakes · Things to do) with Show more, three full link columns (Support 7 · Hosting 10 · Airbnb 6), bottom bar (© · Privacy · Terms · Sitemap · Company details · language · currency · social). Every link must work. | Rebuilt. Each informational link resolves to `/info/[slug]` with real content, the destination grid is live from `/destinations`. |
| F10 | Help Centre is a plain FAQ. Real: pill search with button, role tabs (Guest · Home host · Experience host · Service host · Travel admin), "We're here for you" login card, "Guides for getting started" cards, "Top articles". | Rebuilt with all of the above; the FAQ becomes the per-role article list. |
| F11 | Refer page: real has the controls top-right over a minimal page, three **wide** cards with big emoji, a grey disabled "Share referral link" when logged out, and a legal line with an expiry. | Matched. |
| F12 | Review text is 8 canned lines; real reviews vary in length and voice, and dates read "1 day ago … 3 weeks ago". | 40-line review pool, dates spread over two years, relative-time formatting. |
| F13 | "Add more cities and destinations." | +64 cities (India tail + world tail), ~5,500 listings. |
