import { Router } from "express";
import * as userController from "../controllers/userController";
import { authenticateJWT, authorizeRoles } from "../middleware/auth";

const router = Router();

router.use(authenticateJWT, authorizeRoles("ADMIN"));
router.get("/", userController.list);
router.post("/", userController.create);
router.patch("/:id/active", userController.toggleActive);

export default router;
