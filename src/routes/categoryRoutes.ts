import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorizeAdmin } from "../middleware/authorizeAdmin";
import { validate } from "../middleware/validateRequest";
import { upload } from "../middleware/upload";
import {
    createCategorySchema,
    updateCategorySchema,
    reorderCategoriesSchema,
} from "../schemas/category.schema";

import {
    getAllCategories,
    getCategoryById,
    getCategoryProducts,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
} from "../controllers/categoryController";

const router = Router();

// ==========================================
// PUBLIC ROUTES
// ==========================================
// Categories should natively display on the frontend natively mapping hierarchies.
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);
router.get("/:id/products", getCategoryProducts);

// ==========================================
// SECURE ADMIN ROUTES
// ==========================================
// Require stringent authorization tokens + catalog mapping roles
router.use(authenticate);
router.use(authorizeAdmin(["ADMIN", "MANAGER", "CATALOG_MANAGER"]));

// Utilize Multer inline upload to process image attachments mapping payload bodies
router.post("/", upload.single('image'), validate(createCategorySchema), createCategory);
router.put("/reorder", validate(reorderCategoriesSchema), reorderCategories);
router.put("/:id", upload.single('image'), validate(updateCategorySchema), updateCategory);
router.delete("/:id", deleteCategory);

export default router;
