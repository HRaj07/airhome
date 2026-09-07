import { ReactNode } from "react";

export default function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "rausch" | "green" }) {
  const tones: Record<string, string> = {
    neutral: "bg-neutral-100 text-ink dark:bg-neutral-800 dark:text-neutral-100",
    rausch: "bg-rausch/10 text-rausch",
    green: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}
