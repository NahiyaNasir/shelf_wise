import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · ShelfWise" };

// Already signed in? Skip the form. This streams in after the page appears,
// so the form is never held up waiting for the backend.
async function RedirectIfSignedIn() {
  if (await getSession()) redirect("/dashboard");
  return null;
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-700">ShelfWise</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to track your stock and expiry dates.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          No account yet? Ask the shop owner to create one for you.
        </p>
      </div>

      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
    </main>
  );
}
