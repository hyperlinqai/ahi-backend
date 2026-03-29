import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorizeAdmin } from "../middleware/authorizeAdmin";
import { validate } from "../middleware/validateRequest";
import {
    createRazorpayOrderSchema,
    verifyPaymentSchema,
    refundPaymentSchema
} from "../schemas/payment.schema";

import {
    createRazorpayOrder,
    verifyPayment,
    getPaymentHistory,
    getPaymentById,
    refundPayment
} from "../controllers/paymentController";

const router = Router();

// ==========================================
// USER ROUTES (Checkout Integrity & Verification)
// ==========================================
router.use(authenticate);

router.post("/create-order", validate(createRazorpayOrderSchema), createRazorpayOrder);
// NOTE: Verify payment is an explicit execution map verifying structural HMAC signatures directly via Razorpay
router.post("/verify", validate(verifyPaymentSchema), verifyPayment);
router.get("/history", getPaymentHistory);

// ==========================================
// ADMIN ROUTES (Abstract Refunds & Forensics)
// ==========================================
router.use(authorizeAdmin(["ADMIN", "MANAGER"]));

router.get("/:id", getPaymentById);
router.post("/refund/:orderId", validate(refundPaymentSchema), refundPayment);

export default router;
