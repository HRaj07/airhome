"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import AuthModal from "@/components/AuthModal";

/** The real Help Centre is split by who you are. Each topic lists the roles it applies to. */
type Role = "Guest" | "Home host" | "Experience host" | "Service host" | "Travel admin";
const ROLES: Role[] = ["Guest", "Home host", "Experience host", "Service host", "Travel admin"];

const TOPICS: { category: string; roles: Role[]; items: { q: string; a: string }[] }[] = [
  {
    category: "Booking a stay",
    roles: ["Guest", "Travel admin"],
    items: [
      {
        q: "How do I book a home?",
        a: "Open a listing, pick your check-in and checkout dates on the calendar (dates that are already booked are crossed out), choose the number of guests and press Reserve. You'll see a full price breakdown before confirming on the checkout page.",
      },
      {
        q: "Why can't I select certain dates?",
        a: "Dates that overlap an existing confirmed booking are blocked. Your checkout day can be another guest's check-in day, but you can't span a night that's already taken.",
      },
      {
        q: "What's included in the total price?",
        a: "The nightly rate multiplied by the number of nights, the host's cleaning fee, and a service fee (a percentage of the subtotal). Nothing is added at checkout.",
      },
      {
        q: "How do I cancel a booking?",
        a: "Go to My Trips from the menu, find the upcoming stay and press Cancel booking. Cancelled dates immediately become available again for other guests.",
      },
    ],
  },
  {
    category: "Experiences & services",
    roles: ["Guest", "Experience host", "Service host"],
    items: [
      {
        q: "How are experiences different from services?",
        a: "Experiences are hosted activities that run at a set time on a chosen date (food tours, walks, workshops). Services are professionals you book to come to you — photographers, trainers, chefs — on a date that suits you.",
      },
      {
        q: "How many spots are left on a date?",
        a: "Each experience has a capacity per date. Open the date picker on the experience page — days that are sold out can't be selected, and the guest picker shows how many spots remain on the day you chose.",
      },
      {
        q: "Can I leave a review?",
        a: "Yes — once the date of an experience or service you booked has passed, a Write a review button appears on its page.",
      },
    ],
  },
  {
    category: "Hosting",
    roles: ["Home host", "Experience host", "Service host"],
    items: [
      {
        q: "How do I become a host?",
        a: "Sign up with the \"I want to host\" box ticked (or choose Become a host from the menu). You'll get a host dashboard where you can create, edit and delete listings and see every booking.",
      },
      {
        q: "How do I add photos to my listing?",
        a: "In the listing form, paste image URLs into the Photos section. The first photo becomes the cover image shown on cards; you can remove any photo by hovering over it.",
      },
      {
        q: "Where do I see my bookings and earnings?",
        a: "The host dashboard shows total revenue, confirmed bookings and a per-listing breakdown, plus a list of upcoming bookings across all your properties.",
      },
    ],
  },
  {
    category: "Payments, currency & account",
    roles: ["Guest", "Home host", "Experience host", "Service host", "Travel admin"],
    items: [
      {
        q: "Are payments real?",
        a: "No. This is a demo marketplace: the checkout collects mock card details and never charges a card. Bookings are recorded as if the payment succeeded.",
      },
      {
        q: "How do I change the currency?",
        a: "Press the globe icon in the header and open the Currency tab. Every price on the site is shown in the currency you pick.",
      },
      {
        q: "How do I log out?",
        a: "Open the menu (the icon at the top right) and choose Log out.",
      },
    ],
  },
];


/** "Guides for getting started" — the two cards on the real page, per role. */
const GUIDES: Record<Role, { title: string; href: string; tone: string }[]> = {
  Guest: [
    { title: "airCover for guests", href: "/info/aircover", tone: "from-[#222] to-[#444] text-white" },
    { title: "Essential resources for new guests", href: "/info/cancellation-options", tone: "from-[#0f6b6b] to-[#2fa3a3] text-white" },
  ],
  "Home host": [
    { title: "airCover for Hosts", href: "/info/aircover-for-hosts", tone: "from-[#222] to-[#444] text-white" },
    { title: "Essential resources for new hosts", href: "/info/hosting-resources", tone: "from-[#8b5a2b] to-[#c9955c] text-white" },
  ],
  "Experience host": [
    { title: "Hosting an experience", href: "/info/hosting-resources", tone: "from-[#6a1b9a] to-[#ab47bc] text-white" },
    { title: "Join a free hosting class", href: "/info/hosting-class", tone: "from-[#222] to-[#444] text-white" },
  ],
  "Service host": [
    { title: "Offering a service", href: "/info/hosting-resources", tone: "from-[#1565c0] to-[#42a5f5] text-white" },
    { title: "Hosting responsibly", href: "/info/hosting-responsibly", tone: "from-[#222] to-[#444] text-white" },
  ],
  "Travel admin": [
    { title: "Managing trips for a team", href: "/trips", tone: "from-[#2e7d32] to-[#66bb6a] text-white" },
    { title: "Cancellation options", href: "/info/cancellation-options", tone: "from-[#222] to-[#444] text-white" },
  ],
};

