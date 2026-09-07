"use client";

import { useLocale } from "@/lib/locale-context";

export default function PriceBreakdown({
  nights,
  pricePerNight,
  cleaningFee,
  serviceFee,
  subtotal,
  total,
}: {
  nights: number;
  pricePerNight: number;
  cleaningFee: number;
  serviceFee: number;
  subtotal: number;
  total: number;
}) {
  const { formatPrice } = useLocale();
  return (
    <div className="space-y-3 text-sm">
      <div className="flex justify-between">
        <span className="underline">
          {formatPrice(pricePerNight)} x {nights} night{nights !== 1 ? "s" : ""}
        </span>
        <span>{formatPrice(subtotal, { decimals: 2 })}</span>
      </div>
      {cleaningFee > 0 && (
        <div className="flex justify-between">
          <span className="underline">Cleaning fee</span>
          <span>{formatPrice(cleaningFee, { decimals: 2 })}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="underline">Service fee</span>
        <span>{formatPrice(serviceFee, { decimals: 2 })}</span>
      </div>
      <div className="flex justify-between border-t border-neutral-200 pt-3 font-semibold dark:border-neutral-700">
        <span>Total</span>
        <span>{formatPrice(total, { decimals: 2 })}</span>
      </div>
    </div>
  );
}
