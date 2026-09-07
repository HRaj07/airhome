"use client";

import { useEffect, useState } from "react";
import { X, Languages } from "lucide-react";
import { ALL_LANGUAGES, CURRENCIES, SUGGESTED_LANGUAGES, useLocale } from "@/lib/locale-context";
import { useToast } from "@/lib/toast-context";

type Tab = "language" | "currency";

export default function LocaleModal({ onClose, initialTab = "language" }: { onClose: () => void; initialTab?: Tab }) {
  const { currency, setCurrency, language, setLanguage } = useLocale();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [translate, setTranslate] = useState(true);

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

  function pickLanguage(code: string) {
    setLanguage(code);
    showToast("Language preference saved (interface translation is a placeholder in this demo)", "info");
    onClose();
  }

  function pickCurrency(code: (typeof CURRENCIES)[number]["code"]) {
    setCurrency(code);
    onClose();
  }

  const tabClass = (active: boolean) =>
    `border-b-2 pb-3 text-base font-medium transition-colors ${
      active ? "border-ink text-ink dark:border-white dark:text-white" : "border-transparent text-hof hover:text-ink dark:text-neutral-400 dark:hover:text-white"
    }`;

  const optionClass = (active: boolean) =>
    `rounded-lg border px-3 py-2.5 text-left transition-colors ${
      active
        ? "border-ink dark:border-white"
        : "border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800"
    }`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Language, region and currency"
        className="flex max-h-[90vh] w-full max-w-5xl animate-slide-up flex-col rounded-2xl bg-white shadow-popover dark:bg-neutral-900"
      >
        <div className="px-6 pt-5">
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X size={18} />
          </button>
          <div className="mt-4 flex gap-8 border-b border-neutral-200 dark:border-neutral-800">
            <button onClick={() => setTab("language")} className={tabClass(tab === "language")}>
              Language and region
            </button>
            <button onClick={() => setTab("currency")} className={tabClass(tab === "currency")}>
              Currency
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 pb-8 pt-6">
          {tab === "language" ? (
            <>
              <div className="flex max-w-2xl items-center justify-between rounded-2xl bg-neutral-100 p-5 dark:bg-neutral-800">
                <div>
                  <p className="flex items-center gap-2 text-lg font-medium">
                    Translation <Languages size={18} />
                  </p>
                  <p className="mt-1 text-sm text-hof dark:text-neutral-400">
                    Automatically translate descriptions and reviews to English.
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={translate}
                  onClick={() => setTranslate((t) => !t)}
                  className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${translate ? "bg-ink dark:bg-white" : "bg-neutral-300 dark:bg-neutral-600"}`}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all dark:bg-neutral-900 ${translate ? "left-7" : "left-1"}`}
                  />
                </button>
              </div>

              <h2 className="mt-8 text-2xl font-semibold">Suggested languages and regions</h2>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {SUGGESTED_LANGUAGES.map((l) => (
                  <button key={`s-${l.code}`} onClick={() => pickLanguage(l.code)} className={optionClass(language.code === l.code)}>
                    <p className="text-sm">{l.language}</p>
                    <p className="text-sm text-hof dark:text-neutral-400">{l.region}</p>
                  </button>
                ))}
              </div>

              <h2 className="mt-10 text-2xl font-semibold">Choose a language and region</h2>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {ALL_LANGUAGES.map((l) => (
                  <button key={l.code} onClick={() => pickLanguage(l.code)} className={optionClass(language.code === l.code)}>
                    <p className="text-sm">{l.language}</p>
                    <p className="text-sm text-hof dark:text-neutral-400">{l.region}</p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold">Choose a currency</h2>
              <p className="mt-1 text-sm text-hof dark:text-neutral-400">
                Prices are stored in USD and converted with a fixed demo exchange rate.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {CURRENCIES.map((c) => (
                  <button key={c.code} onClick={() => pickCurrency(c.code)} className={optionClass(currency.code === c.code)}>
                    <p className="text-sm">{c.name}</p>
                    <p className="text-sm text-hof dark:text-neutral-400">
                      {c.code} – {c.symbol}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
