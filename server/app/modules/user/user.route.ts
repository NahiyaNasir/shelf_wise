import { Router } from "express";
import * as userController from "../user/use.controller";
import { requireAuth, requireRole } from "../../middlewares/auth.middlewares";

const router = Router();

router.get("/me", requireAuth, userController.getMe);

router.post("/register", requireAuth, requireRole("admin"), userController.createUser);
router.post("/login", userController.loginUser);
router.get("/", requireAuth, requireRole("admin"), userController.listUsers);
router.get("/:id", requireAuth, requireRole("admin"), userController.getUser);
router.patch("/:id/role", requireAuth, requireRole("admin"), userController.setRole);
router.patch("/:id/ban", requireAuth, requireRole("admin"), userController.banUser);
router.patch("/:id/unban", requireAuth, requireRole("admin"), userController.unbanUser);
router.delete("/:id", requireAuth, requireRole("admin"), userController.removeUser);

export const userRoutes = router;