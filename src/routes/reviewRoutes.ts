import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorizeAdmin } from "../middleware/authorizeAdmin";
import { validate } from "../middleware/validateRequest";
import { submitReviewSchema, getReviewsSchema } from "../schemas/review.schema";

import {
    getApprovedReviews,
    submitReview,
    approveReview,
    rejectReview,
    deleteReview
} from "../controllers/reviewController";

// Important: Explicitly mergeParams safely capturing the `:id` originating securely from the parent `productRoutes` natively.
const router = Router({ mergeParams: true });

// ==========================================
// PUBLIC ROUTES
// ==========================================
router.get("/", validate(getReviewsSchema), getApprovedReviews);

// ==========================================
// USER ROUTES (Feedback constraints)
// ==========================================
router.use(authenticate);

router.post("/", validate(submitReviewSchema), submitReview);

// ==========================================
// ADMIN ROUTES (Approval chains & removals)
// ==========================================
router.use(authorizeAdmin(["ADMIN", "MANAGER", "CATALOG_MANAGER"]));

router.patch("/:rid/approve", approveReview);
router.patch("/:rid/reject", rejectReview);
router.delete("/:rid", deleteReview);

export default router;
