import { betterAuth, APIError } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins/admin";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";
import { prisma } from "./prisma";



export { APIError };

/**
 * Access control for store roles. The admin plugin only knows "admin" and
 * "user" out of the box — these statements/roles are what actually teach
 * it about "staff" and "manager", and what makes those names valid in
 * setRole() calls instead of a TS error.
 *
 *  - staff:   day-to-day — scan/receive stock, record sales/spoilage
 *  - manager: + approve discounts, action vendor returns
 *  - admin:   + manage user accounts (full admin plugin permissions)
 */
const statement = { ...defaultStatements } as const;
const ac = createAccessControl(statement);

const staff = ac.newRole({ user: [], session: [] });
const manager = ac.newRole({ user: ["list", "get"], session: [] });
const adminRole = ac.newRole(adminAc.statements);

export const ROLES = ["staff", "manager", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Small shop staff accounts — no self-service signup / social login needed.
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh if used at least once a day
  },

  plugins: [
   
    admin({
      ac,
      roles: { staff, manager, admin: adminRole },
      defaultRole: "staff",
      adminRoles: ["admin"],
    }),
    
  ],

  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});

export type Session = typeof auth.$Infer.Session;