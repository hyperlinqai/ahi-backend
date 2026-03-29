import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorizeAdmin } from "../middleware/authorizeAdmin";
import { validate } from "../middleware/validateRequest";
import { createPageSchema, updatePageSchema } from "../schemas/cms.schema";

import {
    getAllPages,
    getPageBySlug,
    createPage,
    updatePage,
    deletePage
} from "../controllers/pageController";

const router = Router();

// ==========================================
// PUBLIC ROUTES
// ==========================================
router.get("/", getAllPages);
router.get("/:slug", getPageBySlug);

// ==========================================
// ADMIN ROUTES
// ==========================================
router.use(authenticate, authorizeAdmin());

router.post("/", validate(createPageSchema), createPage);
router.put("/:slug", validate(updatePageSchema), updatePage);
router.delete("/:slug", deletePage);

export default router;
