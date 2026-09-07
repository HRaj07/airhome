"use client";

/**
 * Phase 1 of the listing wizard — "Tell us about your place": what the property
 * is, how much of it the guest gets, where it is and how many it sleeps.
 */
import { useEffect, useState } from "react";
import { Search, Navigation } from "lucide-react";
import { destinationsApi } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { getCurrentPosition } from "@/lib/geo";
import { PRIVACY_TYPES, STRUCTURE_TYPES } from "@/lib/hosting";
import type { Destination, PropertyType } from "@/lib/types";
import WizardShell, { Counter, PhaseIntro, StepHeading, Tile } from "../WizardShell";
import MapEmbed from "@/components/MapEmbed";
import { FIELD_CLASS, useStepNav, type StepProps } from "./common";


export function Intro(props: StepProps & { number: number; title: string; body: string; emoji: string }) {
  const nav = useStepNav(props, () => ({}));
  return (
    <WizardShell {...nav} nextLabel={props.number === 1 ? "Get started" : "Next"} wide>
      <PhaseIntro number={props.number} title={props.title} body={props.body} emoji={props.emoji} />
    </WizardShell>
  );
}

// ---------------------------------------------------------------------------
// Phase 1

export function Structure(props: StepProps) {
  const [value, setValue] = useState(props.listing.structure_type || "");
  const nav = useStepNav(props, () => ({ structure_type: value }), !!value);
  return (
    <WizardShell {...nav}>
      <StepHeading title="Which of these best describes your place?" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {STRUCTURE_TYPES.map((s) => (
          <Tile key={s.id} selected={value === s.id} onClick={() => setValue(s.id)} className="flex min-h-[96px] flex-col justify-between">
            <span className="text-3xl leading-none" aria-hidden="true">
              {s.emoji}
            </span>
            <span className="mt-3 text-sm font-medium">{s.label}</span>
          </Tile>
        ))}
      </div>
    </WizardShell>
  );
}

export function PrivacyType(props: StepProps) {
  const [value, setValue] = useState<PropertyType>(props.listing.property_type);
  const nav = useStepNav(props, () => ({ property_type: value }));
  return (
    <WizardShell {...nav}>
      <StepHeading title="What type of place will guests have?" />
      <div className="space-y-3">
        {PRIVACY_TYPES.map((p) => (
          <Tile key={p.id} selected={value === p.id} onClick={() => setValue(p.id)} className="flex w-full items-center justify-between gap-6 p-6">
            <span>
              <span className="block text-lg font-medium">{p.title}</span>
              <span className="mt-1 block text-sm text-hof dark:text-neutral-400">{p.body}</span>
            </span>
            <span className="text-4xl leading-none" aria-hidden="true">
              {p.emoji}
            </span>
          </Tile>
        ))}
      </div>
    </WizardShell>
  );
}

