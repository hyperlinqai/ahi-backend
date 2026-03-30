import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorizeAdmin } from "../middleware/authorizeAdmin";

import {
  getAllSettings,
  updateSettings,
  resetOrderCounter
} from "../controllers/adminSettingsController";

const router = Router();

router.use(authenticate, authorizeAdmin());

router.get("/", getAllSettings);
router.put("/", updateSettings);
router.post("/reset-order-counter", resetOrderCounter);

export default router;
