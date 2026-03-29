import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorizeAdmin } from "../middleware/authorizeAdmin";

import {
  getAuditLogs
} from "../controllers/adminAuditLogController";

const router = Router();

router.use(authenticate, authorizeAdmin());

router.get("/", getAuditLogs);

export default router;
