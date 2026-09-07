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
  return (
    <div className="space-y-3 text-sm">
      <div className="flex justify-between">
        <span className="underline">
          ${pricePerNight.toFixed(0)} x {nights} night{nights !== 1 ? "s" : ""}
        </span>
        <span>${subtotal.toFixed(2)}</span>
      </div>
      {cleaningFee > 0 && (
        <div className="flex justify-between">
          <span className="underline">Cleaning fee</span>
          <span>${cleaningFee.toFixed(2)}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="underline">Service fee</span>
        <span>${serviceFee.toFixed(2)}</span>
      </div>
      <div className="flex justify-between border-t border-neutral-200 pt-3 font-semibold dark:border-neutral-700">
        <span>Total</span>
        <span>${total.toFixed(2)}</span>
      </div>
    </div>
  );
}
