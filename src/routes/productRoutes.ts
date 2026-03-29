import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorizeAdmin } from "../middleware/authorizeAdmin";
import { validate } from "../middleware/validateRequest";
import { upload } from "../middleware/upload";
import { createProductSchema, updateProductSchema } from "../schemas/product.schema";
import reviewRoutes from "./reviewRoutes";

import {
    getAllProducts,
    getProductById,
    getProductBySlug,
    searchProducts,
    getProductsByCategory,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImages,
    deleteProductImage,
    reorderProductImages
} from "../controllers/productController";

const router = Router();

// ==========================================
// NESTED MODULE ROUTES
// ==========================================
// Explicitly nests review API executions mapping `/ api / v1 / products /: id / reviews` gracefully
router.use("/:id/reviews", reviewRoutes);

// ==========================================
// PUBLIC ROUTES
// ==========================================
router.get("/", getAllProducts);
router.get("/search", searchProducts); // Must be above dynamic strings
router.get("/category/:catId", getProductsByCategory);
router.get("/by-slug/:slug", getProductBySlug); // Must be above :id explicitly 
router.get("/:id", getProductById);

// ==========================================
// SECURE ADMIN ROUTES
// ==========================================
// Scope downstream mutations exclusively behind strict session boundaries
router.use(authenticate);
router.use(authorizeAdmin(["ADMIN", "MANAGER", "CATALOG_MANAGER"]));

router.post("/", validate(createProductSchema), createProduct);
router.put("/:id", validate(updateProductSchema), updateProduct);
router.delete("/:id", deleteProduct);

// Accept array mutations directly leveraging Multer natively into the logic flow
router.post("/:id/images", upload.array('images', 5), uploadProductImages);
router.put("/:id/images/reorder", reorderProductImages);
router.delete("/:id/images/:imgId", deleteProductImage);

export default router;
