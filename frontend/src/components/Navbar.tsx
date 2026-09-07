"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Menu, Globe, HelpCircle, Home as HomeIcon, Sun, Moon, UserPlus, Users, Gift, Heart, UserRound, Briefcase } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/lib/toast-context";
import HeaderSearch, { SearchMode } from "./HeaderSearch";
import LocaleModal from "./LocaleModal";
import AuthModal from "./AuthModal";
import { useLocale } from "@/lib/locale-context";

type Tab = "all" | "homes" | "experiences" | "services";

/**
 * A hot air balloon, drawn rather than typed: Unicode has no hot air balloon
 * emoji (U+1F388 is a party balloon on a string), so the only way to get one
 * next to "Experiences" is to draw it. Original artwork — curved gore seams
 * and a left-hand highlight do the work of making a flat shape read as round.
 */
function HotAirBalloon({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={Math.round((size * 44) / 62)}
      height={size}
      viewBox="0 0 44 62"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <clipPath id="airhome-balloon-envelope">
          <path d="M22 2c11.5 0 20 9 20 20.5 0 9.5-5.5 17.5-11.5 22.5h-17C7.5 40 2 32 2 22.5 2 11 10.5 2 22 2Z" />
        </clipPath>
        <clipPath id="airhome-balloon-basket">
          <path d="M16.4 51.4h11.2a1.1 1.1 0 0 1 1.1 1.2l-.7 6.1a2.1 2.1 0 0 1-2.1 1.9h-7.8a2.1 2.1 0 0 1-2.1-1.9l-.7-6.1a1.1 1.1 0 0 1 1.1-1.2Z" />
        </clipPath>
        {/* Light falls from the upper left, so the right side falls away into shadow. */}
        <linearGradient id="airhome-balloon-shade" x1="0" y1="0" x2="1" y2="0.35">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      {/* ---- Envelope: alternating gores, then seams and shading over the top ---- */}
      <g clipPath="url(#airhome-balloon-envelope)">
        <rect x="2" y="0" width="8" height="48" fill="#A62A52" />
        <rect x="10" y="0" width="8" height="48" fill="#EE7B2D" />
        <rect x="18" y="0" width="8" height="48" fill="#C42C5C" />
        <rect x="26" y="0" width="8" height="48" fill="#EE7B2D" />
        <rect x="34" y="0" width="8" height="48" fill="#A62A52" />

        {/* Seams fan from the crown and converge at the mouth — this is what sells the volume. */}
        <g stroke="#00000026" strokeWidth="0.8" fill="none">
          <path d="M22 2Q10 22 14.5 45" />
          <path d="M22 2Q17 22 18.5 45" />
          <path d="M22 2Q27 22 25.5 45" />
          <path d="M22 2Q34 22 29.5 45" />
        </g>

        <rect x="0" y="0" width="44" height="48" fill="url(#airhome-balloon-shade)" />
        <ellipse cx="14" cy="16" rx="6" ry="9" fill="#fff" opacity="0.16" />
      </g>
      <path
        d="M22 2c11.5 0 20 9 20 20.5 0 9.5-5.5 17.5-11.5 22.5h-17C7.5 40 2 32 2 22.5 2 11 10.5 2 22 2Z"
        stroke="#00000022"
        strokeWidth="0.7"
      />

      {/* ---- Burner throat ---- */}
      <path d="M18.4 45h7.2l-.6 3.2h-6l-.6-3.2Z" fill="#8C8C8C" />
      <rect x="19.6" y="48" width="4.8" height="1.4" rx="0.5" fill="#6E6E6E" />

      {/* ---- Suspension lines ---- */}
      <path
        d="M15.6 45 17 51.4M28.4 45 27 51.4M20 48.6 19.4 51.4M24 48.6 24.6 51.4"
        stroke="#7A5433"
        strokeWidth="0.9"
        strokeLinecap="round"
      />

      {/* ---- Wicker basket ---- */}
      <g>
        <path
          d="M16.4 51.4h11.2a1.1 1.1 0 0 1 1.1 1.2l-.7 6.1a2.1 2.1 0 0 1-2.1 1.9h-7.8a2.1 2.1 0 0 1-2.1-1.9l-.7-6.1a1.1 1.1 0 0 1 1.1-1.2Z"
          fill="#B98046"
        />
        <g clipPath="url(#airhome-balloon-basket)" stroke="#00000030" strokeWidth="0.7">
          <path d="M15 54.2h14M15 56.6h14M15 59h14" />
          <path d="M18.6 51v10M22 51v10M25.4 51v10" />
        </g>
        <rect x="15.6" y="51" width="12.8" height="1.9" rx="0.9" fill="#8E5F33" />
      </g>
    </svg>
  );
}

/**
 * A library globe on a brass stand, for "All". Original artwork: the meridian
 * ring is drawn as a "C" bracket that clasps the sphere front-on, so its near
 * side crosses over — covers — the left half of the globe, the way the real
 * icon's ring wraps the sphere instead of floating behind it as a flat halo.
 */
