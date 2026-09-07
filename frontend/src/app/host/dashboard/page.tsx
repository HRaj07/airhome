"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, Trash2, DollarSign, CalendarCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useLocale } from "@/lib/locale-context";
import { experiencesApi, hostApi, listingsApi } from "@/lib/api";
import ConfirmDialog from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import type { HostDashboard, HostExperienceSummary } from "@/lib/types";

export default function HostDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { formatPrice } = useLocale();
  const router = useRouter();
  const [data, setData] = useState<HostDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  // Homes and experiences delete through different endpoints, so the target
  // carries its kind rather than just an id.
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; kind: "listing" | "experience" } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !user.is_host)) {
      router.replace("/login?next=/host/dashboard");
    }
  }, [authLoading, user, router]);

  function load() {
    hostApi
      .dashboard()
      .then(setData)
      .catch(() => showToast("Couldn't load dashboard", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user?.is_host) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleDelete() {
    if (!deleteTarget) return;
    const isListing = deleteTarget.kind === "listing";
    setDeleting(true);
    try {
      await (isListing ? listingsApi.remove(deleteTarget.id) : experiencesApi.remove(deleteTarget.id));
      showToast(isListing ? "Listing deleted" : "Removed", "success");
      setDeleteTarget(null);
      load();
    } catch {
      showToast("Couldn't delete that", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (authLoading || !user || loading || !data) {
    return <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">Loading...</div>;
  }

  // Every kind of offering counts towards the headline numbers.
  const offerings = [...data.experiences, ...data.services];
  const totalRevenue =
    data.listings.reduce((sum, l) => sum + l.revenue, 0) + offerings.reduce((sum, e) => sum + e.revenue, 0);
  const totalBookings =
    data.listings.reduce((sum, l) => sum + l.booking_count, 0) + offerings.reduce((sum, e) => sum + e.booking_count, 0);
  const activeCount = data.listings.length + offerings.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Host dashboard</h1>
        <Link href="/host/listings/new" className="flex items-center gap-2 rounded-lg bg-rausch px-4 py-2.5 text-sm font-semibold text-white hover:bg-rausch_dark">
          <Plus size={16} /> Create listing
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<DollarSign size={20} />} label="Total revenue" value={formatPrice(totalRevenue, { decimals: 2 })} />
        <StatCard icon={<CalendarCheck size={20} />} label="Confirmed bookings" value={String(totalBookings)} />
        <StatCard icon={<Pencil size={20} />} label="Active listings" value={String(activeCount)} />
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">Your listings</h2>
        {data.listings.length === 0 ? (
          <EmptyState title="No listings yet" description="Create your first listing to start hosting." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-hof dark:border-neutral-800 dark:text-neutral-400">
                  <th className="py-2 pr-4 font-medium">Listing</th>
                  <th className="py-2 pr-4 font-medium">Price/night</th>
                  <th className="py-2 pr-4 font-medium">Bookings</th>
                  <th className="py-2 pr-4 font-medium">Revenue</th>
                  <th className="py-2 pr-4 font-medium">Rating</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.listings.map((l) => (
                  <tr key={l.id} className="border-b border-neutral-100 dark:border-neutral-900">
                    <td className="py-3 pr-4">
                      <Link href={`/listing/${l.id}`} className="flex items-center gap-3 hover:underline">
                        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
                          {l.cover_photo_url && <Image src={l.cover_photo_url} alt={l.title} fill sizes="64px" className="object-cover" />}
                        </div>
                        <span className="max-w-[200px] truncate">{l.title}</span>
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{formatPrice(l.price_per_night)}</td>
                    <td className="py-3 pr-4">{l.booking_count}</td>
                    <td className="py-3 pr-4">{formatPrice(l.revenue, { decimals: 2 })}</td>
                    <td className="py-3 pr-4">{l.review_count > 0 ? l.rating_avg.toFixed(1) : "New"}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/host/listings/${l.id}/edit`}
                          aria-label="Edit listing"
                          className="rounded-lg border border-neutral-300 p-2 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                        >
                          <Pencil size={14} />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget({ id: l.id, kind: "listing" })}
                          aria-label="Delete listing"
                          className="rounded-lg border border-neutral-300 p-2 hover:bg-rausch/5 hover:text-rausch dark:border-neutral-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ExperienceTable
        heading="Your experiences"
        emptyTitle="No experiences yet"
        emptyDescription="Host an experience to show guests around."
        createHref="/setup/experiences/create"
        createLabel="Create experience"
        basePath="experiences"
        rows={data.experiences}
        onDelete={(id) => setDeleteTarget({ id, kind: "experience" })}
      />

      <ExperienceTable
        heading="Your services"
        emptyTitle="No services yet"
        emptyDescription="Offer a service guests can book during their stay."
        createHref="/setup/services/create"
        createLabel="Create service"
        basePath="services"
        rows={data.services}
        onDelete={(id) => setDeleteTarget({ id, kind: "experience" })}
      />

      <section>
        <h2 className="mb-4 text-lg font-semibold">Upcoming bookings</h2>
        {data.upcoming_bookings.length === 0 ? (
          <p className="text-sm text-hof dark:text-neutral-400">No upcoming bookings.</p>
        ) : (
          <div className="space-y-3">
            {data.upcoming_bookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800">
                <div>
                  <p className="font-medium">{b.listing.title}</p>
                  <p className="text-hof dark:text-neutral-400">
                    {b.check_in} → {b.check_out} · {b.guests_count} guest{b.guests_count > 1 ? "s" : ""}
                  </p>
                </div>
                <p className="font-semibold">{formatPrice(b.total_price, { decimals: 2 })}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {deleteTarget && (
        <ConfirmDialog
          title={deleteTarget.kind === "listing" ? "Delete this listing?" : "Delete this from your listings?"}
          description="This permanently removes it, along with its bookings. This cannot be undone."
          confirmLabel="Delete"
          danger
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rausch/10 text-rausch">{icon}</div>
      <div>
        <p className="text-sm text-hof dark:text-neutral-400">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

/**
 * One host section for experiences or services. They share a shape — the only
 * differences are the wording and which detail route a row links to.
 */
function ExperienceTable({
  heading,
  emptyTitle,
  emptyDescription,
  createHref,
  createLabel,
  basePath,
  rows,
  onDelete,
}: {
  heading: string;
  emptyTitle: string;
  emptyDescription: string;
  createHref: string;
  createLabel: string;
  basePath: "experiences" | "services";
  rows: HostExperienceSummary[];
  onDelete: (id: number) => void;
}) {
  const { formatPrice } = useLocale();

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{heading}</h2>
        <Link
          href={createHref}
          className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          <Plus size={14} /> {createLabel}
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-hof dark:border-neutral-800 dark:text-neutral-400">
                <th className="py-2 pr-4 font-medium">Title</th>
                <th className="py-2 pr-4 font-medium">Category</th>
                <th className="py-2 pr-4 font-medium">City</th>
                <th className="py-2 pr-4 font-medium">Price</th>
                <th className="py-2 pr-4 font-medium">Bookings</th>
                <th className="py-2 pr-4 font-medium">Revenue</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-neutral-100 dark:border-neutral-900">
                  <td className="py-3 pr-4">
                    <Link href={`/${basePath}/${e.id}`} className="flex items-center gap-3 hover:underline">
                      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
                        {e.cover_photo_url && <Image src={e.cover_photo_url} alt={e.title} fill sizes="64px" className="object-cover" />}
                      </div>
                      <span className="max-w-[200px] truncate">{e.title}</span>
                    </Link>
                  </td>
                  <td className="py-3 pr-4">{e.category}</td>
                  <td className="py-3 pr-4">{e.city}</td>
                  <td className="py-3 pr-4">
                    {formatPrice(e.price_per_guest)}
                    <span className="text-hof dark:text-neutral-400"> / {e.price_unit}</span>
                  </td>
                  <td className="py-3 pr-4">{e.booking_count}</td>
                  <td className="py-3 pr-4">{formatPrice(e.revenue, { decimals: 2 })}</td>
                  <td className="py-3">
                    <button
                      onClick={() => onDelete(e.id)}
                      aria-label={`Delete ${e.title}`}
                      className="rounded-lg border border-neutral-300 p-2 hover:bg-rausch/5 hover:text-rausch dark:border-neutral-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
