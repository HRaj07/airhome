"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Menu, UserCircle, Home as HomeIcon, Sun, Moon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/lib/toast-context";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    showToast("Logged out successfully", "success");
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2 text-rausch">
          <HomeIcon size={28} strokeWidth={2.2} />
          <span className="hidden text-xl font-bold sm:inline">airhome</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {user?.is_host && (
            <Link href="/host/dashboard" className="rounded-full px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800">
              Host dashboard
            </Link>
          )}
          {!user?.is_host && (
            <Link href="/signup?host=1" className="rounded-full px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800">
              Become a host
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full border border-neutral-300 py-1.5 pl-3 pr-1.5 hover:shadow-md dark:border-neutral-700"
            >
              <Menu size={16} />
              <UserCircle size={26} className="text-neutral-500" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white py-2 text-sm shadow-popover dark:border-neutral-700 dark:bg-neutral-900">
                {loading ? (
                  <p className="px-4 py-2 text-hof">Loading...</p>
                ) : user ? (
                  <>
                    <p className="border-b border-neutral-100 px-4 pb-2 pt-1 font-medium dark:border-neutral-800">
                      {user.full_name}
                    </p>
                    <Link href="/trips" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                      My Trips
                    </Link>
                    <Link href="/wishlist" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                      Wishlist
                    </Link>
                    {user.is_host && (
                      <Link
                        href="/host/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="block px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        Host dashboard
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="block w-full border-t border-neutral-100 px-4 py-2.5 text-left hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800">
                      Log in
                    </Link>
                    <Link href="/signup" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                      Sign up
                    </Link>
                    <Link
                      href="/signup?host=1"
                      onClick={() => setMenuOpen(false)}
                      className="block border-t border-neutral-100 px-4 py-2.5 hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
                    >
                      Become a host
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
