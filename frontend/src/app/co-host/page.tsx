"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Star, MapPin, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";

interface CoHost {
  id: number;
  name: string;
  city: string;
  rating: number;
  reviews: number;
  listingsManaged: number;
  services: string[];
  bio: string;
}

const CO_HOSTS: CoHost[] = [
  { id: 1, name: "Priya Nair", city: "New York", rating: 4.97, reviews: 212, listingsManaged: 14, services: ["Guest messaging", "Cleaning & turnover", "Pricing"], bio: "Ex-hotel manager. I handle everything from check-in to five-star reviews." },
  { id: 2, name: "Lucas Moreau", city: "Paris", rating: 4.92, reviews: 168, listingsManaged: 9, services: ["Guest messaging", "Listing setup", "Photography"], bio: "I've helped 40+ Parisian hosts launch listings that book out within a week." },
  { id: 3, name: "Hana Sato", city: "Tokyo", rating: 4.99, reviews: 301, listingsManaged: 21, services: ["Cleaning & turnover", "Restocking", "Maintenance"], bio: "Meticulous turnovers and a trusted network of local tradespeople." },
  { id: 4, name: "Olivia Bennett", city: "London", rating: 4.9, reviews: 143, listingsManaged: 11, services: ["Guest messaging", "Pricing", "Listing setup"], bio: "Dynamic pricing nerd. Average revenue uplift for my hosts: 23%." },
  { id: 5, name: "Marc Vidal", city: "Barcelona", rating: 4.88, reviews: 97, listingsManaged: 6, services: ["Guest messaging", "Cleaning & turnover"], bio: "Bilingual, on call 7 days a week for guests and emergencies." },
  { id: 6, name: "Kadek Putra", city: "Bali", rating: 4.95, reviews: 184, listingsManaged: 17, services: ["Full management", "Maintenance", "Pool & garden"], bio: "Full-service villa management across Canggu, Ubud and Seminyak." },
  { id: 7, name: "Inês Ferreira", city: "Lisbon", rating: 4.93, reviews: 120, listingsManaged: 8, services: ["Listing setup", "Photography", "Guest messaging"], bio: "Interior stylist turned co-host — I make listings look and feel premium." },
  { id: 8, name: "Diego Ramirez", city: "Los Angeles", rating: 4.91, reviews: 156, listingsManaged: 12, services: ["Full management", "Pricing"], bio: "I run stays like a boutique hotel: consistent, reviewed, profitable." },
];

const CITIES = ["All cities", ...Array.from(new Set(CO_HOSTS.map((c) => c.city)))];

export default function CoHostPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [city, setCity] = useState("All cities");
  const [requested, setRequested] = useState<number[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("airbnb_cohost_requests");
      if (stored) setRequested(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  function request(coHost: CoHost) {
    if (!user) {
      showToast("Log in to contact a co-host", "info");
      return;
    }
    const next = requested.includes(coHost.id) ? requested : [...requested, coHost.id];
    setRequested(next);
    try {
      window.localStorage.setItem("airbnb_cohost_requests", JSON.stringify(next));
    } catch {
      // ignore
    }
    showToast(`Request sent to ${coHost.name} — they usually reply within a day`, "success");
  }

  const visible = CO_HOSTS.filter((c) => city === "All cities" || c.city === city);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-semibold">Find a co-host</h1>
      <p className="mt-2 max-w-2xl text-hof dark:text-neutral-400">
        Experienced local co-hosts can set up your listing, message guests, manage cleaning and turnovers, and optimise pricing — so you can host without the day-to-day.
      </p>

      <div className="scrollbar-none mt-6 flex gap-2 overflow-x-auto">
        {CITIES.map((c) => (
          <button
            key={c}
            onClick={() => setCity(c)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
              city === c ? "border-ink bg-neutral-100 font-semibold dark:border-white dark:bg-neutral-800" : "border-neutral-300 hover:border-ink dark:border-neutral-600"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visible.map((c) => {
          const sent = requested.includes(c.id);
          return (
            <div key={c.id} className="flex gap-4 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <Image src={`https://i.pravatar.cc/150?u=cohost-${c.id}`} alt={c.name} fill sizes="64px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="flex items-center gap-1 text-sm text-hof dark:text-neutral-400">
                      <MapPin size={12} /> {c.city} · {c.listingsManaged} listings managed
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-sm">
                    <Star size={13} className="fill-current" /> {c.rating.toFixed(2)} <span className="text-hof dark:text-neutral-400">({c.reviews})</span>
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink dark:text-neutral-200">{c.bio}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.services.map((s) => (
                    <span key={s} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs dark:bg-neutral-800">
                      {s}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => request(c)}
                  disabled={sent}
                  className={`mt-3 flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold ${
                    sent ? "bg-neutral-100 text-hof dark:bg-neutral-800" : "bg-ink text-white dark:bg-white dark:text-ink"
                  }`}
                >
                  {sent ? (
                    <>
                      <Check size={14} /> Request sent
                    </>
                  ) : (
                    "Request an intro"
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
