import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorizeAdmin } from "../middleware/authorizeAdmin";
import { validate } from "../middleware/validateRequest";
import { updateOrderStatusSchema } from "../schemas/order.schema";

import {
    placeOrder,
    getMyOrders,
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    cancelOrder,
    requestReturn,
    generateInvoicePDF
} from "../controllers/orderController";

const router = Router();

// ==========================================
// USER ROUTES (Checkout & Operations)
// ==========================================
router.use(authenticate);

router.post("/", placeOrder);
router.get("/my-orders", getMyOrders);
router.get("/:id", getOrderById); // Controller explicitly guards against foreign user IDs natively
router.patch("/:id/cancel", cancelOrder);
router.post("/:id/return", requestReturn);
router.get("/:id/invoice", generateInvoicePDF); // Streams direct application/pdf binary

// ==========================================
// ADMIN ROUTES (Abstract overrides & filters)
// ==========================================
// Mounts below block exclusively limiting scope
router.use(authorizeAdmin(["ADMIN", "MANAGER", "SUPPORT"]));

router.get("/", getAllOrders);
router.patch("/:id/status", validate(updateOrderStatusSchema), updateOrderStatus);

export default router;
