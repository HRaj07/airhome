"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, MessageSquareText, Briefcase, UserRound, Users, Languages, MapPin, ShieldCheck } from "lucide-react";
import { bookingsApi, usersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { useToast } from "@/lib/toast-context";
import { timeAgo, tenure } from "@/lib/date";
import type { Booking, UserProfile } from "@/lib/types";

type Tab = "about" | "past-trips" | "connections";

/** The pink initial-circle Airbnb shows in place of a photo, at any size. */
function InitialAvatar({ name, className, textClassName }: { name: string; className: string; textClassName: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-rausch/10 ${className}`}>
      <span className={`font-semibold text-rausch_dark ${textClassName}`}>{name.charAt(0).toUpperCase()}</span>
    </span>
  );
}

/**
 * Your own profile — the page behind "Profile" in the account menu.
 *
 * Mirrors airbnb.co.uk/users/profile: a left rail (About me · Past trips ·
 * Connections), the identity card with your initial, and the "Complete your
 * profile" prompt that opens the edit form.
 */
export default function MyProfilePage() {
  const { user, loading: authLoading, refresh } = useAuth();
  const { t } = useLocale();
  const { showToast } = useToast();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("about");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", home_city: "", languages: "", bio: "" });

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?next=/profile");
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    if (!user) return;
    const [p, b] = await Promise.allSettled([usersApi.profile(user.id), bookingsApi.mine()]);
    if (p.status === "fulfilled") setProfile(p.value);
    else showToast("Couldn't load your profile", "error");
    if (b.status === "fulfilled") setBookings(b.value);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  function openEditor() {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      home_city: profile.home_city ?? "",
      languages: profile.languages ?? "",
      bio: profile.bio ?? "",
    });
    setEditing(true);
    setTab("about");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) {
      showToast("Your name can't be empty", "error");
      return;
    }
    setSaving(true);
    try {
      await usersApi.updateMe({
        full_name: form.full_name.trim(),
        home_city: form.home_city.trim(),
        languages: form.languages.trim(),
        bio: form.bio.trim(),
      });
      await refresh();
      await load();
      setEditing(false);
      showToast("Profile updated", "success");
    } catch {
      showToast("Couldn't save your profile", "error");
    } finally {
      setSaving(false);
    }
  }

  // Past stays, most recent first — what the "Past trips" tab lists.
  const pastTrips = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return bookings
      .filter((b) => b.status === "confirmed" && b.check_out <= today)
      .sort((a, b) => b.check_out.localeCompare(a.check_out));
  }, [bookings]);

  // "Connections" on Airbnb is the people you've met travelling. Here: the
  // distinct places you've stayed, which is the connection this data supports.
  const connections = useMemo(() => {
    const seen = new Map<number, Booking>();
    for (const b of pastTrips) if (!seen.has(b.listing.id)) seen.set(b.listing.id, b);
    return [...seen.values()];
  }, [pastTrips]);

  if (authLoading || (loading && user)) {
    return <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">Loading your profile...</div>;
  }
  if (!user || !profile) return null;

  const first = profile.full_name.split(" ")[0];
  const complete = Boolean(profile.bio && profile.home_city);
  const role = profile.is_host ? t("Host") : t("Guest");

  const navItems: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "about", label: t("About me"), icon: <InitialAvatar name={profile.full_name} className="h-8 w-8" textClassName="text-sm" /> },
    { key: "past-trips", label: t("Past trips"), icon: <Briefcase size={20} strokeWidth={1.6} className="text-hof" /> },
    { key: "connections", label: t("Connections"), icon: <Users size={20} strokeWidth={1.6} className="text-hof" /> },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <div className="grid gap-10 md:grid-cols-[300px_1fr]">
        {/* ---- Left rail ---- */}
        <aside className="h-fit md:border-r md:border-neutral-200 md:pr-8 md:dark:border-neutral-800">
          <h1 className="mb-6 text-[32px] font-bold">{t("Profile")}</h1>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setTab(item.key);
                  setEditing(false);
                }}
                aria-current={tab === item.key ? "page" : undefined}
                className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left text-[15px] font-medium transition ${
                  tab === item.key
                    ? "bg-neutral-100 dark:bg-neutral-800"
                    : "hover:bg-neutral-50 dark:hover:bg-neutral-900"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ---- Main column ---- */}
        <div>
          {tab === "about" && (
            <>
              <div className="flex items-center gap-4">
                <h2 className="text-[32px] font-bold">{t("About me")}</h2>
                {!editing && (
                  <button
                    onClick={openEditor}
                    className="rounded-full bg-neutral-100 px-4 py-1.5 text-sm font-medium hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                  >
                    {t("Edit")}
                  </button>
                )}
              </div>

              {editing ? (
                <form onSubmit={handleSave} className="mt-6 max-w-xl space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium">{t("Name")}</span>
                    <input
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-ink dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">{t("Where I live")}</span>
                    <input
                      value={form.home_city}
                      onChange={(e) => setForm({ ...form, home_city: e.target.value })}
                      placeholder="Noida, India"
                      className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-ink dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">{t("Languages I speak")}</span>
                    <input
                      value={form.languages}
                      onChange={(e) => setForm({ ...form, languages: e.target.value })}
                      placeholder="English, Hindi"
                      className="mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-ink dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">{t("About you")}</span>
                    <textarea
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      rows={5}
                      maxLength={1000}
                      placeholder={t("Tell hosts a little about yourself.")}
                      className="mt-1 w-full resize-y rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-ink dark:border-neutral-700 dark:bg-neutral-900"
                    />
                    <span className="mt-1 block text-xs text-hof dark:text-neutral-400">{form.bio.length}/1000</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-rausch px-6 py-3 font-semibold text-white hover:bg-rausch_dark disabled:opacity-60"
                    >
                      {saving ? t("Saving...") : t("Save")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="rounded-lg px-4 py-3 font-medium underline"
                    >
                      {t("Cancel")}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,340px)_1fr]">
                  {/* Identity card */}
                  <div className="h-fit rounded-3xl px-10 py-10 text-center shadow-[0_6px_16px_rgba(0,0,0,0.12)] dark:bg-neutral-900">
                    <InitialAvatar name={profile.full_name} className="mx-auto h-32 w-32" textClassName="text-5xl" />
                    <p className="mt-5 text-[28px] font-bold leading-tight">{first}</p>
                    <p className="text-sm text-hof dark:text-neutral-400">{role}</p>
                  </div>

                  <div>
                    {complete ? (
                      <>
                        <ul className="space-y-3 text-[15px]">
                          {profile.home_city && (
                            <li className="flex items-center gap-3">
                              <MapPin size={18} strokeWidth={1.6} /> {t("Lives in")} {profile.home_city}
                            </li>
                          )}
                          {profile.languages && (
                            <li className="flex items-center gap-3">
                              <Languages size={18} strokeWidth={1.6} /> {t("Speaks")} {profile.languages}
                            </li>
                          )}
                          {profile.identity_verified !== false && (
                            <li className="flex items-center gap-3">
                              <ShieldCheck size={18} strokeWidth={1.6} /> {t("Identity verified")}
                            </li>
                          )}
                        </ul>
                        {profile.bio && <p className="mt-5 max-w-xl text-[15px] leading-relaxed">{profile.bio}</p>}
                        <p className="mt-4 text-sm text-hof dark:text-neutral-400">{tenure(profile.created_at)} on airhome</p>
                        <Link href={`/users/${profile.id}`} className="mt-4 inline-block text-sm font-medium underline">
                          {t("View your public profile")}
                        </Link>
                      </>
                    ) : (
                      <>
                        <h3 className="text-[22px] font-semibold">{t("Complete your profile")}</h3>
                        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-hof dark:text-neutral-400">
                          {t(
                            "Your airhome profile is an important part of every reservation. Create yours to help other hosts and guests get to know you."
                          )}
                        </p>
                        <button
                          onClick={openEditor}
                          className="mt-6 rounded-lg bg-rausch px-6 py-3 font-semibold text-white hover:bg-rausch_dark"
                        >
                          {t("Get started")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Reviews you've written */}
              <section className="mt-12 border-t border-neutral-200 pt-8 dark:border-neutral-800">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 text-[15px] font-medium">
                    <MessageSquareText size={20} strokeWidth={1.6} />
                    {t("Show reviews I've written")}
                    <span className="text-hof dark:text-neutral-400">({profile.reviews_written})</span>
                  </summary>
                  {profile.reviews.length === 0 ? (
                    <p className="mt-4 text-sm text-hof dark:text-neutral-400">{t("You haven't written any reviews yet.")}</p>
                  ) : (
                    <div className="mt-6 grid gap-x-12 gap-y-8 md:grid-cols-2">
                      {profile.reviews.map((r) => (
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
                                <Star
                                  key={i}
                                  size={10}
                                  className={i < r.rating ? "fill-current" : "fill-current text-neutral-300 dark:text-neutral-700"}
                                />
                              ))}
                            </span>
                            <span className="text-hof dark:text-neutral-400">· {timeAgo(r.created_at)}</span>
                          </p>
                          <p className="text-[15px] leading-relaxed">{r.comment}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </details>
              </section>
            </>
          )}

          {tab === "past-trips" && (
            <>
              <h2 className="text-[32px] font-bold">{t("Past trips")}</h2>
              {pastTrips.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-neutral-200 px-6 py-10 text-center dark:border-neutral-800">
                  <p className="text-[15px] font-medium">{t("No past trips yet")}</p>
                  <p className="mt-2 text-sm text-hof dark:text-neutral-400">
                    {t("Once you've stayed somewhere, it'll show up here.")}
                  </p>
                  <Link href="/" className="mt-5 inline-block rounded-lg bg-rausch px-5 py-2.5 font-semibold text-white hover:bg-rausch_dark">
                    {t("Start searching")}
                  </Link>
                </div>
              ) : (
                <ul className="mt-6 space-y-4">
                  {pastTrips.map((b) => (
                    <li key={b.id}>
                      <Link
                        href={`/listing/${b.listing.id}`}
                        className="flex items-center gap-4 rounded-2xl border border-neutral-200 p-4 hover:shadow-card dark:border-neutral-800"
                      >
                        <Briefcase size={20} strokeWidth={1.6} className="shrink-0 text-hof" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{b.listing.title}</p>
                          <p className="text-sm text-hof dark:text-neutral-400">
                            {b.listing.city}, {b.listing.country} · {b.check_in} – {b.check_out} ·{" "}
                            {b.nights} {b.nights === 1 ? t("night") : t("nights")}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {tab === "connections" && (
            <>
              <h2 className="text-[32px] font-bold">{t("Connections")}</h2>
              <p className="mt-3 text-[15px] text-hof dark:text-neutral-400">
                {t("The places you've stayed and the hosts who welcomed you.")}
              </p>
              {connections.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-neutral-200 px-6 py-10 text-center dark:border-neutral-800">
                  <UserRound size={28} strokeWidth={1.4} className="mx-auto text-hof" />
                  <p className="mt-3 text-[15px] font-medium">{t("No connections yet")}</p>
                  <p className="mt-2 text-sm text-hof dark:text-neutral-400">
                    {t("Complete a stay to start building connections.")}
                  </p>
                </div>
              ) : (
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {connections.map((b) => (
                    <li key={b.listing.id}>
                      <Link
                        href={`/listing/${b.listing.id}`}
                        className="flex items-center gap-4 rounded-2xl border border-neutral-200 p-4 hover:shadow-card dark:border-neutral-800"
                      >
                        <InitialAvatar name={b.listing.title} className="h-12 w-12" textClassName="text-lg" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{b.listing.title}</p>
                          <p className="text-sm text-hof dark:text-neutral-400">
                            {b.listing.city}, {b.listing.country}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
