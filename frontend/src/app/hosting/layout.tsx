"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home as HomeIcon, Menu, Bell, Plus, ArrowLeftRight, HelpCircle, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import HostTypeModal from "@/components/HostTypeModal";

/**
 * The hosting area, /hosting/*: Airbnb's separate host-mode header (Today,
 * Calendar, Listings, Reservations, Earnings, Insights, Menu) over each page.
 * The guest Navbar and Footer hide themselves on these routes.
 */
const NAV: { href: string; label: string; exact?: boolean }[] = [
  { href: "/hosting", label: "Today", exact: true },
  { href: "/hosting/calendar", label: "Calendar" },
  { href: "/hosting/listings", label: "Listings" },
  { href: "/hosting/reservations", label: "Reservations" },
  { href: "/hosting/earnings", label: "Earnings" },
  { href: "/hosting/insights", label: "Insights" },
];

export default function HostingLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname() || "/hosting";
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [chooser, setChooser] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (!user.is_host) router.replace("/become-a-host");
  }, [loading, user, router, pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (loading || !user?.is_host) {
    return <div className="grid min-h-screen place-items-center text-hof">Loading…</div>;
  }

  const item = "flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] hover:bg-neutral-100 dark:hover:bg-neutral-800";

  return (
    <div className="flex min-h-screen flex-col bg-white text-ink dark:bg-neutral-950 dark:text-white">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto flex h-20 max-w-[1760px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <Link href="/hosting" className="flex shrink-0 items-center gap-1.5 text-rausch" aria-label="Hosting home">
            <HomeIcon size={30} strokeWidth={2.4} />
            <span className="hidden text-[22px] font-bold tracking-tight md:inline">airhome</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Hosting">
            {NAV.map((n) => {
              const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
                    active ? "bg-neutral-100 text-ink dark:bg-neutral-800 dark:text-white" : "text-hof hover:bg-neutral-100 hover:text-ink dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/" className="hidden rounded-full px-4 py-2.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 md:block">
              Switch to travelling
            </Link>
            <Link href="/hosting/reservations" aria-label="Notifications" className="grid h-10 w-10 place-items-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <Bell size={18} />
            </Link>
            <Link href="/profile" aria-label="Your profile" className="grid h-10 w-10 place-items-center rounded-full bg-rausch/10 text-sm font-semibold text-rausch_dark">
              {user.full_name.charAt(0).toUpperCase()}
            </Link>
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Open hosting menu"
                aria-expanded={menuOpen}
                className="flex h-10 items-center gap-2 rounded-full border border-neutral-300 px-3 hover:shadow-card dark:border-neutral-700"
              >
                <Menu size={16} />
                <span className="hidden text-sm font-medium sm:inline">Menu</span>
                <ChevronDown size={14} className="hidden sm:inline" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-3 w-72 overflow-hidden rounded-2xl bg-white py-2 shadow-popover dark:bg-neutral-900">
                  <div className="lg:hidden">
                    {NAV.map((n) => (
                      <Link key={n.href} href={n.href} className={item}>
                        {n.label}
                      </Link>
                    ))}
                    <div className="my-2 border-t border-neutral-200 dark:border-neutral-800" />
                  </div>
                  <button type="button" onClick={() => { setMenuOpen(false); setChooser(true); }} className={item}>
                    <Plus size={18} /> Create a new listing
                  </button>
                  <Link href="/host/homes" className={item}>
                    <HelpCircle size={18} /> Hosting resources
                  </Link>
                  <div className="my-2 border-t border-neutral-200 dark:border-neutral-800" />
                  <Link href="/" className={item}>
                    <ArrowLeftRight size={18} /> Switch to travelling
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
      {chooser && <HostTypeModal onClose={() => setChooser(false)} />}
    </div>
  );
}
