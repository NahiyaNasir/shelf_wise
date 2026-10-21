"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ErrorBody = { message?: string; code?: string };

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      // Goes through the /backend rewrite in next.config.ts to Better Auth.
      const res = await fetch("/backend/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      const body = (await res.json().catch(() => ({}))) as ErrorBody;
      setError(messageFor(res.status, body));
    } catch {
      setError("Can't reach the server. Check that the backend is running.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 disabled:bg-slate-100"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 disabled:bg-slate-100"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !email || !password}
        className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function messageFor(status: number, body: ErrorBody): string {
  if (status === 401) return "Wrong email or password.";
  if (status === 429) return "Too many attempts. Wait a moment and try again.";
  if (status === 403) {
    // Banned accounts, or the backend not trusting this site's address.
    if (/origin/i.test(body.message ?? "")) {
      return "The server blocked this site's address. Add it to trustedOrigins in the backend auth config.";
    }
    return body.message || "This account can't sign in.";
  }
  if (status >= 500) return "The server isn't responding properly. Check that the backend is running.";
  return "Something went wrong. Please try again.";
}
