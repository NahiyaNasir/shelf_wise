import { Router } from "express";
import { userRoutes } from "../app/modules/user/user.route";
import app from "..";




const router = Router();

router.use("/users", userRoutes);
// router.use("/batches", batchRoutes);

export const IndexRoutes = router;