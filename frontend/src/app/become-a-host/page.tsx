"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home as HomeIcon } from "lucide-react";
import { listingsApi, usersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { resumeStep, wizardHref } from "@/lib/hosting";
import type { ListingCard } from "@/lib/types";

/**
 * /become-a-host — Airbnb's overview screen: "It's easy to get started on
 * Airbnb", the three numbered steps, and a "Get started" button that creates
 * the draft and drops you into step 1. If you already have unfinished drafts
 * they're offered first, so you don't end up with three half-made listings.
 */
export default function BecomeAHostOverview() {
  const { user, loading: authLoading, refresh } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [drafts, setDrafts] = useState<ListingCard[]>([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?next=/become-a-host");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.is_host) listingsApi.drafts().then(setDrafts).catch(() => setDrafts([]));
  }, [user]);

  async function start() {
    setStarting(true);
    try {
      if (user && !user.is_host) {
        await usersApi.updateMe({ is_host: true });
        await refresh();
      }
      const draft = await listingsApi.createDraft();
      router.push(wizardHref(draft.id, "about-your-place"));
    } catch {
      showToast("Couldn't start your listing just now — please try again", "error");
      setStarting(false);
    }
  }

  const steps = [
    { n: 1, title: "Tell us about your place", body: "Share some basic info, such as where it is and how many guests can stay.", emoji: "🛏️" },
    { n: 2, title: "Make it stand out", body: "Add 5 or more photos plus a title and description – we'll help you out.", emoji: "🖼️" },
    { n: 3, title: "Finish up and publish", body: "Choose a starting price, verify a few details, then publish your listing.", emoji: "🚪" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-neutral-950">
      <header className="flex h-20 items-center justify-between px-6 sm:px-10 lg:px-14">
        <Link href="/" className="flex items-center text-rausch" aria-label="airhome home">
          <HomeIcon size={30} strokeWidth={2.4} />
        </Link>
        <Link href="/hosting/listings" className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
          Exit
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-10 pb-32 lg:grid-cols-2 lg:px-14">
        <h1 className="text-4xl font-medium leading-tight sm:text-5xl">It&apos;s easy to get started on airhome</h1>
        <ol className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {steps.map((s) => (
            <li key={s.n} className="flex items-start gap-5 py-7">
              <span className="w-6 pt-0.5 text-xl font-medium">{s.n}</span>
              <span className="flex-1">
                <span className="block text-xl font-medium">{s.title}</span>
                <span className="mt-1 block text-base text-hof dark:text-neutral-400">{s.body}</span>
              </span>
              <span className="text-5xl leading-none" aria-hidden="true">
                {s.emoji}
              </span>
            </li>
          ))}
        </ol>

        {drafts.length > 0 && (
          <div className="lg:col-span-2">
            <h2 className="text-lg font-medium">Finish a listing you started</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {drafts.map((d) => (
                <li key={d.id}>
                  <Link
                    href={wizardHref(d.id, resumeStep(d))}
                    className="flex items-center gap-4 rounded-xl border border-neutral-300 p-3 hover:border-ink dark:border-neutral-700 dark:hover:border-white"
                  >
                    <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                      {d.cover_photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.cover_photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <HomeIcon size={22} className="text-hof" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{d.title || "Your listing"}</span>
                      <span className="block text-sm text-hof dark:text-neutral-400">{d.city ? `${d.city} · ` : ""}In progress</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-950 sm:px-10 lg:px-14">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={start}
            disabled={starting || authLoading}
            className="rounded-lg bg-rausch px-8 py-3.5 text-base font-semibold text-white transition hover:bg-rausch_dark disabled:opacity-50"
          >
            {starting ? "Starting…" : "Get started"}
          </button>
        </div>
      </footer>
    </div>
  );
}
