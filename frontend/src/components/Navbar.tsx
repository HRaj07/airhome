"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  Menu,
  Globe,
  HelpCircle,
  Home as HomeIcon,
  PartyPopper,
  ConciergeBell,
  Sun,
  Moon,
  UserPlus,
  Users,
  LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/lib/toast-context";
import HeaderSearch from "./HeaderSearch";
import LocaleModal from "./LocaleModal";

type Tab = "all" | "homes" | "experiences" | "services";

const TABS: { key: Tab; label: string; icon: LucideIcon; live: boolean }[] = [
  { key: "all", label: "All", icon: Globe, live: true },
  { key: "homes", label: "Homes", icon: HomeIcon, live: true },
  { key: "experiences", label: "Experiences", icon: PartyPopper, live: false },
  { key: "services", label: "Services", icon: ConciergeBell, live: false },
];

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [atTop, setAtTop] = useState(true);
  const [manualExpand, setManualExpand] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isHome = pathname === "/";
  const expanded = (isHome && atTop) || manualExpand;
  const overlay = expanded && !(isHome && atTop);

  useEffect(() => {
    function onScroll() {
      const top = window.scrollY < 24;
      setAtTop(top);
      if (!top) setManualExpand(false);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setManualExpand(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const collapse = useCallback(() => setManualExpand(false), []);
  const expand = useCallback(() => setManualExpand(true), []);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    showToast("Logged out successfully", "success");
    router.push("/");
  }

  function comingSoon(feature: string) {
    setMenuOpen(false);
    showToast(`${feature} is coming soon`, "info");
  }

  function selectTab(t: Tab, live: boolean) {
    if (!live) {
      showToast(`${t === "experiences" ? "Experiences" : "Services"} are coming soon`, "info");
      return;
    }
    setTab(t);
  }

  const hostHref = user?.is_host ? "/host/dashboard" : "/signup?host=1";
  const hostLabel = user?.is_host ? "Switch to hosting" : "Become a host";

  const menuItem =
    "flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="relative mx-auto max-w-[1760px] px-4 sm:px-6 lg:px-10">
          <div className="flex h-20 items-center justify-between gap-3">
            {/* Logo */}
            <Link href="/" className="flex shrink-0 items-center gap-1.5 text-rausch" aria-label="airhome home">
              <HomeIcon size={30} strokeWidth={2.4} />
              <span className="hidden text-[22px] font-bold tracking-tight md:inline">airhome</span>
            </Link>

            {/* Center: tabs when expanded, compact pill otherwise */}
            <div className="flex min-w-0 flex-1 justify-center">
              {expanded ? (
                <nav className="hidden items-center gap-8 md:flex" aria-label="Browse categories">
                  {TABS.map(({ key, label, icon: Icon, live }) => (
                    <button
                      key={key}
                      onClick={() => selectTab(key, live)}
                      className={`flex items-center gap-2 border-b-2 pb-2 pt-3 text-[15px] transition-colors ${
                        tab === key
                          ? "border-ink font-semibold text-ink dark:border-white dark:text-white"
                          : "border-transparent text-hof hover:border-neutral-300 hover:text-ink dark:text-neutral-400 dark:hover:text-white"
                      }`}
                    >
                      <Icon size={22} strokeWidth={tab === key ? 2.2 : 1.6} />
                      {label}
                    </button>
                  ))}
                </nav>
              ) : (
                <Suspense fallback={null}>
                  <HeaderSearch expanded={false} onExpand={expand} onCollapse={collapse} />
                </Suspense>
              )}
            </div>

            {/* Right actions */}
            <div className="flex shrink-0 items-center gap-1">
              <Link
                href={hostHref}
                className="hidden rounded-full px-4 py-2.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:block"
              >
                {hostLabel}
              </Link>
              <button
                onClick={() => setLocaleOpen(true)}
                aria-label="Choose a language and currency"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              >
                <Globe size={18} />
              </button>

              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="Open menu"
                  aria-expanded={menuOpen}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                >
                  <Menu size={18} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-neutral-200 bg-white py-2 shadow-popover dark:border-neutral-700 dark:bg-neutral-900">
                    {loading ? (
                      <p className="px-4 py-3 text-sm text-hof">Loading...</p>
                    ) : (
                      <>
                        {user && (
                          <div className="border-b border-neutral-200 px-4 pb-3 pt-2 dark:border-neutral-800">
                            <p className="font-semibold">{user.full_name}</p>
                            <p className="text-xs text-hof dark:text-neutral-400">{user.is_host ? "Host account" : "Guest account"}</p>
                          </div>
                        )}

                        <button onClick={() => comingSoon("Help Centre")} className={menuItem}>
                          <HelpCircle size={20} strokeWidth={1.6} /> Help Centre
                        </button>

                        {user && (
                          <div className="border-t border-neutral-200 dark:border-neutral-800">
                            <Link href="/trips" onClick={() => setMenuOpen(false)} className={menuItem}>
                              Trips
                            </Link>
                            <Link href="/wishlist" onClick={() => setMenuOpen(false)} className={menuItem}>
                              Wishlist
                            </Link>
                            {user.is_host && (
                              <Link href="/host/dashboard" onClick={() => setMenuOpen(false)} className={menuItem}>
                                Host dashboard
                              </Link>
                            )}
                          </div>
                        )}

                        <div className="border-t border-neutral-200 dark:border-neutral-800">
                          <Link href={hostHref} onClick={() => setMenuOpen(false)} className={`${menuItem} items-start py-3.5`}>
                            <div className="flex-1">
                              <p className="font-medium">{hostLabel}</p>
                              <p className="text-xs text-hof dark:text-neutral-400">
                                {user?.is_host ? "Manage your listings and bookings." : "It's easy to start hosting and earn extra income."}
                              </p>
                            </div>
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rausch/10 text-rausch">
                              <HomeIcon size={20} />
                            </span>
                          </Link>
                        </div>

                        <div className="border-t border-neutral-200 dark:border-neutral-800">
                          <button onClick={() => comingSoon("Refer a host")} className={menuItem}>
                            <UserPlus size={20} strokeWidth={1.6} /> Refer a host
                          </button>
                          <button onClick={() => comingSoon("Find a co-host")} className={menuItem}>
                            <Users size={20} strokeWidth={1.6} /> Find a co-host
                          </button>
                          <button onClick={toggleTheme} className={menuItem}>
                            {theme === "dark" ? <Sun size={20} strokeWidth={1.6} /> : <Moon size={20} strokeWidth={1.6} />}
                            {theme === "dark" ? "Light mode" : "Dark mode"}
                          </button>
                        </div>

                        <div className="border-t border-neutral-200 dark:border-neutral-800">
                          {user ? (
                            <button onClick={handleLogout} className={menuItem}>
                              Log out
                            </button>
                          ) : (
                            <Link href="/login" onClick={() => setMenuOpen(false)} className={menuItem}>
                              Log in or sign up
                            </Link>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expanded search bar: in-flow at the top of the home page, overlaid elsewhere */}
          {expanded && (
            <div
              className={
                overlay
                  ? "absolute left-0 right-0 top-full border-b border-neutral-200 bg-white px-4 pb-5 pt-2 dark:border-neutral-800 dark:bg-neutral-950 sm:px-6 lg:px-10"
                  : "pb-5"
              }
            >
              <Suspense fallback={null}>
                <HeaderSearch expanded onExpand={expand} onCollapse={collapse} />
              </Suspense>
            </div>
          )}
        </div>
      </header>

      {overlay && <div className="fixed inset-0 z-30 bg-black/30" onClick={collapse} aria-hidden="true" />}
      {localeOpen && <LocaleModal onClose={() => setLocaleOpen(false)} />}
    </>
  );
}