function DeskGlobe({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={Math.round((size * 48) / 56)}
      height={size}
      viewBox="0 0 48 56"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <clipPath id="airhome-globe-sphere">
          <circle cx="25" cy="23" r="13.5" />
        </clipPath>
        <linearGradient id="airhome-globe-shade" x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Back half of the ring, behind the sphere — the far side of the frame. */}
      <path d="M25 9c7 0 9 5 9 14s-2 14-9 14" stroke="#B98F4E" strokeWidth="2.2" fill="none" />

      {/* Sphere */}
      <circle cx="25" cy="23" r="13.5" fill="#EBD9A6" />
      <g clipPath="url(#airhome-globe-sphere)" fill="#7FA457">
        <path d="M13.5 15c3.7-1 6.5 1 7.4 3.7s-1.9 4.6-4.6 4.6-5.5-1.8-5.5-4.6.9-2.8 2.7-3.7Z" />
        <path d="M25 20.5c2.8-1.8 6.5-.9 8.3 1.8s0 6.5-2.8 7.4-4.6-.9-5.5-3.7-.9-4.6 0-5.5Z" />
        <path d="M15.2 27.8c2.8 0 4.6 1.9 4.6 4.6s-1.8 4.6-4.6 4.6-3.7-2.8-3.7-5.5.9-3.7 3.7-3.7Z" />
        <path d="M31.5 13.5c1.9 0 3.7.9 3.7 2.8s-1.8 2.8-3.7 1.8-2.8-1.8-2.8-2.8.9-1.8 2.8-1.8Z" />
      </g>
      <circle cx="25" cy="23" r="13.5" fill="url(#airhome-globe-shade)" />
      <circle cx="25" cy="23" r="13.5" stroke="#00000018" strokeWidth="0.7" />

      {/* Front half of the ring, drawn last so it visibly crosses over the sphere's western edge. */}
      <path d="M25 9c-7 0-9 5-9 14s2 14 9 14" stroke="#C9A063" strokeWidth="2.4" fill="none" />
      <circle cx="25" cy="9" r="1.9" fill="#C9A063" />

      {/* Stand */}
      <path d="M25 37v6" stroke="#B98F4E" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="25" cy="45" rx="9" ry="2.6" fill="#C9A063" />
      <ellipse cx="25" cy="43.9" rx="9" ry="2.6" fill="#DDB87A" />
    </svg>
  );
}

/**
 * A mono-pitch modern house with a tree behind it, for "Homes". Original
 * artwork drawn to sit at the same weight as the other tab icons.
 */
function ModernHouse({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={Math.round((size * 56) / 44)}
      height={size}
      viewBox="0 0 56 44"
      fill="none"
      aria-hidden="true"
    >
      {/* Tree, behind the roofline */}
      <rect x="45" y="20" width="3" height="19" rx="1.4" fill="#7A5433" />
      <circle cx="46" cy="14" r="7.5" fill="#6FA84A" />
      <circle cx="40.5" cy="17" r="5" fill="#7FB856" />
      <circle cx="50.5" cy="18" r="4.6" fill="#5F9440" />

      {/* Chimney */}
      <rect x="10" y="8" width="2.6" height="12" rx="0.6" fill="#3A3A3A" />

      {/* Walls */}
      <path d="M9 24.4 40 12.5V39H9V24.4Z" fill="#EAEAE8" />
      <path d="M31 16v23h9V12.5L31 16Z" fill="#DCDCDA" />

      {/* Roof slab */}
      <path d="M5 22.6 44 7.6v4.2L5 26.8v-4.2Z" fill="#3A3A3A" />

      {/* Door */}
      <rect x="16.5" y="25" width="7.6" height="14" rx="0.6" fill="#E8384F" />
      <circle cx="22.6" cy="32.4" r="0.7" fill="#ffffffaa" />

      {/* Windows */}
      <rect x="28.5" y="22.5" width="6" height="6" rx="0.6" fill="#C3D5DC" />
      <circle cx="34.6" cy="17.6" r="2.4" fill="#C3D5DC" stroke="#3A3A3A" strokeWidth="0.7" />

      {/* Shrubs */}
      <rect x="10.5" y="35.5" width="4.5" height="3.5" rx="1.6" fill="#6FA84A" />
      <rect x="25.5" y="35.5" width="4.5" height="3.5" rx="1.6" fill="#6FA84A" />
    </svg>
  );
}

