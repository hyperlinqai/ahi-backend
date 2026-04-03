import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorizeAdmin } from "../middleware/authorizeAdmin";
import { validate } from "../middleware/validateRequest";
import {
    createRazorpayOrderSchema,
    verifyPaymentSchema,
    refundPaymentSchema,
    verifyPaypalOrderSchema
} from "../schemas/payment.schema";

import {
    createRazorpayOrder,
    createGuestRazorpayOrder,
    verifyPayment,
    getPaymentHistory,
    getPaymentById,
    refundPayment
} from "../controllers/paymentController";
import {
    verifyPaypalPayment,
    createGuestPaypalOrder
} from "../controllers/paypalController";

const router = Router();

// ==========================================
// USER ROUTES (Checkout Integrity & Verification)
// ==========================================
router.post("/guest/create-order", createGuestRazorpayOrder);
router.post("/guest/create-order-paypal", createGuestPaypalOrder);
router.post("/verify", validate(verifyPaymentSchema), verifyPayment);
router.post("/verify-paypal", validate(verifyPaypalOrderSchema), verifyPaypalPayment);

router.use(authenticate);

router.post("/create-order", validate(createRazorpayOrderSchema), createRazorpayOrder);
router.get("/history", getPaymentHistory);

// ==========================================
// ADMIN ROUTES (Abstract Refunds & Forensics)
// ==========================================
router.use(authorizeAdmin(["ADMIN", "MANAGER"]));

router.get("/:id", getPaymentById);
router.post("/refund/:orderId", validate(refundPaymentSchema), refundPayment);

export default router;
