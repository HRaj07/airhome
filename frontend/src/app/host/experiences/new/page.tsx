"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { experiencesApi, usersApi } from "@/lib/api";
import ExperienceForm, { emptyExperienceForm } from "@/components/ExperienceForm";
import type { ExperienceFormData, ExperienceKind } from "@/lib/types";

export default function NewExperiencePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">Loading…</div>}>
      <NewExperienceContent />
    </Suspense>
  );
}

function NewExperienceContent() {
  const { user, loading: authLoading, refresh } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const kind: ExperienceKind = searchParams.get("kind") === "service" ? "service" : "experience";
  const category = searchParams.get("category") || "";
  const noun = kind === "service" ? "service" : "experience";

  const [form, setForm] = useState<ExperienceFormData>(() => emptyExperienceForm(kind, category));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=/host/experiences/new`);
      return;
    }
    // Reached directly rather than through the chooser: the account may still
    // be a guest, so upgrade it here too instead of bouncing them out.
    if (!user.is_host) {
      usersApi
        .updateMe({ is_host: true })
        .then(refresh)
        .catch(() => showToast("Couldn't start hosting just now — please try again", "error"));
    }
  }, [authLoading, user, router, refresh, showToast]);

  // The chooser puts the category in the URL; a direct visit has none.
  useEffect(() => {
    if (!category) router.replace(kind === "service" ? "/setup/services/create" : "/setup/experiences/create");
  }, [category, kind, router]);

  async function handleSubmit() {
    if (!form.city) {
      showToast("Please choose a city", "info");
      return;
    }
    setSubmitting(true);
    try {
      const created = await experiencesApi.create(form);
      showToast(`${noun === "service" ? "Service" : "Experience"} published!`, "success");
      router.push(`/${noun === "service" ? "services" : "experiences"}/${created.id}`);
    } catch {
      showToast(`Couldn't publish your ${noun}. Please check your inputs.`, "error");
      setSubmitting(false);
    }
  }

  if (authLoading || !user) {
    return <div className="mx-auto max-w-3xl px-4 py-12 sm:px-8">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <p className="mb-2 text-sm font-medium text-rausch">{category}</p>
      <h1 className="mb-2 text-2xl font-semibold">
        {kind === "service" ? "Describe your service" : "Describe your experience"}
      </h1>
      <p className="mb-8 text-sm text-hof dark:text-neutral-400">
        {kind === "service"
          ? "Guests book you for a slot, so tell them what you provide and where."
          : "Guests join at a set time each day. Tell them what you'll do together."}
      </p>
      <ExperienceForm
        value={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        submitLabel={kind === "service" ? "Publish service" : "Publish experience"}
        submitting={submitting}
      />
    </div>
  );
}
