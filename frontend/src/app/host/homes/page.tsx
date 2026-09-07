"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search, Check, Minus, X } from "lucide-react";
import { hostApi, destinationsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { getCurrentPosition } from "@/lib/geo";
import type { Destination, EarningsEstimate } from "@/lib/types";
import MapEmbed from "@/components/MapEmbed";

/**
 * /host/homes — Airbnb's "Airbnb it" landing page, the one a signed-out
 * visitor reaches from "Become a host": the earnings estimate with the nights
 * slider and the place picker, the Setup pitch, the AirCover comparison table
 * and the FAQ. Estimates come from the nightly rates of comparable homes we
 * actually list nearby.
 */
export default function HostHomesPage() {
  const { user } = useAuth();
  const { formatPrice } = useLocale();
  const [nights, setNights] = useState(7);
  const [bedrooms, setBedrooms] = useState(2);
  const [placeType, setPlaceType] = useState<"entire_home" | "private_room">("entire_home");
  const [place, setPlace] = useState<{ city: string; lat: number; lng: number } | null>(null);
  const [estimate, setEstimate] = useState<EarningsEstimate | null>(null);
  const [picker, setPicker] = useState(false);

  // First guess: wherever the visitor is; fall back to the busiest city.
  useEffect(() => {
    let cancelled = false;
    getCurrentPosition()
      .then((pos) => destinationsApi.nearest(pos.latitude, pos.longitude).then((n) => ({ city: n.city, lat: pos.latitude, lng: pos.longitude })))
      .catch(() => destinationsApi.search("", 1).then((d) => (d[0] ? { city: d[0].city, lat: d[0].latitude, lng: d[0].longitude } : null)))
      .then((p) => {
        if (!cancelled && p) setPlace(p);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!place) return;
    hostApi
      .estimate({ city: place.city, bedrooms, nights, property_type: placeType })
      .then(setEstimate)
      .catch(() => setEstimate(null));
  }, [place, bedrooms, nights, placeType]);

  const setupHref = user ? "/become-a-host" : "/login?next=/become-a-host";

  return (
    <div className="bg-white dark:bg-neutral-950">
      {/* ---------------- Hero: the estimate ---------------- */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-14 lg:grid-cols-2 lg:px-10 lg:py-20">
        <div className="text-center lg:text-left">
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-[3.5rem]">
            Your home could make{" "}
            <span className="whitespace-nowrap text-rausch">{estimate ? formatPrice(estimate.total, { decimals: 0 }) : "…"}</span> on airhome
          </h1>
          <p className="mt-6 text-lg text-hof dark:text-neutral-400">
            <span className="font-semibold text-ink dark:text-white">{nights} night{nights === 1 ? "" : "s"}</span> at an estimated{" "}
            <span className="font-semibold text-ink dark:text-white">{estimate ? formatPrice(estimate.nightly_rate, { decimals: 0 }) : "…"}</span> a night
          </p>
          <input
            type="range"
            min={1}
            max={30}
            value={nights}
            onChange={(e) => setNights(Number(e.target.value))}
            aria-label="Number of nights"
            className="mt-6 w-full max-w-md accent-rausch"
          />
          <p className="mt-4 text-sm text-hof dark:text-neutral-400">
            <button type="button" onClick={() => setPicker(true)} className="font-semibold text-ink underline dark:text-white">
              {estimate?.city || place?.city || "Your area"} · {placeType === "entire_home" ? "Entire place" : "Private room"} · {bedrooms === 0 ? "Studio" : `${bedrooms} bedroom${bedrooms === 1 ? "" : "s"}`}
            </button>
          </p>
          <p className="mt-2 text-xs text-hof dark:text-neutral-500">
            Estimated from the median nightly rate of {estimate?.sample_size ?? 0} comparable homes on airhome, less the 3% host fee. Actual earnings vary.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <Link href={setupHref} className="rounded-lg bg-rausch px-8 py-3.5 text-base font-semibold text-white transition hover:bg-rausch_dark">
              airhome Setup
            </Link>
            <Link href="/help" className="text-sm font-semibold underline">
              Learn how we estimate your earnings
            </Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border border-neutral-200 shadow-card dark:border-neutral-800">
          {place ? (
            <MapEmbed latitude={place.lat} longitude={place.lng} label={place.city} />
          ) : (
            <div className="grid aspect-[4/3] place-items-center text-hof">Finding homes near you…</div>
          )}
        </div>
      </section>

      {/* ---------------- Setup pitch ---------------- */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <h2 className="text-center text-3xl font-semibold sm:text-4xl">airhome it easily with airhome Setup</h2>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {[
            { emoji: "🤝", title: "One-to-one guidance from a Superhost", body: "We'll match you with an experienced host in your area who can help you get started." },
            { emoji: "⭐", title: "An experienced guest for your first booking", body: "For your first booking, you can choose to welcome an experienced guest who has at least three stays and a good track record." },
            { emoji: "🛟", title: "Specialised support from airhome", body: "New hosts get one-tap access to specially trained Community Support agents who can help with everything from account issues to billing." },
          ].map((c) => (
            <div key={c.title}>
              <span className="text-5xl" aria-hidden="true">
                {c.emoji}
              </span>
              <h3 className="mt-4 text-xl font-semibold">{c.title}</h3>
              <p className="mt-2 text-hof dark:text-neutral-400">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- AirCover table ---------------- */}
      <section className="bg-[#f7f7f7] py-16 dark:bg-neutral-900">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          <p className="text-center text-2xl font-bold text-rausch">airCover for Hosts</p>
          <h2 className="mt-3 text-center text-3xl font-semibold sm:text-4xl">airhome it with top-to-bottom protection</h2>
          <table className="mt-10 w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-300 dark:border-neutral-700">
                <th className="py-3 text-left font-normal" />
                <th className="py-3 text-center font-semibold text-rausch">airhome</th>
                <th className="py-3 text-center font-semibold">Competitors</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Guest identity verification", true, true],
                ["Reservation screening", true, false],
                ["$3M damage protection", true, false],
                ["$1M liability insurance", true, true],
                ["24-hour safety line", true, false],
              ].map(([label, a, b]) => (
                <tr key={String(label)} className="border-b border-neutral-200 dark:border-neutral-800">
                  <td className="py-4">{label}</td>
                  <td className="py-4 text-center">
                    {a ? <Check className="inline text-rausch" size={20} /> : <Minus className="inline text-hof" size={18} />}
                  </td>
                  <td className="py-4 text-center">{b ? <Check className="inline" size={20} /> : <Minus className="inline text-hof" size={18} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-hof dark:text-neutral-400">Comparison is based on public information and free offerings by top competitors as of 10/22.</p>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="mx-auto max-w-3xl px-6 py-16 lg:px-10">
        <h2 className="text-3xl font-semibold sm:text-4xl">Your questions, answered</h2>
        <div className="mt-8 divide-y divide-neutral-200 dark:divide-neutral-800">
          {[
            ["Is my place right for airhome?", "airhome guests are interested in all kinds of places. We have listings for tiny homes, cabins, treehouses and more. Even a spare room can be a great place to stay."],
            ["Do I have to host all the time?", "No – you control your calendar. You can host once a year, a few nights a month or more often."],
            ["How much should I interact with guests?", "It's up to you. Some hosts prefer to message guests only at key moments – like sending a short note when they check in – while others enjoy meeting their guests in person. You'll find a style that works for you and your guests."],
            ["Any tips on being a great airhome host?", "Getting the basics right is easy – provide a clean space, be responsive, and keep your listing accurate. Guests also love thoughtful touches like local recommendations."],
            ["What are airhome's fees?", "Most hosts pay a 3% service fee, deducted from each payout. Guests pay a separate service fee at checkout. Experiences and services carry a 20% host fee."],
            ["When do I get paid?", "Payouts are released about 24 hours after a guest's scheduled check-in, and appear under Earnings in your hosting dashboard."],
          ].map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-medium">
                {q}
                <ChevronDown className="transition group-open:rotate-180" size={20} />
              </summary>
              <p className="mt-3 text-hof dark:text-neutral-400">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-t border-neutral-200 py-14 text-center dark:border-neutral-800">
        <h2 className="text-2xl font-semibold">Still have questions?</h2>
        <p className="mt-2 text-hof dark:text-neutral-400">Get answers from experienced hosts, or start your listing now.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/help" className="rounded-lg border border-ink px-6 py-3 font-semibold dark:border-white">
            Ask a Superhost
          </Link>
          <Link href={setupHref} className="rounded-lg bg-rausch px-6 py-3 font-semibold text-white hover:bg-rausch_dark">
            airhome Setup
          </Link>
        </div>
      </section>

      {picker && (
        <PlacePicker
          bedrooms={bedrooms}
          placeType={placeType}
          onClose={() => setPicker(false)}
          onApply={(p) => {
            setBedrooms(p.bedrooms);
            setPlaceType(p.placeType);
            if (p.place) setPlace(p.place);
            setPicker(false);
          }}
        />
      )}
    </div>
  );
}

/** The "Where's your place?" sheet: search a city, pick type and bedrooms. */
function PlacePicker({
  bedrooms,
  placeType,
  onClose,
  onApply,
}: {
  bedrooms: number;
  placeType: "entire_home" | "private_room";
  onClose: () => void;
  onApply: (p: { bedrooms: number; placeType: "entire_home" | "private_room"; place: { city: string; lat: number; lng: number } | null }) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Destination[]>([]);
  const [chosen, setChosen] = useState<{ city: string; lat: number; lng: number } | null>(null);
  const [beds, setBeds] = useState(bedrooms);
  const [type, setType] = useState(placeType);

  useEffect(() => {
    const q = query.trim();
    if (!q) return setResults([]);
    const t = setTimeout(() => destinationsApi.search(q, 5).then(setResults).catch(() => setResults([])), 200);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tell us about your place</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-neutral-300 px-4 py-3 dark:border-neutral-700">
          <Search size={16} className="text-hof" />
          <input value={chosen ? chosen.city : query} onChange={(e) => { setChosen(null); setQuery(e.target.value); }} placeholder="Where's your place?" className="w-full bg-transparent text-sm outline-none" />
        </div>
        {results.length > 0 && !chosen && (
          <ul className="mt-2 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
            {results.map((d) => (
              <li key={`${d.kind}-${d.label}`}>
                <button type="button" onClick={() => { setChosen({ city: d.city, lat: d.latitude, lng: d.longitude }); setResults([]); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  {d.label} <span className="text-hof">· {d.sublabel}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 flex gap-2">
          {(["entire_home", "private_room"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} className={`rounded-full border px-4 py-2 text-sm ${type === t ? "border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink" : "border-neutral-300 dark:border-neutral-700"}`}>
              {t === "entire_home" ? "Entire place" : "Private room"}
            </button>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm">Bedrooms</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setBeds((b) => Math.max(0, b - 1))} className="grid h-8 w-8 place-items-center rounded-full border border-neutral-400">−</button>
            <span className="w-14 text-center text-sm">{beds === 0 ? "Studio" : beds}</span>
            <button type="button" onClick={() => setBeds((b) => Math.min(10, b + 1))} className="grid h-8 w-8 place-items-center rounded-full border border-neutral-400">+</button>
          </div>
        </div>
        <button type="button" onClick={() => onApply({ bedrooms: beds, placeType: type, place: chosen })} className="mt-6 w-full rounded-lg bg-ink py-3 font-semibold text-white dark:bg-white dark:text-ink">
          Update estimate
        </button>
      </div>
    </div>
  );
}
