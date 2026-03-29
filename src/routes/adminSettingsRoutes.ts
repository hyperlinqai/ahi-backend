import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorizeAdmin } from "../middleware/authorizeAdmin";

import {
  getAllSettings,
  updateSettings
} from "../controllers/adminSettingsController";

const router = Router();

router.use(authenticate, authorizeAdmin());

router.get("/", getAllSettings);
router.put("/", updateSettings);

export default router;
