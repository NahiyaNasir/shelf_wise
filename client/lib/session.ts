import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type Role = "staff" | "manager" | "admin";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

const API_URL = process.env.API_URL ?? "http://localhost:3000";

/**
 * Asks the backend who is signed in, using the visitor's cookies.
 * Returns null if nobody is, or if the backend can't be reached.
 * Server-side only. It reads cookies, so call it inside a <Suspense> boundary.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/get-session`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;

    // Better Auth answers with `null` when the cookie isn't a valid session.
    const data = (await res.json()) as {
      user?: { id: string; name: string; email: string; role?: string | null };
    } | null;
    if (!data?.user) return null;

    return {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: (data.user.role as Role) ?? "staff",
    };
  } catch {
    return null;
  }
}

/** For pages that need a signed-in person. Sends everyone else to /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}
