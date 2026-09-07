"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Check, Pencil, QrCode, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useLocale } from "@/lib/locale-context";
import AuthModal from "@/components/AuthModal";

/** Reward bands in USD; displayed in the viewer's chosen currency. */
const REWARDS = [
  { kind: "Home", emoji: "🏡", min: 65, max: 830 },
  { kind: "Experience", emoji: "🎈", min: 46, max: 46 },
  { kind: "Service", emoji: "🛎️", min: 92, max: 92 },
];

export default function ReferPage() {
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const { formatPrice } = useLocale();

  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [invites, setInvites] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [customising, setCustomising] = useState(false);
  const [slug, setSlug] = useState("");
  const [picked, setPicked] = useState("Experience");
  const [authOpen, setAuthOpen] = useState(false);
  // Airbnb shows an expiry two months out; keep it moving rather than hard-coded.
  const expiry = new Date(Date.now() + 60 * 86_400_000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  useEffect(() => {
    setOrigin(window.location.origin);
    try {
      const storedInvites = window.localStorage.getItem("airbnb_referrals");
      if (storedInvites) setInvites(JSON.parse(storedInvites));
      const storedSlug = window.localStorage.getItem("airbnb_referral_slug");
      if (storedSlug) setSlug(storedSlug);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!slug && user) setSlug(`${user.full_name.split(" ")[0].toLowerCase()}${user.id}`);
  }, [user, slug]);

  const link = user ? `${origin}/signup?host=1&ref=${slug}` : "";

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

  function saveSlug() {
    const clean = slug.trim().replace(/[^a-z0-9-]/gi, "").toLowerCase();
    if (clean.length < 3) {
      showToast("Pick at least 3 letters or numbers", "info");
      return;
    }
    setSlug(clean);
    try {
      window.localStorage.setItem("airbnb_referral_slug", clean);
    } catch {
      // ignore
    }
    setCustomising(false);
    showToast("Referral link updated", "success");
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
    <div className="mx-auto max-w-[1760px] px-4 py-10 sm:px-8 lg:px-10">
      <div className="mb-16 flex justify-end gap-3">
        <button
          onClick={() => showToast("QR codes aren't generated in this demo — share the link instead", "info")}
          aria-label="Show QR code"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
        >
          <QrCode size={18} />
        </button>
        <button
          onClick={() => setCustomising((c) => !c)}
          className="flex items-center gap-2 rounded-full bg-neutral-100 px-5 py-2.5 text-sm font-medium hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
        >
          <Pencil size={15} /> Customise link
        </button>
      </div>

      <h1 className="text-center text-[44px] font-bold leading-none tracking-tight sm:text-[72px]">Refer a host, earn cash</h1>

      {/* Three wide cards; the one you last picked gets the dark outline, as on the real page. */}
      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {REWARDS.map((r) => (
          <button
            key={r.kind}
            type="button"
            onClick={() => setPicked(r.kind)}
            className={`flex items-center justify-between gap-4 rounded-2xl border px-8 py-8 text-left transition-colors ${
              picked === r.kind ? "border-ink border-2 dark:border-white" : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800"
            }`}
          >
            <div>
              <p className="text-[18px] font-medium">{r.kind}</p>
              <p className="mt-1 text-[15px] text-hof dark:text-neutral-400">
                You&apos;ll earn {r.min === r.max ? formatPrice(r.min) : `${formatPrice(r.min)} – ${formatPrice(r.max)}`}
              </p>
            </div>
            <span aria-hidden="true" className="text-[56px] leading-none">
              {r.emoji}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-10 text-center">Loading...</p>
      ) : !user ? (
        <>
          {/* Logged out: the grey, disabled-looking share button the real page shows. Clicking opens login. */}
          <div className="mx-auto mt-10 max-w-xl">
            <button
              onClick={() => setAuthOpen(true)}
              className="w-full rounded-full bg-neutral-100 py-4 text-[15px] font-semibold text-neutral-400 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-500"
            >
              Share referral link
            </button>
            <p className="mt-3 text-center text-sm text-hof dark:text-neutral-400">
              <button onClick={() => setAuthOpen(true)} className="underline">
                Log in
              </button>{" "}
              to get your referral link.
            </p>
          </div>
          {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
        </>
      ) : (
        <>
          {customising && (
            <div className="mx-auto mt-8 flex max-w-xl flex-col gap-2 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800 sm:flex-row">
              <span className="flex items-center text-sm text-hof dark:text-neutral-400">{origin}/signup?ref=</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
              />
              <button onClick={saveSlug} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-ink">
                Save
              </button>
            </div>
          )}

          <div className="mx-auto mt-8 max-w-xl">
            <input
              readOnly
              value={link}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-center text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <button
              onClick={copy}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-neutral-100 py-3.5 font-semibold hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Share referral link"}
            </button>
          </div>

          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
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
              <ul className="mt-4 space-y-1 text-sm text-hof dark:text-neutral-400">
                {invites.map((i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
                    {i} <span className="text-xs">Pending</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <p className="mx-auto mt-24 max-w-3xl border-t border-neutral-200 pt-8 text-center text-[15px] text-hof dark:border-neutral-800 dark:text-neutral-400">
        Only for airhome members. Eligible locations and listing types only. Amounts expire on {expiry}.{" "}
        <Link href="/info/terms" className="font-medium text-ink underline dark:text-white">
          Terms apply
        </Link>
        <span className="mt-2 block text-xs">Rewards in this demo are illustrative and are never paid out.</span>
      </p>
    </div>
  );
}
