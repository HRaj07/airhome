"use client";

import { useState } from "react";
import Link from "next/link";
import { Globe, Facebook, Instagram, Twitter, ChevronDown } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import LocaleModal from "./LocaleModal";

/**
 * The real footer, top to bottom: "Inspiration for future getaways" (a tabbed
 * grid of destinations with a rental type under each), three link columns, and
 * a bottom bar with the legal links, language, currency and social icons.
 *
 * Every link resolves to a real page — the informational ones through
 * /info/[slug] — because a footer full of dead links reads as unfinished.
 */
const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Support",
    links: [
      { label: "Help Centre", href: "/help" },
      { label: "Get help with a safety issue", href: "/info/safety-issue" },
      { label: "airCover", href: "/info/aircover" },
      { label: "Anti-discrimination", href: "/info/anti-discrimination" },
      { label: "Disability support", href: "/info/disability-support" },
      { label: "Cancellation options", href: "/info/cancellation-options" },
      { label: "Report neighbourhood concern", href: "/info/report-neighbourhood-concern" },
    ],
  },
  {
    heading: "Hosting",
    links: [
      { label: "airhome your home", href: "/signup?host=1" },
      { label: "airhome your experience", href: "/signup?host=1" },
      { label: "airhome your service", href: "/signup?host=1" },
      { label: "airCover for Hosts", href: "/info/aircover-for-hosts" },
      { label: "Hosting resources", href: "/info/hosting-resources" },
      { label: "Community forum", href: "/info/community-forum" },
      { label: "Hosting responsibly", href: "/info/hosting-responsibly" },
      { label: "Join a free hosting class", href: "/info/hosting-class" },
      { label: "Find a co-host", href: "/co-host" },
      { label: "Refer a host", href: "/refer" },
    ],
  },
  {
    heading: "airhome",
    links: [
      { label: "2026 Summer Release", href: "/info/summer-release" },
      { label: "Newsroom", href: "/info/newsroom" },
      { label: "Careers", href: "/info/careers" },
      { label: "Investors", href: "/info/investors" },
      { label: "Gift cards", href: "/gift-cards" },
      { label: "airhome.org emergency stays", href: "/info/emergency-stays" },
    ],
  },
];

/** The inspiration tabs. Each is a curated set of cities — every one of them
 *  is in the seed catalogue, so no link here dead-ends — with the rental type
 *  Airbnb pairs them with. */
const INSPIRATION: { tab: string; picks: [string, string][] }[] = [
  {
    tab: "Popular",
    picks: [
      ["Goa", "Villa rentals"], ["Jaipur", "Holiday rentals"], ["Manali", "Cabin rentals"], ["Udaipur", "Flat rentals"],
      ["Mumbai", "Serviced apartment rentals"], ["Bengaluru", "Flat rentals"], ["Rishikesh", "Cottage rentals"],
      ["London", "Holiday rentals"], ["Dubai", "Flat rentals"], ["Bali", "Villa rentals"], ["Paris", "Flat rentals"],
      ["Bangkok", "Serviced apartment rentals"], ["Singapore", "Flat rentals"], ["Rome", "Holiday rentals"],
      ["Barcelona", "Serviced apartment rentals"], ["Cape Town", "Pet-friendly rentals"], ["Tokyo", "Flat rentals"],
    ],
  },
  {
    tab: "Coastal",
    picks: [
      ["Goa", "Beach house rentals"], ["Gokarna", "Cottage rentals"], ["Alibaug", "Villa rentals"], ["Varkala", "Holiday rentals"],
      ["Puri", "Flat rentals"], ["Puducherry", "Holiday rentals"], ["Nice", "Flat rentals"], ["Lisbon", "Flat rentals"],
      ["Phuket", "Villa rentals"], ["Gold Coast", "Holiday rentals"], ["Miami", "Flat rentals"], ["Cancun", "Villa rentals"],
    ],
  },
  {
    tab: "Historic",
    picks: [
      ["Jaipur", "Haveli rentals"], ["Jodhpur", "Holiday rentals"], ["Hampi", "Cottage rentals"], ["Varanasi", "Guesthouse rentals"],
      ["Agra", "Holiday rentals"], ["Rome", "Holiday rentals"], ["Athens", "Flat rentals"], ["Kyoto", "House rentals"],
      ["Istanbul", "Flat rentals"], ["Prague", "Flat rentals"], ["Edinburgh", "Flat rentals"], ["Cusco", "Holiday rentals"],
    ],
  },
  {
    tab: "Islands",
    picks: [
      ["Havelock", "Beach house rentals"], ["Port Blair", "Holiday rentals"], ["Diu", "Holiday rentals"], ["Bali", "Villa rentals"],
      ["Koh Samui", "Villa rentals"], ["Santorini", "Villa rentals"], ["Mykonos", "Villa rentals"], ["Ibiza", "Villa rentals"],
      ["Maui", "Holiday rentals"], ["Zanzibar", "Beach house rentals"], ["Palawan", "Holiday rentals"], ["Male", "Holiday rentals"],
    ],
  },
  {
    tab: "Lakes",
    picks: [
      ["Udaipur", "Lakefront rentals"], ["Nainital", "Cottage rentals"], ["Kodaikanal", "Cottage rentals"], ["Bhopal", "Flat rentals"],
      ["Como", "Villa rentals"], ["Lake Tahoe", "Cabin rentals"], ["Queenstown", "Holiday rentals"], ["Lucerne", "Flat rentals"],
      ["Hallstatt", "Holiday rentals"], ["Bariloche", "Cabin rentals"], ["Pokhara", "Guesthouse rentals"], ["Interlaken", "Chalet rentals"],
    ],
  },
  {
    tab: "Things to do",
    picks: [
      ["New Delhi", "Food tours"], ["Mumbai", "Photography walks"], ["Bengaluru", "Cooking classes"], ["Goa", "Sunrise hikes"],
      ["Jaipur", "History walks"], ["Rishikesh", "Yoga classes"], ["Tokyo", "Night markets"], ["Paris", "Museum tours"],
      ["Barcelona", "Bike tours"], ["Bangkok", "Street food crawls"], ["Lisbon", "Craft cocktails"], ["Cape Town", "Sunrise hikes"],
    ],
  },
];

