import { Router } from "express";
import * as inventoryController from "../controllers/inventoryController";
import { authenticateJWT, authorizeRoles } from "../middleware/auth";

const router = Router();

router.use(authenticateJWT);

router.get("/", inventoryController.overview);
router.get("/movements", inventoryController.listMovements);

// Only ADMIN and WAREHOUSE can move stock
router.post(
  "/movement",
  authorizeRoles("ADMIN", "WAREHOUSE"),
  inventoryController.recordMovement
);

export default router;
