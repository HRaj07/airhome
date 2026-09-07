"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Star, ShieldCheck, Languages, MapPin, Cake, Award, Flag } from "lucide-react";
import ListingCard from "@/components/ListingCard";
import { usersApi } from "@/lib/api";
import { tenure, timeAgo } from "@/lib/date";
import { useLocale } from "@/lib/locale-context";
import { useToast } from "@/lib/toast-context";
import type { UserProfile } from "@/lib/types";

/**
 * A person's public profile, in the real page's shape: the card with photo,
 * name, city and the three stats (Trips · Reviews · Months on airhome); the
 * "About" facts; then what they've written about the places they've stayed.
 */
export default function UserProfilePage() {
  const params = useParams();
  const { t } = useLocale();
  const { showToast } = useToast();
  const id = params?.id as string;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    if (!id) return;
    usersApi
      .profile(id)
      .then((p) => {
        setProfile(p);
        setState("ready");
      })
      .catch(() => setState("missing"));
  }, [id]);

  if (state === "loading") {
    return <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8">Loading profile...</div>;
  }
  if (state === "missing" || !profile) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-8">
        <h1 className="text-xl font-semibold">This profile isn&apos;t available</h1>
        <Link href="/" className="mt-3 inline-block text-rausch underline">
          Back to home
        </Link>
      </div>
    );
  }

  const first = profile.full_name.split(" ")[0];
  // Demo data has no birthdays; pick a decade deterministically per person so
  // it is stable across visits rather than random.
  const decade = ["70s", "80s", "90s", "00s"][profile.id % 4];
  const monthsLabel = profile.months_on_platform >= 12 ? `${Math.floor(profile.months_on_platform / 12)}` : `${profile.months_on_platform}`;
  const monthsUnit =
    profile.months_on_platform >= 12
      ? Math.floor(profile.months_on_platform / 12) === 1
        ? t("Year on airhome")
        : t("Years on airhome")
      : t("Months on airhome");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <div className="grid gap-10 md:grid-cols-[380px_1fr]">
        {/* ---- Identity card ---- */}
        <div className="h-fit rounded-3xl px-8 py-8 shadow-[0_6px_16px_rgba(0,0,0,0.12)] dark:bg-neutral-900">
          <div className="flex items-center gap-8">
            <div className="text-center">
              <span className="relative block h-28 w-28 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt={profile.full_name} fill sizes="112px" className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-4xl font-semibold text-hof">{first.charAt(0)}</span>
                )}
                {profile.identity_verified !== false && (
                  <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-rausch text-white">
                    <ShieldCheck size={14} />
                  </span>
                )}
              </span>
              <p className="mt-3 text-[26px] font-bold leading-tight">{first}</p>
              {profile.home_city && <p className="text-sm text-hof dark:text-neutral-400">{profile.home_city}</p>}
              {profile.is_superhost && (
                <p className="mt-1 flex items-center justify-center gap-1 text-xs font-medium">
                  <Award size={12} /> {t("Superhost")}
                </p>
              )}
            </div>
            <dl className="space-y-3">
              <div className="border-b border-neutral-200 pb-3 dark:border-neutral-800">
                <dt className="text-2xl font-bold">{profile.trips}</dt>
                <dd className="text-[11px] font-medium">{profile.trips === 1 ? t("Trip") : t("Trips")}</dd>
              </div>
              <div className="border-b border-neutral-200 pb-3 dark:border-neutral-800">
                <dt className="text-2xl font-bold">{profile.reviews_written}</dt>
                <dd className="text-[11px] font-medium">{profile.reviews_written === 1 ? t("Review") : t("Reviews")}</dd>
              </div>
              <div>
                <dt className="text-2xl font-bold">{monthsLabel}</dt>
                <dd className="text-[11px] font-medium">{monthsUnit}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* ---- About ---- */}
        <div>
          <h1 className="text-[32px] font-bold">{t("About {name}", { name: first })}</h1>
          <ul className="mt-5 space-y-3 text-[15px]">
            <li className="flex items-center gap-3">
              <Cake size={18} strokeWidth={1.6} /> {t("Born in the")} {decade}
            </li>
            {profile.languages && (
              <li className="flex items-center gap-3">
                <Languages size={18} strokeWidth={1.6} /> {t("Speaks")} {profile.languages}
              </li>
            )}
            {profile.home_city && (
              <li className="flex items-center gap-3">
                <MapPin size={18} strokeWidth={1.6} /> {t("Lives in")} {profile.home_city}
              </li>
            )}
            {profile.identity_verified !== false && (
              <li className="flex items-center gap-3">
                <ShieldCheck size={18} strokeWidth={1.6} /> <span className="underline">{t("Identity verified")}</span>
              </li>
            )}
          </ul>
          {profile.bio && <p className="mt-5 max-w-xl text-[15px] leading-relaxed">{profile.bio}</p>}
          <p className="mt-4 text-sm text-hof dark:text-neutral-400">
            {tenure(profile.created_at)} on airhome
          </p>
        </div>
      </div>

      {/* ---- Reviews they've written ---- */}
      <section className="mt-12 border-t border-neutral-200 pt-10 dark:border-neutral-800">
        <h2 className="text-[22px] font-semibold">
          {profile.is_host ? t("What guests are saying about {name}", { name: first }) : t("Reviews by {name}", { name: first })}
        </h2>
        {profile.reviews.length === 0 ? (
          <p className="mt-4 text-sm text-hof dark:text-neutral-400">{t("No reviews yet")}</p>
        ) : (
          <div className="mt-6 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {profile.reviews.slice(0, 6).map((r) => (
              <article key={`${r.subject_kind}-${r.id}`} className="flex flex-col gap-2">
                <Link
                  href={r.subject_kind === "listing" ? `/listing/${r.subject_id}` : `/experiences/${r.subject_id}`}
                  className="text-sm font-semibold hover:underline"
                >
                  {r.subject_title}
                </Link>
                <p className="text-xs text-hof dark:text-neutral-400">{r.subject_city}</p>
                <p className="flex items-center gap-1.5 text-sm">
                  <span className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={10} className={i < r.rating ? "fill-current" : "fill-current text-neutral-300 dark:text-neutral-700"} />
                    ))}
                  </span>
                  <span className="text-hof dark:text-neutral-400">· {timeAgo(r.created_at)}</span>
                </p>
                <p className="text-[15px] leading-relaxed">{r.comment}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ---- Listings, for hosts ---- */}
      {profile.is_host && profile.listings.length > 0 && (
        <section className="mt-12 border-t border-neutral-200 pt-10 dark:border-neutral-800">
          <h2 className="mb-6 text-[22px] font-semibold">{t("{name}'s listings", { name: first })}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {profile.listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-12 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <button
          onClick={() => showToast(`Thanks — a report about ${first} has been recorded (mocked).`, "info")}
          className="flex items-center gap-2 text-sm underline"
        >
          <Flag size={14} /> {t("Report {name}", { name: first })}
        </button>
      </p>
    </div>
  );
}
