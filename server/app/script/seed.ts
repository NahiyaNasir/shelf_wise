import "dotenv/config"; 
import { prisma } from "../lib/prisma";
import { auth } from "../lib/auth";


/**
 * Default discount rules the daily expiry scan uses. Safe to re-run.
 * (EXPIRED has no discount: expired stock is marked expired, not discounted.)
 */
const DISCOUNT_TIERS = [
  { tier: "THIRTY_DAYS", discountRate: 0.0 },
  { tier: "FIFTEEN_DAYS", discountRate: 0.15 },
  { tier: "SEVEN_DAYS", discountRate: 0.3 },
] as const;

async function seedDiscountTiers() {
  for (const t of DISCOUNT_TIERS) {
    await prisma.discountTierConfig.upsert({
      where: { tier: t.tier },
      update: { discountRate: t.discountRate },
      create: t,
    });
  }
  console.log("✓ Discount tiers seeded");
}

/**
 * Creates the first admin from SEED_ADMIN_* in .env. Public sign-up is off,
 * so this is how the very first account exists; that admin then creates
 * managers and staff with POST /users. Safe to re-run: if the email already
 * exists, nothing is changed.
 */
async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || "Admin";

  if (!email || !password) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in your .env first");
  }
  if (password.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ Admin ${email} already exists, skipping`);
    return;
  }

  // No headers/request here, so Better Auth treats this as a trusted
  // server-side call. Over HTTP this same endpoint requires an admin session.
  await auth.api.createUser({ body: { email, password, name, role: "admin" } });
  console.log(`✓ Admin created: ${email}`);
}

async function main() {
  await seedDiscountTiers();
  await seedAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());