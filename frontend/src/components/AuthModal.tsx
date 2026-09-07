"use client";

import { useEffect, useState } from "react";
import { X, Home as HomeIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AppleLogo, GoogleLogo } from "./BrandLogos";
import { useToast } from "@/lib/toast-context";
import { useLocale } from "@/lib/locale-context";
import { ApiError } from "@/lib/api";

type Step = "identify" | "password" | "register";

/**
 * Airbnb opens login as a modal from anywhere in the app rather than
 * navigating to a page. Step 1 collects the email; step 2 is either a
 * password prompt (existing account) or a short sign-up form.
 */
export default function AuthModal({ onClose, defaultHost = false }: { onClose: () => void; defaultHost?: boolean }) {
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const { t } = useLocale();

  const [step, setStep] = useState<Step>("identify");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isHost, setIsHost] = useState(defaultHost);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const inputClass =
    "w-full rounded-lg border border-neutral-400 px-3 py-3.5 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900";

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      showToast("Enter a valid email address", "info");
      return;
    }
    setStep("password");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      showToast("Welcome back!", "success");
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        showToast("No account with that email and password — create one below", "info");
        setStep("register");
      } else {
        showToast(err instanceof ApiError ? err.message : "Login failed", "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(email, password, fullName, isHost);
      showToast("Account created. Welcome to airhome!", "success");
      onClose();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Sign up failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function socialMock(provider: string) {
    showToast(`${provider} sign-in isn't wired up in this demo — use an email and password`, "info");
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("Log in or sign up")}
        className="w-full max-w-[568px] animate-slide-up overflow-hidden rounded-2xl bg-white shadow-popover dark:bg-neutral-900"
      >
        <div className="relative border-b border-neutral-200 px-6 py-5 dark:border-neutral-800">
          <button onClick={onClose} aria-label="Close" className="absolute left-5 top-1/2 -translate-y-1/2 rounded-full p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X size={18} />
          </button>
          <p className="text-center text-base font-semibold">{t("Log in or sign up")}</p>
        </div>

        <div className="px-6 py-7 sm:px-10">
          <HomeIcon size={40} className="mx-auto mb-5 text-rausch" strokeWidth={2.2} />
          <h2 className="mb-6 text-center text-2xl font-semibold">Welcome to airhome</h2>

          {step === "identify" && (
            <form onSubmit={handleContinue} className="space-y-4">
              <input
                autoFocus
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Phone number or email"
                className={inputClass}
              />
              <button type="submit" className="w-full rounded-lg bg-gradient-to-r from-[#E61E4D] via-[#E31C5F] to-[#D70466] py-3.5 font-semibold text-white transition-opacity hover:opacity-90">
                Continue
              </button>

              <div className="flex items-center gap-3 py-1 text-xs text-hof dark:text-neutral-400">
                <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
                or
                <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
              </div>

              {/* Icon-only square buttons, as on the real modal */}
              <div className="flex justify-center gap-4">
                <button
                  type="button"
                  onClick={() => socialMock("Google")}
                  aria-label="Continue with Google"
                  className="flex h-16 w-20 items-center justify-center rounded-lg border border-neutral-300 hover:border-ink hover:bg-neutral-50 dark:border-neutral-600 dark:hover:border-white dark:hover:bg-neutral-800"
                >
                  <GoogleLogo size={24} />
                </button>
                <button
                  type="button"
                  onClick={() => socialMock("Apple")}
                  aria-label="Continue with Apple"
                  className="flex h-16 w-20 items-center justify-center rounded-lg border border-neutral-300 text-ink hover:border-ink hover:bg-neutral-50 dark:border-neutral-600 dark:text-white dark:hover:border-white dark:hover:bg-neutral-800"
                >
                  <AppleLogo size={26} />
                </button>
              </div>

              <div className="rounded-lg bg-neutral-50 p-3 text-xs text-hof dark:bg-neutral-800 dark:text-neutral-400">
                <p className="mb-1 font-semibold">Demo accounts (password: password123)</p>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("demo@example.com");
                    setPassword("password123");
                    setStep("password");
                  }}
                  className="mr-3 underline"
                >
                  Continue as guest
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("amelia.host@example.com");
                    setPassword("password123");
                    setStep("password");
                  }}
                  className="underline"
                >
                  Continue as host
                </button>
              </div>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <p className="text-sm text-hof dark:text-neutral-400">
                {email}{" "}
                <button type="button" onClick={() => setStep("identify")} className="underline">
                  change
                </button>
              </p>
              <input
                autoFocus
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("Password")}
                className={inputClass}
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-gradient-to-r from-[#E61E4D] via-[#E31C5F] to-[#D70466] py-3.5 font-semibold text-white disabled:opacity-60"
              >
                {submitting ? "..." : t("Log in")}
              </button>
              <button type="button" onClick={() => setStep("register")} className="w-full text-sm underline">
                Create an account instead
              </button>
            </form>
          )}

          {step === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("Full name")} required className={inputClass} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("Email")} required className={inputClass} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`${t("Password")} (min 6 characters)`}
                minLength={6}
                required
                className={inputClass}
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isHost} onChange={(e) => setIsHost(e.target.checked)} />
                I want to host stays on airhome
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-gradient-to-r from-[#E61E4D] via-[#E31C5F] to-[#D70466] py-3.5 font-semibold text-white disabled:opacity-60"
              >
                {submitting ? "..." : "Agree and continue"}
              </button>
              <button type="button" onClick={() => setStep("identify")} className="w-full text-sm underline">
                Back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
