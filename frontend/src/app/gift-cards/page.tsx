"use client";

import { useState } from "react";
import { Gift, Check } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { useToast } from "@/lib/toast-context";

const AMOUNTS_USD = [25, 50, 100, 200, 500];

export default function GiftCardsPage() {
  const { formatPrice } = useLocale();
  const { showToast } = useToast();
  const [amount, setAmount] = useState(100);
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [sent, setSent] = useState(false);

  function buy(e: React.FormEvent) {
    e.preventDefault();
    if (!recipient.includes("@")) {
      showToast("Enter the recipient's email address", "info");
      return;
    }
    setSent(true);
    showToast(`Gift card for ${formatPrice(amount)} sent to ${recipient} (mocked — no payment taken)`, "success");
  }

  function redeem(e: React.FormEvent) {
    e.preventDefault();
    if (redeemCode.trim().length < 6) {
      showToast("Gift card codes are at least 6 characters", "info");
      return;
    }
    showToast("That code isn't recognised. Gift cards in this demo are not chargeable.", "error");
  }

  return (
    <div>
      <section className="px-4 py-16 text-center sm:px-8">
        <h1 className="mx-auto max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">airhome gift cards</h1>
        <p className="mx-auto mt-6 max-w-md text-lg text-ink dark:text-neutral-200">
          Homes. Experiences. Services.
          <br />
          There&apos;s even more airhome to give.
        </p>
        <a
          href="#buy"
          className="mt-8 inline-block rounded-full bg-gradient-to-r from-[#E61E4D] via-[#E31C5F] to-[#D70466] px-8 py-3.5 font-semibold text-white transition-opacity hover:opacity-90"
        >
          Buy now
        </a>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Buy */}
          <form id="buy" onSubmit={buy} className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Gift size={20} className="text-rausch" /> Buy a gift card
            </h2>

            <p className="mb-2 mt-5 text-sm font-medium">Amount</p>
            <div className="flex flex-wrap gap-2">
              {AMOUNTS_USD.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(a)}
                  className={`rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                    amount === a
                      ? "border-ink bg-neutral-100 font-semibold dark:border-white dark:bg-neutral-800"
                      : "border-neutral-300 hover:border-ink dark:border-neutral-600"
                  }`}
                >
                  {formatPrice(a)}
                </button>
              ))}
            </div>

            <p className="mb-1 mt-5 text-sm font-medium">Recipient email</p>
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="friend@example.com"
              className="w-full rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
            />

            <p className="mb-1 mt-4 text-sm font-medium">Message (optional)</p>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Happy birthday! Go somewhere good."
              className="w-full rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
            />

            <button
              type="submit"
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#E61E4D] via-[#E31C5F] to-[#D70466] py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Send gift card — {formatPrice(amount)}
            </button>
            {sent && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
                <Check size={15} /> Sent to {recipient}
              </p>
            )}
            <p className="mt-3 text-xs text-hof dark:text-neutral-400">
              Checkout is mocked for this demo — no card is charged and no email is actually sent.
            </p>
          </form>

          {/* Preview + redeem */}
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <div className="flex h-52 flex-col justify-between bg-gradient-to-br from-[#FF385C] via-[#E31C5F] to-[#BD1E59] p-6 text-white">
                <p className="text-sm font-medium opacity-90">airhome gift card</p>
                <div>
                  <p className="text-4xl font-semibold">{formatPrice(amount)}</p>
                  <p className="mt-1 text-sm opacity-90">{recipient || "recipient@example.com"}</p>
                </div>
              </div>
              {message && <p className="border-t border-neutral-200 p-4 text-sm dark:border-neutral-800">&ldquo;{message}&rdquo;</p>}
            </div>

            <form onSubmit={redeem} className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
              <h2 className="text-xl font-semibold">Redeem a gift card</h2>
              <p className="mt-1 text-sm text-hof dark:text-neutral-400">Enter the code from your gift card to add credit to your account.</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX"
                  className="flex-1 rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
                />
                <button type="submit" className="rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-ink">
                  Redeem
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
