/**
 * Content for the informational pages linked from the footer and the Help
 * Centre — AirCover, Anti-discrimination, Cancellation options, and so on.
 *
 * Real Airbnb has a page behind every footer link. This clone does too: each
 * slug here renders at /info/[slug], so nothing in the footer is a dead link.
 * The copy describes how *this* marketplace behaves, not Airbnb's legal terms.
 */
export interface InfoSection {
  heading: string;
  body: string[];
}

export interface InfoPage {
  slug: string;
  title: string;
  intro: string;
  sections: InfoSection[];
  /** Optional call to action shown under the intro. */
  cta?: { label: string; href: string };
}

const HOSTING_CTA = { label: "Start hosting", href: "/signup?host=1" };

export const INFO_PAGES: InfoPage[] = [
  {
    slug: "aircover",
    title: "airCover",
    intro: "Top-to-bottom protection, included for free with every booking.",
    cta: { label: "Explore homes", href: "/homes" },
    sections: [
      { heading: "Booking protection guarantee", body: ["In the unlikely event a host needs to cancel your booking within 30 days of check-in, we'll find you a similar or better home, or refund you."] },
      { heading: "Check-in guarantee", body: ["If you can't check in to your home and the host can't resolve the issue, we'll find you a similar or better home for the length of your original stay, or refund you."] },
      { heading: "Get-what-you-booked guarantee", body: ["If at any time during your stay you find your listing isn't as advertised — for example, the refrigerator stops working and your host can't easily fix it, or it has fewer bedrooms than listed — you'll have three days to report it and we'll find you a similar or better home, or refund you."] },
      { heading: "24-hour safety line", body: ["If you ever feel unsafe, you'll get priority access to specially trained safety agents, day or night."] },
    ],
  },
  {
    slug: "aircover-for-hosts",
    title: "airCover for Hosts",
    intro: "Top-to-bottom protection, always included and always free.",
    cta: HOSTING_CTA,
    sections: [
      { heading: "Guest identity verification", body: ["Our comprehensive verification system checks details such as name, address, government ID and more to confirm the identity of guests who book."] },
      { heading: "Reservation screening", body: ["Our proprietary technology analyses hundreds of factors in each reservation and blocks certain bookings that show a high risk for disruptive parties and property damage."] },
      { heading: "Damage protection", body: ["Damage to your home, furnishings, valuables or belongings caused by guests is covered, as is unexpected cleaning and income lost if you need to cancel confirmed bookings because of damage."] },
      { heading: "Liability insurance", body: ["You're protected in the rare event that a guest is hurt or their belongings are damaged or stolen while they're staying at your place."] },
    ],
  },
  {
    slug: "anti-discrimination",
    title: "Anti-discrimination",
    intro: "airhome is a community built on connection and belonging. Discrimination has no place here.",
    sections: [
      { heading: "Our commitment", body: ["Hosts and guests are expected to treat everyone in the community with respect and without bias, regardless of race, colour, ethnicity, national origin, religion, sexual orientation, gender identity, marital status, disability or age."] },
      { heading: "What hosts may not do", body: ["Decline a booking based on a protected characteristic, impose different terms or conditions, post a listing or make statements that discourage guests based on those characteristics, or refuse a reasonable accommodation for a guest with a disability."] },
      { heading: "How to report", body: ["If you experience discrimination while using airhome, report it from the Help Centre. Every report is reviewed and may lead to the removal of the host or guest from the platform."] },
    ],
  },
  {
    slug: "disability-support",
    title: "Disability support",
    intro: "Find and book homes and experiences that work for you.",
    sections: [
      { heading: "Accessibility features", body: ["Hosts can add accessibility features to their listing — step-free entry, wide doorways, accessible bathrooms and more — and you can search with those filters applied."] },
      { heading: "Service animals", body: ["Service animals are always welcome, regardless of a listing's pet policy. Emotional support animals are also welcome in most regions; check the listing's House rules."] },
      { heading: "Get help", body: ["Our accessibility team is available to help with booking, reasonable accommodations and any issue during your stay. Contact them through the Help Centre."] },
    ],
  },
  {
    slug: "cancellation-options",
    title: "Cancellation options",
    intro: "Plans change. Here's how cancelling works on airhome.",
    cta: { label: "Go to My Trips", href: "/trips" },
    sections: [
      { heading: "Cancelling a stay", body: ["Open My Trips, find the upcoming stay and choose Cancel booking. Cancelled dates immediately become available for other guests, and your refund (this demo never charges a card) is processed automatically."] },
      { heading: "Cancelling an experience or service", body: ["Experiences and services can be cancelled from My Trips up to the day before the booked date. The spots you held are released to other guests straight away."] },
      { heading: "Host cancellations", body: ["If a host cancels a confirmed booking, you'll be notified immediately and airCover's booking protection guarantee applies."] },
    ],
  },
  {
    slug: "safety-issue",
    title: "Get help with a safety issue",
    intro: "If you're in immediate danger, contact local emergency services first.",
    sections: [
      { heading: "During a stay", body: ["Our 24-hour safety line is available from the Help Centre for urgent issues — a lock that doesn't work, a host who won't respond, or a situation where you feel unsafe."] },
      { heading: "Reporting after a stay", body: ["You can report a safety concern about a listing, a host or a guest at any time. Reports are confidential and reviewed by a specialist team."] },
    ],
  },
  {
    slug: "report-neighbourhood-concern",
    title: "Report a neighbourhood concern",
    intro: "Concerned about a listing near you? Tell us about it.",
    sections: [
      { heading: "What you can report", body: ["Excessive noise, a disruptive party, unsafe behaviour, or concerns about a listing's legality. You do not need an airhome account to report a concern."] },
      { heading: "What happens next", body: ["A neighbourhood support team reviews every report, contacts the host where appropriate, and may restrict or remove listings that repeatedly cause problems."] },
    ],
  },
  {
    slug: "hosting-resources",
    title: "Hosting resources",
    intro: "Guides, tools and tips to help you host with confidence.",
    cta: HOSTING_CTA,
    sections: [
      { heading: "Getting started", body: ["Create your listing from the host dashboard: photos (by URL), a description, nightly price, cleaning fee, amenities and a map location. New listings appear in search immediately."] },
      { heading: "Pricing", body: ["Guests see the nightly rate multiplied by their nights, plus your cleaning fee and a service fee. Instant Book listings are surfaced by a dedicated filter chip."] },
      { heading: "Managing bookings", body: ["The host dashboard shows revenue, confirmed bookings and a per-listing breakdown, plus every upcoming stay across your properties."] },
    ],
  },
  {
    slug: "community-forum",
    title: "Community forum",
    intro: "Connect with hosts around the world, ask questions and share what works.",
    sections: [
      { heading: "Popular topics", body: ["Getting your first booking · Writing a listing description that converts · Pricing for peak season · Hosting long-term stays · Co-hosting arrangements."] },
      { heading: "Community guidelines", body: ["Be respectful, keep it relevant, and don't share guests' personal information. Moderators remove posts that break these rules."] },
    ],
  },
  {
    slug: "hosting-responsibly",
    title: "Hosting responsibly",
    intro: "What to know about local rules, safety and being a good neighbour.",
    sections: [
      { heading: "Local regulations", body: ["Many cities have rules about short-term rentals — registration, limits on nights per year, or taxes. Check your local requirements before you list."] },
      { heading: "Safety essentials", body: ["Install a smoke alarm and a carbon monoxide alarm, keep a first aid kit and fire extinguisher accessible, and list them under your amenities so guests can see them."] },
      { heading: "Neighbours", body: ["Set clear house rules on noise and guest numbers, and give neighbours a way to reach you."] },
    ],
  },
  {
    slug: "hosting-class",
    title: "Join a free hosting class",
    intro: "Live, online sessions with experienced Superhosts. Bring your questions.",
    cta: HOSTING_CTA,
    sections: [
      { heading: "Upcoming sessions", body: ["Hosting 101 — every Tuesday, 7 PM IST · Photos that book — every Thursday, 6 PM IST · Pricing masterclass — first Saturday of the month, 11 AM IST."] },
      { heading: "Format", body: ["45 minutes of walkthrough, 15 minutes of Q&A. Sessions are recorded and shared with everyone who registers."] },
    ],
  },
  {
    slug: "newsroom",
    title: "Newsroom",
    intro: "The latest from airhome.",
    sections: [
      { heading: "2026 Summer Release", body: ["Experiences and Services join Homes as first-class tabs, a redesigned search with destination autocomplete, and a map that drives your results."] },
      { heading: "Marketplace at scale", body: ["The catalogue now spans more than 600 cities and 5,000 homes, with India covered from the metros down to hill stations and islands."] },
    ],
  },
  {
    slug: "summer-release",
    title: "2026 Summer Release",
    intro: "Homes, Experiences and Services — now one app.",
    sections: [
      { heading: "Services", body: ["Book photographers, chefs, trainers, massage therapists and more, delivered to your stay."] },
      { heading: "Experiences", body: ["Food tours, sunrise hikes, photography walks and sound baths, hosted by locals at a fixed daily time with per-date capacity."] },
      { heading: "Search that follows the map", body: ["Pan or zoom the results map and the list updates to what's in view — with a price on every home."] },
    ],
  },
  {
    slug: "careers",
    title: "Careers",
    intro: "Help build the way people travel and host.",
    sections: [
      { heading: "Open roles", body: ["Full-stack engineer (Next.js / FastAPI) · Product designer · Trust & safety specialist · Host community manager."] },
      { heading: "How we work", body: ["Small teams, clear ownership, and a bias for shipping. Remote-friendly across India, Europe and North America."] },
    ],
  },
  {
    slug: "investors",
    title: "Investors",
    intro: "Financial information, reports and announcements.",
    sections: [
      { heading: "About this page", body: ["airhome is a student project; there are no investors, filings or shares. This page exists so that, like the real site, every footer link resolves to something."] },
    ],
  },
  {
    slug: "emergency-stays",
    title: "airhome.org emergency stays",
    intro: "Free, temporary housing for people in times of crisis.",
    sections: [
      { heading: "How it works", body: ["Hosts offer their homes for free or at a discount to people displaced by disasters, refugees, and frontline workers. Non-profit partners refer guests who need a place to stay."] },
      { heading: "Offer your home", body: ["Opt in from the host dashboard to make your listing available for emergency stays."] },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy",
    intro: "How this demo handles your information.",
    sections: [
      { heading: "What we store", body: ["An email address, a display name and a password hash for accounts you create; bookings, reviews and wishlist items you add. All of it lives in a local SQLite file on the machine running the backend."] },
      { heading: "What we don't do", body: ["No analytics, no advertising, no third-party sharing. Payments are mocked, so no card details are ever collected."] },
    ],
  },
  {
    slug: "terms",
    title: "Terms",
    intro: "The terms for using airhome.",
    sections: [
      { heading: "This is a demo", body: ["airhome is a student project that reproduces the Airbnb experience for evaluation. Listings, hosts, reviews and prices are seeded demo data, and no booking here creates a real reservation or charge."] },
      { heading: "Accounts", body: ["You're responsible for activity on your account. Don't use another person's account or attempt to access data that isn't yours."] },
    ],
  },
  {
    slug: "sitemap",
    title: "Sitemap",
    intro: "Every page on airhome.",
    sections: [
      { heading: "Explore", body: ["/ · /homes · /experiences · /services · /gift-cards"] },
      { heading: "Account", body: ["/login · /signup · /trips · /wishlist · /users/[id]"] },
      { heading: "Hosting", body: ["/host/dashboard · /host/listings/new · /refer · /co-host"] },
      { heading: "Support", body: ["/help · /info/aircover · /info/cancellation-options · /info/anti-discrimination · /info/disability-support"] },
    ],
  },
  {
    slug: "company-details",
    title: "Company details",
    intro: "airhome, Inc. — a student project clone, not affiliated with Airbnb.",
    sections: [
      { heading: "Project", body: ["Built as a fullstack assignment: Next.js 14 + TypeScript on the front, FastAPI + SQLAlchemy + SQLite on the back. Source and documentation are in the repository README."] },
    ],
  },
];

export function findInfoPage(slug: string): InfoPage | undefined {
  return INFO_PAGES.find((p) => p.slug === slug);
}
