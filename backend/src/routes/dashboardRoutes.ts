import { Router } from "express";
import * as dashboardController from "../controllers/dashboardController";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

router.use(authenticateJWT);
router.get("/", dashboardController.getStats);

export default router;
