"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { ApiError } from "@/lib/api";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsHost = searchParams.get("host") === "1";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isHost, setIsHost] = useState(wantsHost);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(email, password, fullName, isHost);
      showToast("Account created! Welcome to airhome.", "success");
      router.push(isHost ? "/host/dashboard" : "/");
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Sign up failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-8">
      <h1 className="mb-6 text-2xl font-semibold">Sign up</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Full name</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
          />
          <p className="mt-1 text-xs text-hof dark:text-neutral-400">At least 6 characters</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isHost} onChange={(e) => setIsHost(e.target.checked)} />
          I want to host stays on airhome
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-rausch py-3 font-semibold text-white hover:bg-rausch_dark disabled:opacity-50"
        >
          {submitting ? "Creating account..." : "Sign up"}
        </button>
      </form>
      <p className="mt-6 text-sm text-hof dark:text-neutral-400">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-ink underline dark:text-white">
          Log in
        </Link>
      </p>
    </div>
  );
}
