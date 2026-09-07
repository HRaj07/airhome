"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { usersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { useLocale } from "@/lib/locale-context";

type HostType = "home" | "experience" | "service";

/** The three things Airbnb lets you host, in the order its own modal shows them. */
const HOST_TYPES: { id: HostType; label: string; emoji: string }[] = [
  { id: "home", label: "Home", emoji: "🏡" },
  { id: "experience", label: "Experience", emoji: "🎈" },
  { id: "service", label: "Service", emoji: "🛎️" },
];

/**
 * "What would you like to host?" — the chooser Airbnb opens when a signed-in
 * guest clicks "Become a host".
 *
 * Previously that button sent an already-signed-in guest to /signup?host=1,
 * asking them to create a second account for an account they already had. The
 * guest → host upgrade now happens in place via PATCH /users/me.
 *
 * All three choices lead to a real, publishable flow: a home starts at the
 * address step, an experience or service at its category chooser.
 */
export default function HostTypeModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<HostType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user, refresh } = useAuth();
  const { showToast } = useToast();
  const { t } = useLocale();
  const router = useRouter();

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

  /** Where each choice starts, mirroring Airbnb's own routes. */
  const START: Record<HostType, string> = {
    home: "/become-a-host",
    experience: "/setup/experiences/create",
    service: "/setup/services/create",
  };

  async function next() {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      // Already a host (e.g. reopened the modal) — skip straight to the flow.
      if (!user?.is_host) {
        await usersApi.updateMe({ is_host: true });
        await refresh();
      }
      onClose();
      router.push(START[selected]);
    } catch {
      showToast(t("Couldn't start hosting just now — please try again"), "error");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("What would you like to host?")}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-6 pb-6 pt-6 sm:px-10 sm:pb-8 sm:pt-8">
          <button
            onClick={onClose}
            aria-label={t("Close")}
            className="absolute right-5 top-5 rounded-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={18} />
          </button>

          <h2 className="mb-8 mt-2 text-center text-2xl font-semibold">{t("What would you like to host?")}</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            {HOST_TYPES.map((type) => {
              const active = selected === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelected(type.id)}
                  aria-pressed={active}
                  className={`flex aspect-[3/4] flex-col items-center justify-center gap-6 rounded-2xl border bg-white transition-all dark:bg-neutral-900 ${
                    active
                      ? "border-2 border-ink shadow-md dark:border-white"
                      : "border-neutral-300 hover:border-neutral-400 hover:shadow-sm dark:border-neutral-700 dark:hover:border-neutral-500"
                  }`}
                >
                  <span className="text-6xl" aria-hidden>
                    {type.emoji}
                  </span>
                  <span className="text-lg font-medium">{t(type.label)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end border-t border-neutral-200 px-6 py-4 dark:border-neutral-800 sm:px-10">
          <button
            onClick={next}
            disabled={!selected || submitting}
            className="rounded-lg bg-ink px-8 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-ink"
          >
            {submitting ? t("Starting…") : t("Next")}
          </button>
        </div>
      </div>
    </div>
  );
}
