import { Request, Response, NextFunction, ParamsDictionary } from "express-serve-static-core";
import { fromNodeHeaders } from "better-auth/node";
import { auth, type Role, type Session } from "../lib/auth";

export interface AuthedRequest<P = ParamsDictionary> extends Request<P> {
  authSession?: Session;
}

/**
 * Resolves the Better Auth session from the request's cookies and attaches
 * it as req.authSession. Responds 401 if there isn't a valid session.
 * Apply this before requireRole, and before any handler that needs to know
 * who's calling (e.g. recording userId on a StockMovement).
 */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return res.status(401).json({ error: "Authentication required" });
  }

  req.authSession = session;
  next();
}

/**
 * Gate a route to specific roles. Must run after requireAuth.
 * Usage: router.post("/", requireAuth, requireRole("admin"), handler)
 */
export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const role = req.authSession?.user.role as Role | undefined;

    if (!role || !roles.includes(role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}