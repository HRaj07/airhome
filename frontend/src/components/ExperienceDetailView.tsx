"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Star, MapPin, Clock, Users, Tag, CalendarDays } from "lucide-react";
import PhotoGallery from "./PhotoGallery";
import HostCard from "./HostCard";
import ReviewsSection from "./ReviewsSection";
import MapEmbed from "./MapEmbed";
import DateRangeCalendar from "./DateRangeCalendar";
import GuestSelector from "./GuestSelector";
import WriteReviewForm from "./WriteReviewForm";
import { shortTime } from "./ExperienceCard";
import { experiencesApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { useToast } from "@/lib/toast-context";
import { formatShort, toISODate } from "@/lib/date";
import type { ExperienceDetail, ExperienceKind } from "@/lib/types";
import { KIND_PATH } from "@/lib/types";
import TranslatedText from "./TranslatedText";

function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h} hour${h > 1 ? "s" : ""}`;
}

export default function ExperienceDetailView({ kind }: { kind: ExperienceKind }) {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { formatPrice, t } = useLocale();
  const { showToast } = useToast();
  const id = params?.id as string;

  const [item, setItem] = useState<ExperienceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [date, setDate] = useState<Date | null>(null);
  const [guests, setGuests] = useState(1);
  const [datesOpen, setDatesOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);

  async function load() {
    if (!id) return;
    try {
      const data = await experiencesApi.get(id);
      setItem(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const availableDates = useMemo(() => (item ? item.availability.filter((a) => a.spots_left > 0).map((a) => a.date) : []), [item]);
  const spotsForDate = useMemo(() => {
    if (!item || !date) return item?.max_guests ?? 1;
    const iso = toISODate(date);
    return item.availability.find((a) => a.date === iso)?.spots_left ?? item.max_guests;
  }, [item, date]);

  useEffect(() => {
    if (guests > spotsForDate) setGuests(Math.max(1, spotsForDate));
  }, [spotsForDate, guests]);

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">Loading...</div>;
  if (notFound || !item) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-8">
        <h1 className="mb-2 text-xl font-semibold">Not found</h1>
        <button onClick={() => router.push(KIND_PATH[kind])} className="text-rausch underline">
          Back to {kind === "service" ? "services" : "experiences"}
        </button>
      </div>
    );
  }

  const isGroupPrice = item.price_unit === "group";
  const total = isGroupPrice ? item.price_per_guest : item.price_per_guest * guests;

  function handleReserve() {
    if (!date) {
      setDatesOpen(true);
      showToast("Please choose a date", "info");
      return;
    }
    if (!user) {
      const next = `${KIND_PATH[kind]}/${item!.id}/book?date=${toISODate(date)}&guests=${guests}`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    router.push(`${KIND_PATH[kind]}/${item!.id}/book?date=${toISODate(date)}&guests=${guests}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
      <h1 className="text-2xl font-semibold sm:text-3xl">{item.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        <span className="flex items-center gap-1">
          <Star size={14} className="fill-current" />
          {item.review_count > 0 ? item.rating_avg.toFixed(2) : "New"}
          {item.review_count > 0 && <span className="text-hof dark:text-neutral-400">({item.review_count} reviews)</span>}
        </span>
        <span className="text-hof dark:text-neutral-400">·</span>
        <span className="flex items-center gap-1 text-hof dark:text-neutral-400">
          <MapPin size={14} /> {item.city}, {item.country}
        </span>
        <span className="text-hof dark:text-neutral-400">·</span>
        <span className="flex items-center gap-1 text-hof dark:text-neutral-400">
          <Tag size={14} /> {item.category}
        </span>
      </div>

      <div className="mt-6">
        <PhotoGallery photos={item.photos} title={item.title} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="border-b border-neutral-200 pb-6 dark:border-neutral-800">
            <h2 className="text-xl font-semibold">
              {kind === "service" ? "Service" : "Experience"} hosted by {item.host.full_name}
            </h2>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-hof dark:text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Clock size={16} /> {durationLabel(item.duration_minutes)}
              </span>
              {item.start_time && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={16} /> Starts at {shortTime(item.start_time)}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users size={16} /> Up to {item.max_guests} guest{item.max_guests !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="border-b border-neutral-200 py-6 dark:border-neutral-800">
            <h2 className="mb-3 text-xl font-semibold">What you&apos;ll do</h2>
            <TranslatedText text={item.description} className="whitespace-pre-line text-ink dark:text-neutral-200" showNote />
          </div>

          <div className="border-b border-neutral-200 py-6 dark:border-neutral-800">
            <h2 className="mb-4 text-xl font-semibold">{t("Where you'll be")}</h2>
            <MapEmbed latitude={item.latitude} longitude={item.longitude} label={item.title} />
          </div>

          <ReviewsSection reviews={item.reviews} ratingAvg={item.rating_avg} />

          {user && (
            <div className="py-8">
              <WriteReviewForm
                listingId={item.id}
                onSubmitted={load}
                submitReview={(data) => experiencesApi.review(item.id, data)}
                notEligibleMessage={`You can review this ${kind} after you've attended it`}
              />
            </div>
          )}

          <div className="py-6">
            <HostCard host={item.host} />
          </div>
        </div>

        <div>
          <div className="sticky top-28 rounded-2xl border border-neutral-200 p-6 shadow-card dark:border-neutral-800">
            <p className="text-[22px]">
              <span className="font-semibold">{t("From")} {formatPrice(item.price_per_guest)}</span>{" "}
              <span className="text-base text-hof dark:text-neutral-400">/ {t(item.price_unit)}</span>
            </p>

            <div className="relative mt-4 rounded-xl border border-neutral-400 dark:border-neutral-600">
              <button
                type="button"
                onClick={() => {
                  setDatesOpen((o) => !o);
                  setGuestsOpen(false);
                }}
                className="block w-full border-b border-neutral-400 px-3 py-2.5 text-left dark:border-neutral-600"
              >
                <span className="block text-[10px] font-bold uppercase tracking-wide">Date</span>
                <span className="text-sm">
                  {date ? `${formatShort(date)}${item.start_time ? ` · ${shortTime(item.start_time)}` : ""}` : "Choose a date"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setGuestsOpen((o) => !o);
                  setDatesOpen(false);
                }}
                className="block w-full px-3 py-2.5 text-left"
              >
                <span className="block text-[10px] font-bold uppercase tracking-wide">{t("Guests")}</span>
                <span className="text-sm">
                  {guests} guest{guests > 1 ? "s" : ""}
                </span>
              </button>

              {datesOpen && (
                <div className="absolute left-0 top-full z-20 mt-2 w-[320px] rounded-2xl border border-neutral-200 bg-white p-4 shadow-popover dark:border-neutral-700 dark:bg-neutral-900 sm:w-[360px]">
                  <DateRangeCalendar
                    checkIn={date}
                    checkOut={null}
                    mode="single"
                    monthsToShow={1}
                    allowedDates={availableDates}
                    onChange={(d) => {
                      setDate(d);
                      setDatesOpen(false);
                    }}
                  />
                  <p className="mt-2 text-xs text-hof dark:text-neutral-400">Only dates with open spots in the next 30 days can be selected.</p>
                </div>
              )}
              {guestsOpen && (
                <div className="absolute left-0 top-full z-20 mt-2 w-[300px] rounded-2xl border border-neutral-200 bg-white p-4 shadow-popover dark:border-neutral-700 dark:bg-neutral-900">
                  <GuestSelector guests={guests} onChange={setGuests} max={Math.max(1, spotsForDate)} />
                  <p className="mt-2 text-xs text-hof dark:text-neutral-400">
                    {date ? `${spotsForDate} spot${spotsForDate !== 1 ? "s" : ""} left on ${formatShort(date)}` : `Up to ${item.max_guests} guests`}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleReserve}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#E61E4D] via-[#E31C5F] to-[#D70466] py-3.5 font-semibold text-white transition-opacity hover:opacity-90"
            >
              {date ? t("Reserve") : t("Check availability")}
            </button>

            {date && (
              <div className="mt-6 space-y-3 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800">
                <div className="flex justify-between">
                  <span className="underline">
                    {isGroupPrice ? "Private group" : `${formatPrice(item.price_per_guest)} x ${guests} guest${guests > 1 ? "s" : ""}`}
                  </span>
                  <span>{formatPrice(total, { decimals: 2 })}</span>
                </div>
                <div className="flex justify-between border-t border-neutral-200 pt-3 font-semibold dark:border-neutral-800">
                  <span>{t("Total")}</span>
                  <span>{formatPrice(total, { decimals: 2 })}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
