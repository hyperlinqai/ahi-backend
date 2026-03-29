import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorizeAdmin } from "../middleware/authorizeAdmin";

import {
    getSalesReport,
    getInventoryReport,
    getCustomerReport,
    getReturnsReport
} from "../controllers/adminReportController";

const router = Router();

router.use(authenticate, authorizeAdmin());

router.get("/sales", getSalesReport);
router.get("/inventory", getInventoryReport);
router.get("/customers", getCustomerReport);
router.get("/returns", getReturnsReport);

export default router;
