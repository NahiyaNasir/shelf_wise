import { Router } from "express";
import * as productController from "./productController";
import { requireRole } from "../../middlewares/auth.middlewares";

const router = Router();
// Any staff can look products up and scan in new ones.
router.get("/", productController.listProducts);
router.get("/barcode/:barcode", productController.lookupBarcode);
router.get("/:id", productController.getProduct);
router.post("/", productController.createProduct);
 
// Changing prices/details or deleting a product (cascades to its batches!) is a manager job.
router.put("/:id", requireRole("manager", "admin"), productController.updateProduct);
router.delete("/:id", requireRole("manager", "admin"), productController.deleteProduct);
 

export default router;

