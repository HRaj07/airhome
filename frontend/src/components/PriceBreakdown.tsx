"use client";

import { useLocale } from "@/lib/locale-context";
import type { StayQuote } from "@/lib/types";

/**
 * Airbnb's receipt. Every line comes from the server's quote rather than being
 * recomputed here, so what the guest reads is what the booking endpoint will
 * charge — including a weekend rate, a night the host re-priced, and any
 * length-of-stay discount.
 */
export default function PriceBreakdown({ quote }: { quote: StayQuote }) {
  const { formatPrice, t } = useLocale();
  // "x 3 nights" only makes sense at one rate; mixed rates get an average.
  const mixed = new Set(quote.rates).size > 1;

  return (
    <div className="space-y-3 text-sm">
      <div className="flex justify-between">
        <span className="underline">
          {formatPrice(quote.avg_nightly)} x {quote.nights} {t("night")}
          {mixed && <span className="ml-1 text-hof dark:text-neutral-400">({t("avg.")})</span>}
        </span>
        <span>{formatPrice(quote.nightly_subtotal, { decimals: 2 })}</span>
      </div>

      {quote.discount_amount > 0 && (
        <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
          <span className="underline">
            {t(quote.discount_label)} ({Math.round(quote.discount_rate * 100)}%)
          </span>
          <span>-{formatPrice(quote.discount_amount, { decimals: 2 })}</span>
        </div>
      )}

      {quote.cleaning_fee > 0 && (
        <div className="flex justify-between">
          <span className="underline">{t("Cleaning fee")}</span>
          <span>{formatPrice(quote.cleaning_fee, { decimals: 2 })}</span>
        </div>
      )}

      <div className="flex justify-between">
        <span className="underline">{t("Service fee")}</span>
        <span>{formatPrice(quote.service_fee, { decimals: 2 })}</span>
      </div>

      <div className="flex justify-between border-t border-neutral-200 pt-3 font-semibold dark:border-neutral-700">
        <span>{t("Total")}</span>
        <span>{formatPrice(quote.total, { decimals: 2 })}</span>
      </div>
    </div>
  );
}
