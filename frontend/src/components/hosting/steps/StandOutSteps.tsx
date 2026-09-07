"use client";

/**
 * Phase 2 — "Make it stand out": amenities, photos, the 32-character title and
 * the description Airbnb seeds from the highlights you pick.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Check, Camera, Plus } from "lucide-react";
import { amenitiesApi } from "@/lib/api";
import {
  DESCRIPTION_MAX,
  GUEST_FAVOURITES,
  HIGHLIGHTS,
  SAFETY_AMENITIES,
  SAMPLE_PHOTOS,
  STANDOUT_AMENITIES,
  TITLE_MAX,
  structureLabel,
} from "@/lib/hosting";
import type { Amenity } from "@/lib/types";
import WizardShell, { StepHeading, Tile } from "../WizardShell";
import AmenityIcon from "@/components/AmenityIcon";
import { useStepNav, type StepProps } from "./common";


export function Amenities(props: StepProps) {
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

export function Photos(props: StepProps) {
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

export function Title(props: StepProps) {
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

export function Description(props: StepProps) {
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
