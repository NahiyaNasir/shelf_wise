import { auth, Role } from "../../lib/auth";

export interface ListUsersOptions {
  searchValue?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

/**
 * Current signed-in user + session, from the request's cookies.
 * Returns null if there's no valid session.
 */
export async function getCurrentSession(headers: Headers) {
  return auth.api.getSession({ headers });
}

/**
 * List users — admin only (enforced by Better Auth itself based on the
 * caller's session in `headers`, not by this function).
 */
export async function listUsers(headers: Headers, options: ListUsersOptions = {}) {
  return auth.api.listUsers({
    headers,
    query: {
      searchValue: options.searchValue,
      searchField: options.searchValue ? "email" : undefined,
      searchOperator: options.searchValue ? "contains" : undefined,
      limit: options.limit,
      offset: options.offset,
      sortBy: options.sortBy,
      sortDirection: options.sortDirection,
    },
  });
}

/**
 * Get a single user by id — admin only.
 */
export async function getUserById(headers: Headers, id: string) {
  return auth.api.getUser({ headers, query: { id } });
}

/**
 * Change a user's role (e.g. promote staff to manager) — admin only.
 */
export async function setUserRole(headers: Headers, userId: string, role: Role) {
  return auth.api.setRole({ headers, body: { userId, role } });
}

/**
 * Ban a user, optionally with a reason and auto-expiry in seconds.
 * A banned user's sessions stop being accepted by requireAuth. Admin only.
 */
export async function banUser(
  headers: Headers,
  userId: string,
  banReason?: string,
  banExpiresIn?: number
) {
  return auth.api.banUser({ headers, body: { userId, banReason, banExpiresIn } });
}
export async function createUser(
  headers: Headers,
  input: { email: string; password: string; name: string; role: Role }
) {
  return auth.api.signUpEmail({ headers, body: input });
}
export async function  signInEmail(
  headers: Headers,
  input: { email: string; password: string }
) {
  return auth.api.signInEmail({ headers, body: input });
}











/**
 * Lift a ban — admin only.
 */
export async function unbanUser(headers: Headers, userId: string) {
  return auth.api.unbanUser({ headers, body: { userId } });
}

/**
 * Permanently remove a user account — admin only.
 * Note: StockMovement.userId and ExpiryAlert.resolvedById are optional
 * (SetNull-style) references, so existing audit records survive this,
 * just with their user link cleared — check that's the behavior you want.
 */
export async function removeUser(headers: Headers, userId: string) {
  return auth.api.removeUser({ headers, body: { userId } });
}
export const userService = {
  getCurrentSession,
  listUsers,
  getUserById,
  setUserRole,
  banUser,
  unbanUser,
  removeUser,
  createUser,
  signInEmail
};