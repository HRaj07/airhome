"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      showToast("Welcome back!", "success");
      router.push(next);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Login failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(role: "guest" | "host") {
    if (role === "guest") {
      setEmail("demo@example.com");
    } else {
      setEmail("amelia.host@example.com");
    }
    setPassword("password123");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-8">
      <h1 className="mb-6 text-2xl font-semibold">Log in</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 p-3 text-sm outline-none focus:border-ink dark:border-neutral-600 dark:bg-neutral-900"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-rausch py-3 font-semibold text-white hover:bg-rausch_dark disabled:opacity-50"
        >
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>

      <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-xs text-hof dark:bg-neutral-900 dark:text-neutral-400">
        <p className="mb-1 font-semibold">Demo accounts (password: password123)</p>
        <button type="button" onClick={() => fillDemo("guest")} className="mr-3 underline">
          Fill guest demo
        </button>
        <button type="button" onClick={() => fillDemo("host")} className="underline">
          Fill host demo
        </button>
      </div>

      <p className="mt-6 text-sm text-hof dark:text-neutral-400">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-ink underline dark:text-white">
          Sign up
        </Link>
      </p>
    </div>
  );
}
