"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ChevronDown, HelpCircle } from "lucide-react";

const TOPICS: { category: string; items: { q: string; a: string }[] }[] = [
  {
    category: "Booking a stay",
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

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = TOPICS.map((t) => ({
    ...t,
    items: t.items.filter((i) => !q || i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)),
  })).filter((t) => t.items.length > 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <div className="mb-8 text-center">
        <HelpCircle size={40} className="mx-auto mb-3 text-rausch" />
        <h1 className="text-3xl font-semibold">Hi, how can we help?</h1>
        <div className="mx-auto mt-6 flex max-w-xl items-center gap-2 rounded-full border border-neutral-300 px-5 py-3 shadow-sm focus-within:border-ink dark:border-neutral-600">
          <Search size={18} className="text-hof" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search how-tos and more"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-hof dark:text-neutral-400">No articles match &ldquo;{query}&rdquo;.</p>
      ) : (
        filtered.map((topic) => (
          <section key={topic.category} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">{topic.category}</h2>
            <div className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {topic.items.map((item) => {
                const key = `${topic.category}:${item.q}`;
                const isOpen = open === key;
                return (
                  <div key={key}>
                    <button
                      onClick={() => setOpen(isOpen ? null : key)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    >
                      {item.q}
                      <ChevronDown size={18} className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && <p className="px-5 pb-5 text-sm leading-relaxed text-hof dark:text-neutral-300">{item.a}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      <div className="mt-10 rounded-2xl bg-neutral-100 p-6 text-center dark:bg-neutral-900">
        <p className="font-semibold">Still need help?</p>
        <p className="mt-1 text-sm text-hof dark:text-neutral-400">Hosts reply to booking questions directly from the listing page, and every booking can be managed from My Trips.</p>
        <Link href="/trips" className="mt-4 inline-block rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-ink">
          Go to My Trips
        </Link>
      </div>
    </div>
  );
}
