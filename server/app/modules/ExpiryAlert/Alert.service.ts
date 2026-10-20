
import { AlertTier, Prisma,  } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

export class AlertNotFoundError extends Error {
  constructor() {
    super("Alert not found");
  }
}

/**
 * List alerts, optionally filtered by resolution status and/or tier.
 * Newest first so the dashboard's alert feed reads top-down.
 */
export async function listAlerts(filters: { isResolved?: boolean; tier?: AlertTier }) {
  return prisma.expiryAlert.findMany({
    where: {
      isResolved: filters.isResolved,
      tier: filters.tier,
    },
    include: { batch: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get a single alert with its batch/product context and notification history.
 */
export async function getAlertById(id: string) {
  return prisma.expiryAlert.findUnique({
    where: { id },
    include: { batch: { include: { product: true } }, notifications: true },
  });
}

/**
 * Mark an alert resolved (e.g. staff actioned the discount or return).
 */
export async function resolveAlert(id: string, resolvedById?: string) {
  try {
    return await prisma.expiryAlert.update({
      where: { id },
      data: { isResolved: true, resolvedById },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw new AlertNotFoundError();
    }
    throw err;
  }
}

/**
 * Create an alert for a batch/tier combination — idempotent, so the daily
 * expiry-scan cron job (see roadmap section 4) can call this safely without
 * producing duplicate alerts every time it runs. Intended for internal use
 * by that job, not exposed directly over HTTP.
 */
export async function createAlertIfNotExists(batchId: string, tier: AlertTier) {
  const existing = await prisma.expiryAlert.findFirst({
    where: { batchId, tier },
  });

  if (existing) {
    return existing;
  }

  return prisma.expiryAlert.create({
    data: { batchId, tier },
  });
}