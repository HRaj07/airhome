"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Star, Share, Heart, Award, X, ShieldCheck, CalendarX2, ClipboardList } from "lucide-react";
import PhotoGallery from "@/components/PhotoGallery";
import ReviewsSection, { Laurel } from "@/components/ReviewsSection";
import AmenityIcon from "@/components/AmenityIcon";
import MapEmbed from "@/components/MapEmbed";
import BookingWidget from "@/components/BookingWidget";
import WriteReviewForm from "@/components/WriteReviewForm";
import DateRangeCalendar from "@/components/DateRangeCalendar";
import TranslatedText from "@/components/TranslatedText";
import { isGuestFavourite } from "@/components/ListingCard";
import { listingsApi, reviewsApi, wishlistApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useLocale } from "@/lib/locale-context";
import type { ListingDetail, Review } from "@/lib/types";
import { PROPERTY_TYPE_SHORT } from "@/lib/types";

const TYPE_LONG: Record<string, string> = {
  entire_home: "Entire home",
  private_room: "Private room",
  shared_room: "Shared room",
  hotel_room: "Hotel room",
};

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t, formatPrice } = useLocale();
  const id = params?.id as string;

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [subnav, setSubnav] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([listingsApi.get(id), reviewsApi.list(id)])
      .then(([l, r]) => {
        setListing(l);
        setReviews(r);
        setSaved(l.is_wishlisted);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  // The sticky "Photos · Amenities · Reviews · Location | price · Reserve" bar
  // appears once the gallery has scrolled out of view, as on the real page.
  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setSubnav(!entry.isIntersecting), { rootMargin: "-80px 0px 0px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [listing]);

  useEffect(() => {
    if (!amenitiesOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAmenitiesOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [amenitiesOpen]);

  async function refreshReviews() {
    if (!id) return;
    const [l, r] = await Promise.all([listingsApi.get(id), reviewsApi.list(id)]);
    setListing(l);
    setReviews(r);
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title: listing?.title, url });
      else {
        await navigator.clipboard.writeText(url);
        showToast("Link copied to clipboard", "success");
      }
    } catch {
      /* user dismissed the share sheet */
    }
  }

  async function toggleSave() {
    if (!listing) return;
    if (!user) {
      showToast("Log in to save listings to your wishlist", "info");
      return;
    }
    const next = !saved;
    setSaved(next);
    try {
      if (next) await wishlistApi.add(listing.id);
      else await wishlistApi.remove(listing.id);
      showToast(next ? "Saved to wishlist" : "Removed from wishlist", next ? "success" : "info");
    } catch {
      setSaved(!next);
    }
  }

  const scrollTo = (anchor: string) => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (loading) {
    return (
      <div className="mx-auto max-w-[1120px] animate-pulse px-4 py-8 sm:px-8">
        <div className="h-7 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-6 h-[420px] rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-8">
        <h1 className="mb-2 text-xl font-semibold">Listing not found</h1>
        <button onClick={() => router.push("/")} className="text-rausch underline">
          Back to search
        </button>
      </div>
    );
  }

  const favourite = isGuestFavourite(listing);
  const hostFirst = listing.host.full_name.split(" ")[0];
  const groups = Array.from(new Set(listing.amenities.map((a) => a.group || "Essentials")));
  const descLong = listing.description.length > 320;

  return (
    <div className="mx-auto max-w-[1120px] px-4 pb-16 sm:px-8">
      {/* ---------- Sticky sub-nav ---------- */}
      {subnav && (
        <div className="fixed inset-x-0 top-0 z-40 border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <div className="mx-auto flex h-20 max-w-[1120px] items-center justify-between px-4 sm:px-8">
            <nav className="flex gap-6 text-sm font-medium">
              {[
                ["photos", t("Photos")],
                ["amenities", t("Amenities")],
                ["reviews", t("Reviews")],
                ["location", t("Location")],
              ].map(([a, label]) => (
                <button key={a} onClick={() => scrollTo(a)} className="border-b-2 border-transparent py-1 hover:border-ink dark:hover:border-white">
                  {label}
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-[15px]">
                  <span className="font-semibold underline">{formatPrice(listing.price_per_night)}</span>{" "}
                  <span className="text-hof dark:text-neutral-400">{t("night")}</span>
                </p>
                {listing.review_count > 0 && (
                  <p className="flex items-center justify-end gap-1 text-xs">
                    <Star size={10} className="fill-current" /> {listing.rating_avg.toFixed(2)} · {listing.review_count} {t("reviews")}
                  </p>
                )}
              </div>
              <button
                onClick={() => scrollTo("reserve")}
                className="rounded-lg bg-gradient-to-r from-[#E61E4D] via-[#E31C5F] to-[#D70466] px-6 py-3 text-[15px] font-semibold text-white"
              >
                {t("Reserve")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Title row ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-3 pt-6">
        <h1 className="text-[26px] font-semibold leading-tight">{listing.title}</h1>
        <div className="flex items-center gap-1">
          <button onClick={share} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm underline hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <Share size={16} /> {t("Share")}
          </button>
          <button onClick={toggleSave} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm underline hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <Heart size={16} className={saved ? "fill-rausch text-rausch" : ""} /> {saved ? t("Saved") : t("Save")}
          </button>
        </div>
      </div>

      {/* ---------- Photos ---------- */}
      <div id="photos" ref={galleryRef} className="mt-5 scroll-mt-24">
        <PhotoGallery photos={listing.photos} title={listing.title} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_373px]">
        {/* ================= LEFT COLUMN ================= */}
        <div>
          {/* Type · place · capacity */}
          <div className="border-b border-neutral-200 pb-6 dark:border-neutral-800">
            <h2 className="text-[22px] font-semibold">
              {t(TYPE_LONG[listing.property_type] || PROPERTY_TYPE_SHORT[listing.property_type])} {t("in")} {listing.city}, {listing.country}
            </h2>
            <p className="mt-1 text-[15px] text-ink dark:text-neutral-200">
              {listing.max_guests} {t("guests")} · {listing.bedrooms} {listing.bedrooms !== 1 ? t("bedrooms") : t("bedroom")} ·{" "}
              {listing.beds} {listing.beds !== 1 ? t("beds") : t("bed")} · {listing.bathrooms}{" "}
              {listing.bathrooms !== 1 ? t("bathrooms") : t("bathroom")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {listing.instant_book && <span className="rounded bg-neutral-100 px-2 py-1 dark:bg-neutral-800">{t("Instant Book")}</span>}
              <span className="rounded bg-neutral-100 px-2 py-1 dark:bg-neutral-800">{t("Free cancellation")}</span>
            </div>
          </div>

          {/* Guest favourite banner */}
          {favourite ? (
            <div className="my-6 flex flex-col items-center gap-4 rounded-2xl border border-neutral-200 px-6 py-5 dark:border-neutral-800 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-2">
                <Laurel side="left" size={40} />
                <span className="text-center text-lg font-semibold leading-tight">
                  Guest
                  <br />
                  favourite
                </span>
                <Laurel side="right" size={40} />
              </div>
              <p className="max-w-[260px] text-center text-[15px] sm:text-left">One of the most loved homes on airhome, according to guests</p>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xl font-semibold">{listing.rating_avg.toFixed(1)}</p>
                  <p className="flex justify-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={9} className="fill-current" />
                    ))}
                  </p>
                </div>
                <span className="h-10 w-px bg-neutral-200 dark:bg-neutral-800" />
                <button onClick={() => scrollTo("reviews")} className="text-center">
                  <p className="text-xl font-semibold">{listing.review_count}</p>
                  <p className="text-xs underline">{t("Reviews")}</p>
                </button>
              </div>
            </div>
          ) : (
            listing.review_count > 0 && (
              <p className="flex items-center gap-2 border-b border-neutral-200 py-5 text-[15px] dark:border-neutral-800">
                <Star size={16} className="fill-current" />
                <span className="font-semibold">{listing.rating_avg.toFixed(2)}</span>
                <span>·</span>
                <button onClick={() => scrollTo("reviews")} className="underline">
                  {listing.review_count} {t("reviews")}
                </button>
              </p>
            )
          )}

          {/* Hosted by */}
          <Link href={`/users/${listing.host.id}`} className="flex items-center gap-4 border-b border-neutral-200 py-6 dark:border-neutral-800">
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              {listing.host.avatar_url && <Image src={listing.host.avatar_url} alt={listing.host.full_name} fill sizes="48px" className="object-cover" />}
              {listing.host.is_superhost && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-rausch text-white">
                  <Award size={11} />
                </span>
              )}
            </span>
            <span>
              <span className="block font-semibold">{t("Hosted by {name}", { name: listing.host.full_name })}</span>
              <span className="block text-sm text-hof dark:text-neutral-400">
                {listing.host.is_superhost ? `${t("Superhost")} · ` : ""}
                {listing.host_years_hosting} {listing.host_years_hosting === 1 ? t("year hosting") : t("years hosting")}
              </span>
            </span>
          </Link>

          {/* Listing highlights */}
          {listing.highlights.length > 0 && (
            <div className="border-b border-neutral-200 py-6 dark:border-neutral-800">
              <h3 className="sr-only">{t("Listing highlights")}</h3>
              <ul className="space-y-5">
                {listing.highlights.map((h) => (
                  <li key={h.title} className="flex gap-4">
                    <AmenityIcon icon={h.icon} size={24} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">{h.title}</p>
                      <p className="text-sm text-hof dark:text-neutral-400">{h.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Description + Guest access + Other notes */}
          <div className="border-b border-neutral-200 py-8 dark:border-neutral-800">
            <div className={descOpen ? "" : "max-h-[9.5rem] overflow-hidden"}>
              <TranslatedText text={listing.description} className="whitespace-pre-line text-[15px] leading-relaxed text-ink dark:text-neutral-200" showNote />
              {listing.guest_access && (
                <>
                  <h3 className="mb-2 mt-6 font-semibold">{t("Guest access")}</h3>
                  <p className="whitespace-pre-line text-[15px] leading-relaxed">{listing.guest_access}</p>
                </>
              )}
              {listing.other_notes && (
                <>
                  <h3 className="mb-2 mt-6 font-semibold">{t("Other things to note")}</h3>
                  <p className="whitespace-pre-line text-[15px] leading-relaxed">{listing.other_notes}</p>
                </>
              )}
            </div>
            {(descLong || listing.guest_access || listing.other_notes) && !descOpen && (
              <button onClick={() => setDescOpen(true)} className="mt-3 flex items-center gap-1 font-semibold underline">
                {t("Show more")} ›
              </button>
            )}
          </div>

          {/* Where you'll sleep */}
          {listing.sleeping.length > 0 && (
            <div className="border-b border-neutral-200 py-8 dark:border-neutral-800">
              <h2 className="mb-5 text-[22px] font-semibold">{t("Where you'll sleep")}</h2>
              <div className="flex gap-4 overflow-x-auto">
                {listing.sleeping.map((s) => (
                  <div key={s.name} className="w-[200px] shrink-0 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
                    <AmenityIcon icon="bed" size={26} />
                    <p className="mt-4 font-semibold">{s.name}</p>
                    <p className="text-sm text-hof dark:text-neutral-400">{s.beds}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Amenities */}
          <div id="amenities" className="scroll-mt-24 border-b border-neutral-200 py-8 dark:border-neutral-800">
            <h2 className="mb-5 text-[22px] font-semibold">{t("What this place offers")}</h2>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {listing.amenities.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-center gap-4 text-[15px]">
                  <AmenityIcon icon={a.icon} size={24} className="shrink-0" />
                  {a.name}
                </div>
              ))}
            </div>
            {listing.amenities.length > 10 && (
              <button
                onClick={() => setAmenitiesOpen(true)}
                className="mt-6 rounded-lg border border-ink px-6 py-3 text-[15px] font-semibold hover:bg-neutral-100 dark:border-white dark:hover:bg-neutral-800"
              >
                {t("Show all {n} amenities", { n: String(listing.amenities.length) })}
              </button>
            )}
          </div>

          {/* Calendar */}
          <div className="border-b border-neutral-200 py-8 dark:border-neutral-800">
            <h2 className="text-[22px] font-semibold">{t("Select check-in date")}</h2>
            <p className="mb-4 text-sm text-hof dark:text-neutral-400">{t("Add your travel dates for exact pricing")}</p>
            <div className="max-w-[720px]">
              <DateRangeCalendar checkIn={null} checkOut={null} blockedDates={listing.blocked_dates} monthsToShow={2} onChange={() => scrollTo("reserve")} />
            </div>
          </div>

          <ReviewsSection reviews={reviews} ratingAvg={listing.rating_avg} categories={listing.rating_categories} guestFavourite={favourite} />

          {user && (
            <div className="py-8">
              <WriteReviewForm listingId={listing.id} onSubmitted={refreshReviews} />
            </div>
          )}

          {/* Location */}
          <div id="location" className="scroll-mt-24 border-b border-neutral-200 py-8 dark:border-neutral-800">
            <h2 className="mb-1 text-[22px] font-semibold">{t("Where you'll be")}</h2>
            <p className="mb-4 text-[15px] text-hof dark:text-neutral-400">
              {listing.neighborhood ? `${listing.neighborhood}, ` : ""}
              {listing.city}, {listing.state ? `${listing.state}, ` : ""}
              {listing.country}
            </p>
            <MapEmbed latitude={listing.latitude} longitude={listing.longitude} label={listing.title} />
          </div>

          {/* Meet your host */}
          <div className="border-b border-neutral-200 py-8 dark:border-neutral-800">
            <h2 className="mb-5 text-[22px] font-semibold">{t("Meet your host")}</h2>
            <div className="grid gap-6 md:grid-cols-[minmax(0,380px)_1fr]">
              <Link href={`/users/${listing.host.id}`} className="flex items-center gap-6 rounded-2xl border border-neutral-200 px-6 py-6 shadow-card dark:border-neutral-800">
                <div className="text-center">
                  <span className="relative block h-24 w-24 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    {listing.host.avatar_url && <Image src={listing.host.avatar_url} alt={listing.host.full_name} fill sizes="96px" className="object-cover" />}
                    {listing.host.identity_verified !== false && (
                      <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-rausch text-white">
                        <ShieldCheck size={14} />
                      </span>
                    )}
                  </span>
                  <p className="mt-2 text-xl font-semibold">{hostFirst}</p>
                  {listing.host.is_superhost && (
                    <p className="flex items-center justify-center gap-1 text-xs">
                      <Award size={12} /> {t("Superhost")}
                    </p>
                  )}
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-lg font-semibold">{listing.review_count}</p>
                    <p className="text-xs">{t("Reviews")}</p>
                  </div>
                  <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
                    <p className="text-lg font-semibold">{listing.rating_avg > 0 ? listing.rating_avg.toFixed(2) : "—"}</p>
                    <p className="text-xs">{t("Rating")}</p>
                  </div>
                  <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
                    <p className="text-lg font-semibold">{listing.host_years_hosting}</p>
                    <p className="text-xs">{listing.host_years_hosting === 1 ? t("Year hosting") : t("Years hosting")}</p>
                  </div>
                </div>
              </Link>
              <div className="text-[15px]">
                {listing.host.bio && <p className="mb-3 leading-relaxed">{listing.host.bio}</p>}
                {listing.host.languages && (
                  <p className="text-hof dark:text-neutral-400">
                    {t("Speaks")} {listing.host.languages}
                  </p>
                )}
                {listing.host.home_city && <p className="text-hof dark:text-neutral-400">{t("Lives in")} {listing.host.home_city}</p>}
                <Link href={`/users/${listing.host.id}`} className="mt-4 inline-block rounded-lg border border-ink px-5 py-2.5 text-sm font-semibold dark:border-white">
                  {t("Message host")}
                </Link>
              </div>
            </div>
          </div>

          {/* Things to know */}
          <div className="py-8">
            <h2 className="mb-5 text-[22px] font-semibold">{t("Things to know")}</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-semibold"><ClipboardList size={16} /> {t("House rules")}</h3>
                <ul className="space-y-1.5 text-sm text-ink dark:text-neutral-200">
                  <li>Check-in after 2:00 PM</li>
                  <li>Checkout before 11:00 AM</li>
                  <li>{listing.max_guests} {t("guests")} maximum</li>
                </ul>
              </div>
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-semibold"><ShieldCheck size={16} /> {t("Safety & property")}</h3>
                <ul className="space-y-1.5 text-sm text-ink dark:text-neutral-200">
                  {listing.amenities.some((a) => a.name === "Carbon monoxide alarm") ? <li>Carbon monoxide alarm</li> : <li>No carbon monoxide alarm</li>}
                  {listing.amenities.some((a) => a.name === "Smoke alarm") ? <li>Smoke alarm</li> : <li>No smoke alarm</li>}
                  {listing.amenities.some((a) => a.name.startsWith("Exterior security")) && <li>Exterior security cameras on property</li>}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-semibold"><CalendarX2 size={16} /> {t("Cancellation policy")}</h3>
                <p className="text-sm text-ink dark:text-neutral-200">
                  {t("Free cancellation before check-in. Cancel from My Trips at any time before your stay begins.")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div>
          <BookingWidget listing={listing} />
        </div>
      </div>

      {/* ---------- All amenities modal ---------- */}
      {amenitiesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAmenitiesOpen(false)}>
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="All amenities"
          >
            <div className="flex items-center gap-3 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
              <button onClick={() => setAmenitiesOpen(false)} aria-label="Close" className="rounded-full p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-4">
              <h3 className="mb-6 text-2xl font-semibold">{t("What this place offers")}</h3>
              {groups.map((g) => (
                <div key={g} className="mb-6">
                  <h4 className="mb-3 text-lg font-semibold">{g}</h4>
                  <ul>
                    {listing.amenities
                      .filter((a) => (a.group || "Essentials") === g)
                      .map((a) => (
                        <li key={a.id} className="flex items-center gap-4 border-b border-neutral-200 py-4 text-[15px] last:border-0 dark:border-neutral-800">
                          <AmenityIcon icon={a.icon} size={24} className="shrink-0" /> {a.name}
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
