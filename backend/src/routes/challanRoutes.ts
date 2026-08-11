import { Router } from "express";
import * as challanController from "../controllers/challanController";
import { authenticateJWT, authorizeRoles } from "../middleware/auth";

const router = Router();

router.use(authenticateJWT);

// All roles can view challans (WAREHOUSE/ACCOUNTS see them too)
router.get("/", challanController.list);
router.get("/:id", challanController.getById);

// ADMIN and SALES create/manage challans
router.post("/", authorizeRoles("ADMIN", "SALES"), challanController.create);
router.put("/:id", authorizeRoles("ADMIN", "SALES"), challanController.update);
router.patch("/:id/confirm", authorizeRoles("ADMIN", "SALES"), challanController.confirm);
router.patch("/:id/cancel", authorizeRoles("ADMIN", "SALES"), challanController.cancel);

export default router;
