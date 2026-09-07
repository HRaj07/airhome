"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Navigation, X } from "lucide-react";
import { destinationsApi } from "@/lib/api";
import { getCurrentPosition } from "@/lib/geo";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useLocale } from "@/lib/locale-context";
import type { Destination } from "@/lib/types";

/**
 * "Set up your Airbnb listing" — the first step of hosting a home, where
 * Airbnb asks for the address before anything else.
 *
 * The suggestions are the destinations we actually have inventory in, so a
 * new listing always lands in a city the rest of the app can search, map and
 * build carousel rows for. A free-typed address is kept too: whatever the
 * host picks is carried into the listing form as query params rather than
 * stored here, so a refresh mid-flow loses nothing.
 */
export default function BecomeAHostAddressPage() {
  const [open, setOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?next=/become-a-host/address");
  }, [authLoading, user, router]);

  return (
    <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-2 lg:gap-16 lg:px-10">
      <div className="text-center lg:text-left">
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">{t("Set up your airhome listing")}</h1>
        <p className="mx-auto mt-4 max-w-md text-base text-hof dark:text-neutral-400 lg:mx-0">
          {t("It's easy to create a great listing — let's start with your address.")}
        </p>

        <button
          onClick={() => setOpen(true)}
          className="mx-auto mt-8 flex w-full max-w-md items-center gap-3 rounded-full border border-neutral-300 px-6 py-4 text-left text-hof shadow-sm transition-shadow hover:shadow-md dark:border-neutral-700 dark:text-neutral-400 lg:mx-0"
        >
          <Search size={18} />
          {t("Enter your address")}
        </button>
      </div>

      {/* The sample listing card Airbnb shows beside the prompt. */}
      <div className="hidden justify-center lg:flex">
        <div className="rounded-3xl bg-[#f4eef5] p-10 dark:bg-neutral-800">
          <div className="w-64 overflow-hidden rounded-2xl bg-white shadow-lg dark:bg-neutral-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.pexels.com/photos/1974596/pexels-photo-1974596.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop"
              alt=""
              className="h-56 w-full object-cover"
            />
            <div className="p-4">
              <p className="font-medium leading-snug">{t("Entire home in New Delhi")}</p>
              <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3 text-sm text-hof dark:border-neutral-800 dark:text-neutral-400">
                <span>{t("Hosted by you")}</span>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-rausch text-xs font-semibold text-white">
                  {(user?.full_name || "?").charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {open && <AddressModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function AddressModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Destination[]>([]);
  const [locating, setLocating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { showToast } = useToast();
  const { t } = useLocale();

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Debounced so typing doesn't fire a request per keystroke.
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

  function go(params: Record<string, string | number>) {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString();
    router.push(`/host/listings/new?${qs}`);
  }

  function pick(d: Destination) {
    go({
      city: d.city,
      country: d.country,
      latitude: d.latitude,
      longitude: d.longitude,
      neighborhood: d.kind === "neighborhood" ? d.label : "",
    });
  }

  async function useMyLocation() {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      const nearest = await destinationsApi.nearest(pos.latitude, pos.longitude);
      go({
        city: nearest.city,
        country: nearest.country,
        latitude: pos.latitude,
        longitude: pos.longitude,
      });
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("Couldn't get your location"), "error");
      setLocating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 p-4 pt-[10vh]" onClick={onClose}>
      <div
        className="max-h-[70vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("Enter your address")}
      >
        <div className="relative px-6 pb-4 pt-6">
          <button
            onClick={onClose}
            aria-label={t("Close")}
            className="absolute right-5 top-5 rounded-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={18} />
          </button>
          <h2 className="mb-6 text-center text-xl font-semibold">{t("Enter your address")}</h2>

          <div className="flex items-center gap-3 rounded-xl border-2 border-ink px-4 py-3 dark:border-white">
            <Search size={18} className="shrink-0 text-hof dark:text-neutral-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Enter your address")}
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div className="max-h-[40vh] overflow-y-auto px-3 pb-4">
          <button
            onClick={useMyLocation}
            disabled={locating}
            className="flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left hover:bg-neutral-100 disabled:opacity-60 dark:hover:bg-neutral-800"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <Navigation size={16} />
            </span>
            <span className="text-sm">{locating ? t("Locating…") : t("Use my current location")}</span>
          </button>

          {results.map((d) => (
            <button
              key={`${d.kind}-${d.label}-${d.city}`}
              onClick={() => pick(d)}
              className="flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
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
            <p className="px-3 py-6 text-center text-sm text-hof dark:text-neutral-400">
              {t("No matching destinations — pick a nearby city instead.")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
