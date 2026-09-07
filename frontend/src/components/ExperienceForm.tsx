"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ExperienceFormData, ExperienceKind } from "@/lib/types";

/** Cities the catalogue already has inventory in, so a new offering is findable. */
const CITY_PRESETS: { city: string; country: string; latitude: number; longitude: number }[] = [
  { city: "New Delhi", country: "India", latitude: 28.6139, longitude: 77.209 },
  { city: "Mumbai", country: "India", latitude: 19.076, longitude: 72.8777 },
  { city: "Bengaluru", country: "India", latitude: 12.9716, longitude: 77.5946 },
  { city: "Goa", country: "India", latitude: 15.2993, longitude: 74.124 },
  { city: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522 },
  { city: "London", country: "United Kingdom", latitude: 51.5074, longitude: -0.1278 },
  { city: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503 },
  { city: "New York", country: "United States", latitude: 40.7128, longitude: -74.006 },
];

/** A blank draft. Services are booked ad hoc, so they carry no daily start time. */
export function emptyExperienceForm(kind: ExperienceKind, category: string): ExperienceFormData {
  return {
    kind,
    category,
    title: "",
    description: "",
    city: "",
    country: "",
    latitude: 0,
    longitude: 0,
    price_per_guest: kind === "service" ? 80 : 45,
    price_unit: kind === "service" ? "group" : "guest",
    duration_minutes: kind === "service" ? 90 : 120,
    start_time: kind === "service" ? "" : "10:00 AM",
    max_guests: kind === "service" ? 4 : 8,
    photo_urls: [
      kind === "service"
        ? "https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg?auto=compress&cs=tinysrgb&w=1024&h=768&fit=crop"
        : "https://images.pexels.com/photos/1051075/pexels-photo-1051075.jpeg?auto=compress&cs=tinysrgb&w=1024&h=768&fit=crop",
    ],
  };
}

const START_TIMES = ["8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM", "8:00 PM"];

export default function ExperienceForm({
  value,
  onChange,
  onSubmit,
  submitLabel,
  submitting,
}: {
  value: ExperienceFormData;
  onChange: (v: ExperienceFormData) => void;
  onSubmit: () => void;
  submitLabel: string;
  submitting: boolean;
}) {
  const set = <K extends keyof ExperienceFormData>(key: K, v: ExperienceFormData[K]) =>
    onChange({ ...value, [key]: v });

  const isService = value.kind === "service";
  const field = "w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-ink dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";
  const label = "mb-1.5 block text-sm font-medium";

  function setPhoto(i: number, url: string) {
    const next = [...value.photo_urls];
    next[i] = url;
    set("photo_urls", next);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-8"
    >
      <section className="space-y-4">
        <div>
          <label className={label} htmlFor="title">
            Title
          </label>
          <input
            id="title"
            required
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder={isService ? "Portrait session with a local photographer" : "Old Delhi street food walk"}
            className={field}
          />
        </div>

        <div>
          <label className={label} htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            value={value.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What happens, what's included, and what guests should bring."
            className={field}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Where</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {CITY_PRESETS.map((c) => (
            <button
              key={c.city}
              type="button"
              onClick={() =>
                onChange({ ...value, city: c.city, country: c.country, latitude: c.latitude, longitude: c.longitude })
              }
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                value.city === c.city
                  ? "border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink"
                  : "border-neutral-300 hover:border-neutral-500 dark:border-neutral-700"
              }`}
            >
              {c.city}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="city">
              City
            </label>
            <input id="city" required value={value.city} onChange={(e) => set("city", e.target.value)} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="country">
              Country
            </label>
            <input id="country" value={value.country} onChange={(e) => set("country", e.target.value)} className={field} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Pricing and capacity</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={label} htmlFor="price">
              Price
            </label>
            <input
              id="price"
              type="number"
              min={1}
              required
              value={value.price_per_guest}
              onChange={(e) => set("price_per_guest", Number(e.target.value))}
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="unit">
              Charged per
            </label>
            <select id="unit" value={value.price_unit} onChange={(e) => set("price_unit", e.target.value)} className={field}>
              <option value="guest">Guest</option>
              <option value="group">Group</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="max_guests">
              {isService ? "Max people" : "Group size"}
            </label>
            <input
              id="max_guests"
              type="number"
              min={1}
              max={50}
              value={value.max_guests}
              onChange={(e) => set("max_guests", Number(e.target.value))}
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="duration">
              Duration (minutes)
            </label>
            <input
              id="duration"
              type="number"
              min={15}
              max={1440}
              step={15}
              value={value.duration_minutes}
              onChange={(e) => set("duration_minutes", Number(e.target.value))}
              className={field}
            />
          </div>
        </div>

        {!isService && (
          <div className="mt-4 max-w-xs">
            <label className={label} htmlFor="start_time">
              Daily start time
            </label>
            <select id="start_time" value={value.start_time} onChange={(e) => set("start_time", e.target.value)} className={field}>
              {START_TIMES.map((tm) => (
                <option key={tm} value={tm}>
                  {tm}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-base font-semibold">Photos</h2>
        <p className="mb-3 text-sm text-hof dark:text-neutral-400">Paste image URLs. The first one is the cover.</p>
        <div className="space-y-2">
          {value.photo_urls.map((url, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={url}
                onChange={(e) => setPhoto(i, e.target.value)}
                placeholder="https://…"
                className={field}
              />
              <button
                type="button"
                onClick={() => set("photo_urls", value.photo_urls.filter((_, idx) => idx !== i))}
                aria-label="Remove photo"
                className="shrink-0 rounded-lg border border-neutral-300 px-3 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => set("photo_urls", [...value.photo_urls, ""])}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          <Plus size={16} /> Add photo
        </button>
      </section>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-rausch py-3 font-semibold text-white transition-opacity disabled:opacity-60 sm:w-auto sm:px-10"
      >
        {submitting ? "Publishing…" : submitLabel}
      </button>
    </form>
  );
}
