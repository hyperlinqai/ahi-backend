import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorizeAdmin } from "../middleware/authorizeAdmin";

import {
    getDashboardStats,
    getRecentOrders,
    getTopProducts,
    getRevenueChart
} from "../controllers/adminDashboardController";

const router = Router();

router.use(authenticate, authorizeAdmin());

router.get("/stats", getDashboardStats);
router.get("/recent-orders", getRecentOrders);
router.get("/top-products", getTopProducts);
router.get("/revenue-chart", getRevenueChart);

export default router;
