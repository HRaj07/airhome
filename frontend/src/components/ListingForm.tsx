"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Amenity, ListingFormData, PropertyType } from "@/lib/types";
import { PROPERTY_TYPE_LABELS } from "@/lib/types";
import AmenityIcon from "./AmenityIcon";

const CITY_PRESETS: { city: string; state: string; country: string; latitude: number; longitude: number }[] = [
  { city: "New York", state: "NY", country: "United States", latitude: 40.7128, longitude: -74.006 },
  { city: "Los Angeles", state: "CA", country: "United States", latitude: 34.0522, longitude: -118.2437 },
  { city: "San Francisco", state: "CA", country: "United States", latitude: 37.7749, longitude: -122.4194 },
  { city: "Paris", state: "", country: "France", latitude: 48.8566, longitude: 2.3522 },
  { city: "London", state: "", country: "United Kingdom", latitude: 51.5074, longitude: -0.1278 },
  { city: "Tokyo", state: "", country: "Japan", latitude: 35.6762, longitude: 139.6503 },
  { city: "Barcelona", state: "", country: "Spain", latitude: 41.3874, longitude: 2.1686 },
  { city: "Bali", state: "", country: "Indonesia", latitude: -8.3405, longitude: 115.092 },
];

export const emptyListingForm = (): ListingFormData => ({
  title: "",
  description: "",
  property_type: "entire_home",
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  max_guests: 2,
  price_per_night: 100,
  cleaning_fee: 30,
  service_fee_pct: 0.12,
  address: "",
  neighborhood: "",
  city: "",
  state: "",
  country: "",
  latitude: 0,
  longitude: 0,
  amenity_ids: [],
  // Placeholders for a brand-new listing: a home, a living room and a bedroom,
  // so an unedited draft still looks like somewhere you could stay.
  photo_urls: [
    "https://images.pexels.com/photos/1974596/pexels-photo-1974596.jpeg?auto=compress&cs=tinysrgb&w=1024&h=768&fit=crop",
    "https://images.pexels.com/photos/276746/pexels-photo-276746.jpeg?auto=compress&cs=tinysrgb&w=1024&h=768&fit=crop",
    "https://images.pexels.com/photos/11036444/pexels-photo-11036444.jpeg?auto=compress&cs=tinysrgb&w=1024&h=768&fit=crop",
  ],
});

export default function ListingForm({
  value,
  amenities,
  onChange,
  onSubmit,
  submitLabel,
  submitting,
}: {
  value: ListingFormData;
  amenities: Amenity[];
  onChange: (v: ListingFormData) => void;
  onSubmit: () => void;
  submitLabel: string;
  submitting: boolean;
}) {
  const [newPhotoUrl, setNewPhotoUrl] = useState("");

  function set<K extends keyof ListingFormData>(key: K, val: ListingFormData[K]) {
    onChange({ ...value, [key]: val });
  }

  function toggleAmenity(id: number) {
    set("amenity_ids", value.amenity_ids.includes(id) ? value.amenity_ids.filter((a) => a !== id) : [...value.amenity_ids, id]);
  }

  function applyCityPreset(city: string) {
    const preset = CITY_PRESETS.find((c) => c.city === city);
    if (!preset) return;
    onChange({ ...value, city: preset.city, state: preset.state, country: preset.country, latitude: preset.latitude, longitude: preset.longitude });
  }

  function addPhoto() {
    if (!newPhotoUrl.trim()) return;
    set("photo_urls", [...value.photo_urls, newPhotoUrl.trim()]);
    setNewPhotoUrl("");
  }

  function removePhoto(idx: number) {
    set("photo_urls", value.photo_urls.filter((_, i) => i !== idx));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-8"
    >
      <section>
        <h2 className="mb-4 text-lg font-semibold">Basics</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <input
              required
              value={value.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Sunny loft in the heart of the city"
              className="w-full rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              required
              rows={4}
              value={value.description}
              onChange={(e) => set("description", e.target.value)}
              className="w-full rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Property type</label>
            <select
              value={value.property_type}
              onChange={(e) => set("property_type", e.target.value as PropertyType)}
              className="w-full rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
            >
              {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((pt) => (
                <option key={pt} value={pt}>
                  {PROPERTY_TYPE_LABELS[pt]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Capacity</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <NumberField label="Guests" value={value.max_guests} min={1} onChange={(n) => set("max_guests", n)} />
          <NumberField label="Bedrooms" value={value.bedrooms} min={0} onChange={(n) => set("bedrooms", n)} />
          <NumberField label="Beds" value={value.beds} min={1} onChange={(n) => set("beds", n)} />
          <NumberField label="Bathrooms" value={value.bathrooms} min={0.5} step={0.5} onChange={(n) => set("bathrooms", n)} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Location</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Quick-fill city</label>
            <select
              onChange={(e) => applyCityPreset(e.target.value)}
              defaultValue=""
              className="w-full rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
            >
              <option value="" disabled>
                Choose a city to auto-fill map coordinates
              </option>
              {CITY_PRESETS.map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Street address</label>
            <input
              value={value.address}
              onChange={(e) => set("address", e.target.value)}
              className="w-full rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Neighbourhood (shown on cards, e.g. Montmartre)" value={value.neighborhood} onChange={(v) => set("neighborhood", v)} />
            <TextField label="City" value={value.city} onChange={(v) => set("city", v)} required />
            <TextField label="State/Region" value={value.state} onChange={(v) => set("state", v)} />
            <TextField label="Country" value={value.country} onChange={(v) => set("country", v)} required />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Pricing</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <NumberField label="Price / night ($)" value={value.price_per_night} min={1} onChange={(n) => set("price_per_night", n)} />
          <NumberField label="Cleaning fee ($)" value={value.cleaning_fee} min={0} onChange={(n) => set("cleaning_fee", n)} />
          <NumberField
            label="Service fee (%)"
            value={Math.round(value.service_fee_pct * 100)}
            min={0}
            max={50}
            onChange={(n) => set("service_fee_pct", n / 100)}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Amenities</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {amenities.map((a) => (
            <button
              type="button"
              key={a.id}
              onClick={() => toggleAmenity(a.id)}
              className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition-colors ${
                value.amenity_ids.includes(a.id)
                  ? "border-ink bg-neutral-100 dark:border-white dark:bg-neutral-800"
                  : "border-neutral-300 hover:border-ink dark:border-neutral-600"
              }`}
            >
              <AmenityIcon icon={a.icon} size={18} />
              {a.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Photos (image URLs)</h2>
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.photo_urls.map((url, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <div key={idx} className="group relative aspect-video overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
              <img src={url} alt={`Listing photo ${idx + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newPhotoUrl}
            onChange={(e) => setNewPhotoUrl(e.target.value)}
            placeholder="https://... image URL"
            className="flex-1 rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
          />
          <button
            type="button"
            onClick={addPhoto}
            className="flex items-center gap-1 rounded-lg border border-neutral-300 px-4 text-sm font-semibold dark:border-neutral-600"
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </section>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-rausch py-3 font-semibold text-white hover:bg-rausch_dark disabled:opacity-50 sm:w-auto sm:px-8"
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
      />
    </div>
  );
}