export function Location(props: StepProps) {
  const l = props.listing;
  const [chosen, setChosen] = useState(!!l.city);
  const [address, setAddress] = useState(l.address || "");
  const [neighborhood, setNeighborhood] = useState(l.neighborhood || "");
  const [city, setCity] = useState(l.city || "");
  const [state, setState] = useState(l.state || "");
  const [country, setCountry] = useState(l.country || "");
  const [lat, setLat] = useState(l.latitude || 0);
  const [lng, setLng] = useState(l.longitude || 0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Destination[]>([]);
  const [locating, setLocating] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      destinationsApi.search(q, 6).then(setResults).catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  function pick(d: Destination) {
    setCity(d.city);
    setCountry(d.country);
    setNeighborhood(d.kind === "neighborhood" ? d.label : "");
    setLat(d.latitude);
    setLng(d.longitude);
    setChosen(true);
    setResults([]);
    setQuery("");
  }

  async function useMyLocation() {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      const nearest = await destinationsApi.nearest(pos.latitude, pos.longitude);
      setCity(nearest.city);
      setCountry(nearest.country);
      setLat(pos.latitude);
      setLng(pos.longitude);
      setChosen(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't get your location", "error");
    } finally {
      setLocating(false);
    }
  }

  const nav = useStepNav(
    props,
    () => ({ address, neighborhood, city, state, country, latitude: lat, longitude: lng }),
    chosen && !!city.trim()
  );

  const field = "w-full rounded-lg border border-neutral-400 px-4 py-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900 dark:focus:border-white";

  return (
    <WizardShell {...nav}>
      {!chosen ? (
        <>
          <StepHeading title="Where's your place located?" subtitle="Your address is only shared with guests after they've made a reservation." />
          <div className="relative">
            <div className="flex items-center gap-3 rounded-full border border-neutral-400 bg-white px-5 py-4 shadow-sm dark:border-neutral-600 dark:bg-neutral-900">
              <Search size={18} className="shrink-0 text-hof" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your address"
                className="w-full bg-transparent text-base outline-none"
                autoFocus
              />
            </div>
            <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card dark:border-neutral-800 dark:bg-neutral-900">
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-neutral-100 disabled:opacity-60 dark:hover:bg-neutral-800"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <Navigation size={16} />
                </span>
                <span className="text-sm">{locating ? "Locating…" : "Use my current location"}</span>
              </button>
              {results.map((d) => (
                <button
                  key={`${d.kind}-${d.label}-${d.city}`}
                  type="button"
                  onClick={() => pick(d)}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <Search size={16} />
                  </span>
                  <span>
                    <span className="block text-sm">{d.label}</span>
                    <span className="block text-xs text-hof dark:text-neutral-400">{d.sublabel}</span>
                  </span>
                </button>
              ))}
              {query.trim() && results.length === 0 && (
                <p className="px-4 py-5 text-center text-sm text-hof dark:text-neutral-400">No matching places — try the nearest city.</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <StepHeading title="Confirm your address" subtitle="Your address is only shared with guests after they've made a reservation." />
          <div className="space-y-3">
            <input className={field} placeholder="Street address" value={address} onChange={(e) => setAddress(e.target.value)} />
            <input className={field} placeholder="Flat, floor, building (if applicable)" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
            <input className={field} placeholder="City / town" value={city} onChange={(e) => setCity(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <input className={field} placeholder="State / province" value={state} onChange={(e) => setState(e.target.value)} />
              <input className={field} placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>
          <button type="button" onClick={() => setChosen(false)} className="mt-4 text-sm font-semibold underline">
            Search for a different location
          </button>
          {lat !== 0 && lng !== 0 && (
            <div className="mt-8 overflow-hidden rounded-2xl">
              <MapEmbed latitude={lat} longitude={lng} label={city} />
              <p className="mt-2 text-xs text-hof dark:text-neutral-400">
                We&apos;ll show the general area to guests. Your exact address is shared after booking.
              </p>
            </div>
          )}
        </>
      )}
    </WizardShell>
  );
}

export function FloorPlan(props: StepProps) {
  const l = props.listing;
  const [guests, setGuests] = useState(l.max_guests || 4);
  const [bedrooms, setBedrooms] = useState(l.bedrooms ?? 1);
  const [beds, setBeds] = useState(l.beds || 1);
  const [bathrooms, setBathrooms] = useState(l.bathrooms || 1);
  const nav = useStepNav(props, () => ({ max_guests: guests, bedrooms, beds, bathrooms }));
  return (
    <WizardShell {...nav}>
      <StepHeading title="Share some basics about your place" subtitle="You'll add more details later, such as bed types." />
      <Counter label="Guests" value={guests} min={1} max={16} onChange={setGuests} />
      <Counter label="Bedrooms" value={bedrooms} min={0} max={50} onChange={setBedrooms} format={(v) => (v === 0 ? "Studio" : String(v))} />
      <Counter label="Beds" value={beds} min={1} max={50} onChange={setBeds} />
      <Counter label="Bathrooms" value={bathrooms} min={0.5} max={50} step={0.5} onChange={setBathrooms} />
    </WizardShell>
  );
}

// ---------------------------------------------------------------------------
// Phase 2
