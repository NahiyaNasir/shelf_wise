import { Suspense } from "react";
import { requireUser, type Role } from "@/lib/session";
import { LogoutButton } from "./logout-button";

export const metadata = { title: "Dashboard · ShelfWise" };

const ROLE_INFO: Record<Role, { label: string; can: string }> = {
  staff: {
    label: "Staff",
    can: "You can scan products, receive stock, record sales and spoilage, and see alerts.",
  },
  manager: {
    label: "Manager",
    can: "You can do everything staff can, plus discounts, supplier returns, and resolving alerts.",
  },
  admin: {
    label: "Admin",
    can: "You can do everything managers can, plus create and manage user accounts.",
  },
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const user = await requireUser(); // sends visitors who aren't signed in to /login
  const role = ROLE_INFO[user.role] ?? ROLE_INFO.staff;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-xl font-bold tracking-tight text-emerald-700">ShelfWise</span>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm leading-tight">
              <p className="font-medium">{user.name}</p>
              <p className="text-slate-500">{role.label}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
        <p className="mt-2 max-w-prose text-slate-600">{role.can}</p>

        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-6">
          <h2 className="font-medium">What&apos;s next</h2>
          <p className="mt-1 text-sm text-slate-600">
            Login works. The next screen to build is <strong>Receive stock</strong>, where you scan
            a barcode and save a delivery with its expiry date.
          </p>
        </div>
      </main>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-14 border-b border-slate-200 bg-white" />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-4 w-96 max-w-full animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}
