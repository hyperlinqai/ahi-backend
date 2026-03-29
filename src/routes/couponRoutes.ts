import { Router } from "express";
import {
    validateCoupon,
    getAllCoupons,
    getCouponById,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    getCouponUsages
} from "../controllers/couponController";
import { authenticate } from "../middleware/authenticate";
import { authorizeAdmin } from "../middleware/authorizeAdmin";
import { validate } from "../middleware/validateRequest";
import {
    createCouponSchema,
    validateCouponSchema,
    updateCouponSchema,
    getCouponUsagesSchema
} from "../schemas/coupon.schema";

const router = Router();

// Debug middleware
router.use((req, res, next) => {
    console.log("🎯 Coupon router reached:", req.method, req.path);
    next();
});

router.post("/validate", validate(validateCouponSchema), validateCoupon);

// Protect all coupon routes
router.use(authenticate);

// Debug after auth
router.use((req, res, next) => {
    console.log("✅ Auth passed, user:", req.user?.id);
    next();
});

router.use(authorizeAdmin());

// Debug after authz
router.use((req, res, next) => {
    console.log("✅ Authorize passed");
    next();
}); // Only admins manage coupons

// Main CRUD endpoints
router.route("/")
    .get(getAllCoupons)
    .post(validate(createCouponSchema), createCoupon);

router.route("/:id")
    .get(getCouponById)
    .patch(validate(updateCouponSchema), updateCoupon)
    .delete(deleteCoupon);

// Custom endpoints
router.get("/:id/usage", validate(getCouponUsagesSchema), getCouponUsages);

export default router;
