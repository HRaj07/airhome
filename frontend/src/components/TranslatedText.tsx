"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import { useLocale } from "@/lib/locale-context";

/**
 * Host-written text (descriptions, reviews) shown in the viewer's language when
 * the Translation toggle is on and a translation exists, with Airbnb's
 * "Translated from English · Show original" affordance.
 */
export default function TranslatedText({ text, className = "", showNote = false }: { text: string; className?: string; showNote?: boolean }) {
  const { tc, t } = useLocale();
  const [showOriginal, setShowOriginal] = useState(false);
  const [translated, wasTranslated] = tc(text);
  const display = wasTranslated && !showOriginal ? translated : text;

  return (
    <div>
      <p className={className}>{display}</p>
      {wasTranslated && showNote && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-hof dark:text-neutral-400">
          <Languages size={13} />
          {t("Translated from English")}
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => setShowOriginal((o) => !o)} className="underline">
            {showOriginal ? t("Show translation") : t("Show original")}
          </button>
        </p>
      )}
    </div>
  );
}
