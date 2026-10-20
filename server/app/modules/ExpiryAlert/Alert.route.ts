import { Router } from "express";
import * as alertController from "./Alert.controller";
import { requireAuth, requireRole } from "../../middlewares/auth.middlewares";

const router = Router();

router.use(requireAuth);

// Everyone on the team should see what's expiring.
router.get("/", alertController.listAlerts);
router.get("/:id", alertController.getAlert);

// Acting on alerts, and forcing a scan, is a manager job.
router.post("/scan", requireRole("manager", "admin"), alertController.runScan);
router.patch("/:id/resolve", requireRole("manager", "admin"), alertController.resolveAlert);

export default router;