import { Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { APIError, type Role } from "../../lib/auth";

import type { AuthedRequest } from "../../middlewares/auth.middlewares";
import { userService } from "./user.service";


const VALID_ROLES: Role[] = ["staff", "manager", "admin"];

/**
 * GET /users/me
 * The signed-in user making the request. Requires requireAuth.
 */
export async function getMe(req: AuthedRequest, res: Response) {
  res.json(req.authSession);
}
export async function createUser(req: AuthedRequest, res: Response) {
  const { name, email, password, role  } = req.body;
  console.log(req.body);

 
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email and password are required" });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "password must be at least 8 characters" });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of ${VALID_ROLES.join(", ")}` });
  }
 
  try {
    const result = await userService.createUser(fromNodeHeaders(req.headers), {
      name,
      email,
      password,
      role,
    });
    console.log(result,"cu");
    res.status(201).json(result);
  } catch (err) {
    handleAuthApiError(err, res, "Failed to create user");
  }
}
 export async function loginUser(req: AuthedRequest, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    const result = await userService.signInEmail(fromNodeHeaders(req.headers), {
      email,
      password,
    });
    res.status(200).json(result);
  } catch (err) {
    handleAuthApiError(err, res, "Failed to login user");
  }
 }




  /**
 * GET /users
 * List staff accounts. Supports ?searchValue=, ?limit=, ?offset=.
 * Requires requireAuth + requireRole("admin").
 */
export async function listUsers(req: AuthedRequest, res: Response) {
  const { searchValue, limit, offset, sortBy, sortDirection } = req.query;

  try {
    const result = await userService.listUsers(fromNodeHeaders(req.headers), {
      searchValue: searchValue ? String(searchValue) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      sortBy: sortBy ? String(sortBy) : undefined,
      sortDirection: sortDirection === "desc" ? "desc" : sortDirection === "asc" ? "asc" : undefined,
    });
    res.json(result);
  } catch (err) {
    handleAuthApiError(err, res, "Failed to list users");
  }
}

/**
 * GET /users/:id
 * Requires requireAuth + requireRole("admin").
 */
export async function getUser(req: AuthedRequest<{ id: string }>, res: Response) {
  try {
    const user = await userService.getUserById(fromNodeHeaders(req.headers), req.params.id);
    res.json(user);
  } catch (err) {
    handleAuthApiError(err, res, "Failed to get user");
  }
}

/**
 * PATCH /users/:id/role
 * Body: { role: "staff" | "manager" | "admin" }
 * Requires requireAuth + requireRole("admin").
 */
export async function setRole(req: AuthedRequest<{ id: string }>, res: Response) {
  const { role } = req.body;

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of ${VALID_ROLES.join(", ")}` });
  }

  try {
    const user = await userService.setUserRole(fromNodeHeaders(req.headers), req.params.id, role);
    res.json(user);
  } catch (err) {
    handleAuthApiError(err, res, "Failed to update role");
  }
}

/**
 * PATCH /users/:id/ban
 * Body: { banReason?: string, banExpiresIn?: number } (seconds; omit for a permanent ban)
 * Requires requireAuth + requireRole("admin").
 */
export async function banUser(req: AuthedRequest<{ id: string }>, res: Response) {
  const { banReason, banExpiresIn } = req.body;

  try {
    const result = await userService.banUser(
      fromNodeHeaders(req.headers),
      req.params.id,
      banReason,
      banExpiresIn
    );
    res.json(result);
  } catch (err) {
    handleAuthApiError(err, res, "Failed to ban user");
  }
}

/**
 * PATCH /users/:id/unban
 * Requires requireAuth + requireRole("admin").
 */
export async function unbanUser(req: AuthedRequest<{ id: string }>, res: Response) {
  try {
    const result = await userService.unbanUser(fromNodeHeaders(req.headers), req.params.id);
    res.json(result);
  } catch (err) {
    handleAuthApiError(err, res, "Failed to unban user");
  }
}

/**
 * DELETE /users/:id
 * Requires requireAuth + requireRole("admin").
 */
export async function removeUser(req: AuthedRequest<{ id: string }>, res: Response) {
  try {
    await userService.removeUser(fromNodeHeaders(req.headers), req.params.id);
    res.status(204).send();
  } catch (err) {
    handleAuthApiError(err, res, "Failed to remove user");
  }
}

/**
 * Better Auth's admin endpoints throw APIError with a ready-to-use
 * statusCode (401/403/404/etc) — forward it instead of flattening
 * everything to a 500.
 */
function handleAuthApiError(err: unknown, res: Response, fallbackMessage: string) {
  if (err instanceof APIError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: fallbackMessage });
}