"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Menu, Globe, HelpCircle, Home as HomeIcon, Sun, Moon, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/lib/toast-context";
import HeaderSearch, { SearchMode } from "./HeaderSearch";
import LocaleModal from "./LocaleModal";
import { useLocale } from "@/lib/locale-context";

type Tab = "all" | "homes" | "experiences" | "services";

/** Colourful illustrated tab icons (emoji render as full-colour glyphs on every platform). */
const TABS: { key: Tab; label: string; emoji: string; href: string }[] = [
  { key: "all", label: "All", emoji: "🌍", href: "/" },
  { key: "homes", label: "Homes", emoji: "🏠", href: "/homes" },
  { key: "experiences", label: "Experiences", emoji: "🎈", href: "/experiences" },
  { key: "services", label: "Services", emoji: "🛎️", href: "/services" },
];

/** Which tab is active, and which search mode the header uses, for a pathname. */
function tabForPath(pathname: string): { tab: Tab; mode: SearchMode; isTabRoot: boolean } {
  if (pathname === "/") return { tab: "all", mode: "homes", isTabRoot: true };
  if (pathname === "/homes") return { tab: "homes", mode: "homes", isTabRoot: true };
  if (pathname === "/experiences") return { tab: "experiences", mode: "experiences", isTabRoot: true };
  if (pathname === "/services") return { tab: "services", mode: "services", isTabRoot: true };
  if (pathname.startsWith("/experiences/")) return { tab: "experiences", mode: "experiences", isTabRoot: false };
  if (pathname.startsWith("/services/")) return { tab: "services", mode: "services", isTabRoot: false };
  return { tab: "homes", mode: "homes", isTabRoot: false };
}

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [manualExpand, setManualExpand] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { tab, mode, isTabRoot } = tabForPath(pathname || "/");
  const isHome = isTabRoot;
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

  const hostHref = user?.is_host ? "/host/dashboard" : "/signup?host=1";
  const hostLabel = user?.is_host ? t("Switch to hosting") : t("Become a host");

  const menuItem =
    "flex w-full items-center gap-3 px-5 py-3.5 text-left text-[15px] hover:bg-neutral-100 dark:hover:bg-neutral-800";

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b border-neutral-200 dark:border-neutral-800 dark:bg-neutral-950 ${
          expanded && !overlay ? "bg-[#f7f7f7]" : "bg-white"
        }`}
      >
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
                  {TABS.map(({ key, label, icon: Icon, href }) => (
                    <Link
                      key={key}
                      href={href}
                      className={`flex items-center gap-2 border-b-2 pb-2 pt-3 text-[15px] transition-colors ${
                        tab === key
                          ? "border-ink font-semibold text-ink dark:border-white dark:text-white"
                          : "border-transparent text-hof hover:border-neutral-300 hover:text-ink dark:text-neutral-400 dark:hover:text-white"
                      }`}
                    >
                      <Icon size={22} strokeWidth={tab === key ? 2.2 : 1.6} />
                      {t(label)}
                    </Link>
                  ))}
                </nav>
              ) : (
                <Suspense fallback={null}>
                  <HeaderSearch mode={mode} expanded={false} onExpand={expand} onCollapse={collapse} />
                </Suspense>
              )}
            </div>

            {/* Right actions */}
            <div className="flex shrink-0 items-center gap-1">
              {user ? (
                <Link href={hostHref} className="hidden rounded-full px-4 py-2.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:block">
                  {hostLabel}
                </Link>
              ) : (
                <Link href="/login" className="hidden rounded-full px-4 py-2.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:block">
                  {t("Log in or sign up")}
                </Link>
              )}
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
                  <div className="absolute right-0 top-full z-50 mt-3 w-[360px] overflow-hidden rounded-2xl bg-white py-2 shadow-popover dark:bg-neutral-900">
                    {loading ? (
                      <p className="px-4 py-3 text-sm text-hof">Loading...</p>
                    ) : (
                      <>
                        {user && (
                          <div className="border-b border-neutral-200 px-4 pb-3 pt-2 dark:border-neutral-800">
                            <p className="font-semibold">{user.full_name}</p>
                            <p className="text-xs text-hof dark:text-neutral-400">{user.is_host ? t("Host account") : t("Guest account")}</p>
                          </div>
                        )}

                        <Link href="/help" onClick={() => setMenuOpen(false)} className={menuItem}>
                          <HelpCircle size={20} strokeWidth={1.6} /> {t("Help Centre")}
                        </Link>

                        {user && (
                          <div className="border-t border-neutral-200 dark:border-neutral-800">
                            <Link href="/trips" onClick={() => setMenuOpen(false)} className={menuItem}>
                              {t("Trips")}
                            </Link>
                            <Link href="/wishlist" onClick={() => setMenuOpen(false)} className={menuItem}>
                              {t("Wishlist")}
                            </Link>
                            {user.is_host && (
                              <Link href="/host/dashboard" onClick={() => setMenuOpen(false)} className={menuItem}>
                                {t("Host dashboard")}
                              </Link>
                            )}
                          </div>
                        )}

                        <div className="border-t border-neutral-200 dark:border-neutral-800">
                          <Link href={hostHref} onClick={() => setMenuOpen(false)} className={`${menuItem} items-start py-3.5`}>
                            <div className="flex-1">
                              <p className="font-medium">{hostLabel}</p>
                              <p className="text-xs text-hof dark:text-neutral-400">
                                {user?.is_host ? t("Manage your listings and bookings.") : t("It's easy to start hosting and earn extra income.")}
                              </p>
                            </div>
                            <span aria-hidden="true" className="text-4xl leading-none">🧑‍💼</span>
                          </Link>
                        </div>

                        <div className="border-t border-neutral-200 dark:border-neutral-800">
                          <Link href="/refer" onClick={() => setMenuOpen(false)} className={menuItem}>
                            <UserPlus size={20} strokeWidth={1.6} /> {t("Refer a host")}
                          </Link>
                          <Link href="/co-host" onClick={() => setMenuOpen(false)} className={menuItem}>
                            <Users size={20} strokeWidth={1.6} /> {t("Find a co-host")}
                          </Link>
                        </div>

                        <div className="border-t border-neutral-200 dark:border-neutral-800">
                          {user ? (
                            <button onClick={handleLogout} className={menuItem}>
                              {t("Log out")}
                            </button>
                          ) : (
                            <Link href="/login" onClick={() => setMenuOpen(false)} className={menuItem}>
                              {t("Log in or sign up")}
                            </Link>
                          )}
                        </div>

                        <div className="border-t border-neutral-200 dark:border-neutral-800">
                          <button onClick={toggleTheme} className={menuItem}>
                            {theme === "dark" ? <Sun size={20} strokeWidth={1.6} /> : <Moon size={20} strokeWidth={1.6} />}
                            {theme === "dark" ? t("Light mode") : t("Dark mode")}
                          </button>
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
                <HeaderSearch mode={mode} expanded onExpand={expand} onCollapse={collapse} />
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