export default function HelpPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role>("Guest");
  const [open, setOpen] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const filtered = TOPICS.filter((t) => q || t.roles.includes(role))
    .map((t) => ({
      ...t,
      items: t.items.filter((i) => !q || i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)),
    }))
    .filter((t) => t.items.length > 0);

  return (
    <div className="mx-auto max-w-[1160px] px-4 py-10 sm:px-8">
      {/* Search */}
      <div className="mb-12 text-center">
        <h1 className="text-[32px] font-semibold sm:text-[40px]">Hi, how can we help?</h1>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="mx-auto mt-6 flex max-w-md items-center rounded-full bg-neutral-100 py-1.5 pl-6 pr-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ink dark:bg-neutral-900"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search how-tos and more"
            className="w-full bg-transparent text-[15px] outline-none"
          />
          <button type="submit" aria-label="Search" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rausch text-white">
            <Search size={18} strokeWidth={2.5} />
          </button>
        </form>
      </div>

      {!q && (
        <>
          {/* Role tabs */}
          <div className="flex gap-8 overflow-x-auto border-b border-neutral-200 text-[15px] dark:border-neutral-800">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRole(r);
                  setOpen(null);
                }}
                className={`-mb-px shrink-0 border-b-2 pb-3 ${
                  r === role ? "border-ink font-semibold text-ink dark:border-white dark:text-white" : "border-transparent text-hof hover:text-ink dark:text-neutral-400"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* We're here for you */}
          <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-[22px] font-semibold">We&apos;re here for you</p>
              <p className="text-[15px] text-hof dark:text-neutral-300">
                {user ? `Hi ${user.full_name.split(" ")[0]} — get help with your reservations, account and more.` : "Log in to get help with your reservations, account and more."}
              </p>
            </div>
            {user ? (
              <Link href="/trips" className="rounded-lg bg-ink px-8 py-3.5 text-center font-semibold text-white dark:bg-white dark:text-ink">
                Go to My Trips
              </Link>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="rounded-lg bg-gradient-to-r from-[#E61E4D] via-[#E31C5F] to-[#D70466] px-8 py-3.5 font-semibold text-white sm:min-w-[300px]"
              >
                Log in or sign up
              </button>
            )}
          </div>

          {/* Guides */}
          <div className="mt-12">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[22px] font-semibold">Guides for getting started</h2>
              <Link href="/info/hosting-resources" className="flex items-center gap-1 text-sm font-medium underline">
                Browse all topics <ChevronRight size={14} />
              </Link>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {GUIDES[role].map((g) => (
                <Link key={g.title} href={g.href} className="group">
                  <div className={`flex aspect-square items-end rounded-xl bg-gradient-to-br p-5 ${g.tone}`}>
                    <span className="text-2xl font-bold leading-tight">{g.title.split(" ")[0]}</span>
                  </div>
                  <p className="mt-3 text-[15px] font-medium group-hover:underline">{g.title}</p>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Top articles / FAQ */}
      <div className="mt-12">
        <h2 className="mb-6 text-[22px] font-semibold">{q ? `Results for "${query}"` : "Top articles"}</h2>
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-hof dark:text-neutral-400">No articles match &ldquo;{query}&rdquo;.</p>
        ) : (
          <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
            {filtered.map((topic) => (
              <section key={topic.category}>
                <h3 className="mb-3 text-lg font-semibold">{topic.category}</h3>
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {topic.items.map((item) => {
                    const key = `${topic.category}:${item.q}`;
                    const isOpen = open === key;
                    return (
                      <div key={key}>
                        <button
                          onClick={() => setOpen(isOpen ? null : key)}
                          aria-expanded={isOpen}
                          className="flex w-full items-center justify-between gap-4 py-4 text-left text-[15px] font-medium hover:underline"
                        >
                          {item.q}
                          <ChevronDown size={18} className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                        {isOpen && <p className="pb-5 text-sm leading-relaxed text-hof dark:text-neutral-300">{item.a}</p>}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <div className="mt-12 grid gap-4 border-t border-neutral-200 pt-8 dark:border-neutral-800 sm:grid-cols-3">
        {[
          ["Cancellation options", "/info/cancellation-options"],
          ["Get help with a safety issue", "/info/safety-issue"],
          ["Report a neighbourhood concern", "/info/report-neighbourhood-concern"],
        ].map(([label, href]) => (
          <Link key={href} href={href} className="flex items-center justify-between rounded-xl border border-neutral-200 px-5 py-4 text-[15px] font-medium hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
            {label} <ChevronRight size={16} />
          </Link>
        ))}
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
