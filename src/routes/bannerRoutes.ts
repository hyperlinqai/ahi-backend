import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorizeAdmin } from "../middleware/authorizeAdmin";
import { validate } from "../middleware/validateRequest";
import { createBannerSchema, updateBannerSchema, reorderBannerSchema } from "../schemas/cms.schema";
import { upload } from "../middleware/upload";

import {
    getBanners,
    createBanner,
    updateBanner,
    deleteBanner,
    reorderBanner
} from "../controllers/bannerController";

const router = Router();

// ==========================================
// PUBLIC ROUTES
// ==========================================
router.get("/", getBanners);

// ==========================================
// ADMIN ROUTES
// ==========================================
router.use(authenticate, authorizeAdmin());

router.post("/", upload.single("image"), validate(createBannerSchema), createBanner);
router.put("/:id", upload.single("image"), validate(updateBannerSchema), updateBanner);
router.delete("/:id", deleteBanner);
router.patch("/:id/reorder", validate(reorderBannerSchema), reorderBanner);

export default router;
