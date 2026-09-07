"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, CreditCard } from "lucide-react";
import { experiencesApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { useToast } from "@/lib/toast-context";
import { formatShort, fromISODate } from "@/lib/date";
import { shortTime } from "./ExperienceCard";
import type { ExperienceBooking, ExperienceDetail, ExperienceKind } from "@/lib/types";
import { KIND_PATH } from "@/lib/types";

export default function ExperienceCheckout({ kind }: { kind: ExperienceKind }) {
  return (
    <Suspense fallback={null}>
      <Checkout kind={kind} />
    </Suspense>
  );
}

function Checkout({ kind }: { kind: ExperienceKind }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { formatPrice } = useLocale();
  const { showToast } = useToast();

  const id = params?.id as string;
  const dateISO = searchParams.get("date") || "";
  const guests = Math.max(1, Number(searchParams.get("guests")) || 1);

  const [item, setItem] = useState<ExperienceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<ExperienceBooking | null>(null);
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "", name: "" });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!id) return;
    experiencesApi
      .get(id)
      .then(setItem)
      .catch(() => showToast("Couldn't load this booking", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const cardValid = card.number.replace(/\s/g, "").length >= 12 && card.expiry.length >= 4 && card.cvc.length >= 3 && card.name.trim().length > 1;

  async function handleConfirm() {
    if (!item || !dateISO) return;
    if (!cardValid) {
      showToast("Please fill in mock payment details to continue", "info");
      return;
    }
    setSubmitting(true);
    try {
      const booking = await experiencesApi.book(item.id, { date: dateISO, guests_count: guests });
      setConfirmed(booking);
      showToast("Booking confirmed!", "success");
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Something went wrong confirming your booking", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) return <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">Loading...</div>;
  if (!item) return <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">Not found.</div>;

  const date = dateISO ? fromISODate(dateISO) : null;
  if (!date) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-8">
        <p className="mb-4">Please choose a date first.</p>
        <button onClick={() => router.push(`${KIND_PATH[kind]}/${item.id}`)} className="rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-ink">
          Back
        </button>
      </div>
    );
  }

  const isGroupPrice = item.price_unit === "group";
  const total = isGroupPrice ? item.price_per_guest : item.price_per_guest * guests;
  const noun = kind === "service" ? "service" : "experience";

  if (confirmed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-8">
        <CheckCircle2 size={56} className="mx-auto mb-4 text-green-600" />
        <h1 className="text-2xl font-semibold">You&apos;re booked!</h1>
        <p className="mt-2 text-hof dark:text-neutral-400">
          {item.title} on {formatShort(date)}
          {item.start_time ? ` at ${shortTime(item.start_time)}` : ""}.
        </p>
        <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-neutral-200 p-5 text-left dark:border-neutral-800">
          <p className="text-sm text-hof dark:text-neutral-400">Confirmation #{confirmed.id}</p>
          <p className="mt-1 font-semibold">{confirmed.experience.title}</p>
          <p className="text-sm text-hof dark:text-neutral-400">
            {confirmed.date} · {confirmed.guests_count} guest{confirmed.guests_count > 1 ? "s" : ""}
          </p>
          <p className="mt-2 font-semibold">{formatPrice(confirmed.total_price, { decimals: 2 })} total</p>
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={() => router.push("/trips")} className="rounded-lg bg-rausch px-5 py-2.5 text-sm font-semibold text-white hover:bg-rausch_dark">
            View My Trips
          </button>
          <button onClick={() => router.push(KIND_PATH[kind])} className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-semibold dark:border-neutral-700">
            Browse more {noun}s
          </button>
        </div>
      </div>
    );
  }

  const inputClass = "w-full rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <h1 className="mb-6 text-2xl font-semibold">Confirm and pay</h1>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <section className="border-b border-neutral-200 pb-6 dark:border-neutral-800">
            <h2 className="mb-4 text-lg font-semibold">Your {noun}</h2>
            <p className="font-medium">Date</p>
            <p className="text-sm text-hof dark:text-neutral-400">
              {formatShort(date)}
              {item.start_time ? ` · ${shortTime(item.start_time)}` : ""}
            </p>
            <p className="mt-4 font-medium">Guests</p>
            <p className="text-sm text-hof dark:text-neutral-400">
              {guests} guest{guests > 1 ? "s" : ""}
            </p>
          </section>

          <section className="py-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <CreditCard size={20} /> Payment (mocked — no real charge)
            </h2>
            <div className="space-y-3">
              <input placeholder="Card number" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} className={inputClass} />
              <div className="flex gap-3">
                <input placeholder="MM/YY" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} className={inputClass} />
                <input placeholder="CVC" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} className={inputClass} />
              </div>
              <input placeholder="Name on card" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} className={inputClass} />
              <p className="text-xs text-hof dark:text-neutral-400">This is a mocked checkout for demo purposes. No real payment will be processed.</p>
            </div>
          </section>
        </div>

        <div>
          <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
            <div className="flex gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800">
              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
                {item.cover_photo_url && <Image src={item.cover_photo_url} alt={item.title} fill sizes="80px" className="object-cover" />}
              </div>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-hof dark:text-neutral-400">
                  {item.category} · {item.city}
                </p>
              </div>
            </div>
            <div className="space-y-3 py-4 text-sm">
              <div className="flex justify-between">
                <span className="underline">{isGroupPrice ? "Private group" : `${formatPrice(item.price_per_guest)} x ${guests} guest${guests > 1 ? "s" : ""}`}</span>
                <span>{formatPrice(total, { decimals: 2 })}</span>
              </div>
              <div className="flex justify-between border-t border-neutral-200 pt-3 font-semibold dark:border-neutral-800">
                <span>Total</span>
                <span>{formatPrice(total, { decimals: 2 })}</span>
              </div>
            </div>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full rounded-xl bg-rausch py-3 font-semibold text-white transition-colors hover:bg-rausch_dark disabled:opacity-50"
            >
              {submitting ? "Confirming..." : "Confirm and pay"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
