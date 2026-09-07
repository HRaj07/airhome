"use client";

/**
 * Phase 3 — "Finish up and publish": how bookings are confirmed, who may book
 * first, the weekday and weekend price, discounts, the safety disclosures, the
 * review screen and the celebration that follows publishing.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, ChevronDown, Pencil } from "lucide-react";
import { listingsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useLocale } from "@/lib/locale-context";
import {
  GUEST_FEE_PCT,
  HOST_FEE_PCT,
  PRIVACY_TYPES,
  prevStep,
  publishProblems,
  structureLabel,
} from "@/lib/hosting";
import type { ListingDetail, ListingDraftUpdate } from "@/lib/types";
import WizardShell, { StepHeading, Tile } from "../WizardShell";
import { useStepNav, type StepProps } from "./common";


export function BookingSettings(props: StepProps) {
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

export function Visibility(props: StepProps) {
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

export function Price(props: StepProps & { weekend: boolean }) {
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

export function Discounts(props: StepProps) {
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

export function Legal(props: StepProps) {
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

export function Receipt(props: StepProps) {
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

export function Published({ listing }: { listing: ListingDetail }) {
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
