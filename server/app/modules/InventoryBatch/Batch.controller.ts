import { Request, Response } from "express";

import * as batchService from "./Batch.service";
import { BatchStatus } from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";

const VALID_MOVEMENT_TYPES = ["SALE", "SPOILAGE", "ADJUSTMENT"] as const;

/**
 * GET /batches
 * Supports ?status= and ?productId= filters. Invalid `status` values are
 * rejected by Prisma's own enum validation (PrismaClientValidationError),
 * caught below and turned into a clean 400.
 */
export async function listBatches(req: Request, res: Response) {
  const { status, productId } = req.query;

  try {
    const batches = await batchService.listBatches({
      status: status ? (String(status) as BatchStatus) : undefined,
      productId: productId ? String(productId) : undefined,
    });
    res.json(batches);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientValidationError) {
      return res.status(400).json({ error: "Invalid status filter" });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to list batches" });
  }
}

/**
 * GET /batches/:id
 */
export async function getBatch(req: Request<{ id: string }>, res: Response) {
  const batch = await batchService.getBatchById(req.params.id);

  if (!batch) {
    return res.status(404).json({ error: "Batch not found" });
  }

  res.json(batch);
}

/**
 * POST /batches
 * "Receive stock" for a product.
 */
export async function receiveBatch(req: Request, res: Response) {
  const { productId, vendorId, batchNumber, quantity, expiryDate, userId } = req.body;

  if (!productId || quantity == null || !expiryDate) {
    return res.status(400).json({
      error: "productId, quantity and expiryDate are required",
    });
  }

  try {
    const batch = await batchService.receiveBatch({
      productId,
      vendorId,
      batchNumber,
      quantity,
      expiryDate,
      userId,
    });
    res.status(201).json(batch);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create batch" });
  }
}

/**
 * PATCH /batches/:id/status
 * Manual status override (e.g. mark DISCOUNTED or RETURNED from the dashboard).
 */
export async function updateStatus(req: Request<{ id: string }>, res: Response) {
  const { status, discountRate } = req.body;

  try {
    const batch = await batchService.updateBatchStatus(req.params.id, status, discountRate);
    res.json(batch);
  } catch (err) {
    if (err instanceof batchService.BatchNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof Prisma.PrismaClientValidationError) {
      return res.status(400).json({
        error: "status must be one of ACTIVE, DISCOUNTED, EXPIRED, RETURNED",
      });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to update batch status" });
  }
}

/**
 * POST /batches/:id/movements
 * Records a SALE, SPOILAGE or ADJUSTMENT and adjusts batch quantity to match.
 * Body: { type, quantity, note?, userId? } — quantity is always a positive
 * magnitude to remove; it's stored as a negative delta in the movement log.
 */
export async function recordMovement(req: Request<{ id: string }>, res: Response) {
  const { type, quantity, note, userId } = req.body;

  if (!VALID_MOVEMENT_TYPES.includes(type) || !quantity || quantity <= 0) {
    return res.status(400).json({
      error: `type must be one of ${VALID_MOVEMENT_TYPES.join(", ")} and quantity must be a positive number`,
    });
  }

  try {
    const result = await batchService.recordMovement(req.params.id, {
      type,
      quantity,
      note,
      userId,
    });
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof batchService.BatchNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof batchService.InsufficientQuantityError) {
      return res.status(409).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to record movement" });
  }
}