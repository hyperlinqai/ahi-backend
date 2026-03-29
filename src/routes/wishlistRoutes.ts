import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validateRequest";
import { addToWishlistSchema } from "../schemas/wishlist.schema";

import {
    getWishlist,
    addToWishlist,
    removeFromWishlist
} from "../controllers/wishlistController";

const router = Router();

// ==========================================
// USER ROUTES (Wishlist inherently bound sequentially to users entirely)
// ==========================================
router.use(authenticate);

router.get("/", getWishlist);
router.post("/", validate(addToWishlistSchema), addToWishlist);
router.delete("/:productId", removeFromWishlist);

export default router;
