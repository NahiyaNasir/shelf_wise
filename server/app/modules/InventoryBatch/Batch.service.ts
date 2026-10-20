import { Prisma } from "../../../generated/prisma/client";
import { BatchStatus, MovementType } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";


export interface ReceiveBatchInput {
  productId: string;
  vendorId?: string;
  batchNumber?: string;
  quantity: number;
  expiryDate: Date | string;
  userId?: string;
}

export interface RecordMovementInput {
  type: Extract<MovementType, "SALE" | "SPOILAGE" | "ADJUSTMENT">;
  quantity: number; // positive magnitude to remove
  note?: string;
  userId?: string;
}

export class BatchNotFoundError extends Error {
  constructor() {
    super("Batch not found");
  }
}

export class InsufficientQuantityError extends Error {
  constructor() {
    super("Movement quantity exceeds batch quantity");
  }
}

/**
 * List batches, optionally filtered by status and/or product.
 * Sorted soonest-to-expire first so "most urgent" surfaces at the top.
 */
export async function listBatches(filters: {
  status?: BatchStatus;
  productId?: string;
}) {
  return prisma.inventoryBatch.findMany({
    where: {
      status: filters.status,
      productId: filters.productId,
    },
    include: { product: true, vendor: true },
    orderBy: { expiryDate: "asc" },
  });
}

/**
 * Get a single batch with its product, vendor, alerts and movement history.
 */
export async function getBatchById(id: string) {
  return prisma.inventoryBatch.findUnique({
    where: { id },
    include: { product: true, vendor: true, alerts: true, movements: true },
  });
}

/**
 * "Receive stock" — creates a new batch and logs the initial RECEIVE
 * movement in the same transaction so the two never drift apart.
 */
export async function receiveBatch(input: ReceiveBatchInput) {
  return prisma.$transaction(async (tx) => {
    const batch = await tx.inventoryBatch.create({
      data: {
        productId: input.productId,
        vendorId: input.vendorId,
        batchNumber: input.batchNumber,
        quantity: input.quantity,
        expiryDate: new Date(input.expiryDate),
      },
    });

    await tx.stockMovement.create({
      data: {
        batchId: batch.id,
        type: "RECEIVE",
        quantity: input.quantity,
        userId: input.userId,
        note: "Initial stock receipt",
      },
    });

    return batch;
  });
}

/**
 * Manually move a batch between statuses (e.g. mark DISCOUNTED or
 * RETURNED) and optionally set a discount rate at the same time.
 * The alert engine will do this automatically for expiry-driven
 * transitions — this is for manual overrides from the dashboard.
 */
export async function updateBatchStatus(
  id: string,
  status: BatchStatus,
  discountRate?: number
) {
  try {
    return await prisma.inventoryBatch.update({
      where: { id },
      data: {
        status,
        ...(discountRate != null ? { discountRate } : {}),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw new BatchNotFoundError();
    }
    throw err;
  }
}

/**
 * Records a SALE, SPOILAGE or ADJUSTMENT against a batch and keeps
 * InventoryBatch.quantity in sync, in a single transaction.
 */
export async function recordMovement(batchId: string, input: RecordMovementInput) {
  return prisma.$transaction(async (tx) => {
    const batch = await tx.inventoryBatch.findUnique({ where: { id: batchId } });

    if (!batch) {
      throw new BatchNotFoundError();
    }

    if (batch.quantity < input.quantity) {
      throw new InsufficientQuantityError();
    }

    const updated = await tx.inventoryBatch.update({
      where: { id: batchId },
      data: { quantity: batch.quantity - input.quantity },
    });

    const movement = await tx.stockMovement.create({
      data: {
        batchId,
        type: input.type,
        quantity: -input.quantity,
        note: input.note,
        userId: input.userId,
      },
    });

    return { batch: updated, movement };
  });
}