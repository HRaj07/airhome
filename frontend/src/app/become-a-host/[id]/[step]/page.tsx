"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Search, Navigation, X, Star, Check, ChevronDown, Pencil, Camera, Plus } from "lucide-react";
import { amenitiesApi, destinationsApi, listingsApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useLocale } from "@/lib/locale-context";
import { getCurrentPosition } from "@/lib/geo";
import {
  DESCRIPTION_MAX,
  GUEST_FAVOURITES,
  GUEST_FEE_PCT,
  HIGHLIGHTS,
  HOST_FEE_PCT,
  PRIVACY_TYPES,
  SAFETY_AMENITIES,
  SAMPLE_PHOTOS,
  STANDOUT_AMENITIES,
  STRUCTURE_TYPES,
  TITLE_MAX,
  isWizardStep,
  nextStep,
  prevStep,
  publishProblems,
  structureLabel,
  wizardHref,
  type WizardStep,
} from "@/lib/hosting";
import type { Amenity, Destination, ListingDetail, ListingDraftUpdate, PropertyType } from "@/lib/types";
import WizardShell, { Counter, PhaseIntro, StepHeading, Tile } from "@/components/hosting/WizardShell";
import AmenityIcon from "@/components/AmenityIcon";
import MapEmbed from "@/components/MapEmbed";

/**
 * /become-a-host/[id]/[step] — Airbnb's listing wizard, one URL per step.
 *
 * The draft lives on the server from the first click, so every step saves its
 * own fields with PATCH /listings/{id}/draft along with the step to resume at.
 * Refresh, close the tab, come back next week: the listing opens where you
 * left it. The extra "published" route is the celebration screen.
 */
export default function BecomeAHostStepPage() {
  const params = useParams<{ id: string; step: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const id = params.id;
  const stepParam = params.step;

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace(`/login?next=/become-a-host/${id}/${stepParam}`);
  }, [authLoading, user, router, id, stepParam]);

  useEffect(() => {
    if (!user) return;
    listingsApi
      .get(id)
      .then(setListing)
      .catch((e: unknown) => setError(e instanceof ApiError && e.status === 404 ? "We couldn't find that listing." : "Couldn't load your listing."));
  }, [id, user]);

  const step: WizardStep | "published" | null = stepParam === "published" ? "published" : isWizardStep(stepParam) ? stepParam : null;

  /** Save this step's fields and move to `to` (or stay, for Save & exit). */
  const save = useCallback(
    async (patch: ListingDraftUpdate, to: WizardStep | "exit" | "published" | null) => {
      if (!listing) return;
      setSaving(true);
      try {
        const nextWizardStep = to && to !== "exit" && to !== "published" ? to : undefined;
        const body: ListingDraftUpdate = { ...patch };
        if (nextWizardStep && listing.status === "draft") body.wizard_step = nextWizardStep;
        const hasChanges = Object.keys(body).length > 0;
        const updated = hasChanges ? await listingsApi.updateDraft(listing.id, body) : listing;
        setListing(updated);
        if (to === "exit") router.push("/hosting/listings");
        else if (to === "published") router.push(`/become-a-host/${listing.id}/published`);
        else if (to) router.push(wizardHref(listing.id, to));
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Couldn't save that step", "error");
      } finally {
        setSaving(false);
      }
    },
    [listing, router, showToast]
  );

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">{error}</h1>
        <Link href="/hosting/listings" className="mt-6 inline-block rounded-lg bg-ink px-6 py-3 font-semibold text-white dark:bg-white dark:text-ink">
          Go to your listings
        </Link>
      </div>
    );
  }
  if (!step) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">That step doesn&apos;t exist.</h1>
        <Link href={wizardHref(id, "about-your-place")} className="mt-6 inline-block underline">
          Start from the beginning
        </Link>
      </div>
    );
  }
  if (!listing || authLoading) {
    return <div className="grid min-h-screen place-items-center text-hof">Loading your listing…</div>;
  }

  if (step === "published") return <Published listing={listing} />;

  const common = {
    listing,
    saving,
    onSave: save,
    step,
  };

  switch (step) {
    case "about-your-place":
      return (
        <Intro
          {...common}
          number={1}
          title="Tell us about your place"
          body="In this step, we'll ask you which type of property you have and if guests will book the entire place or just a room. Then let us know the location and how many guests can stay."
          emoji="🏠"
        />
      );
    case "structure":
      return <Structure {...common} />;
    case "privacy-type":
      return <PrivacyType {...common} />;
    case "location":
      return <Location {...common} />;
    case "floor-plan":
      return <FloorPlan {...common} />;
    case "stand-out":
      return (
        <Intro
          {...common}
          number={2}
          title="Make your place stand out"
          body="In this step, you'll add some of the amenities your place offers, plus 5 or more photos. Then you'll create a title and description."
          emoji="🛋️"
        />
      );
    case "amenities":
      return <Amenities {...common} />;
    case "photos":
      return <Photos {...common} />;
    case "title":
      return <Title {...common} />;
    case "description":
      return <Description {...common} />;
    case "finish-setup":
      return (
        <Intro
          {...common}
          number={3}
          title="Finish up and publish"
          body="Finally, you'll choose booking settings, set up pricing and publish your listing."
          emoji="🎉"
        />
      );
    case "booking-settings":
      return <BookingSettings {...common} />;
    case "visibility":
      return <Visibility {...common} />;
    case "price":
      return <Price {...common} weekend={false} />;
    case "weekend-price":
      return <Price {...common} weekend />;
    case "discounts":
      return <Discounts {...common} />;
    case "legal":
      return <Legal {...common} />;
    case "receipt":
      return <Receipt {...common} />;
  }
}

