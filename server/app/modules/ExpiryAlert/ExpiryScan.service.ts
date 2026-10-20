import { AlertTier, BatchStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { createAlertIfNotExists } from "./Alert.service";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Which tier a batch is in, given how many days it has left.
 * Returns null when it's more than 30 days out (nothing to do yet).
 */
export function tierForDaysLeft(daysLeft: number): AlertTier | null {
  if (daysLeft <= 0) return "EXPIRED";
  if (daysLeft <= 7) return "SEVEN_DAYS";
  if (daysLeft <= 15) return "FIFTEEN_DAYS";
  if (daysLeft <= 30) return "THIRTY_DAYS";
  return null;
}

/** Whole days until expiry, rounded up (expires tomorrow evening => 1). */
export function daysUntil(expiryDate: Date, now: Date = new Date()): number {
  return Math.ceil((expiryDate.getTime() - now.getTime()) / DAY_MS);
}

export interface ScanResult {
  scanned: number;
  alertsCreated: number;
  discountsApplied: number;
  markedExpired: number;
  errors: number;
}

/**
 * The daily job:
 *  1. Look at every ACTIVE/DISCOUNTED batch that still has stock.
 *  2. Work out its tier from the days left.
 *  3. Create the alert for that tier (once — safe to re-run).
 *  4. Apply the tier's automatic action:
 *       - a DiscountTierConfig row exists for the tier -> raise the batch's
 *         discountRate to it and mark the batch DISCOUNTED
 *       - EXPIRED -> mark the batch EXPIRED
 *     Vendor returns are left to a manager (they involve a human decision).
 */
export async function runExpiryScan(now: Date = new Date()): Promise<ScanResult> {
  const result: ScanResult = {
    scanned: 0,
    alertsCreated: 0,
    discountsApplied: 0,
    markedExpired: 0,
    errors: 0,
  };

  const [batches, tierConfigs] = await Promise.all([
    prisma.inventoryBatch.findMany({
      where: {
        status: { in: [BatchStatus.ACTIVE, BatchStatus.DISCOUNTED] },
        quantity: { gt: 0 },
      },
    }),
    prisma.discountTierConfig.findMany(),
  ]);

  const discountByTier = new Map(tierConfigs.map((c) => [c.tier, c.discountRate]));

  for (const batch of batches) {
    result.scanned++;

    try {
      const tier = tierForDaysLeft(daysUntil(batch.expiryDate, now));
      if (!tier) continue;

      const { created } = await createAlertIfNotExists(batch.id, tier);
      if (created) result.alertsCreated++;

      if (tier === "EXPIRED") {
        await prisma.inventoryBatch.update({
          where: { id: batch.id },
          data: { status: BatchStatus.EXPIRED },
        });
        result.markedExpired++;
        continue;
      }

      const rate = discountByTier.get(tier);
      // Only ever raise a discount — never undo a bigger manual one.
      if (rate != null && rate > batch.discountRate) {
        await prisma.inventoryBatch.update({
          where: { id: batch.id },
          data: { discountRate: rate, status: BatchStatus.DISCOUNTED },
        });
        result.discountsApplied++;
      }
    } catch (err) {
      // One bad batch must not stop the rest of the scan.
      result.errors++;
      console.error(`Expiry scan failed for batch ${batch.id}:`, err);
    }
  }

  return result;
}