export default function Footer() {
  const { currency, language } = useLocale();
  const [tab, setTab] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);

  const picks = INSPIRATION[tab].picks;
  const visible = showMore ? picks : picks.slice(0, 17);

  return (
    <footer className="mt-16 border-t border-neutral-200 bg-[#f7f7f7] dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto max-w-[1760px] px-4 py-12 sm:px-6 lg:px-10">
        {/* ---- Inspiration for future getaways ---- */}
        <section>
          <h2 className="text-[22px] font-semibold">Inspiration for future getaways</h2>
          <div className="mt-4 flex gap-6 overflow-x-auto border-b border-neutral-300 text-sm dark:border-neutral-800">
            {INSPIRATION.map((g, i) => (
              <button
                key={g.tab}
                onClick={() => {
                  setTab(i);
                  setShowMore(false);
                }}
                className={`-mb-px shrink-0 border-b-2 pb-3 ${
                  i === tab ? "border-ink font-semibold text-ink dark:border-white dark:text-white" : "border-transparent text-hof hover:text-ink dark:text-neutral-400"
                }`}
              >
                {g.tab}
              </button>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
            {visible.map(([city, kind]) => {
              const href =
                INSPIRATION[tab].tab === "Things to do"
                  ? `/experiences?location=${encodeURIComponent(city)}`
                  : `/homes?location=${encodeURIComponent(city)}`;
              return (
                <Link key={`${city}-${kind}`} href={href} className="group text-sm">
                  <span className="block font-medium text-ink group-hover:underline dark:text-neutral-100">{city}</span>
                  <span className="block text-hof dark:text-neutral-400">{kind}</span>
                </Link>
              );
            })}
            {picks.length > 17 && (
              <button onClick={() => setShowMore((v) => !v)} className="flex items-center gap-1 self-start text-sm font-semibold">
                {showMore ? "Show less" : "Show more"} <ChevronDown size={16} className={showMore ? "rotate-180" : ""} />
              </button>
            )}
          </div>
        </section>

        {/* ---- Link columns ---- */}
        <div className="mt-12 grid grid-cols-1 gap-8 border-t border-neutral-300 pt-10 dark:border-neutral-800 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h2 className="mb-3 text-sm font-semibold">{col.heading}</h2>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-ink hover:underline dark:text-neutral-300">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ---- Bottom bar ---- */}
        <div className="mt-10 flex flex-col gap-4 border-t border-neutral-300 pt-6 text-sm dark:border-neutral-800 lg:flex-row lg:items-center lg:justify-between">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-ink dark:text-neutral-300">
            <span>© {new Date().getFullYear()} airhome, Inc.</span>
            <span>·</span>
            <Link href="/info/privacy" className="hover:underline">Privacy</Link>
            <span>·</span>
            <Link href="/info/terms" className="hover:underline">Terms</Link>
            <span>·</span>
            <Link href="/info/sitemap" className="hover:underline">Sitemap</Link>
            <span>·</span>
            <Link href="/info/company-details" className="hover:underline">Company details</Link>
          </p>
          <div className="flex items-center gap-5">
            <button onClick={() => setLocaleOpen(true)} className="flex items-center gap-1.5 font-medium hover:underline">
              <Globe size={16} />
              {language.language} ({language.region})
            </button>
            <button onClick={() => setLocaleOpen(true)} className="font-medium hover:underline">
              {currency.symbol} {currency.code}
            </button>
            <span className="flex items-center gap-4">
              <Link href="/info/newsroom" aria-label="Facebook"><Facebook size={18} /></Link>
              <Link href="/info/newsroom" aria-label="X"><Twitter size={18} /></Link>
              <Link href="/info/newsroom" aria-label="Instagram"><Instagram size={18} /></Link>
            </span>
          </div>
        </div>
        <p className="mt-4 text-xs text-hof dark:text-neutral-500">A student project clone — not affiliated with Airbnb.</p>
      </div>
      {localeOpen && <LocaleModal onClose={() => setLocaleOpen(false)} />}
    </footer>
  );
}
