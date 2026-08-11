import { Router } from "express";
import * as productController from "../controllers/productController";
import { authenticateJWT, authorizeRoles } from "../middleware/auth";

const router = Router();

router.use(authenticateJWT);

// All authenticated roles can view products
router.get("/", productController.list);
router.get("/:id", productController.getById);

// ADMIN and WAREHOUSE manage the product catalog
router.post("/", authorizeRoles("ADMIN", "WAREHOUSE"), productController.create);
router.put("/:id", authorizeRoles("ADMIN", "WAREHOUSE"), productController.update);
router.delete("/:id", authorizeRoles("ADMIN"), productController.remove);

export default router;
