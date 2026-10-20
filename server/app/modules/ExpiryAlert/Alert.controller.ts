import { Request, Response } from "express";
import { AlertTier } from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";

import * as alertService from "./Alert.service";
import { AuthedRequest } from "../../middlewares/auth.middlewares";
import { runExpiryScan } from "./ExpiryScan.service";
/**
 * GET /alerts
 * Supports ?isResolved=true|false and ?tier= filters. An invalid `tier`
 * is rejected by Prisma's own enum validation, caught below as a 400.
 */
export async function listAlerts(req: Request, res: Response) {
  const { isResolved, tier } = req.query;

  try {
    const alerts = await alertService.listAlerts({
      isResolved: isResolved != null ? String(isResolved) === "true" : undefined,
      tier: tier ? (String(tier) as AlertTier) : undefined,
    });
    res.json(alerts);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientValidationError) {
      return res.status(400).json({ error: "Invalid tier filter" });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to list alerts" });
  }
}

/**
 * GET /alerts/:id
 */
export async function getAlert(req: Request<{ id: string }>, res: Response) {
  const alert = await alertService.getAlertById(req.params.id);

  if (!alert) {
    return res.status(404).json({ error: "Alert not found" });
  }

  res.json(alert);
}

/**
 * PATCH /alerts/:id/resolve
 * Body: { resolvedById? } — the user marking it resolved, if you're
 * enforcing auth on this route.
 */
export async function resolveAlert(req: Request<{ id: string }>, res: Response) {
  const { resolvedById } = req.body;

  try {
    const alert = await alertService.resolveAlert(req.params.id, resolvedById);
    res.json(alert);
  } catch (err) {
    if (err instanceof alertService.AlertNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to resolve alert" });
  }
}
 
/**
 * POST /alerts/scan
 * Runs the expiry scan right now instead of waiting for the daily job —
 * handy for testing and for "I just received stock, check it" moments.
 */
export async function runScan(_req: AuthedRequest, res: Response) {
  try {
    const result = await runExpiryScan();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Expiry scan failed" });
  }
}