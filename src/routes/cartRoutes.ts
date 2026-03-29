import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validateRequest";
import { cartItemSchema, updateCartItemSchema, mergeCartSchema } from "../schemas/cart.schema";

import {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    mergeCart
} from "../controllers/cartController";

const router = Router();

// ==========================================
// USER CART BOUNDARIES 
// ==========================================
// All endpoints implicitly bound against `req.user.id` guaranteeing structural privacy
router.use(authenticate);

router.get("/", getCart);
router.post("/items", validate(cartItemSchema), addToCart);
router.put("/items/:itemId", validate(updateCartItemSchema), updateCartItem);
router.delete("/items/:itemId", removeFromCart);
router.delete("/", clearCart);
router.post("/merge", validate(mergeCartSchema), mergeCart);

export default router;
