"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Check, Gift, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useLocale } from "@/lib/locale-context";

const REWARD_USD = 250;

export default function ReferPage() {
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const { formatPrice } = useLocale();
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [invites, setInvites] = useState<string[]>([]);
  const [email, setEmail] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    try {
      const stored = window.localStorage.getItem("airbnb_referrals");
      if (stored) setInvites(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const code = user ? `${user.full_name.split(" ")[0].toLowerCase()}${user.id}` : "";
  const link = user ? `${origin}/signup?host=1&ref=${code}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      showToast("Referral link copied", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Couldn't copy — select the link and copy it manually", "error");
    }
  }

  function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      showToast("Enter a valid email address", "info");
      return;
    }
    const next = [email, ...invites.filter((i) => i !== email)];
    setInvites(next);
    try {
      window.localStorage.setItem("airbnb_referrals", JSON.stringify(next));
    } catch {
      // ignore
    }
    setEmail("");
    showToast(`Invitation sent to ${email}`, "success");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <div className="rounded-3xl bg-gradient-to-br from-rausch to-[#BD1E59] p-8 text-white sm:p-12">
        <Gift size={40} className="mb-4" />
        <h1 className="text-3xl font-semibold sm:text-4xl">Refer a host, earn {formatPrice(REWARD_USD)}</h1>
        <p className="mt-3 max-w-xl text-white/90">
          Know someone with a spare room or a second home? When they publish their first listing and complete a booking, you both get {formatPrice(REWARD_USD)} in travel credit.
        </p>
      </div>

      {loading ? (
        <p className="py-10">Loading...</p>
      ) : !user ? (
        <div className="mt-8 rounded-2xl border border-neutral-200 p-6 text-center dark:border-neutral-800">
          <p className="font-semibold">Log in to get your referral link</p>
          <Link href="/login?next=/refer" className="mt-4 inline-block rounded-lg bg-rausch px-5 py-2.5 text-sm font-semibold text-white hover:bg-rausch_dark">
            Log in
          </Link>
        </div>
      ) : (
        <>
          <section className="mt-8 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
            <h2 className="font-semibold">Your referral link</h2>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input readOnly value={link} className="flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-900" />
              <button onClick={copy} className="flex items-center justify-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-ink">
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy link"}
              </button>
            </div>
            <p className="mt-2 text-xs text-hof dark:text-neutral-400">Anyone who signs up as a host through this link is credited to you.</p>
          </section>

          <section className="mt-6 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
            <h2 className="flex items-center gap-2 font-semibold">
              <UserPlus size={18} /> Invite by email
            </h2>
            <form onSubmit={sendInvite} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@example.com"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
              />
              <button type="submit" className="rounded-lg bg-rausch px-5 py-2.5 text-sm font-semibold text-white hover:bg-rausch_dark">
                Send invite
              </button>
            </form>
            {invites.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium">Sent invitations</p>
                <ul className="mt-2 space-y-1 text-sm text-hof dark:text-neutral-400">
                  {invites.map((i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
                      {i} <span className="text-xs">Pending</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
