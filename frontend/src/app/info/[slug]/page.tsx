"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { findInfoPage } from "@/lib/info-pages";

/** One route renders every informational page linked from the footer. */
export default function InfoPage() {
  const params = useParams();
  const page = findInfoPage(String(params?.slug || ""));

  if (!page) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-8">
        <h1 className="text-xl font-semibold">We couldn&apos;t find that page</h1>
        <Link href="/" className="mt-3 inline-block text-rausch underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{page.title}</h1>
      <p className="mt-4 text-lg text-hof dark:text-neutral-400">{page.intro}</p>
      {page.cta && (
        <Link href={page.cta.href} className="mt-6 inline-block rounded-lg bg-ink px-6 py-3 font-semibold text-white dark:bg-white dark:text-ink">
          {page.cta.label}
        </Link>
      )}
      <div className="mt-10 space-y-8">
        {page.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-xl font-semibold">{s.heading}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-2 text-[15px] leading-relaxed text-ink dark:text-neutral-200">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