/** Colourful illustrated tab icons (emoji render as full-colour glyphs on every platform). */
const TABS: { key: Tab; label: string; emoji: string; icon?: React.ReactNode; href: string }[] = [
  { key: "all", label: "All", emoji: "🌍", icon: <DeskGlobe />, href: "/" },
  { key: "homes", label: "Homes", emoji: "🏠", icon: <ModernHouse />, href: "/homes" },
  { key: "experiences", label: "Experiences", emoji: "🎈", icon: <HotAirBalloon />, href: "/experiences" },
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
  const [authOpen, setAuthOpen] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [manualExpand, setManualExpand] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { tab, mode, isTabRoot } = tabForPath(pathname || "/");
  const isHome = isTabRoot;
  const expanded = (isHome && atTop) || manualExpand;
  const overlay = expanded && !(isHome && atTop);

  // Collapse the big search bar once the page has scrolled, with hysteresis.
  // A single threshold flickers: collapsing shrinks the header by ~100px,
  // which pulls scrollY back under the threshold, which re-expands it, and so
  // on. Two thresholds far apart, plus refusing to collapse on a page too
  // short to scroll past the header, make it stable.
  useEffect(() => {
    const COLLAPSE_AT = 80;
    const EXPAND_AT = 16;
    let raf = 0;
    function evaluate() {
      raf = 0;
      const y = window.scrollY;
      const canScrollPast = document.documentElement.scrollHeight - window.innerHeight > COLLAPSE_AT + 120;
      setAtTop((prev) => {
        if (prev) return !(canScrollPast && y > COLLAPSE_AT);
        return y < EXPAND_AT;
      });
      if (y > COLLAPSE_AT) setManualExpand(false);
    }
    function onScroll() {
      if (!raf) raf = window.requestAnimationFrame(evaluate);
    }
    evaluate();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
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
                <nav className="hidden items-end gap-10 md:flex" aria-label="Browse categories">
                  {TABS.map(({ key, label, emoji, icon, href }) => (
                    <Link
                      key={key}
                      href={href}
                      className={
                        tab === key && key !== "all"
                          ? "group flex items-center gap-2 rounded-2xl border border-neutral-300 px-4 py-1.5 text-[15px] font-semibold text-ink shadow-sm dark:border-neutral-600 dark:text-white"
                          : `group flex items-center gap-2 border-b-2 pb-2.5 pt-2 text-[15px] transition-colors ${
                              tab === key
                                ? "border-ink font-semibold text-ink dark:border-white dark:text-white"
                                : "border-transparent text-[#6a6a6a] hover:text-ink dark:text-neutral-400 dark:hover:text-white"
                            }`
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-flex h-[34px] items-center justify-center text-[34px] leading-none transition-transform group-hover:scale-110 ${tab === key ? "scale-110" : ""}`}
                        style={{ filter: tab === key ? "none" : "saturate(0.85)" }}
                      >
                        {icon ?? emoji}
                      </span>
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
            <div className="flex shrink-0 items-center gap-2">
              {user ? (
                <Link href={hostHref} className="hidden rounded-full px-4 py-2.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:block">
                  {hostLabel}
                </Link>
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="hidden rounded-full px-4 py-2.5 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:block"
                >
                  {t("Log in or sign up")}
                </button>
              )}
              {/* Avatar: a direct link to your profile, like the real header. */}
              {user && (
                <Link
                  href="/profile"
                  aria-label={`${user.full_name} — go to your profile`}
                  title={user.full_name}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-rausch/10 text-sm font-semibold text-rausch_dark transition hover:bg-rausch/20"
                >
                  {user.full_name.charAt(0).toUpperCase()}
                </Link>
              )}

              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="Open menu"
                  aria-expanded={menuOpen}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white transition hover:shadow-card dark:border-neutral-700 dark:bg-neutral-900"
                >
                  <Menu size={16} />
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

                        {user && (
                          <div>
                            <Link href="/wishlist" onClick={() => setMenuOpen(false)} className={menuItem}>
                              <Heart size={20} strokeWidth={1.6} /> {t("Wishlists")}
                            </Link>
                            <Link href="/trips" onClick={() => setMenuOpen(false)} className={menuItem}>
                              <Briefcase size={20} strokeWidth={1.6} /> {t("Trips")}
                            </Link>
                            <Link href="/profile" onClick={() => setMenuOpen(false)} className={menuItem}>
                              <UserRound size={20} strokeWidth={1.6} /> {t("Profile")}
                            </Link>
                            {user.is_host && (
                              <Link href="/host/dashboard" onClick={() => setMenuOpen(false)} className={menuItem}>
                                <HomeIcon size={20} strokeWidth={1.6} /> {t("Host dashboard")}
                              </Link>
                            )}
                          </div>
                        )}

                        <div className={user ? "border-t border-neutral-200 dark:border-neutral-800" : undefined}>
                          <button
                            onClick={() => {
                              setMenuOpen(false);
                              setLocaleOpen(true);
                            }}
                            className={menuItem}
                          >
                            <Globe size={20} strokeWidth={1.6} /> {t("Languages & currency")}
                          </button>
                          <Link href="/help" onClick={() => setMenuOpen(false)} className={menuItem}>
                            <HelpCircle size={20} strokeWidth={1.6} /> {t("Help Centre")}
                          </Link>
                        </div>

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
                          <Link href="/gift-cards" onClick={() => setMenuOpen(false)} className={menuItem}>
                            <Gift size={20} strokeWidth={1.6} /> {t("Gift cards")}
                          </Link>
                        </div>

                        <div className="border-t border-neutral-200 dark:border-neutral-800">
                          {user ? (
                            <button onClick={handleLogout} className={menuItem}>
                              {t("Log out")}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setMenuOpen(false);
                                setAuthOpen(true);
                              }}
                              className={menuItem}
                            >
                              {t("Log in or sign up")}
                            </button>
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
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}
