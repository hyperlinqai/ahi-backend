import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import db from "../db";
import { carts, cartItems, products, productVariants, coupons } from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const computeCartTotals = (cart: any) => {
    let subtotal = 0;
    cart.items.forEach((item: any) => {
        subtotal += item.product.price * item.quantity;
    });

    let discount = 0;
    if (cart.coupon) {
        if (cart.coupon.type === "FLAT") {
            discount = cart.coupon.discountValue;
        } else if (cart.coupon.type === "PERCENTAGE") {
            discount = subtotal * (cart.coupon.discountValue / 100);
            if (cart.coupon.maxDiscount && discount > cart.coupon.maxDiscount) {
                discount = cart.coupon.maxDiscount;
            }
        }

        if (cart.coupon.minOrderValue && subtotal < cart.coupon.minOrderValue) {
            discount = 0;
        }
    }

    const total = subtotal - discount > 0 ? subtotal - discount : 0;

    return {
        ...cart,
        subtotal: Number(subtotal.toFixed(2)),
        discount,
        total: Number(total.toFixed(2))
    };
};

export const getCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const cart = await db.query.carts.findFirst({
            where: eq(carts.userId, userId),
            with: {
                coupon: true,
                items: {
                    with: {
                        product: {
                            columns: { id: true, title: true, slug: true, price: true },
                            with: { images: { limit: 1 } }
                        }
                    },
                    orderBy: [desc(cartItems.createdAt)]
                }
            }
        });

        if (!cart) {
            return res.status(200).json({
                success: true,
                data: { items: [], subtotal: 0, discount: 0, total: 0 }
            });
        }

        res.status(200).json({
            success: true,
            data: computeCartTotals(cart)
        });

    } catch (error) {
        next(error);
    }
};

export const addToCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { productId, quantity } = req.body;

        const product = await db.query.products.findFirst({
            where: eq(products.id, productId),
            with: { variants: true }
        });

        if (!product) return next(new AppError("Product explicitly not found", 404));

        const totalStock = product.variants.reduce((acc: number, variant: any) => acc + variant.stock, 0);
        if (totalStock < quantity) {
            return next(new AppError("Insufficient inclusive aggregated stock bounds", 400));
        }

        let cart = await db.query.carts.findFirst({ where: eq(carts.userId, userId) });
        if (!cart) {
            const [newCart] = await db.insert(carts).values({ userId }).returning();
            cart = newCart;
        }

        const existingItem = await db.query.cartItems.findFirst({
            where: and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId))
        });

        let cartItemRes;
        if (existingItem) {
            const updatedQuantity = existingItem.quantity + quantity;
            if (updatedQuantity > totalStock) return next(new AppError("Requested quantity strictly exceeds current aggregated bounds", 400));

            const [updated] = await db.update(cartItems)
                .set({ quantity: updatedQuantity, updatedAt: new Date() })
                .where(eq(cartItems.id, existingItem.id))
                .returning();
            cartItemRes = updated;
        } else {
            const [created] = await db.insert(cartItems).values({
                cartId: cart.id,
                productId,
                quantity
            }).returning();
            cartItemRes = created;
        }

        res.status(200).json({
            success: true,
            message: "Item actively securely stored",
            data: cartItemRes
        });

    } catch (error) {
        next(error);
    }
}

export const updateCartItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const itemId = req.params.itemId as string;
        const { quantity } = req.body;

        const cartItem = await db.query.cartItems.findFirst({
            where: eq(cartItems.id, itemId),
            with: { cart: true, product: { with: { variants: true } } }
        });

        if (!cartItem || cartItem.cart.userId !== userId) {
            return next(new AppError("CartItem implicitly missing tracking natively", 404));
        }

        const totalStock = cartItem.product.variants.reduce((acc: number, variant: any) => acc + variant.stock, 0);
        if (quantity > totalStock) {
            return next(new AppError("Requested bound safely exceeds active stock levels", 400));
        }

        const [updatedItem] = await db.update(cartItems)
            .set({ quantity, updatedAt: new Date() })
            .where(eq(cartItems.id, itemId))
            .returning();

        res.status(200).json({
            success: true,
            message: "Item quantity logically adjusted.",
            data: updatedItem
        });

    } catch (error) {
        next(error);
    }
}

export const removeFromCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const itemId = req.params.itemId as string;

        const cartItem = await db.query.cartItems.findFirst({
            where: eq(cartItems.id, itemId),
            with: { cart: true }
        });

        if (!cartItem || cartItem.cart.userId !== userId) {
            return next(new AppError("Item explicitly missing natively bounding safely", 404));
        }

        await db.delete(cartItems).where(eq(cartItems.id, itemId));

        res.status(200).json({
            success: true,
            message: "Item naturally removed.",
        });

    } catch (error) {
        next(error);
    }
}

export const clearCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const cart = await db.query.carts.findFirst({ where: eq(carts.userId, userId) });

        if (cart) {
            await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
        }

        res.status(200).json({
            success: true,
            message: "Cart securely scrubbed completely.",
        });

    } catch (error) {
        next(error);
    }
}

export const mergeCart = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { items } = req.body; // Array of { productId, quantity }

        let cart = await db.query.carts.findFirst({ where: eq(carts.userId, userId) });
        if (!cart) {
            const [newCart] = await db.insert(carts).values({ userId }).returning();
            cart = newCart;
        }

        const upsertPromises = items.map(async (item: any) => {
            const product = await db.query.products.findFirst({
                where: eq(products.id, item.productId),
                with: { variants: true }
            });

            if (!product) return null;

            const totalStock = product.variants.reduce((acc: number, variant: any) => acc + variant.stock, 0);
            const qty = Math.min(item.quantity, totalStock);

            if (qty <= 0) return null;

            return db.insert(cartItems).values({
                cartId: cart.id,
                productId: item.productId,
                quantity: qty
            }).onConflictDoUpdate({
                target: [cartItems.cartId, cartItems.productId],
                set: {
                    quantity: sql`${cartItems.quantity} + EXCLUDED.quantity`,
                    updatedAt: new Date()
                }
            });
        });

        await Promise.all(upsertPromises);

        res.status(200).json({
            success: true,
            message: "Items smartly structurally merged cleanly."
        });

    } catch (error) {
        next(error);
    }
}
