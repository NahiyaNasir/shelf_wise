import cron from "node-cron";
import { runExpiryScan } from "./ExpiryScan.service";



/**
 * Runs the expiry scan every day at 06:00 (server time) — before the shop
 * opens, so the morning alerts feed is already up to date.
 * Override with the EXPIRY_SCAN_CRON env var (standard cron syntax).
 */
export function startExpiryScanJob() {
  const schedule = process.env.EXPIRY_SCAN_CRON || "0 6 * * *";

  cron.schedule(schedule, async () => {
    try {
      const result = await runExpiryScan();
      console.log("[expiry-scan] done", result);
    } catch (err) {
      console.error("[expiry-scan] failed", err);
    }
  });

  console.log(`[expiry-scan] scheduled: ${schedule}`);
}