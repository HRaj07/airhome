"use client";

import { useToast } from "@/lib/toast-context";
import { useLocale } from "@/lib/locale-context";
import { AppleLogo, GoogleLogo } from "./BrandLogos";

/**
 * "Continue with Google / Apple", shared by the login and sign-up pages and by
 * the header's auth modal so the three can't drift apart.
 *
 * They are mocked: wiring real OAuth needs provider credentials and a callback
 * domain, which is out of scope here. Pressing one says so plainly rather than
 * failing silently or pretending to sign you in — the buttons are there because
 * the real page has them, not to imply an integration that doesn't exist.
 */
export default function SocialAuthButtons({
  action = "Continue",
  compact = false,
}: {
  /** Verb on the label: "Continue", "Log in", "Sign up". */
  action?: string;
  /** The modal's icon-only squares, instead of full-width labelled rows. */
  compact?: boolean;
}) {
  const { showToast } = useToast();
  const { t } = useLocale();

  function mock(provider: string) {
    showToast(
      t("{provider} sign-in isn't wired up in this demo — use an email and password", { provider }),
      "info"
    );
  }

  const providers = [
    { name: "Google", logo: <GoogleLogo size={compact ? 24 : 20} />, tint: "" },
    { name: "Apple", logo: <AppleLogo size={compact ? 26 : 22} />, tint: "text-ink dark:text-white" },
  ];

  if (compact) {
    return (
      <div className="flex justify-center gap-4">
        {providers.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => mock(p.name)}
            aria-label={`${action} with ${p.name}`}
            className={`flex h-16 w-20 items-center justify-center rounded-lg border border-neutral-300 hover:border-ink hover:bg-neutral-50 dark:border-neutral-600 dark:hover:border-white dark:hover:bg-neutral-800 ${p.tint}`}
          >
            {p.logo}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {providers.map((p) => (
        <button
          key={p.name}
          type="button"
          onClick={() => mock(p.name)}
          className={`relative flex w-full items-center justify-center rounded-lg border border-neutral-800 py-3 text-sm font-medium transition-colors hover:bg-neutral-50 dark:border-neutral-500 dark:hover:bg-neutral-800 ${p.tint}`}
        >
          <span className="absolute left-4 flex items-center">{p.logo}</span>
          {t("{action} with {provider}", { action, provider: p.name })}
        </button>
      ))}
    </div>
  );
}

/** The "or" rule Airbnb puts between the form and the social buttons. */
export function AuthDivider() {
  const { t } = useLocale();
  return (
    <div className="flex items-center gap-3 py-1 text-xs text-hof dark:text-neutral-400">
      <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
      {t("or")}
      <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
    </div>
  );
}