// ---------------------------------------------------------------------------
// Shared step plumbing

interface StepProps {
  listing: ListingDetail;
  saving: boolean;
  step: WizardStep;
  onSave: (patch: ListingDraftUpdate, to: WizardStep | "exit" | "published" | null) => Promise<void>;
}

/** Wires a step's local patch into the shell's Back / Next / Save & exit. */
function useStepNav(props: StepProps, patch: () => ListingDraftUpdate, canProceed = true) {
  const { step, onSave, saving } = props;
  const back = prevStep(step);
  const next = nextStep(step);
  return {
    step,
    saving,
    onBack: back ? () => onSave(patch(), back) : undefined,
    onNext: next ? () => onSave(patch(), next) : undefined,
    onSaveAndExit: () => onSave(patch(), "exit"),
    nextDisabled: !canProceed,
  };
}

function Intro(props: StepProps & { number: number; title: string; body: string; emoji: string }) {
  const nav = useStepNav(props, () => ({}));
  return (
    <WizardShell {...nav} nextLabel={props.number === 1 ? "Get started" : "Next"} wide>
      <PhaseIntro number={props.number} title={props.title} body={props.body} emoji={props.emoji} />
    </WizardShell>
  );
}

// ---------------------------------------------------------------------------
// Phase 1

function Structure(props: StepProps) {
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

function PrivacyType(props: StepProps) {
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

function Location(props: StepProps) {
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

function FloorPlan(props: StepProps) {
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

function Amenities(props: StepProps) {
  const [all, setAll] = useState<Amenity[]>([]);
  const [selected, setSelected] = useState<number[]>(props.listing.amenities.map((a) => a.id));
  useEffect(() => {
    amenitiesApi.list().then(setAll).catch(() => setAll([]));
  }, []);
  const nav = useStepNav(props, () => ({ amenity_ids: selected }));

  function toggle(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  const byName = useMemo(() => new Map(all.map((a) => [a.name, a])), [all]);
  const groups: { title: string; names: string[] }[] = [
    { title: "What about these guest favourites?", names: GUEST_FAVOURITES },
    { title: "Do you have any standout amenities?", names: STANDOUT_AMENITIES },
    { title: "Do you have any of these safety items?", names: SAFETY_AMENITIES },
  ];
  const grouped = new Set(groups.flatMap((g) => g.names));
  const rest = all.filter((a) => !grouped.has(a.name));

  return (
    <WizardShell {...nav}>
      <StepHeading title="Tell guests what your place has to offer" subtitle="You can add more amenities after you publish your listing." />
      {groups.map((g) => {
        const items = g.names.map((n) => byName.get(n)).filter((a): a is Amenity => !!a);
        if (!items.length) return null;
        return (
          <section key={g.title} className="mb-8">
            <h2 className="mb-3 text-lg font-medium">{g.title}</h2>
            <AmenityGrid items={items} selected={selected} toggle={toggle} />
          </section>
        );
      })}
      {rest.length > 0 && (
        <details className="mb-8">
          <summary className="cursor-pointer text-base font-semibold underline">Show more amenities</summary>
          <div className="mt-4">
            <AmenityGrid items={rest} selected={selected} toggle={toggle} />
          </div>
        </details>
      )}
    </WizardShell>
  );
}

function AmenityGrid({ items, selected, toggle }: { items: Amenity[]; selected: number[]; toggle: (id: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((a) => (
        <Tile key={a.id} selected={selected.includes(a.id)} onClick={() => toggle(a.id)} className="flex min-h-[96px] flex-col justify-between">
          <AmenityIcon icon={a.icon} size={28} />
          <span className="mt-3 text-sm font-medium">{a.name}</span>
        </Tile>
      ))}
    </div>
  );
}

function Photos(props: StepProps) {
  const [urls, setUrls] = useState<string[]>(props.listing.photos.map((p) => p.url));
  const [draft, setDraft] = useState("");
  const [modal, setModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nav = useStepNav(props, () => ({ photo_urls: urls }), urls.length >= 5);

  function add(url: string) {
    const u = url.trim();
    if (!u || urls.includes(u)) return;
    setUrls((s) => [...s, u]);
    setDraft("");
  }
  function move(from: number, to: number) {
    setUrls((s) => {
      const copy = [...s];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  }

  return (
    <WizardShell {...nav}>
      {urls.length === 0 ? (
        <>
          <StepHeading title={`Add some photos of your ${structureLabel(props.listing.structure_type).toLowerCase()}`} subtitle="You'll need 5 photos to get started. You can add more or make changes later." />
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-400 bg-neutral-50 px-6 py-20 text-center dark:border-neutral-600 dark:bg-neutral-900">
            <Camera size={64} strokeWidth={1} className="mb-6" />
            <p className="text-lg font-medium">Drag your photos here</p>
            <p className="mt-1 text-sm text-hof dark:text-neutral-400">Choose at least 5 photos</p>
            <button type="button" onClick={() => setModal(true)} className="mt-6 text-sm font-semibold underline">
              Add photos
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-6 flex items-start justify-between gap-4">
            <StepHeading title="Ta-da! How does this look?" subtitle="Drag to reorder — the first photo is your cover." />
            <button
              type="button"
              onClick={() => setModal(true)}
              aria-label="Add more photos"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {urls.map((u, i) => (
              <div key={u} className={`group relative overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800 ${i === 0 ? "col-span-2 aspect-[16/10]" : "aspect-[4/3]"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute left-3 top-3 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-ink shadow">Cover photo</span>}
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                  {i > 0 && (
                    <button type="button" onClick={() => move(i, 0)} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink shadow" title="Make cover">
                      Make cover
                    </button>
                  )}
                  <button type="button" onClick={() => setUrls((s) => s.filter((x) => x !== u))} aria-label="Remove photo" className="grid h-7 w-7 place-items-center rounded-full bg-white text-ink shadow">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-hof dark:text-neutral-400">
            {urls.length < 5 ? `${5 - urls.length} more photo${5 - urls.length === 1 ? "" : "s"} needed` : `${urls.length} photos`}
          </p>
        </>
      )}

      {modal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={() => setModal(false)}>
          <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Upload photos</h2>
              <button type="button" onClick={() => setModal(false)} aria-label="Close" className="rounded-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <X size={18} />
              </button>
            </div>
            <label className="block text-sm font-medium">Paste an image URL</label>
            <div className="mt-2 flex gap-2">
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") add(draft);
                }}
                placeholder="https://…"
                className="w-full rounded-lg border border-neutral-400 px-4 py-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-800"
              />
              <button type="button" onClick={() => add(draft)} className="rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-ink">
                Add
              </button>
            </div>
            <p className="mt-6 text-sm font-medium">Or pick from sample photos</p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {SAMPLE_PHOTOS.map((p) => {
                const used = urls.includes(p.url);
                return (
                  <button key={p.url} type="button" disabled={used} onClick={() => add(p.url)} className="relative aspect-square overflow-hidden rounded-lg disabled:opacity-40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.label} className="h-full w-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-0.5 text-[11px] text-white">{p.label}</span>
                    {used && (
                      <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-white text-ink">
                        <Check size={12} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setModal(false)} className="rounded-lg bg-ink px-6 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-ink">
                Done ({urls.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </WizardShell>
  );
}

function Title(props: StepProps) {
  const [value, setValue] = useState(props.listing.title || "");
  const nav = useStepNav(props, () => ({ title: value.trim() }), value.trim().length > 0);
  return (
    <WizardShell {...nav}>
      <StepHeading title="Now, let's give your place a title" subtitle="Short titles work best. Have fun with it – you can always change it later." />
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, TITLE_MAX))}
        rows={3}
        autoFocus
        className="w-full resize-none rounded-lg border border-neutral-400 p-4 text-xl outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900 dark:focus:border-white"
      />
      <p className="mt-2 text-sm text-hof dark:text-neutral-400">
        {value.length}/{TITLE_MAX}
      </p>
    </WizardShell>
  );
}

function Description(props: StepProps) {
  const l = props.listing;
  const [hl, setHl] = useState<string[]>(l.host_highlights || []);
  const [value, setValue] = useState(l.description || "");
  const [phase, setPhase] = useState<"highlights" | "text">(l.description ? "text" : "highlights");
  const nav = useStepNav(props, () => ({ host_highlights: hl, description: value.trim() }), phase === "text" ? value.trim().length > 0 : true);

  // Airbnb prefills a sentence from the highlights you picked.
  function goToText() {
    if (!value.trim()) {
      const words = hl.map((h) => HIGHLIGHTS.find((x) => x.id === h)?.label.toLowerCase()).filter(Boolean);
      const lead = words.length ? `A ${words.join(" and ")} place to stay. ` : "";
      setValue(`${lead}You'll have a great time at this comfortable place to stay.`);
    }
    setPhase("text");
  }

  if (phase === "highlights") {
    return (
      <WizardShell {...nav} onNext={goToText}>
        <StepHeading title={`Next, let's describe your ${structureLabel(l.structure_type).toLowerCase()}`} subtitle="Choose up to 2 highlights. We'll use these to get your description started." />
        <div className="flex flex-wrap gap-3">
          {HIGHLIGHTS.map((h) => {
            const on = hl.includes(h.id);
            return (
              <button
                key={h.id}
                type="button"
                aria-pressed={on}
                onClick={() => setHl((s) => (on ? s.filter((x) => x !== h.id) : s.length < 2 ? [...s, h.id] : s))}
                className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                  on ? "border-2 border-ink bg-neutral-50 dark:border-white dark:bg-neutral-800" : "border-neutral-300 hover:border-ink dark:border-neutral-700 dark:hover:border-white"
                }`}
              >
                <span aria-hidden="true">{h.emoji}</span> {h.label}
              </button>
            );
          })}
        </div>
      </WizardShell>
    );
  }

  return (
    <WizardShell {...nav} onBack={() => setPhase("highlights")}>
      <StepHeading title="Create your description" subtitle="Share what makes your place special." />
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, DESCRIPTION_MAX))}
        rows={8}
        autoFocus
        className="w-full resize-none rounded-lg border border-neutral-400 p-4 text-lg leading-relaxed outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900 dark:focus:border-white"
      />
      <p className="mt-2 text-sm text-hof dark:text-neutral-400">
        {value.length}/{DESCRIPTION_MAX}
      </p>
    </WizardShell>
  );
}

// ---------------------------------------------------------------------------
// Phase 3

function BookingSettings(props: StepProps) {
  const [instant, setInstant] = useState(props.listing.instant_book);
  const nav = useStepNav(props, () => ({ instant_book: instant }));
  const options = [
    { id: false, title: "Approve your first 5 bookings", body: "Start by reviewing reservation requests, then switch to Instant Book, so guests can book automatically.", emoji: "💬", tag: "Recommended" },
    { id: true, title: "Use Instant Book", body: "Let guests book automatically.", emoji: "⚡", tag: "" },
  ];
  return (
    <WizardShell {...nav}>
      <StepHeading title="Decide how you'll confirm bookings" />
      <div className="space-y-3">
        {options.map((o) => (
          <Tile key={String(o.id)} selected={instant === o.id} onClick={() => setInstant(o.id)} className="flex w-full items-center justify-between gap-6 p-6">
            <span>
              {o.tag && <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-hof">{o.tag}</span>}
              <span className="block text-lg font-medium">{o.title}</span>
              <span className="mt-1 block text-sm text-hof dark:text-neutral-400">{o.body}</span>
            </span>
            <span className="text-4xl leading-none" aria-hidden="true">
              {o.emoji}
            </span>
          </Tile>
        ))}
      </div>
    </WizardShell>
  );
}

function Visibility(props: StepProps) {
  const [value, setValue] = useState<"any" | "experienced">(props.listing.guest_visibility || "any");
  const nav = useStepNav(props, () => ({ guest_visibility: value }));
  return (
    <WizardShell {...nav}>
      <StepHeading title="Choose who to welcome for your first reservation" subtitle="After your first guest, anyone can book your place." />
      <div className="space-y-3">
        <label className={`flex cursor-pointer items-start gap-4 rounded-xl border p-5 ${value === "any" ? "border-2 border-ink dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`}>
          <input type="radio" name="visibility" checked={value === "any"} onChange={() => setValue("any")} className="mt-1.5 h-4 w-4 accent-ink" />
          <span>
            <span className="block text-lg font-medium">Any airhome guest</span>
            <span className="mt-1 block text-sm text-hof dark:text-neutral-400">Get reservations faster when you welcome anyone from the airhome community.</span>
          </span>
        </label>
        <label className={`flex cursor-pointer items-start gap-4 rounded-xl border p-5 ${value === "experienced" ? "border-2 border-ink dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`}>
          <input type="radio" name="visibility" checked={value === "experienced"} onChange={() => setValue("experienced")} className="mt-1.5 h-4 w-4 accent-ink" />
          <span>
            <span className="block text-lg font-medium">An experienced guest</span>
            <span className="mt-1 block text-sm text-hof dark:text-neutral-400">For your first guest, welcome someone with a good track record on airhome who can offer tips for how to be a great host.</span>
          </span>
        </label>
      </div>
    </WizardShell>
  );
}

/** The big editable number Airbnb uses for the weekday and weekend prices. */
function Price(props: StepProps & { weekend: boolean }) {
  const { currency, formatPrice } = useLocale();
  const l = props.listing;
  const rate = currency.rate || 1;
  const base = props.weekend ? l.weekend_price ?? l.price_per_night : l.price_per_night;
  // Edit in the viewer's currency, store in USD like every other price.
  const [local, setLocal] = useState<string>(base ? String(Math.round(base * rate)) : props.weekend ? "" : "");
  const [editing, setEditing] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const localNum = Number(local.replace(/[^\d.]/g, "")) || 0;
  const usd = localNum / rate;
  const guestPrice = usd * (1 + GUEST_FEE_PCT);
  const youEarn = usd * (1 - HOST_FEE_PCT);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const patch = (): ListingDraftUpdate =>
    props.weekend ? (localNum > 0 ? { weekend_price: +usd.toFixed(2) } : { clear_weekend_price: true }) : { price_per_night: +usd.toFixed(2) };
  const nav = useStepNav(props, patch, props.weekend ? true : localNum > 0);

  const suggested = l.price_per_night ? Math.round(l.price_per_night * (props.weekend ? 1.15 : 1) * rate) : 0;
  const fontSize = local.length > 6 ? "text-5xl" : local.length > 4 ? "text-6xl" : "text-8xl";

  return (
    <WizardShell {...nav}>
      <StepHeading
        title={props.weekend ? "Set a weekend base price" : "Now, set a weekday base price"}
        subtitle={props.weekend ? "Add a price for Friday and Saturday nights — or leave it the same as weekdays." : "Tip: Prices go up during peak times. You can change it anytime."}
      />
      <div className="flex flex-col items-center py-6">
        <div className="flex items-center justify-center gap-2">
          {editing ? (
            <>
              <span className={`${fontSize} font-bold leading-none`}>{currency.symbol}</span>
              <input
                ref={inputRef}
                inputMode="numeric"
                value={local}
                onChange={(e) => setLocal(e.target.value.replace(/[^\d]/g, "").slice(0, 8))}
                onBlur={() => setEditing(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setEditing(false);
                }}
                className={`${fontSize} w-[6ch] border-b-2 border-ink bg-transparent text-center font-bold leading-none outline-none dark:border-white`}
                aria-label="Nightly price"
              />
            </>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-3 rounded-xl px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900" aria-label="Edit price">
              <span className={`${fontSize} font-bold leading-none tabular-nums`}>
                {localNum > 0 ? formatPrice(usd, { decimals: 0 }) : `${currency.symbol}0`}
              </span>
              <span className="grid h-8 w-8 place-items-center rounded-full border border-neutral-300 dark:border-neutral-700">
                <Pencil size={14} />
              </span>
            </button>
          )}
        </div>

        {!showBreakdown ? (
          <button type="button" onClick={() => setShowBreakdown(true)} className="mt-6 flex items-center gap-1 text-base text-hof underline-offset-2 hover:underline dark:text-neutral-400">
            Guest price before taxes {formatPrice(guestPrice, { decimals: 0 })} <ChevronDown size={16} />
          </button>
        ) : (
          <div className="mt-6 w-full max-w-sm rounded-2xl border border-neutral-300 p-5 text-sm dark:border-neutral-700">
            <div className="flex justify-between py-1.5">
              <span>Base price</span>
              <span>{formatPrice(usd, { decimals: 0 })}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span>Guest service fee</span>
              <span>{formatPrice(usd * GUEST_FEE_PCT, { decimals: 0 })}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-200 py-2.5 font-semibold dark:border-neutral-800">
              <span>Guest price before taxes</span>
              <span>{formatPrice(guestPrice, { decimals: 0 })}</span>
            </div>
            <div className="mt-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900">
              <div className="flex justify-between">
                <span>You earn</span>
                <span className="font-semibold">{formatPrice(youEarn, { decimals: 0 })}</span>
              </div>
              <p className="mt-1 text-xs text-hof dark:text-neutral-400">After the {Math.round(HOST_FEE_PCT * 100)}% host service fee.</p>
            </div>
            <button type="button" onClick={() => setShowBreakdown(false)} className="mt-3 text-sm underline">
              Show less
            </button>
          </div>
        )}

        {suggested > 0 && props.weekend && (
          <button type="button" onClick={() => setLocal(String(suggested))} className="mt-8 rounded-full border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
            Suggested: {currency.symbol}
            {suggested.toLocaleString()} (+15%)
          </button>
        )}
        {props.weekend && (
          <button type="button" onClick={() => setLocal("")} className="mt-3 text-sm underline">
            Same as weekday price
          </button>
        )}
      </div>
    </WizardShell>
  );
}

function Discounts(props: StepProps) {
  const l = props.listing;
  const [newListing, setNewListing] = useState(l.new_listing_discount > 0);
  const [weekly, setWeekly] = useState(l.weekly_discount > 0);
  const [monthly, setMonthly] = useState(l.monthly_discount > 0);
  const nav = useStepNav(props, () => ({
    new_listing_discount: newListing ? 0.2 : 0,
    weekly_discount: weekly ? 0.1 : 0,
    monthly_discount: monthly ? 0.2 : 0,
  }));
  const rows = [
    { pct: "20%", title: "New listing promotion", body: "Offer 20% off your first 3 bookings", on: newListing, set: setNewListing },
    { pct: "10%", title: "Weekly discount", body: "For stays of 7 nights or more", on: weekly, set: setWeekly },
    { pct: "20%", title: "Monthly discount", body: "For stays of 28 nights or more", on: monthly, set: setMonthly },
  ];
  return (
    <WizardShell {...nav}>
      <StepHeading title="Add discounts" subtitle="Help your place stand out to get booked faster and earn your first reviews." />
      <div className="space-y-3">
        {rows.map((r) => (
          <label key={r.title} className={`flex cursor-pointer items-center gap-5 rounded-xl border p-5 ${r.on ? "border-2 border-ink dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`}>
            <span className="rounded-lg bg-neutral-100 px-3 py-2 text-lg font-semibold dark:bg-neutral-800">{r.pct}</span>
            <span className="flex-1">
              <span className="block font-medium">{r.title}</span>
              <span className="block text-sm text-hof dark:text-neutral-400">{r.body}</span>
            </span>
            <input type="checkbox" checked={r.on} onChange={(e) => r.set(e.target.checked)} className="h-6 w-6 accent-ink" />
          </label>
        ))}
      </div>
    </WizardShell>
  );
}

function Legal(props: StepProps) {
  const l = props.listing;
  const [camera, setCamera] = useState(l.has_exterior_camera);
  const [noise, setNoise] = useState(l.has_noise_monitor);
  const [weapons, setWeapons] = useState(l.has_weapons);
  const nav = useStepNav(props, () => ({ has_exterior_camera: camera, has_noise_monitor: noise, has_weapons: weapons }));
  const rows = [
    { label: "Exterior security camera present", on: camera, set: setCamera },
    { label: "Noise decibel monitor present", on: noise, set: setNoise },
    { label: "Weapon(s) on the property", on: weapons, set: setWeapons },
  ];
  return (
    <WizardShell {...nav}>
      <StepHeading title="Share safety details" subtitle="Does your place have any of these?" />
      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {rows.map((r) => (
          <label key={r.label} className="flex cursor-pointer items-center justify-between py-5">
            <span className="text-base">{r.label}</span>
            <input type="checkbox" checked={r.on} onChange={(e) => r.set(e.target.checked)} className="h-6 w-6 accent-ink" />
          </label>
        ))}
      </div>
      <div className="mt-8 border-t border-neutral-200 pt-6 text-sm text-hof dark:border-neutral-800 dark:text-neutral-400">
        <p className="font-semibold text-ink dark:text-white">Important things to know</p>
        <p className="mt-2">
          Security cameras that monitor indoor spaces are not allowed even if they&apos;re turned off. All exterior security cameras must be disclosed.
        </p>
        <p className="mt-2">Be sure to comply with your local laws and review airhome&apos;s anti-discrimination policy and guest and host fees.</p>
      </div>
    </WizardShell>
  );
}

function Receipt(props: StepProps) {
  const l = props.listing;
  const { formatPrice } = useLocale();
  const { showToast } = useToast();
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const problems = publishProblems(l);
  const back = prevStep(props.step);
  const isLive = l.status === "published";

  async function publish() {
    setPublishing(true);
    try {
      await listingsApi.publish(l.id);
      router.push(`/become-a-host/${l.id}/published`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't publish", "error");
      setPublishing(false);
    }
  }

  const cover = l.photos[0]?.url;
  const next = [
    { emoji: "📅", title: "Set up your calendar", body: "Choose which dates your listing is available. It will be visible 24 hours after you publish." },
    { emoji: "⚙️", title: "Adjust your settings", body: "Set house rules, select a cancellation policy, choose how guests book and more." },
    { emoji: "✅", title: "Confirm a few details and publish", body: "We'll let you know if you need to verify your identity or register with the local government." },
  ];

  return (
    <WizardShell
      step={props.step}
      saving={publishing}
      onBack={back ? () => props.onSave({}, back) : undefined}
      onNext={isLive ? () => router.push("/hosting/listings") : publish}
      nextLabel={isLive ? "Done" : "Publish"}
      nextDisabled={problems.length > 0}
      onSaveAndExit={() => props.onSave({}, "exit")}
      wide
    >
      <StepHeading title="Review your listing" subtitle="Here's what we'll show to guests. Make sure everything looks good." />
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="mx-auto w-full max-w-sm">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card dark:border-neutral-800 dark:bg-neutral-900">
            <div className="aspect-square bg-neutral-100 dark:bg-neutral-800">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-hof">No photo yet</div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium leading-snug">{l.title || "Untitled listing"}</p>
                <span className="flex items-center gap-1 text-sm">
                  <Star size={12} fill="currentColor" /> New
                </span>
              </div>
              <p className="text-sm text-hof dark:text-neutral-400">
                {l.city}
                {l.country ? `, ${l.country}` : ""}
              </p>
              <p className="mt-1 text-sm">
                <span className="font-semibold">{formatPrice(l.price_per_night, { decimals: 0 })}</span> night
              </p>
            </div>
          </div>
          <Link href={`/listing/${l.id}`} target="_blank" className="mt-3 block text-center text-sm underline">
            Show preview
          </Link>
        </div>
        <div>
          <h2 className="text-xl font-medium">What&apos;s next?</h2>
          <ul className="mt-4 space-y-5">
            {next.map((n) => (
              <li key={n.title} className="flex gap-4">
                <span className="text-3xl leading-none" aria-hidden="true">
                  {n.emoji}
                </span>
                <span>
                  <span className="block font-medium">{n.title}</span>
                  <span className="block text-sm text-hof dark:text-neutral-400">{n.body}</span>
                </span>
              </li>
            ))}
          </ul>
          {problems.length > 0 && (
            <div className="mt-6 rounded-xl border border-rausch/40 bg-rausch/5 p-4 text-sm">
              <p className="font-semibold">Before you can publish:</p>
              <ul className="mt-1 list-disc pl-5">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <dt className="text-hof dark:text-neutral-400">Place</dt>
            <dd>
              {structureLabel(l.structure_type)} · {PRIVACY_TYPES.find((p) => p.id === l.property_type)?.title ?? l.property_type}
            </dd>
            <dt className="text-hof dark:text-neutral-400">Capacity</dt>
            <dd>
              {l.max_guests} guests · {l.bedrooms === 0 ? "Studio" : `${l.bedrooms} bedroom${l.bedrooms === 1 ? "" : "s"}`} · {l.beds} bed{l.beds === 1 ? "" : "s"} · {l.bathrooms} bath
            </dd>
            <dt className="text-hof dark:text-neutral-400">Booking</dt>
            <dd>{l.instant_book ? "Instant Book" : "Approve requests"}</dd>
            <dt className="text-hof dark:text-neutral-400">Weekend price</dt>
            <dd>{l.weekend_price ? formatPrice(l.weekend_price, { decimals: 0 }) : "Same as weekday"}</dd>
            <dt className="text-hof dark:text-neutral-400">Discounts</dt>
            <dd>
              {[l.new_listing_discount > 0 && "New listing 20%", l.weekly_discount > 0 && "Weekly 10%", l.monthly_discount > 0 && "Monthly 20%"].filter(Boolean).join(" · ") || "None"}
            </dd>
            <dt className="text-hof dark:text-neutral-400">Amenities</dt>
            <dd>{l.amenities.length} selected</dd>
          </dl>
        </div>
      </div>
    </WizardShell>
  );
}

function Published({ listing }: { listing: ListingDetail }) {
  const { user } = useAuth();
  const cover = listing.photos[0]?.url;
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-neutral-950">
      <div className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-12 px-6 py-16 lg:grid-cols-2">
        <div>
          <p className="text-4xl" aria-hidden="true">
            🎉
          </p>
          <h1 className="mt-4 text-4xl font-medium leading-tight sm:text-5xl">Congratulations, {user?.full_name.split(" ")[0] || "host"}!</h1>
          <p className="mt-4 text-lg text-hof dark:text-neutral-400">
            Your listing is live. Guests can now find and book <span className="font-medium text-ink dark:text-white">{listing.title}</span>. Welcome to hosting.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/hosting" className="rounded-lg bg-ink px-6 py-3 font-semibold text-white dark:bg-white dark:text-ink">
              Go to hosting dashboard
            </Link>
            <Link href={`/listing/${listing.id}`} className="rounded-lg border border-ink px-6 py-3 font-semibold dark:border-white">
              View listing
            </Link>
            <Link href="/hosting/calendar" className="rounded-lg px-6 py-3 font-semibold underline">
              Set up your calendar
            </Link>
          </div>
        </div>
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl shadow-card">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="aspect-square w-full object-cover" />
          )}
        </div>
      </div>
    </div>
  );
}
