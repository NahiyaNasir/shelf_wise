import { Router } from "express";
import * as batchController from "./Batch.controller";
import { requireAuth, requireRole } from "../../middlewares/auth.middlewares";


const router = Router();

router.use(requireAuth);

// Day-to-day stock work: any logged-in staff.
router.get("/", batchController.listBatches);
router.get("/:id", batchController.getBatch);
router.post("/", batchController.receiveBatch);
router.post("/:id/movements", batchController.recordMovement);

// Manually discounting / returning a batch changes money: managers and up.
router.patch("/:id/status", requireRole("manager", "admin"), batchController.updateStatus);


export const batchRoutes = router;