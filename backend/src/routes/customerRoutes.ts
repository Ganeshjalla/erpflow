import { Router } from "express";
import * as customerController from "../controllers/customerController";
import { authenticateJWT, authorizeRoles } from "../middleware/auth";

const router = Router();

router.use(authenticateJWT);

// All roles listed can view customers
router.get("/", authorizeRoles("ADMIN", "SALES", "ACCOUNTS"), customerController.list);
router.get("/:id", authorizeRoles("ADMIN", "SALES", "ACCOUNTS"), customerController.getById);

// Only ADMIN and SALES manage customers
router.post("/", authorizeRoles("ADMIN", "SALES"), customerController.create);
router.put("/:id", authorizeRoles("ADMIN", "SALES"), customerController.update);
router.delete("/:id", authorizeRoles("ADMIN"), customerController.remove);

router.post(
  "/:id/follow-ups",
  authorizeRoles("ADMIN", "SALES"),
  customerController.addFollowUp
);
router.get(
  "/:id/follow-ups",
  authorizeRoles("ADMIN", "SALES", "ACCOUNTS"),
  customerController.listFollowUps
);

export default router;
