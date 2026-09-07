"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, MoreHorizontal, Home as HomeIcon } from "lucide-react";
import { experiencesApi, hostApi, listingsApi } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { useLocale } from "@/lib/locale-context";
import { resumeStep, wizardHref } from "@/lib/hosting";
import type { HostDashboard, HostExperienceSummary, HostListingSummary, ListingCard, ListingStatus } from "@/lib/types";
import ConfirmDialog from "@/components/ConfirmDialog";
import HostTypeModal from "@/components/HostTypeModal";

type Row = {
  key: string;
  id: number;
  kind: "home" | "experience" | "service";
  title: string;
  cover: string;
  location: string;
  status: ListingStatus;
  bookings: number;
  revenue: number;
  price: number;
  wizardStep?: string;
};

const STATUS: Record<ListingStatus, { label: string; dot: string }> = {
  published: { label: "Listed", dot: "bg-emerald-500" },
  draft: { label: "In progress", dot: "bg-amber-400" },
  unlisted: { label: "Unlisted", dot: "bg-neutral-400" },
};

/**
 * /hosting/listings — Airbnb's listings table: every home, experience and
 * service you host with its status, plus drafts you can pick back up. The
 * row menu lists/unlists, edits, previews and deletes.
 */
export default function HostListingsPage() {
  const { showToast } = useToast();
  const { formatPrice } = useLocale();
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [chooser, setChooser] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    Promise.all([hostApi.dashboard(), listingsApi.drafts().catch(() => [] as ListingCard[])])
      .then(([d, drafts]: [HostDashboard, ListingCard[]]) => {
        const homes: Row[] = d.listings.map((l: HostListingSummary) => ({
          key: `home-${l.id}`,
          id: l.id,
          kind: "home",
          title: l.title || "Untitled listing",
          cover: l.cover_photo_url,
          location: [l.city, l.country].filter(Boolean).join(", "),
          status: l.status ?? "published",
          bookings: l.booking_count,
          revenue: l.revenue,
          price: l.price_per_night,
          wizardStep: l.wizard_step,
        }));
        const seen = new Set(homes.map((h) => h.id));
        const draftRows: Row[] = drafts
          .filter((x) => !seen.has(x.id))
          .map((x) => ({
            key: `home-${x.id}`,
            id: x.id,
            kind: "home",
            title: x.title || "Untitled listing",
            cover: x.cover_photo_url,
            location: [x.city, x.country].filter(Boolean).join(", "),
            status: "draft",
            bookings: 0,
            revenue: 0,
            price: x.price_per_night,
            wizardStep: x.wizard_step,
          }));
        const exp = (items: HostExperienceSummary[], kind: "experience" | "service"): Row[] =>
          items.map((e) => ({
            key: `${kind}-${e.id}`,
            id: e.id,
            kind,
            title: e.title,
            cover: e.cover_photo_url,
            location: [e.city, e.country].filter(Boolean).join(", "),
            status: "published",
            bookings: e.booking_count,
            revenue: e.revenue,
            price: e.price_per_guest,
          }));
        setRows([...draftRows, ...homes, ...exp(d.experiences, "experience"), ...exp(d.services, "service")]);
      })
      .catch(() => showToast("Couldn't load your listings", "error"))
      .finally(() => setLoaded(true));
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function close() {
      setMenuFor(null);
    }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  async function toggleStatus(row: Row) {
    setBusy(true);
    try {
      await listingsApi.setStatus(row.id, row.status === "published" ? "unlisted" : "published");
      showToast(row.status === "published" ? "Listing hidden from search" : "Listing is live again", "success");
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't update that listing", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await (deleteTarget.kind === "home" ? listingsApi.remove(deleteTarget.id) : experiencesApi.remove(deleteTarget.id));
      showToast("Deleted", "success");
      setDeleteTarget(null);
      load();
    } catch {
      showToast("Couldn't delete that", "error");
    } finally {
      setBusy(false);
    }
  }

  const q = query.trim().toLowerCase();
  const visible = q ? rows.filter((r) => r.title.toLowerCase().includes(q) || r.location.toLowerCase().includes(q)) : rows;

  function editHref(r: Row) {
    if (r.kind === "home") return r.status === "draft" ? wizardHref(r.id, resumeStep({ wizard_step: r.wizardStep })) : `/host/listings/${r.id}/edit`;
    return r.kind === "experience" ? `/experiences/${r.id}` : `/services/${r.id}`;
  }
  function previewHref(r: Row) {
    return r.kind === "home" ? `/listing/${r.id}` : r.kind === "experience" ? `/experiences/${r.id}` : `/services/${r.id}`;
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Your listings</h1>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2 dark:border-neutral-700">
            <Search size={16} className="text-hof" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search listings" className="w-40 bg-transparent text-sm outline-none" />
          </label>
          <button
            type="button"
            onClick={() => setChooser(true)}
            aria-label="Create a new listing"
            className="grid h-10 w-10 place-items-center rounded-full border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {!loaded ? (
        <div className="mt-8 h-64 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900" />
      ) : visible.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
          <HomeIcon size={40} strokeWidth={1.2} className="text-hof" />
          <p className="mt-4 font-medium">{q ? "No listings match that search." : "You haven't created any listings yet."}</p>
          {!q && (
            <button type="button" onClick={() => setChooser(true)} className="mt-4 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-ink">
              Create a listing
            </button>
          )}
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-hof dark:text-neutral-400">
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-3 pr-4 font-medium">Listing</th>
                <th className="py-3 pr-4 font-medium">Type</th>
                <th className="py-3 pr-4 font-medium">Location</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 text-right font-medium">Price</th>
                <th className="py-3 pr-4 text-right font-medium">Bookings</th>
                <th className="py-3 pr-4 text-right font-medium">Earned</th>
                <th className="py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {visible.map((r) => (
                <tr key={r.key} className="group">
                  <td className="py-4 pr-4">
                    <Link href={editHref(r)} className="flex items-center gap-3 hover:underline">
                      <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                        {r.cover && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.cover} alt="" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="max-w-[260px] truncate font-medium">{r.title}</span>
                    </Link>
                  </td>
                  <td className="py-4 pr-4 capitalize text-hof dark:text-neutral-400">{r.kind}</td>
                  <td className="py-4 pr-4 text-hof dark:text-neutral-400">{r.location || "—"}</td>
                  <td className="py-4 pr-4">
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${STATUS[r.status].dot}`} />
                      {STATUS[r.status].label}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-right tabular-nums">
                    {r.price > 0 ? formatPrice(r.price, { decimals: 0 }) : "—"}
                    <span className="text-xs text-hof"> /{r.kind === "home" ? "night" : "guest"}</span>
                  </td>
                  <td className="py-4 pr-4 text-right tabular-nums">{r.bookings}</td>
                  <td className="py-4 pr-4 text-right font-medium tabular-nums">{formatPrice(r.revenue, { decimals: 0 })}</td>
                  <td className="relative py-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuFor(menuFor === r.key ? null : r.key);
                      }}
                      aria-label="Listing actions"
                      className="grid h-9 w-9 place-items-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {menuFor === r.key && (
                      <div className="absolute right-0 top-full z-20 w-48 overflow-hidden rounded-xl bg-white py-1 text-left shadow-popover dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}>
                        <Link href={editHref(r)} className="block px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                          {r.status === "draft" ? "Continue setup" : "Edit listing"}
                        </Link>
                        {r.status !== "draft" && (
                          <Link href={previewHref(r)} className="block px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                            Preview listing
                          </Link>
                        )}
                        {r.kind === "home" && r.status !== "draft" && (
                          <>
                            <Link href={`/hosting/calendar?listing=${r.id}`} className="block px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                              Open calendar
                            </Link>
                            <button type="button" disabled={busy} onClick={() => toggleStatus(r)} className="block w-full px-4 py-2.5 text-left hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-800">
                              {r.status === "published" ? "Unlist" : "List"}
                            </button>
                          </>
                        )}
                        <button type="button" onClick={() => setDeleteTarget(r)} className="block w-full px-4 py-2.5 text-left text-rausch hover:bg-neutral-100 dark:hover:bg-neutral-800">
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {chooser && <HostTypeModal onClose={() => setChooser(false)} />}
      {deleteTarget && (
        <ConfirmDialog
          title={`Delete "${deleteTarget.title}"?`}
          description="This permanently removes the listing and its bookings. This can't be undone."
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={remove}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
